import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(express.json());

let db;

const sendError = (res, status, message) =>
  res.status(status).json({ message });

const allowedOrderBy = new Set(["id", "title", "author", "price", "pages"]);

function parseNonNegativeNumber(value, fieldName) {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number) || number < 0) {
    return { error: `${fieldName} must be a non-negative number` };
  }
  return { value: number };
}

function parsePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return { value: number };
}

// Health/root route for local checks and Render health checks.
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Lab 3 Books REST API is running",
    endpoints: {
      listBooks: "GET /books",
      getBook: "GET /books/:bookId",
      createBook: "POST /books",
      updateBook: "PUT /books/:bookId",
      deleteBook: "DELETE /books/:bookId"
    }
  });
});

// GET /books?search_q=atomic&order_by=price&order=DESC&limit=10&offset=0&min_price=100&max_price=500
app.get("/books", async (req, res) => {
  try {
    const searchQ = String(req.query.search_q ?? "").trim();
    const orderBy = String(req.query.order_by ?? "id").toLowerCase();
    const order = String(req.query.order ?? "ASC").toUpperCase();

    if (!allowedOrderBy.has(orderBy)) {
      return sendError(res, 400, "order_by must be id, title, author, price, or pages");
    }
    if (!["ASC", "DESC"].includes(order)) {
      return sendError(res, 400, "order must be ASC or DESC");
    }

    const limitResult = parsePositiveInteger(req.query.limit ?? "10", "limit");
    if (limitResult.error || limitResult.value > 100) {
      return sendError(res, 400, "limit must be an integer from 1 to 100");
    }

    const offset = Number(req.query.offset ?? 0);
    if (!Number.isInteger(offset) || offset < 0) {
      return sendError(res, 400, "offset must be a non-negative integer");
    }

    let minPrice;
    let maxPrice;

    if (req.query.min_price !== undefined) {
      const parsed = parseNonNegativeNumber(req.query.min_price, "min_price");
      if (parsed.error) return sendError(res, 400, parsed.error);
      minPrice = parsed.value;
    }

    if (req.query.max_price !== undefined) {
      const parsed = parseNonNegativeNumber(req.query.max_price, "max_price");
      if (parsed.error) return sendError(res, 400, parsed.error);
      maxPrice = parsed.value;
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return sendError(res, 400, "min_price cannot be greater than max_price");
    }

    let sql = "SELECT id, title, author, price, pages FROM book WHERE 1 = 1";
    const params = [];

    if (searchQ) {
      sql += " AND title LIKE ?";
      params.push(`%${searchQ}%`);
    }
    if (minPrice !== undefined) {
      sql += " AND price >= ?";
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += " AND price <= ?";
      params.push(maxPrice);
    }

    // Column name and sort direction are allow-listed above.
    sql += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limitResult.value, offset);

    const books = await db.all(sql, params);
    return res.status(200).json({ data: books, count: books.length });
  } catch (error) {
    console.error("GET /books failed:", error);
    return sendError(res, 500, "Failed to fetch books");
  }
});

// GET /books/:bookId
app.get("/books/:bookId", async (req, res) => {
  try {
    const idResult = parsePositiveInteger(req.params.bookId, "bookId");
    if (idResult.error) return sendError(res, 400, idResult.error);

    const book = await db.get(
      "SELECT id, title, author, price, pages FROM book WHERE id = ?",
      [idResult.value]
    );
    if (!book) return sendError(res, 404, "Book not found");

    return res.status(200).json({ data: book });
  } catch (error) {
    console.error("GET /books/:bookId failed:", error);
    return sendError(res, 500, "Failed to fetch book");
  }
});

