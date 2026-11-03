# Lab 3: REST API, query parameters, validation, debugging

## Student Details

- **Name:** Sukumar
- **Registration Number:** 252U1R7059
- **Section:** CSE FSD 309 2B

---

## Live Link

Deployment pending.

---

## Project Description

This project implements a complete, production-ready REST API for managing a bookstore inventory using **Node.js**, **Express**, and **SQLite3**. It supports advanced query parameters including partial title search (`search_q`), whitelisted column sorting (`order_by`, `order`), safe pagination (`limit`, `offset`), and price-range filtering (`min_price`, `max_price`). The API incorporates strict input validation, consistent JSON error responses, standard HTTP status codes, and parameterized SQL queries to prevent SQL injection vulnerabilities.

---

## Technologies Used

- **Node.js** (v24.x) — JavaScript runtime environment
- **Express.js** (v5.x) — Web framework for routing and middleware
- **SQLite3** — Embedded, self-contained SQL database engine

---

## Installation and Setup

1. Navigate to the `lab-03` directory:
   ```bash
   cd lab-03
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000/` (or the port specified by `process.env.PORT`).

4. Run the automated test suite:
   ```bash
   npm test
   ```

---

## API Endpoints

| HTTP Method | Endpoint | Description | Query Parameters / Body |
|---|---|---|---|
| `GET` | `/` | API overview and available routes | None |
| `GET` | `/books` | Retrieve books with filtering, sorting, and pagination | `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` |
| `GET` | `/books/:id` | Retrieve a single book by ID | URL parameter: `id` |
| `POST` | `/books` | Create a new book | JSON body: `{ "title", "author", "price" }` |
| `PUT` | `/books/:id` | Update an existing book | URL param: `id`, JSON body: optional fields to update |
| `DELETE` | `/books/:id` | Delete a book by ID | URL parameter: `id` |

### Query Parameters for `GET /books`

| Parameter | Type | Default | Description | Example |
|---|---|---|---|---|
| `search_q` | String | `""` | Case-insensitive partial match on book title | `/books?search_q=java` |
| `order_by` | String | `id` | Whitelisted column (`id`, `title`, `author`, `price`) | `/books?order_by=price` |
| `order` | String | `ASC` | Sort direction (`ASC` or `DESC`) | `/books?order=DESC` |
| `limit` | Integer | `10` | Number of records to return (capped at 100) | `/books?limit=5` |
| `offset` | Integer | `0` | Number of records to skip from beginning | `/books?offset=0` |
| `min_price` | Number | None | Minimum book price filter (`price >= min_price`) | `/books?min_price=100` |
| `max_price` | Number | None | Maximum book price filter (`price <= max_price`) | `/books?max_price=500` |

---

## Validation & Status Codes

| Situation | HTTP Status Code | Response Type / Message |
|---|:---:|---|
| Successful data retrieval | `200 OK` | JSON array or object |
| Successful update | `200 OK` | `{"message": "Book updated successfully", "book": ...}` |
| Successful deletion | `200 OK` | `{"message": "Book deleted successfully"}` |
| Successful creation | `201 Created` | `{"message": "Book created successfully", "book": ...}` |
| Missing or invalid field in body | `400 Bad Request` | `{"message": "Title is required"}` / `{"message": "..."}` |
| Invalid query parameter | `400 Bad Request` | `{"message": "Invalid order_by column..."}` |
| Book ID not found | `404 Not Found` | `{"message": "Book not found"}` |
| Unknown endpoint | `404 Not Found` | `{"message": "404 - Endpoint Not Found"}` |
| Internal server error | `500 Internal Server Error` | `{"message": "Database error"}` |

---

## Postman Testing Checklist

