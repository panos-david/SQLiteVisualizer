-- SQLite Visualizer - Quick Test Script
-- Τρέξτε αυτά τα queries στο SQL Editor για να δοκιμάσετε την εφαρμογή

-- 1. Δημιουργία πίνακα χρηστών
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  age INTEGER,
  city TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Εισαγωγή δεδομένων
INSERT INTO users (name, email, age, city) VALUES 
  ('Γιάννης Παπαδόπουλος', 'giannis@example.com', 28, 'Αθήνα'),
  ('Μαρία Κωνσταντίνου', 'maria@example.com', 34, 'Θεσσαλονίκη'),
  ('Νίκος Αθανασίου', 'nikos@example.com', 42, 'Πάτρα'),
  ('Ελένη Γεωργίου', 'eleni@example.com', 25, 'Αθήνα'),
  ('Δημήτρης Μιχαηλίδης', 'dimitris@example.com', 31, 'Ηράκλειο');

-- 3. Δημιουργία πίνακα παραγγελιών με Foreign Key
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  order_date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Εισαγωγή παραγγελιών
INSERT INTO orders (user_id, product, amount, status) VALUES
  (1, 'Laptop', 850.00, 'completed'),
  (1, 'Mouse', 25.50, 'completed'),
  (2, 'Keyboard', 89.99, 'pending'),
  (3, 'Monitor', 320.00, 'completed'),
  (4, 'Headphones', 65.00, 'shipped'),
  (5, 'Webcam', 120.00, 'pending'),
  (1, 'USB Cable', 12.50, 'completed');

-- 5. Queries για testing

-- Απλό SELECT
SELECT * FROM users;

-- SELECT με WHERE
SELECT * FROM users WHERE city = 'Αθήνα';

-- COUNT
SELECT COUNT(*) as total_users FROM users;

-- JOIN
SELECT 
  u.name,
  u.email,
  o.product,
  o.amount,
  o.status
FROM users u
JOIN orders o ON u.id = o.user_id
ORDER BY o.amount DESC;

-- GROUP BY με aggregation
SELECT 
  u.city,
  COUNT(o.id) as total_orders,
  SUM(o.amount) as total_amount,
  AVG(o.amount) as avg_order
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.city
ORDER BY total_amount DESC;

-- Subquery
SELECT 
  name,
  email,
  (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count,
  (SELECT SUM(amount) FROM orders WHERE user_id = users.id) as total_spent
FROM users
ORDER BY total_spent DESC;

-- Users with most expensive order
SELECT 
  u.name,
  MAX(o.amount) as most_expensive_order
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id
ORDER BY most_expensive_order DESC;

-- Orders by status
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total
FROM orders
GROUP BY status;

-- 6. Ελέγξτε το Schema tab για να δείτε τη σχέση Foreign Key!

-- 7. Πηγαίνετε στο Charts tab:
--    - Επιλέξτε πίνακα: orders
--    - X: user_id
--    - Y: amount
--    - Δείτε το scatter plot!

-- 8. Test Error Handling (θα δώσει error - αυτό είναι σωστό!)
SELECT * FROM nonexistent_table;

-- 9. Test complex query
WITH user_stats AS (
  SELECT 
    user_id,
    COUNT(*) as order_count,
    SUM(amount) as total_spent,
    AVG(amount) as avg_order
  FROM orders
  GROUP BY user_id
)
SELECT 
  u.name,
  u.email,
  COALESCE(us.order_count, 0) as orders,
  COALESCE(us.total_spent, 0) as spent,
  COALESCE(us.avg_order, 0) as avg
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
ORDER BY spent DESC;

-- 10. Export test
-- Μετά από κάθε query, πηγαίνετε στο Tables tab και κάντε "Export CSV"
