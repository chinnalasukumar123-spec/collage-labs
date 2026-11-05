// Comprehensive test suite for Lab 3 REST API
const { app, initializeDatabase } = require('./server');
const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage();
    req.method = method;
    req.url = path;
    req.headers = {
      'content-type': 'application/json'
    };

    if (body) {
      req.body = body;
    }

    const res = new http.ServerResponse(req);
    let responseBody = '';

    res.write = (chunk) => {
      if (chunk) responseBody += chunk;
      return true;
    };

    res.end = (chunk) => {
      if (chunk) responseBody += chunk;
      let parsed;
      try {
        parsed = JSON.parse(responseBody);
      } catch (e) {
        parsed = responseBody;
      }
      resolve({ status: res.statusCode, data: parsed });
    };

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('--- Starting Lab 3 REST API Tests ---\n');
  await initializeDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} - ${details}`);
      failed++;
    }
  }

  // 1. Root route
  const rRoot = await request('GET', '/');
  assert(rRoot.status === 200 && rRoot.data?.student?.name === 'CHINNALA SUKUMAR',
    'GET / returns 200 with student details');

  // 2. GET /books
  const r1 = await request('GET', '/books');
  assert(r1.status === 200 && Array.isArray(r1.data?.data) && r1.data.data.length > 0,
    'GET /books returns 200 and list of books', `Count: ${r1.data?.data?.length}`);

  // 3. Search books: GET /books?search_q=java
  const r2 = await request('GET', '/books?search_q=java');
  const allMatchJava = r2.data?.data?.every(b => b.title.toLowerCase().includes('java'));
  assert(r2.status === 200 && r2.data?.data?.length > 0 && allMatchJava,
    'GET /books?search_q=java returns 200 with partial title match', `Found: ${r2.data?.data?.length}`);

  // 4. Sort books ASC: GET /books?order_by=price&order=ASC
  const r3 = await request('GET', '/books?order_by=price&order=ASC');
  let isAsc = true;
  const listAsc = r3.data?.data || [];
  for (let i = 1; i < listAsc.length; i++) {
    if (listAsc[i].price < listAsc[i - 1].price) isAsc = false;
  }
  assert(r3.status === 200 && isAsc,
    'GET /books?order_by=price&order=ASC sorts ascending by price');

  // 5. Sort books DESC: GET /books?order_by=price&order=DESC
  const r4 = await request('GET', '/books?order_by=price&order=DESC');
  let isDesc = true;
  const listDesc = r4.data?.data || [];
  for (let i = 1; i < listDesc.length; i++) {
    if (listDesc[i].price > listDesc[i - 1].price) isDesc = false;
  }
  assert(r4.status === 200 && isDesc,
    'GET /books?order_by=price&order=DESC sorts descending by price');

  // 6. Pagination: GET /books?limit=5&offset=0
  const r5 = await request('GET', '/books?limit=5&offset=0');
  assert(r5.status === 200 && r5.data?.data?.length === 5,
    'GET /books?limit=5&offset=0 returns 5 books');

  // 7. Price-range filtering: min_price & max_price
  const r6 = await request('GET', '/books?min_price=100&max_price=500');
  const rangeValid = r6.data?.data?.every(b => b.price >= 100 && b.price <= 500);
  assert(r6.status === 200 && rangeValid,
    'GET /books?min_price=100&max_price=500 filters prices between 100 and 500');

  // 8. Combined query
  const r7 = await request('GET', '/books?search_q=java&min_price=100&max_price=600&order_by=price&order=ASC&limit=5&offset=0');
  assert(r7.status === 200 && Array.isArray(r7.data?.data),
    'Combined query returns 200 with matching items');

  // 9. POST /books - Valid
  const r8 = await request('POST', '/books', {
    title: 'Testing Node & Express With MySQL',
    author: 'CHINNALA SUKUMAR',
    price: 399.00
  });
  const createdId = r8.data?.data?.id;
  assert(r8.status === 201 && r8.data?.data?.title === 'Testing Node & Express With MySQL',
    'POST /books creates book and returns 201 Created', `ID: ${createdId}`);

  // 10. POST /books - Missing title
  const r9 = await request('POST', '/books', { author: 'Author', price: 100 });
  assert(r9.status === 400 && r9.data?.message === 'Title is required',
    'POST /books rejects missing title (400)');

  // 11. POST /books - Missing author
  const r10 = await request('POST', '/books', { title: 'Title', price: 100 });
  assert(r10.status === 400 && r10.data?.message === 'Author is required',
    'POST /books rejects missing author (400)');

  // 12. POST /books - Missing price
  const r11 = await request('POST', '/books', { title: 'Title', author: 'Author' });
  assert(r11.status === 400, 'POST /books rejects missing price (400)');

  // 13. POST /books - Negative price
  const r12 = await request('POST', '/books', { title: 'Title', author: 'Author', price: -50 });
  assert(r12.status === 400 && r12.data?.message === 'Price must not be negative',
    'POST /books rejects negative price (400)');

  // 14. GET /books/:id - Valid ID
  const r13 = await request('GET', `/books/${createdId}`);
  assert(r13.status === 200 && r13.data?.data?.title === 'Testing Node & Express With MySQL',
    'GET /books/:id retrieves specific book (200)');

  // 15. GET /books/:id - Nonexistent ID
  const r14 = await request('GET', '/books/999999');
  assert(r14.status === 404 && r14.data?.message === 'Book not found',
    'GET /books/:id returns 404 for missing book');

  // 16. PUT /books/:id - Valid update
  const r15 = await request('PUT', `/books/${createdId}`, {
    title: 'Testing Node & Express (Updated)',
    price: 450.00
  });
  assert(r15.status === 200 && r15.data?.data?.price === 450,
    'PUT /books/:id updates existing book (200)');

  // 17. PUT /books/:id - Missing book
  const r16 = await request('PUT', '/books/999999', { title: 'Updated' });
  assert(r16.status === 404, 'PUT /books/:id returns 404 for missing book');

  // 18. DELETE /books/:id - Valid delete
  const r17 = await request('DELETE', `/books/${createdId}`);
  assert(r17.status === 200 && r17.data?.message === 'Book deleted successfully',
    'DELETE /books/:id deletes book (200)');

  // 19. DELETE /books/:id - Missing book
  const r18 = await request('DELETE', '/books/999999');
  assert(r18.status === 404 && r18.data?.message === 'Book not found',
    'DELETE /books/:id returns 404 for missing book');

  // 20. Invalid Query Param - Invalid sort column
  const r19 = await request('GET', '/books?order_by=invalid_col');
  assert(r19.status === 400, 'GET /books?order_by=invalid_col returns 400');

  // 21. Invalid Query Param - Invalid order direction
  const r20 = await request('GET', '/books?order=DIAGONAL');
  assert(r20.status === 400, 'GET /books?order=DIAGONAL returns 400');

  // 22. Invalid Query Param - min_price > max_price
  const r21 = await request('GET', '/books?min_price=600&max_price=200');
  assert(r21.status === 400, 'GET /books?min_price=600&max_price=200 returns 400');

  // 23. Invalid Query Param - negative limit
  const r22 = await request('GET', '/books?limit=-5');
  assert(r22.status === 400, 'GET /books?limit=-5 returns 400');

  // 24. 404 handler for unknown routes
  const r23 = await request('GET', '/unknown-endpoint');
  assert(r23.status === 404 && r23.data?.message === '404 - Endpoint Not Found',
    'Unknown endpoint returns 404');

  console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