// POST /books
app.post("/books", async (req, res) => {
  try {
    const { title, author, price, pages } = req.body ?? {};

    if (typeof title !== "string" || !title.trim()) {
      return sendError(res, 400, "title is required and must be a non-empty string");
    }
    if (typeof author !== "string" || !author.trim()) {
      return sendError(res, 400, "author is required and must be a non-empty string");
    }
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return sendError(res, 400, "price is required and must be a non-negative number");
    }
    if (!Number.isInteger(pages) || pages <= 0) {
      return sendError(res, 400, "pages is required and must be a positive integer");
    }

    const result = await db.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
      [title.trim(), author.trim(), price, pages]
    );

    const created = await db.get(
      "SELECT id, title, author, price, pages FROM book WHERE id = ?",
      [result.lastID]
    );
    return res.status(201).json({
      message: "Book created successfully",
      data: created
    });
  } catch (error) {
    console.error("POST /books failed:", error);
    return sendError(res, 500, "Failed to create book");
  }
});

// PUT /books/:bookId
app.put("/books/:bookId", async (req, res) => {
  try {
    const idResult = parsePositiveInteger(req.params.bookId, "bookId");
    if (idResult.error) return sendError(res, 400, idResult.error);

    const { title, author, price, pages } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
      return sendError(res, 400, "title is required and must be a non-empty string");
    }
    if (typeof author !== "string" || !author.trim()) {
      return sendError(res, 400, "author is required and must be a non-empty string");
    }
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return sendError(res, 400, "price is required and must be a non-negative number");
    }
    if (!Number.isInteger(pages) || pages <= 0) {
      return sendError(res, 400, "pages is required and must be a positive integer");
    }

    const result = await db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
      [title.trim(), author.trim(), price, pages, idResult.value]
    );

    if (result.changes === 0) return sendError(res, 404, "Book not found");

    const updated = await db.get(
      "SELECT id, title, author, price, pages FROM book WHERE id = ?",
      [idResult.value]
    );
    return res.status(200).json({
      message: "Book updated successfully",
      data: updated
    });
  } catch (error) {
    console.error("PUT /books/:bookId failed:", error);
    return sendError(res, 500, "Failed to update book");
  }
});

// DELETE /books/:bookId
app.delete("/books/:bookId", async (req, res) => {
  try {
    const idResult = parsePositiveInteger(req.params.bookId, "bookId");
    if (idResult.error) return sendError(res, 400, idResult.error);

    const result = await db.run(
      "DELETE FROM book WHERE id = ?",
      [idResult.value]
    );
    if (result.changes === 0) return sendError(res, 404, "Book not found");

    return res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("DELETE /books/:bookId failed:", error);
    return sendError(res, 500, "Failed to delete book");
  }
});

// Invalid JSON request body -> consistent JSON error.
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return sendError(res, 400, "Invalid JSON request body");
  }
  console.error("Unexpected server error:", error);
  return sendError(res, 500, "Internal server error");
});

async function initializeDBAndServer() {
  try {
    // For Render, set DB_PATH=/var/data/books.db only if a persistent disk
    // is attached and mounted at /var/data. Locally, this uses ./books.db.
    const databasePath = process.env.DB_PATH || "./books.db";

    db = await open({
      filename: databasePath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      )
    `);

    // Seed demo data only when the table is empty.
    const row = await db.get("SELECT COUNT(*) AS count FROM book");
    if (row.count === 0) {
      const books = [
        ["The Alchemist", "Paulo Coelho", 250, 208],
        ["Wings of Fire", "A. P. J. Abdul Kalam", 300, 180],
        ["Atomic Habits", "James Clear", 450, 320],
        ["The Hobbit", "J. R. R. Tolkien", 350, 310],
        ["1984", "George Orwell", 200, 328],
        ["Clean Code", "Robert C. Martin", 600, 464],
        ["The Great Gatsby", "F. Scott Fitzgerald", 220, 180],
        ["Rich Dad Poor Dad", "Robert Kiyosaki", 280, 336],
        ["Think and Grow Rich", "Napoleon Hill", 240, 250],
        ["Ikigai", "Hector Garcia", 260, 194]
      ];

      const insertBook = await db.prepare(
        "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)"
      );
      try {
        for (const book of books) await insertBook.run(book);
      } finally {
        await insertBook.finalize();
      }
    }

    const port = Number(process.env.PORT || 3000);
    app.listen(port, "0.0.0.0", () => {
      console.log(`Books API running on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to initialize database and server:", error);
    process.exit(1);
  }
}

initializeDBAndServer();