| Test Case | Method | Endpoint / Condition | Expected Status |
|---|:---:|---|:---:|
| Retrieve all books | `GET` | `/books` | `200 OK` |
| Search books by title | `GET` | `/books?search_q=java` | `200 OK` |
| Sort books by price ascending | `GET` | `/books?order_by=price&order=ASC` | `200 OK` |
| Sort books by price descending | `GET` | `/books?order_by=price&order=DESC` | `200 OK` |
| Paginate books (limit & offset) | `GET` | `/books?limit=5&offset=0` | `200 OK` |
| Filter by minimum price | `GET` | `/books?min_price=500` | `200 OK` |
| Filter by maximum price | `GET` | `/books?max_price=400` | `200 OK` |
| Filter by price range | `GET` | `/books?min_price=100&max_price=500` | `200 OK` |
| Combined search, sort, filter & page | `GET` | `/books?search_q=java&min_price=100&max_price=600&order_by=price&order=ASC&limit=5&offset=0` | `200 OK` |
| Retrieve specific book by ID | `GET` | `/books/1` | `200 OK` |
| Retrieve nonexistent book ID | `GET` | `/books/999999` | `404 Not Found` |
| Create valid book | `POST` | `/books` with `{ "title": "Learning Node.js", "author": "Rahul Sharma", "price": 350 }` | `201 Created` |
| Reject missing title | `POST` | `/books` without `title` | `400 Bad Request` |
| Reject empty title | `POST` | `/books` with `title: "   "` | `400 Bad Request` |
| Reject missing author | `POST` | `/books` without `author` | `400 Bad Request` |
| Reject missing price | `POST` | `/books` without `price` | `400 Bad Request` |
| Reject non-numeric price | `POST` | `/books` with `price: "abc"` | `400 Bad Request` |
| Reject negative price | `POST` | `/books` with `price: -20` | `400 Bad Request` |
| Update existing book | `PUT` | `/books/1` with `{ "price": 399 }` | `200 OK` |
| Update missing book ID | `PUT` | `/books/999999` | `404 Not Found` |
| Update with invalid price | `PUT` | `/books/1` with `{ "price": -5 }` | `400 Bad Request` |
| Delete existing book | `DELETE` | `/books/1` | `200 OK` |
| Delete missing book ID | `DELETE` | `/books/999999` | `404 Not Found` |
| Reject invalid sort column | `GET` | `/books?order_by=hack_column` | `400 Bad Request` |
| Reject invalid sort direction | `GET` | `/books?order=UPWARDS` | `400 Bad Request` |
| Reject min_price > max_price | `GET` | `/books?min_price=500&max_price=200` | `400 Bad Request` |
| Reject negative limit | `GET` | `/books?limit=-5` | `400 Bad Request` |
| Unknown endpoint | `GET` | `/random-path` | `404 Not Found` |

---

## Screenshots

Screenshots will be added after the API has been tested.

---

## Debugging Notes

1. **Port Collision Prevention (`EADDRINUSE`):**  
   Configured the server port dynamically with `process.env.PORT || 3000` so that it seamlessly adapts to port allocations on local environments as well as cloud deployment platforms like Render.
2. **Defensive Body Destructuring:**  
   During automated testing, handled unparsed or missing request bodies gracefully using `const { title, author, price } = req.body || {}` to prevent runtime `TypeError` when destructuring undefined values.
3. **SQL Injection Vulnerability Mitigation:**  
   User-supplied values for searching (`LIKE ?`), price boundaries (`BETWEEN ? AND ?`, `>= ?`, `<= ?`), and pagination (`LIMIT ? OFFSET ?`) are strictly passed through parameterized placeholders. Sort columns (`order_by`) and sort directions (`order`) are validated against strict whitelists before injection into query strings.
4. **Data Type and Edge Case Sanitization:**  
   Validated numerical ranges to catch edge cases where `min_price > max_price`, negative limits or offsets, and blank/whitespace-only string titles or authors before they touch the database layer.

---

## Render Deployment

To deploy this service on Render:

1. **Create a new Web Service** on [Render](https://render.com/).
2. Connect your GitHub repository: `https://github.com/chinnalasukumar123-spec/collage-labs`.
3. Set the following build configuration:
   - **Root Directory:** `lab-03`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. The service will automatically bind to `process.env.PORT` provided by Render.
