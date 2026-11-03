// Lab 3: SQLite Database Configuration and Initialization
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'books.db');

// Connect to SQLite database file
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', DB_PATH);
  }
});

// Initialize the schema and seed initial data if table is empty
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating books table:', err.message);
      return;
    }

    // Check if table has books; if not, seed with sample records
    db.get('SELECT COUNT(*) AS count FROM books', (countErr, row) => {
      if (countErr) {
        console.error('Error checking row count:', countErr.message);
        return;
      }

      if (row.count === 0) {
        console.log('Seeding initial sample books into database...');
        const stmt = db.prepare('INSERT INTO books (title, author, price) VALUES (?, ?, ?)');
        const sampleBooks = [
          ['Learning Node.js', 'Rahul Sharma', 350.0],
          ['Java: The Complete Reference', 'Herbert Schildt', 650.0],
          ['Effective Java', 'Joshua Bloch', 550.0],
          ['JavaScript: The Good Parts', 'Douglas Crockford', 400.0],
          ['Clean Code', 'Robert C. Martin', 700.0],
          ['Core Java for the Impatient', 'Cay S. Horstmann', 480.0],
          ['Python Crash Course', 'Eric Matthes', 320.0],
          ['Design Patterns', 'Erich Gamma', 850.0],
          ['HTML and CSS: Design and Build Websites', 'Jon Duckett', 280.0],
          ['Database System Concepts', 'Abraham Silberschatz', 950.0]
        ];

        sampleBooks.forEach(([title, author, price]) => {
          stmt.run(title, author, price);
        });
        stmt.finalize();
        console.log('Sample books seeded successfully.');
      }
    });
  });
});

module.exports = db;
