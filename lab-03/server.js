/**
 * ============================================================================
 * Lab 3: REST API, Query Parameters, Validation, Debugging
 * ============================================================================
 * Student Name        : CHINNALA SUKUMAR
 * Registration Number : 252U1R7059
 * Class & Section     : CSE FSD-309
 * Study Level         : UG (Year II & Term II)
 * Subject             : Backend Development Fundamentals
 * Lab Number          : 03
 * ============================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON body parser
app.use(cors());
app.use(express.json());

// ============================================================================
// 1. DATABASE CONFIGURATION & FALLBACK HANDLING
// ============================================================================
let pool = null;
let useFallback = false;

// In-memory fallback dataset in case local MySQL server is not running
let memoryBooks = [
  { id: 1, title: 'Learning Node.js', author: 'Rahul Sharma', price: 350.00, created_at: new Date() },
  { id: 2, title: 'Java: The Complete Reference', author: 'Herbert Schildt', price: 650.00, created_at: new Date() },
  { id: 3, title: 'Effective Java', author: 'Joshua Bloch', price: 550.00, created_at: new Date() },
  { id: 4, title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', price: 400.00, created_at: new Date() },
  { id: 5, title: 'Clean Code', author: 'Robert C. Martin', price: 700.00, created_at: new Date() },
  { id: 6, title: 'Core Java for the Impatient', author: 'Cay S. Horstmann', price: 480.00, created_at: new Date() },
  { id: 7, title: 'Python Crash Course', author: 'Eric Matthes', price: 320.00, created_at: new Date() },
  { id: 8, title: 'Design Patterns', author: 'Erich Gamma', price: 850.00, created_at: new Date() },
  { id: 9, title: 'HTML and CSS: Design and Build Websites', author: 'Jon Duckett', price: 280.00, created_at: new Date() },
  { id: 10, title: 'Database System Concepts', author: 'Abraham Silberschatz', price: 950.00, created_at: new Date() }
];
let nextId = 11;

// Initialize MySQL connection pool
async function initializeDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'library_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('[Database] Connected to MySQL database:', process.env.DB_NAME || 'library_db');

    // Create table if not exists (Fixes debugging problem: Table-name typo)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed sample books if table is empty
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM books');
    if (rows[0].count === 0) {
      console.log('[Database] Seeding initial sample books into MySQL table...');
      const sampleBooks = [
        ['Learning Node.js', 'Rahul Sharma', 350.00],
        ['Java: The Complete Reference', 'Herbert Schildt', 650.00],
        ['Effective Java', 'Joshua Bloch', 550.00],
        ['JavaScript: The Good Parts', 'Douglas Crockford', 400.00],
        ['Clean Code', 'Robert C. Martin', 700.00],
        ['Core Java for the Impatient', 'Cay S. Horstmann', 480.00],
        ['Python Crash Course', 'Eric Matthes', 320.00],
        ['Design Patterns', 'Erich Gamma', 850.00],
        ['HTML and CSS: Design and Build Websites', 'Jon Duckett', 280.00],
        ['Database System Concepts', 'Abraham Silberschatz', 950.00]
      ];
      await connection.query('INSERT INTO books (title, author, price) VALUES ?', [sampleBooks]);
      console.log('[Database] Seeded 10 sample books successfully.');
    }
    connection.release();
  } catch (err) {
    console.warn('[Database Warning] MySQL connection failed:', err.message);
    console.warn('[Database Fallback] Running with in-memory dataset to ensure uninterrupted local testing.');
    useFallback = true;
  }
}

// ============================================================================
// 2. REST API ROUTES
// ============================================================================

// Root Route: API Overview
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Lab 3: Books REST API',
    student: {
      name: 'CHINNALA SUKUMAR',
      registrationNumber: '252U1R7059',
      section: 'CSE FSD-309'
    },
    endpoints: {
      'GET /books': 'Get all books (supports search_q, order_by, order, limit, offset, min_price, max_price)',
      'GET /books/:id': 'Get book by ID',
      'POST /books': 'Create a new book (requires title, author, price)',
      'PUT /books/:id': 'Update existing book by ID',
      'DELETE /books/:id': 'Delete book by ID'
    }
  });
});

// ----------------------------------------------------------------------------
// GET /books - Retrieve books with search, sort, filter, and pagination
// ----------------------------------------------------------------------------
app.get('/books', async (req, res, next) => {
  try {
    const { search_q, order_by, order, limit, offset, min_price, max_price } = req.query;

    // 1. Validate sorting column (Safe Whitelist against SQL Injection)
    const allowedSortColumns = ['id', 'title', 'author', 'price', 'created_at'];
    let safeOrderBy = 'id';
    let safeOrder = 'ASC';

    if (order_by !== undefined) {
      const normalizedCol = String(order_by).trim().toLowerCase();
      if (!allowedSortColumns.includes(normalizedCol)) {
        return res.status(400).json({
          message: 'Invalid order_by column. Permitted columns: id, title, author, price, created_at'
        });
      }
      safeOrderBy = normalizedCol;
    }

    // 2. Validate sort direction
    if (order !== undefined) {
      const normalizedOrder = String(order).trim().toUpperCase();
      if (normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
        return res.status(400).json({
          message: 'Invalid order parameter. Permitted values: ASC, DESC'
        });
      }
      safeOrder = normalizedOrder;
    }

    // 3. Validate price-range filters
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

    // 4. Validate pagination parameters
    let safeLimit = 10;
    let safeOffset = 0;

    if (limit !== undefined) {
      const parsedLimit = Number(limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({
          message: 'limit must be a positive integer'
        });
      }
      safeLimit = Math.min(parsedLimit, 100);
    }

    if (offset !== undefined) {
      const parsedOffset = Number(offset);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          message: 'offset must be a non-negative integer'
        });
      }
      safeOffset = parsedOffset;
    }

    // 5. Execute Query via MySQL or Fallback
    if (!useFallback && pool) {
      let sql = 'SELECT * FROM books';
      const conditions = [];
      const params = [];

      if (search_q !== undefined && String(search_q).trim() !== '') {
        conditions.push('title LIKE ?');
        params.push(`%${String(search_q).trim()}%`);
      }

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

      sql += ` ORDER BY ${safeOrderBy} ${safeOrder}`;
      sql += ' LIMIT ? OFFSET ?';
      params.push(safeLimit, safeOffset);

      // Fixes debugging problem: Missing await on database query
      const [rows] = await pool.query(sql, params);

      return res.status(200).json({
        message: 'Books retrieved successfully',
        data: rows
      });
    } else {
      // In-Memory Fallback Processor
      let results = [...memoryBooks];

      if (search_q !== undefined && String(search_q).trim() !== '') {
        const queryTerm = String(search_q).trim().toLowerCase();
        results = results.filter(b => b.title.toLowerCase().includes(queryTerm));
      }

      if (minPriceNum !== null && maxPriceNum !== null) {
        results = results.filter(b => b.price >= minPriceNum && b.price <= maxPriceNum);
      } else if (minPriceNum !== null) {
        results = results.filter(b => b.price >= minPriceNum);
      } else if (maxPriceNum !== null) {
        results = results.filter(b => b.price <= maxPriceNum);
      }

      results.sort((a, b) => {
        let valA = a[safeOrderBy];
        let valB = b[safeOrderBy];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return safeOrder === 'ASC' ? -1 : 1;
        if (valA > valB) return safeOrder === 'ASC' ? 1 : -1;
        return 0;
      });

      const paginated = results.slice(safeOffset, safeOffset + safeLimit);

      return res.status(200).json({
        message: 'Books retrieved successfully',
        data: paginated
      });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /books/:id - Retrieve a particular book using its ID
// ----------------------------------------------------------------------------
app.get('/books/:id', async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    if (!useFallback && pool) {
      const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Book not found' });
      }
      return res.status(200).json({
        message: 'Book retrieved successfully',
        data: rows[0]
      });
    } else {
      const book = memoryBooks.find(b => b.id === bookId);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
      return res.status(200).json({
        message: 'Book retrieved successfully',
        data: book
      });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// POST /books - Create a new book with input validation
// ----------------------------------------------------------------------------
app.post('/books', async (req, res, next) => {
  try {
    const { title, author, price } = req.body || {};

    // 1. Validate Title
    if (title === undefined || title === null || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    // 2. Validate Author
    if (author === undefined || author === null || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({ message: 'Author is required' });
    }

    // 3. Validate Price
    if (price === undefined || price === null || price === '' || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Price is required and must be numeric' });
    }

    const numPrice = Number(price);
    if (numPrice < 0) {
      return res.status(400).json({ message: 'Price must not be negative' });
    }

    if (!useFallback && pool) {
      const insertSql = 'INSERT INTO books (title, author, price) VALUES (?, ?, ?)';
      const [result] = await pool.query(insertSql, [title.trim(), author.trim(), numPrice]);

      return res.status(201).json({
        message: 'Book created successfully',
        data: {
          id: result.insertId,
          title: title.trim(),
          author: author.trim(),
          price: numPrice
        }
      });
    } else {
      const newBook = {
        id: nextId++,
        title: title.trim(),
        author: author.trim(),
        price: numPrice,
        created_at: new Date()
      };
      memoryBooks.push(newBook);

      return res.status(201).json({
        message: 'Book created successfully',
        data: newBook
      });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// PUT /books/:id - Update an existing book
// ----------------------------------------------------------------------------
app.put('/books/:id', async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const { title, author, price } = req.body || {};

    if (!useFallback && pool) {
      const [existing] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Book not found' });
      }

      let updatedTitle = existing[0].title;
      let updatedAuthor = existing[0].author;
      let updatedPrice = existing[0].price;

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({ message: 'Title cannot be empty' });
        }
        updatedTitle = title.trim();
      }

      if (author !== undefined) {
        if (typeof author !== 'string' || author.trim() === '') {
          return res.status(400).json({ message: 'Author cannot be empty' });
        }
        updatedAuthor = author.trim();
      }

      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ message: 'Price must be a non-negative number' });
        }
        updatedPrice = parsedPrice;
      }

      const updateSql = 'UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?';
      await pool.query(updateSql, [updatedTitle, updatedAuthor, updatedPrice, bookId]);

      return res.status(200).json({
        message: 'Book updated successfully',
        data: {
          id: bookId,
          title: updatedTitle,
          author: updatedAuthor,
          price: updatedPrice
        }
      });
    } else {
      const bookIndex = memoryBooks.findIndex(b => b.id === bookId);
      if (bookIndex === -1) {
        return res.status(404).json({ message: 'Book not found' });
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({ message: 'Title cannot be empty' });
        }
        memoryBooks[bookIndex].title = title.trim();
      }

      if (author !== undefined) {
        if (typeof author !== 'string' || author.trim() === '') {
          return res.status(400).json({ message: 'Author cannot be empty' });
        }
        memoryBooks[bookIndex].author = author.trim();
      }

      if (price !== undefined) {
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ message: 'Price must be a non-negative number' });
        }
        memoryBooks[bookIndex].price = parsedPrice;
      }

      return res.status(200).json({
        message: 'Book updated successfully',
        data: memoryBooks[bookIndex]
      });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// DELETE /books/:id - Delete an existing book
// ----------------------------------------------------------------------------
app.delete('/books/:id', async (req, res, next) => {
  try {
    const bookId = Number(req.params.id);
    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    if (!useFallback && pool) {
      const [existing] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Book not found' });
      }

      await pool.query('DELETE FROM books WHERE id = ?', [bookId]);
      return res.status(200).json({ message: 'Book deleted successfully' });
    } else {
      const bookIndex = memoryBooks.findIndex(b => b.id === bookId);
      if (bookIndex === -1) {
        return res.status(404).json({ message: 'Book not found' });
      }

      memoryBooks.splice(bookIndex, 1);
      return res.status(200).json({ message: 'Book deleted successfully' });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 3. 404 & ERROR HANDLING MIDDLEWARE
// ----------------------------------------------------------------------------

// Catch-all handler for unknown endpoints (404)
app.use((req, res) => {
  res.status(404).json({ message: '404 - Endpoint Not Found' });
});

// Centralized error handler (500)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ----------------------------------------------------------------------------
// 4. SERVER STARTUP & EXPORT
// ----------------------------------------------------------------------------
// Fixes debugging problem: EADDRINUSE port conflict by using dynamic PORT
if (require.main === module) {
  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Lab 3 Books REST API server running on port ${PORT}`);
      console.log(`Local URL : http://localhost:${PORT}/`);
      console.log(`Endpoints : http://localhost:${PORT}/books`);
      console.log(`====================================================`);
    });
  });
}

module.exports = { app, initializeDatabase };
