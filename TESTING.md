# 🧪 SQLite Visualizer - Testing Guide

## ✅ Test Checklist

### 1. **Αρχική Φόρτωση**
- [ ] Η εφαρμογή φορτώνει χωρίς errors
- [ ] Εμφανίζεται το "Loading SQL engine…" μήνυμα
- [ ] Μετά από 1-2 δευτερόλεπτα φορτώνει η κύρια σελίδα
- [ ] Εμφανίζεται η ελληνική περιγραφή "Ολοκληρωμένο περιβάλλον διαχείρισης SQLite βάσεων δεδομένων"

### 2. **Νέα Βάση Δεδομένων**
- [ ] Πατώντας "Νέα Βάση" εμφανίζεται confirmation dialog
- [ ] Μετά το confirmation δημιουργείται νέα κενή βάση
- [ ] Το localStorage καθαρίζεται
- [ ] Εμφανίζεται "Δεν βρέθηκαν πίνακες" με εικονίδιο

### 3. **Δημιουργία Demo Table**
- [ ] Πατώντας "Δημιουργία Demo" ζητάει όνομα πίνακα
- [ ] Default όνομα είναι "demo"
- [ ] Δημιουργείται πίνακας με 3 στήλες (id, value, category)
- [ ] Εισάγονται 4 δοκιμαστικές εγγραφές
- [ ] Ο πίνακας εμφανίζεται στη λίστα

### 4. **SQL Editor**
#### Quick Templates:
- [ ] "Show Tables" - Εμφανίζει όλους τους πίνακες
- [ ] "SELECT *" - Επιλέγει τον ενεργό πίνακα
- [ ] "COUNT" - Μετράει εγγραφές
- [ ] "Table Info" - Εμφανίζει PRAGMA info

#### Query Execution:
- [ ] Ctrl+Enter τρέχει το query
- [ ] Valid SQL queries επιστρέφουν αποτελέσματα
- [ ] Invalid SQL queries εμφανίζουν κόκκινο error box
- [ ] Error message είναι ευανάγνωστο

#### Test Queries:
```sql
-- Θα πρέπει να λειτουργεί:
SELECT * FROM demo;
SELECT COUNT(*) FROM demo;
SELECT * FROM demo WHERE category = 'A';

-- Θα πρέπει να δίνει error:
SELECT * FROM nonexistent;
SELECTT * FROM demo;
```

### 5. **Tables Tab**
- [ ] Οι πίνακες εμφανίζονται σαν buttons
- [ ] Πατώντας πίνακα φορτώνει τα δεδομένα
- [ ] DataGrid εμφανίζει Excel-like interface
- [ ] Pagination λειτουργεί (25/50/100 rows)
- [ ] Columns μπορούν να ταξινομηθούν
- [ ] Export CSV κουμπί κατεβάζει το αρχείο

### 6. **Schema Tab**
- [ ] Εμφανίζει όλους τους πίνακες
- [ ] Για κάθε πίνακα δείχνει:
  - [ ] Column names
  - [ ] Data types
  - [ ] Nullable (Yes/No)
  - [ ] Default values
  - [ ] Primary Keys (PK badge)
- [ ] Foreign Keys εμφανίζονται σε μπλε box (αν υπάρχουν)

### 7. **Charts Tab**
- [ ] Επιλογή πίνακα από dropdown
- [ ] X column φιλτράρει μόνο numeric columns
- [ ] Y column φιλτράρει μόνο numeric columns
- [ ] Scatter chart εμφανίζεται σωστά
- [ ] Bar chart εμφανίζεται σωστά
- [ ] Αλλαγή τύπου γραφήματος ενημερώνει το UI

### 8. **Import/Export**
#### CSV Import:
- [ ] Επιλογή CSV αρχείου
- [ ] Ζητάει όνομα πίνακα
- [ ] Δημιουργεί πίνακα με σωστές στήλες
- [ ] Εισάγει όλα τα rows
- [ ] Ο νέος πίνακας εμφανίζεται

#### SQLite File:
- [ ] Άνοιγμα .sqlite/.db αρχείου
- [ ] Αντικαθιστά την τρέχουσα βάση
- [ ] Φορτώνει όλους τους πίνακες
- [ ] Δεδομένα διατηρούνται

### 9. **LocalStorage Persistence**
- [ ] Αλλαγές στη βάση αποθηκεύονται αυτόματα
- [ ] Refresh της σελίδας διατηρεί τη βάση
- [ ] Νέα βάση διαγράφει το localStorage

### 10. **Responsive Design**
- [ ] Σε desktop (>1024px) όλα εμφανίζονται σωστά
- [ ] Σε tablet (768-1024px) layout προσαρμόζεται
- [ ] Σε mobile (<768px) buttons stack κάθετα

## 🐛 Known Issues to Test

1. **Large Datasets**: Δοκιμάστε με >1000 rows
2. **Special Characters**: Πίνακες με ειδικούς χαρακτήρες στο όνομα
3. **Unicode**: Ελληνικά/Unicode δεδομένα
4. **Complex Queries**: JOINs, subqueries, CTEs

## 📊 Test Data

### Δημιουργήστε test tables:

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, age) VALUES 
  ('Γιάννης Παπαδόπουλος', 'giannis@example.com', 28),
  ('Μαρία Κωνσταντίνου', 'maria@example.com', 34),
  ('Νίκος Αθανασίου', 'nikos@example.com', 42);

-- Orders table with foreign key
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL,
  status TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO orders (user_id, amount, status) VALUES
  (1, 150.50, 'completed'),
  (1, 89.99, 'pending'),
  (2, 234.00, 'completed'),
  (3, 45.50, 'cancelled');
```

## ✅ Success Criteria

Η εφαρμογή θεωρείται επιτυχής όταν:
- ✅ Όλα τα 10 βασικά tests περνούν
- ✅ Δεν υπάρχουν console errors
- ✅ Η εφαρμογή είναι responsive
- ✅ Τα δεδομένα διατηρούνται μετά από refresh
- ✅ Foreign keys εμφανίζονται σωστά στο Schema tab

## 🚀 Next Steps

Μετά την επιτυχή ολοκλήρωση των tests:
1. Deploy σε production (Vercel/Netlify)
2. Προσθήκη export σε JSON/SQL format
3. Προσθήκη in-grid editing
4. Προσθήκη query history
5. Προσθήκη dark mode
