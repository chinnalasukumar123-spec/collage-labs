-- Lab 3: Database Schema and Seed Data
-- Database: library_db

CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 10 realistic sample books
INSERT INTO books (title, author, price) VALUES
('Learning Node.js', 'Rahul Sharma', 350.00),
('Java: The Complete Reference', 'Herbert Schildt', 650.00),
('Effective Java', 'Joshua Bloch', 550.00),
('JavaScript: The Good Parts', 'Douglas Crockford', 400.00),
('Clean Code', 'Robert C. Martin', 700.00),
('Core Java for the Impatient', 'Cay S. Horstmann', 480.00),
('Python Crash Course', 'Eric Matthes', 320.00),
('Design Patterns', 'Erich Gamma', 850.00),
('HTML and CSS: Design and Build Websites', 'Jon Duckett', 280.00),
('Database System Concepts', 'Abraham Silberschatz', 950.00);
