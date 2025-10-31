# 🗄️ SQLite Visualizer

Ολοκληρωμένο περιβάλλον διαχείρισης SQLite βάσεων δεδομένων στο browser.

![SQLite Visualizer](https://img.shields.io/badge/React-18.3-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Vite](https://img.shields.io/badge/Vite-5.4-purple)

## ✨ Χαρακτηριστικά

### 🎯 Βασικές Λειτουργίες
- ✅ **Δημιουργία Νέας Βάσης** - Δημιουργία κενής SQLite βάσης δεδομένων
- ✅ **SQL Editor** - Εκτέλεση SQL queries με syntax highlighting και error handling
- ✅ **Excel-like Tables** - Προβολή δεδομένων σε DataGrid με pagination και sorting
- ✅ **Schema Visualization** - Οπτικοποίηση δομής πινάκων και Foreign Key relationships
- ✅ **Charts & Analytics** - Scatter και Bar charts για data analysis
- ✅ **Import/Export** - Εισαγωγή CSV και SQLite files, εξαγωγή σε CSV

### 🚀 Προηγμένες Λειτουργίες
- **LocalStorage Persistence** - Αυτόματη αποθήκευση βάσης στο browser
- **Quick SQL Templates** - Έτοιμα templates για συνηθισμένα queries
- **Ctrl+Enter Shortcut** - Γρήγορη εκτέλεση queries
- **Responsive Design** - Λειτουργεί σε desktop, tablet και mobile
- **Greek Language Support** - Πλήρης υποστήριξη ελληνικών

## 🛠️ Εγκατάσταση

```bash
# Clone το repository
git clone <repo-url>
cd SQLiteVisualizer

# Εγκατάσταση dependencies
npm install

# Εκκίνηση development server
npm run dev
```

Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:5173/`

## 📖 Οδηγίες Χρήσης

### 1. Δημιουργία Νέας Βάσης
1. Πατήστε **"Νέα Βάση"**
2. Επιβεβαιώστε τη δημιουργία
3. Ξεκινήστε να δημιουργείτε πίνακες!

### 2. Εισαγωγή Δεδομένων

#### Από SQLite File:
1. Πατήστε **"Άνοιγμα .sqlite"**
2. Επιλέξτε το `.sqlite` ή `.db` αρχείο
3. Η βάση φορτώνει αυτόματα

#### Από CSV:
1. Πατήστε **"Εισαγωγή CSV"**
2. Επιλέξτε το CSV αρχείο
3. Δώστε όνομα στον πίνακα
4. Τα δεδομένα εισάγονται αυτόματα

### 3. SQL Queries

```sql
-- Δημιουργία πίνακα
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);

-- Εισαγωγή δεδομένων
INSERT INTO users (name, email) 
VALUES ('Γιάννης', 'giannis@example.com');

-- Ερώτημα
SELECT * FROM users WHERE name LIKE '%Γ%';
```

**Shortcuts:**
- `Ctrl+Enter` - Εκτέλεση query
- Quick templates για συνηθισμένα queries

### 4. Schema & Foreign Keys

Στο tab **"Schema"** μπορείτε να δείτε:
- Όλες τις στήλες κάθε πίνακα
- Data types και constraints
- Primary Keys
- **Foreign Key Relationships** (οπτικοποιημένα)

### 5. Data Visualization

Στο tab **"Charts"**:
1. Επιλέξτε πίνακα
2. Επιλέξτε X και Y άξονες (numeric columns)
3. Επιλέξτε τύπο γραφήματος (Scatter/Bar)
4. Το γράφημα δημιουργείται αυτόματα!

## 🏗️ Τεχνολογίες

- **Frontend**: React 18.3 + TypeScript
- **Build Tool**: Vite 5.4
- **Database**: SQL.js (SQLite compiled to WebAssembly)
- **UI Components**: 
  - Radix UI (Tabs, Select, etc.)
  - Material-UI DataGrid
  - Recharts (Visualization)
  - Lucide Icons
- **Styling**: Tailwind CSS

## 📁 Δομή Project

```
SQLiteVisualizer/
├── src/
│   ├── components/
│   │   └── ui/          # UI components (Button, Card, Input, etc.)
│   ├── App.tsx
│   ├── main.tsx
│   ├── visualizer.tsx   # Κύριο component
│   └── index.css
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── TESTING.md          # Testing guide
└── README.md
```

## 🧪 Testing

Δείτε το [TESTING.md](./TESTING.md) για αναλυτικές οδηγίες testing.

### Quick Test:
1. Δημιουργήστε νέα βάση
2. Πατήστε "Δημιουργία Demo"
3. Πηγαίνετε στο SQL tab
4. Τρέξτε: `SELECT * FROM demo;`
5. Δείτε τα αποτελέσματα στο Tables tab
6. Ελέγξτε το Schema tab για τη δομή
7. Δημιουργήστε chart στο Charts tab

## 🚀 Build για Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

Τα static files θα δημιουργηθούν στον φάκελο `dist/`

## 📦 Deploy

### Vercel:
```bash
npm i -g vercel
vercel
```

### Netlify:
```bash
npm run build
# Drag & drop το dist/ folder στο Netlify
```

## 🐛 Troubleshooting

### Η εφαρμογή δεν φορτώνει:
1. Ελέγξτε το browser console (F12)
2. Κάντε hard refresh (Ctrl+Shift+R)
3. Διαγράψτε το localStorage και reload

### SQL Errors:
- Ελέγξτε το syntax
- Βεβαιωθείτε ότι ο πίνακας υπάρχει
- Χρησιμοποιήστε double quotes για table/column names με spaces

### Performance Issues:
- Περιορίστε τα results με `LIMIT`
- Αποφύγετε πολύ μεγάλα CSV imports
- Χρησιμοποιήστε indexes για μεγάλους πίνακες

## 📝 License

MIT License - Ελεύθερο για χρήση

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

Για ερωτήσεις και υποστήριξη, ανοίξτε ένα issue στο GitHub.

---

**Made with ❤️ using React + TypeScript + SQL.js**
