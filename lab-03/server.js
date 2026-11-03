// Lab 3: REST API with Query Parameters, Validation, and Debugging
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON bodies
app.use(express.json());

// Root endpoint: API overview
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Lab 3: Books REST API',
    endpoints: {
      'GET /books': 'Retrieve books (supports search_q, order_by, order, limit, offset, min_price, max_price)',
      'GET /books/:id': 'Retrieve book by ID',
      'POST /books': 'Create a new book (requires title, author, price)',
      'PUT /books/:id': 'Update an existing book',
      'DELETE /books/:id': 'Delete a book by ID'
    }
  });
});

// GET /books - Retrieve books with search, sorting, price filtering, and pagination
app.get('/books', (req, res) => {
  const { search_q, order_by, order, limit, offset, min_price, max_price } = req.query;

  // 1. Whitelist & Validate Sorting
  const allowedSortColumns = ['id', 'title', 'author', 'price'];
  let sortColumn = 'id';
  let sortOrder = 'ASC';

  if (order_by !== undefined) {
    const normalizedOrderBy = String(order_by).trim().toLowerCase();
    if (!allowedSortColumns.includes(normalizedOrderBy)) {
      return res.status(400).json({
        message: 'Invalid order_by column. Permitted columns: id, title, author, price'
      });
    }
    sortColumn = normalizedOrderBy;
  }

  if (order !== undefined) {
    const normalizedOrder = String(order).trim().toUpperCase();
    if (normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
      return res.status(400).json({
        message: 'Invalid order parameter. Permitted values: ASC, DESC'
      });
    }
    sortOrder = normalizedOrder;
  }

  // 2. Validate Price-Range Filters
  let minPriceNum = null;
  let maxPriceNum = null;

  if (min_price !== undefined) {
    minPriceNum = Number(min_price);
    if (isNaN(minPriceNum) || minPriceNum < 0) {
      return res.status(400).json({
        message: 'min_price must be a valid non-negative number'
      });
    }
  }

  if (max_price !== undefined) {
    maxPriceNum = Number(max_price);
    if (isNaN(maxPriceNum) || maxPriceNum < 0) {
      return res.status(400).json({
        message: 'max_price must be a valid non-negative number'
      });
    }
  }

  if (minPriceNum !== null && maxPriceNum !== null && minPriceNum > maxPriceNum) {
    return res.status(400).json({
      message: 'min_price cannot be greater than max_price'
    });
  }

  // 3. Validate Pagination Parameters
  let pageLimit = 10;
  let pageOffset = 0;

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({
        message: 'limit must be a positive integer'
      });
    }
    pageLimit = Math.min(parsedLimit, 100); // capped at 100
  }

  if (offset !== undefined) {
    const parsedOffset = Number(offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        message: 'offset must be a non-negative integer'
      });
    }
    pageOffset = parsedOffset;
  }

  // 4. Construct SQL Query with Parameterization
  let sql = 'SELECT * FROM books';
  const conditions = [];
  const params = [];

  // Search by partial title match
  if (search_q !== undefined && String(search_q).trim() !== '') {
    conditions.push('title LIKE ?');
    params.push(`%${String(search_q).trim()}%`);
  }

  // Price filtering
  if (minPriceNum !== null && maxPriceNum !== null) {
    conditions.push('price BETWEEN ? AND ?');
    params.push(minPriceNum, maxPriceNum);
  } else if (minPriceNum !== null) {
    conditions.push('price >= ?');
    params.push(minPriceNum);
  } else if (maxPriceNum !== null) {
    conditions.push('price <= ?');
    params.push(maxPriceNum);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Safe sorting using whitelisted identifiers
  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  // Safe pagination
  sql += ' LIMIT ? OFFSET ?';
  params.push(pageLimit, pageOffset);

  // Execute database query
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('Database query error:', err.message);
      return res.status(500).json({ message: 'Database query error' });
    }
    res.status(200).json(rows);
  });
});

// GET /books/:id - Retrieve a specific book by ID
app.get('/books/:id', (req, res) => {
  const { id } = req.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ message: 'Invalid book ID' });
  }

  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.status(200).json(row);
  });
});

// POST /books - Create a new book with input validation
app.post('/books', (req, res) => {
  const { title, author, price } = req.body || {};

  // Validation: title
  if (title === undefined || title === null || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required' });
  }

  // Validation: author
  if (author === undefined || author === null || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ message: 'Author is required' });
  }

  // Validation: price
  if (price === undefined || price === null || price === '' || isNaN(Number(price))) {
    return res.status(400).json({ message: 'Price is required and must be a valid number' });
  }

  const numPrice = Number(price);
  if (numPrice < 0) {
    return res.status(400).json({ message: 'Price must be a non-negative number' });
  }

  // Insert book into database
  const query = 'INSERT INTO books (title, author, price) VALUES (?, ?, ?)';
  db.run(query, [title.trim(), author.trim(), numPrice], function (err) {
    if (err) {
      console.error('Database insertion error:', err.message);
      return res.status(500).json({ message: 'Database insertion error' });
    }

    res.status(201).json({
      message: 'Book created successfully',
      book: {
        id: this.lastID,
        title: title.trim(),
        author: author.trim(),
        price: numPrice
      }
    });
  });
});

// PUT /books/:id - Update an existing book
app.put('/books/:id', (req, res) => {
  const { id } = req.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ message: 'Invalid book ID' });
  }

  // First verify book exists
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (checkErr, existingBook) => {
    if (checkErr) {
      console.error('Database error:', checkErr.message);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, price } = req.body || {};

    // Validate update fields if provided
    let newTitle = existingBook.title;
    let newAuthor = existingBook.author;
    let newPrice = existingBook.price;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      newTitle = title.trim();
    }

    if (author !== undefined) {
      if (typeof author !== 'string' || author.trim() === '') {
        return res.status(400).json({ message: 'Author cannot be empty' });
      }
      newAuthor = author.trim();
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Price must be a valid non-negative number' });
      }
      newPrice = parsedPrice;
    }

    const updateSql = 'UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?';
    db.run(updateSql, [newTitle, newAuthor, newPrice, bookId], function (updateErr) {
      if (updateErr) {
        console.error('Database update error:', updateErr.message);
        return res.status(500).json({ message: 'Database update error' });
      }

      res.status(200).json({
        message: 'Book updated successfully',
        book: {
          id: bookId,
          title: newTitle,
          author: newAuthor,
          price: newPrice
        }
      });
    });
  });
});

// DELETE /books/:id - Delete an existing book
app.delete('/books/:id', (req, res) => {
  const { id } = req.params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId <= 0) {
    return res.status(400).json({ message: 'Invalid book ID' });
  }

  // Check if book exists before deleting
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (checkErr, existingBook) => {
    if (checkErr) {
      console.error('Database error:', checkErr.message);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    db.run('DELETE FROM books WHERE id = ?', [bookId], function (deleteErr) {
      if (deleteErr) {
        console.error('Database deletion error:', deleteErr.message);
        return res.status(500).json({ message: 'Database deletion error' });
      }

      res.status(200).json({ message: 'Book deleted successfully' });
    });
  });
});

// Catch-all handler for unknown endpoints (404)
app.use((req, res) => {
  res.status(404).json({ message: '404 - Endpoint Not Found' });
});

// Centralized error handler (500)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Lab 3 Books API running on http://localhost:${PORT}/`);
  });
}

module.exports = app;
