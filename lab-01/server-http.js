// Lab 1: Plain Node.js HTTP Server using built-in 'http' module
const http = require('http');

const PORT = 3000;

// Create an HTTP server using http.createServer
const server = http.createServer((req, res) => {
  // Set the response HTTP status code to 200 (OK) and header
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');

  // Respond with "Hello"
  res.end('Hello');
});

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Plain HTTP Server running at http://localhost:${PORT}/`);
  });
}

module.exports = server;
