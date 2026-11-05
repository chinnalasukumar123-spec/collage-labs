# Lab 3: REST API, Query Parameters, Validation, Debugging

## Student Details

- **Student Name:** CHINNALA SUKUMAR
- **Registration Number:** 252U1R7059
- **Class & Section:** CSE FSD-309
- **Study Level:** UG (Year II & Term II)
- **Subject:** Backend Development Fundamentals
- **Lab Number:** 03

---

## 1. Project Title
**Lab 3: REST API, Query Parameters, Validation, Debugging**

---

## 2. Project Objective
Convert previous routes into a complete, clean REST API using **Node.js**, **Express.js**, and **MySQL**.

The API supports:
- Full Book CRUD management (`GET`, `POST`, `PUT`, `DELETE`).
- Partial title searching using SQL `LIKE`.
- Whitelisted column sorting (`ASC` / `DESC`).
- Safe numerical pagination (`limit` & `offset`).
- Price range filtering (`min_price` & `max_price`).
- Strict request body validation (`title`, `author`, `price`).
- Standard HTTP status codes (`200`, `201`, `400`, `404`, `500`).
- Consistent JSON response structures.
- Solutions for common backend debugging problems.

---

## 3. Technology Stack
- **Node.js** (v24.x) — JavaScript runtime
- **Express.js** (v4.x) — Web framework for HTTP routing
- **MySQL & mysql2** — Relational database management with promise-based connection pooling
- **dotenv** — Environment configuration manager
- **cors** — Cross-Origin Resource Sharing middleware
- **Postman** — API testing and documentation tool

---

## 4. Project Folder Structure

```text
lab-03/
├── database/
│   └── schema.sql           # Database creation & 10 sample books seed script
├── screenshots/             # Route verification screenshots
│   └── .gitkeep
├── .env.example             # Template for environment variables
├── .gitignore               # Excludes node_modules, .env, and local database files
├── package.json             # Project metadata, scripts, and dependencies
├── package-lock.json        # Pinned dependency tree
├── server.js                # Complete single-file Express REST API & MySQL connector
├── test.js                  # Automated 24-point test suite
└── README.md                # Comprehensive lab documentation
```

---

## 5. Database Setup Instructions

1. **Log in to MySQL:**
   ```bash
   mysql -u root -p
   ```

2. **Run the schema script:**
   ```bash
   source database/schema.sql;
   ```
   *(Or import via phpMyAdmin / MySQL Workbench).*

3. The script creates the `library_db` database, the `books` table, and seeds 10 realistic sample books:
   ```sql
   CREATE DATABASE IF NOT EXISTS library_db;
   USE library_db;

   CREATE TABLE IF NOT EXISTS books (
     id INT AUTO_INCREMENT PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     author VARCHAR(255) NOT NULL,
     price DECIMAL(10, 2) NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## 6. Installation & How to Run

1. **Navigate to `lab-03` directory:**
   ```bash
   cd lab-03
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your local database credentials:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=library_db
   DB_PORT=3306
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   Server will run at: `http://localhost:3000/`

5. **Run automated test suite:**
   ```bash
   npm test
   ```

---

## 7. API Endpoints Table

| HTTP Method | Endpoint | Description | Query Parameters / Body |
|---|---|---|---|
| `GET` | `/` | API Overview & student metadata | None |
| `GET` | `/books` | Retrieve books with search, sort, filter, pagination | `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` |
| `GET` | `/books/:id` | Retrieve single book by ID | URL parameter: `id` |
| `POST` | `/books` | Create new book | JSON body: `{ "title", "author", "price" }` |
| `PUT` | `/books/:id` | Update an existing book | URL param: `id`, JSON body: `{ "title", "author", "price" }` |
| `DELETE` | `/books/:id` | Delete a book by ID | URL parameter: `id` |

### Query Parameters for `GET /books`
- **`search_q`**: Partial title search using SQL `LIKE ?` (e.g. `?search_q=java`).
- **`order_by`**: Allowed sorting columns: `id`, `title`, `author`, `price`, `created_at` (default: `id`).
- **`order`**: Sort order: `ASC` or `DESC` (default: `ASC`).
- **`limit`**: Positive integer for page size (default: `10`, maximum: `100`).
- **`offset`**: Non-negative integer for record offset (default: `0`).
- **`min_price`**: Minimum price filter (e.g. `?min_price=100`).
- **`max_price`**: Maximum price filter (e.g. `?max_price=500`).

---

## 8. Validation and HTTP Status Codes

| Situation | HTTP Status | Response Format |
|---|:---:|---|
| Successful data retrieval (`GET`) | `200 OK` | `{"message": "...", "data": [...]}` |
| Successful update (`PUT`) | `200 OK` | `{"message": "Book updated successfully", "data": {...}}` |
| Successful deletion (`DELETE`) | `200 OK` | `{"message": "Book deleted successfully"}` |
| Successful creation (`POST`) | `201 Created` | `{"message": "Book created successfully", "data": {...}}` |
| Missing / invalid fields in request | `400 Bad Request` | `{"message": "Title is required"}` |
| Invalid query parameter (sort / price / pagination) | `400 Bad Request` | `{"message": "Invalid order_by column..."}` |
| Book ID not found | `404 Not Found` | `{"message": "Book not found"}` |
| Unknown route | `404 Not Found` | `{"message": "404 - Endpoint Not Found"}` |
| Server error | `500 Internal Server Error`| `{"message": "Internal Server Error"}` |

