# Lab 3: REST API, Query Parameters, Validation and Debugging

**Project:** Books API  
**Stack:** Node.js, Express.js, SQLite (`sqlite` + `sqlite3`)

## What changed from Lab 2?

This project preserves the Lab 2 SQLite table name `book` and columns `id`, `title`, `author`, `price`, and `pages`. It extends the existing CRUD API with query parameters, input validation, and consistent JSON error messages.

## Run locally

1. Open a terminal in the project root.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the API:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000/` or test using Postman.

The project uses ES modules (`"type": "module"` in `package.json`). Do not replace `import` with `require` unless you also change the package type.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Health/info response |
| GET | `/books` | List/search/filter/sort/page books |
| GET | `/books/:bookId` | Read one book |
| POST | `/books` | Create a book |
| PUT | `/books/:bookId` | Update a book |
| DELETE | `/books/:bookId` | Delete a book |

### GET /books query parameters

- `search_q`: partial match on title, e.g. `?search_q=atomic`
- `order_by`: `id`, `title`, `author`, `price`, or `pages`; default `id`
- `order`: `ASC` or `DESC`; default `ASC`
- `limit`: page size from 1 to 100; default `10`
- `offset`: number of rows to skip; default `0`
- `min_price`: optional minimum price
- `max_price`: optional maximum price

Examples:

```text
GET /books?search_q=atomic
GET /books?order_by=price&order=DESC
GET /books?limit=5&offset=0
GET /books?min_price=200&max_price=400
GET /books?search_q=the&order_by=title&order=ASC&limit=5&offset=0
```

The column name and sort direction are allow-listed. User-provided values are passed through parameterized SQL placeholders.

## POST /books example

Set Postman to **Body → raw → JSON**:

```json
{
  "title": "Database Fundamentals",
  "author": "John Smith",
  "price": 400,
  "pages": 300
}
```

`title` and `author` must be non-empty strings, `price` must be a non-negative JSON number, and `pages` must be a positive integer because the existing Lab 2 schema requires it.

## Status codes

- `200 OK`: successful read, update, or delete
- `201 Created`: book created
- `400 Bad Request`: invalid ID, invalid query parameter, invalid JSON, or invalid request body
- `404 Not Found`: requested book does not exist
- `500 Internal Server Error`: unexpected server/database error

Error responses use the same shape, for example:

```json
{
  "message": "Book not found"
}
```

## Postman test checklist

Use `http://localhost:3000` locally. Run tests in this order where relevant.

| Test | Request | Expected |
|---|---|---|
| Health | `GET /` | 200 |
| List | `GET /books` | 200 |
| Search | `GET /books?search_q=atomic` | 200; matching titles |
| Sort | `GET /books?order_by=price&order=DESC` | 200; descending prices |
| Pagination | `GET /books?limit=5&offset=0` | 200; at most 5 rows |
| Price range | `GET /books?min_price=200&max_price=400` | 200; prices in range |
| Bad sort column | `GET /books?order_by=password` | 400 |
| Bad sort direction | `GET /books?order=SIDEWAYS` | 400 |
| Bad limit | `GET /books?limit=-1` | 400 |
| Create | `POST /books` with valid JSON | 201 |
| Missing title | `POST /books` without `title` | 400 |
| Invalid price | `POST /books` with `"price":"abc"` | 400 |
| Read missing ID | `GET /books/999999` | 404 if ID absent |
| Update existing ID | `PUT /books/1` with valid JSON | 200 if ID exists |
| Update missing ID | `PUT /books/999999` with valid JSON | 404 if ID absent |
| Delete existing ID | `DELETE /books/1` | 200 if ID exists |
| Delete missing ID | `DELETE /books/999999` | 404 if ID absent |

Use a disposable ID for delete tests if you want to preserve seeded demo data. Capture actual Postman response screenshots for your submission.

## Push changes to the existing GitHub repository

First make a backup or commit any work you do not want to lose. In the existing local Lab 2 repository folder:

```bash
git status
git pull --rebase origin main
```

Replace the existing `app.js` with the updated version, then run:

```bash
npm install
npm start
```

Test locally. If it works, run:

```bash
git add app.js README.md package-lock.json
git commit -m "Complete Lab 3 REST API validation and query parameters"
git push origin main
```

Do not add `node_modules/` or `.env` to Git.

## Deploy to Render

1. Push the working code to GitHub.
2. Sign in to Render and choose **New → Web Service**.
3. Connect `chinnalasukumar123-spec/collage-labs` and select branch `main`.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Deploy, then open the Render URL and test `/`, `/books`, and query parameters.
7. After each push to the connected branch, Render can automatically redeploy the service.

### SQLite deployment warning

Render's default filesystem is ephemeral. Without persistent storage, SQLite changes can be lost when the service restarts or redeploys. The app supports `DB_PATH=/var/data/books.db` if a disk is mounted at `/var/data`, but Render's documented persistent disks require a paid web service. For a no-cost demo, treat the database as temporary; for durable hosted data, consider a managed database such as Render Postgres and update the app's database driver accordingly.

## Debugging notes

- `EADDRINUSE`: another process is using the port; stop it or configure a different `PORT`.
- Wrong import path: check file names and relative paths.
- `no such table`: confirm the table is named `book`, not `books`.
- Missing `await`: await database calls before using returned rows or sending a response.
