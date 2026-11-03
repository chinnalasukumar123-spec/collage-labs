// Comprehensive test suite for Lab 3 REST API
const app = require('./server');
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

  // Allow database seeding to complete
  await new Promise(r => setTimeout(r, 600));

  // 1. GET /books
  const r1 = await request('GET', '/books');
  assert(r1.status === 200 && Array.isArray(r1.data) && r1.data.length > 0,
    'GET /books returns 200 and list of books', `Length: ${r1.data?.length}`);

  // 2. Search books: GET /books?search_q=java
  const r2 = await request('GET', '/books?search_q=java');
  const allMatchJava = r2.data.every(b => b.title.toLowerCase().includes('java'));
  assert(r2.status === 200 && r2.data.length > 0 && allMatchJava,
    'GET /books?search_q=java returns 200 with partial title match', `Found: ${r2.data.length}`);

  // 3. Sort books ASC: GET /books?order_by=price&order=ASC
  const r3 = await request('GET', '/books?order_by=price&order=ASC');
  let isAsc = true;
  for (let i = 1; i < r3.data.length; i++) {
    if (r3.data[i].price < r3.data[i - 1].price) isAsc = false;
  }
  assert(r3.status === 200 && isAsc,
    'GET /books?order_by=price&order=ASC sorts ascending by price');

  // 4. Sort books DESC: GET /books?order_by=price&order=DESC
  const r4 = await request('GET', '/books?order_by=price&order=DESC');
  let isDesc = true;
  for (let i = 1; i < r4.data.length; i++) {
    if (r4.data[i].price > r4.data[i - 1].price) isDesc = false;
  }
  assert(r4.status === 200 && isDesc,
    'GET /books?order_by=price&order=DESC sorts descending by price');

  // 5. Pagination: GET /books?limit=5&offset=0
  const r5 = await request('GET', '/books?limit=5&offset=0');
  assert(r5.status === 200 && r5.data.length === 5,
    'GET /books?limit=5&offset=0 returns 5 books');

  // 6. Price-range filtering: min_price
  const r6 = await request('GET', '/books?min_price=500');
  assert(r6.status === 200 && r6.data.every(b => b.price >= 500),
    'GET /books?min_price=500 filters prices >= 500');

  // 7. Price-range filtering: max_price
  const r7 = await request('GET', '/books?max_price=400');
  assert(r7.status === 200 && r7.data.every(b => b.price <= 400),
    'GET /books?max_price=400 filters prices <= 400');

  // 8. Price-range filtering: min_price & max_price
  const r8 = await request('GET', '/books?min_price=100&max_price=500');
  assert(r8.status === 200 && r8.data.every(b => b.price >= 100 && b.price <= 500),
    'GET /books?min_price=100&max_price=500 filters prices in range');

  // 9. Combined query
  const r9 = await request('GET', '/books?search_q=java&min_price=100&max_price=600&order_by=price&order=ASC&limit=5&offset=0');
  assert(r9.status === 200 && Array.isArray(r9.data),
    'Combined query returns 200');

  // 10. POST /books - Valid
  const r10 = await request('POST', '/books', {
    title: 'Testing Node & Express',
    author: 'Sukumar',
    price: 320
  });
  const createdId = r10.data?.book?.id;
  assert(r10.status === 201 && r10.data?.book?.title === 'Testing Node & Express',
    'POST /books creates book and returns 201 Created', `ID: ${createdId}`);

  // 11. POST /books - Missing title
  const r11 = await request('POST', '/books', { author: 'Author', price: 100 });
  assert(r11.status === 400, 'POST /books rejects missing title (400)');

  // 12. POST /books - Empty title
  const r12 = await request('POST', '/books', { title: '   ', author: 'Author', price: 100 });
  assert(r12.status === 400, 'POST /books rejects empty title (400)');

  // 13. POST /books - Missing author
  const r13 = await request('POST', '/books', { title: 'Title', price: 100 });
  assert(r13.status === 400, 'POST /books rejects missing author (400)');

  // 14. POST /books - Missing price
  const r14 = await request('POST', '/books', { title: 'Title', author: 'Author' });
  assert(r14.status === 400, 'POST /books rejects missing price (400)');

  // 15. POST /books - Non-numeric price
  const r15 = await request('POST', '/books', { title: 'Title', author: 'Author', price: 'abc' });
  assert(r15.status === 400, 'POST /books rejects non-numeric price (400)');

  // 16. POST /books - Negative price
  const r16 = await request('POST', '/books', { title: 'Title', author: 'Author', price: -50 });
  assert(r16.status === 400, 'POST /books rejects negative price (400)');

  // 17. GET /books/:id - Valid ID
  const r17 = await request('GET', `/books/${createdId}`);
  assert(r17.status === 200 && r17.data?.title === 'Testing Node & Express',
    'GET /books/:id retrieves specific book (200)');

  // 18. GET /books/:id - Non-existent ID
  const r18 = await request('GET', '/books/999999');
  assert(r18.status === 404, 'GET /books/:id returns 404 for missing book');

  // 19. PUT /books/:id - Valid update
  const r19 = await request('PUT', `/books/${createdId}`, {
    title: 'Testing Node & Express (Updated)',
    price: 360
  });
  assert(r19.status === 200 && r19.data?.book?.title === 'Testing Node & Express (Updated)' && r19.data?.book?.price === 360,
    'PUT /books/:id updates existing book (200)');

  // 20. PUT /books/:id - Missing book
  const r20 = await request('PUT', '/books/999999', { title: 'Updated' });
  assert(r20.status === 404, 'PUT /books/:id returns 404 for missing book');

  // 21. PUT /books/:id - Invalid price
  const r21 = await request('PUT', `/books/${createdId}`, { price: -10 });
  assert(r21.status === 400, 'PUT /books/:id rejects negative price (400)');

  // 22. DELETE /books/:id - Valid delete
  const r22 = await request('DELETE', `/books/${createdId}`);
  assert(r22.status === 200, 'DELETE /books/:id deletes book (200)');

  // 23. DELETE /books/:id - Missing book
  const r23 = await request('DELETE', '/books/999999');
  assert(r23.status === 404, 'DELETE /books/:id returns 404 for missing book');

  // 24. Invalid Query Param - Invalid sort column
  const r24 = await request('GET', '/books?order_by=invalid_column');
  assert(r24.status === 400, 'GET /books?order_by=invalid_column returns 400');

  // 25. Invalid Query Param - Invalid order direction
  const r25 = await request('GET', '/books?order=SIDEWAYS');
  assert(r25.status === 400, 'GET /books?order=SIDEWAYS returns 400');

  // 26. Invalid Query Param - min_price > max_price
  const r26 = await request('GET', '/books?min_price=500&max_price=200');
  assert(r26.status === 400, 'GET /books?min_price=500&max_price=200 returns 400');

  // 27. Invalid Query Param - negative limit
  const r27 = await request('GET', '/books?limit=-5');
  assert(r27.status === 400, 'GET /books?limit=-5 returns 400');

  // 28. Invalid Query Param - negative offset
  const r28 = await request('GET', '/books?offset=-1');
  assert(r28.status === 400, 'GET /books?offset=-1 returns 400');

  // 29. 404 handler for unknown routes
  const r29 = await request('GET', '/unknown-route');
  assert(r29.status === 404, 'Unknown endpoint returns 404');

  console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