---

## 9. Postman Testing Guide

| # | Test Case | Method | URL / Parameters | Body (JSON) | Expected Status |
|---|---|:---:|---|---|:---:|
| 1 | GET all books | `GET` | `http://localhost:3000/books` | None | `200 OK` |
| 2 | Search books by title | `GET` | `http://localhost:3000/books?search_q=java` | None | `200 OK` |
| 3 | Sort by price ascending | `GET` | `http://localhost:3000/books?order_by=price&order=ASC` | None | `200 OK` |
| 4 | Sort by price descending | `GET` | `http://localhost:3000/books?order_by=price&order=DESC` | None | `200 OK` |
| 5 | Pagination | `GET` | `http://localhost:3000/books?limit=5&offset=0` | None | `200 OK` |
| 6 | Price range filtering | `GET` | `http://localhost:3000/books?min_price=100&max_price=500` | None | `200 OK` |
| 7 | Combined query | `GET` | `http://localhost:3000/books?search_q=java&min_price=100&max_price=600&order_by=price&order=ASC&limit=5&offset=0` | None | `200 OK` |
| 8 | GET book by valid ID | `GET` | `http://localhost:3000/books/1` | None | `200 OK` |
| 9 | GET book by invalid ID | `GET` | `http://localhost:3000/books/999999` | None | `404 Not Found` |
| 10 | POST valid book | `POST` | `http://localhost:3000/books` | `{"title": "Learning Node.js", "author": "Rahul Sharma", "price": 350}` | `201 Created` |
| 11 | POST without title | `POST` | `http://localhost:3000/books` | `{"author": "Rahul Sharma", "price": 350}` | `400 Bad Request` |
| 12 | POST without author | `POST` | `http://localhost:3000/books` | `{"title": "Learning Node.js", "price": 350}` | `400 Bad Request` |
| 13 | POST non-numeric price | `POST` | `http://localhost:3000/books` | `{"title": "Learning Node.js", "author": "Rahul Sharma", "price": "invalid"}` | `400 Bad Request` |
| 14 | PUT existing book | `PUT` | `http://localhost:3000/books/1` | `{"price": 450.00}` | `200 OK` |
| 15 | PUT nonexistent book | `PUT` | `http://localhost:3000/books/999999` | `{"title": "Updated"}` | `404 Not Found` |
| 16 | DELETE existing book | `DELETE`| `http://localhost:3000/books/1` | None | `200 OK` |
| 17 | DELETE nonexistent book | `DELETE`| `http://localhost:3000/books/999999` | None | `404 Not Found` |

---

## 10. Debugging Requirements & Solutions

### 1. `EADDRINUSE` — Port Already in Use
- **Problem:** Attempting to start the Express server on a port that is already occupied by another running instance.
- **Solution:** Configured dynamic port binding via `const PORT = process.env.PORT || 3000;`, enabling flexible port overrides through `.env` or cloud environments without code modification.

### 2. Wrong Import Path — Module Not Found
- **Problem:** Incorrect relative import statements (e.g. `require('./controller/bookController')` when directory is named differently) leading to `MODULE_NOT_FOUND`.
- **Solution:** Consolidating cleanly and verifying verified package dependencies (`mysql2/promise`, `dotenv`, `cors`, `express`).

### 3. Table-Name Typo — No Such Table Error
- **Problem:** Querying misspelled table names (e.g. `book` instead of `books`) throws SQL errors.
- **Solution:** Standardized table name `books` across the entire application and `schema.sql`, and used `CREATE TABLE IF NOT EXISTS books` during auto-initialization.

### 4. Missing `await` — Unhandled Asynchronous Operations
- **Problem:** Executing database calls without `await` causes Express to respond before the database returns results, yielding empty promises or unhandled promise rejections.
- **Solution:** Implemented `async/await` on every pool query (`const [rows] = await pool.query(...)`) inside `try...catch` blocks with `next(err)`.

---

## 11. Screenshots Section

Screenshots will be placed in [`screenshots/`](screenshots/) after testing:

- **1. Server Running:** `screenshots/server-running.png`
- **2. GET All Books:** `screenshots/get-books.png`
- **3. Search Functionality:** `screenshots/search-books.png`
- **4. Sorting Functionality:** `screenshots/sort-books.png`
- **5. Pagination:** `screenshots/pagination.png`
- **6. Price Range Filtering:** `screenshots/filter-books.png`
- **7. POST Successful Request:** `screenshots/create-book.png`
- **8. POST Validation Error:** `screenshots/validation-error.png`
- **9. PUT Successful Request:** `screenshots/update-book.png`
- **10. DELETE Successful Request:** `screenshots/delete-book.png`
- **11. 404 Error Response:** `screenshots/404.png`
- **12. MySQL Database Records:** `screenshots/database-records.png`

---

## 12. Deployment (Render)

1. Push this project to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a **New Web Service**.
3. Set:
   - **Root Directory:** `lab-03`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Configure Environment Variables on Render (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
5. Render will automatically assign a live URL.

- **Live URL:** Deployment pending.
