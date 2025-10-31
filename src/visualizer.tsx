import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Play, Upload, Database as DbIcon, Network, Table as TableIcon, Key, Link2 } from "lucide-react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

// --- Helper Types ---
type Database = any;
type QueryExecResult = any;
type TableInfo = { name: string; nrows?: number };

// Extend window for sql.js
declare global {
  interface Window {
    initSqlJs: any;
  }
}

type TableData = {
  columns: string[];
  rows: any[][];
};

// CSV to array util (simple, not RFC-perfect)
function parseCSV(csv: string, delimiter = ","): { header: string[]; rows: string[][] } {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { header: [], rows: [] };
  const header = lines[0].split(delimiter).map((s) => s.trim());
  const rows = lines.slice(1).map((line) => line.split(delimiter).map((s) => s.trim()));
  return { header, rows };
}

function arrayToCSV(columns: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

// Persist/restore DB to localStorage
const STORAGE_KEY = "sqlite-visualizer-db";

export default function SQLiteVisualizer() {
  const [SQL, setSQL] = useState<any>(null);
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string>("");
  const [query, setQuery] = useState<string>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  const [queryResult, setQueryResult] = useState<QueryExecResult[] | null>(null);
  const [queryError, setQueryError] = useState<string>("");
  const [tableData, setTableData] = useState<TableData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sqlFileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedQueries, setSavedQueries] = useState<Array<{name: string, sql: string}>>([]);

  // Schema diagram state
  type TableSchema = {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      pk: boolean;
      notnull: boolean;
    }>;
    foreignKeys: Array<{
      from: string;
      table: string;
      to: string;
    }>;
  };
  const [schemas, setSchemas] = useState<TableSchema[]>([]);

  // Init sql.js
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Load sql.js from CDN
        const script = document.createElement('script');
        script.src = 'https://sql.js.org/dist/sql-wasm.js';
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load SQL.js'));
          document.head.appendChild(script);
        });

        // @ts-ignore - initSqlJs is loaded from CDN
        const SQL = await window.initSqlJs({ 
          locateFile: (file: string) => `https://sql.js.org/dist/${file}` 
        });
        setSQL(SQL);

        // Try to restore from localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        const db = saved ? new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0))) : new SQL.Database();
        setDb(db);
      } catch (error) {
        console.error("Failed to initialize SQL.js:", error);
        alert("Σφάλμα φόρτωσης SQL.js. Παρακαλώ ανανεώστε τη σελίδα.");
      }
      setLoading(false);
    })();
  }, []);

  // Save DB on changes (simple debounce)
  useEffect(() => {
    if (!db) return;
    const id = setTimeout(() => {
      const binaryArray = db.export();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(binaryArray as unknown as number[])));
      localStorage.setItem(STORAGE_KEY, base64);
    }, 600);
    return () => clearTimeout(id);
  }, [db, tableData, queryResult]);

  // Load table list
  const refreshTables = () => {
    if (!db) return;
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
    const names = (res?.[0]?.values ?? []).map((v: any) => ({ name: String(v[0]) })) as TableInfo[];
    setTables(names);
    if (names.length && !activeTable) setActiveTable(names[0].name);
  };

  useEffect(() => {
    if (db) refreshTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Load active table data
  useEffect(() => {
    if (!db || !activeTable) return;
    try {
      const res = db.exec(`SELECT * FROM "${activeTable}" LIMIT 1000;`);
      if (res[0]) {
        setTableData({ columns: res[0].columns, rows: res[0].values });
      } else {
        setTableData({ columns: [], rows: [] });
      }
    } catch (e) {
      console.error(e);
    }
  }, [db, activeTable]);

  // Load all schemas for diagram
  useEffect(() => {
    if (!db || tables.length === 0) return;
    
    const loadSchemas = () => {
      const allSchemas: TableSchema[] = [];
      
      tables.forEach(table => {
        try {
          const tableInfo = db.exec(`PRAGMA table_info("${table.name}");`);
          const foreignKeys = db.exec(`PRAGMA foreign_key_list("${table.name}");`);
          
          const columns = (tableInfo[0]?.values || []).map((col: any[]) => ({
            name: String(col[1]),
            type: String(col[2]),
            pk: Boolean(col[5]),
            notnull: Boolean(col[3])
          }));
          
          const fks = (foreignKeys[0]?.values || []).map((fk: any[]) => ({
            from: String(fk[3]),
            table: String(fk[2]),
            to: String(fk[4])
          }));
          
          allSchemas.push({
            name: table.name,
            columns,
            foreignKeys: fks
          });
        } catch (e) {
          console.error(`Error loading schema for ${table.name}:`, e);
        }
      });
      
      setSchemas(allSchemas);
    };
    
    loadSchemas();
  }, [db, tables]);

  const runQuery = () => {
    if (!db) return;
    setQueryError("");
    try {
      const res = db.exec(query);
      setQueryResult(res);
      refreshTables();
    } catch (e: any) {
      setQueryError(e.message || "Unknown SQL error");
      setQueryResult(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!SQL) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    const newDb = new SQL.Database(buf);
    setDb(newDb);
    setQueryResult(null);
    setActiveTable("");
  };

  // SQL Syntax Highlighting
  const highlightSQL = (sql: string) => {
    if (!sql) return '';
    
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 
      'ALTER', 'TABLE', 'INTO', 'VALUES', 'SET', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
      'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'LIKE', 'IN', 'BETWEEN',
      'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT',
      'SUM', 'AVG', 'MAX', 'MIN', 'PRAGMA', 'INDEX', 'VIEW', 'PRIMARY', 'KEY',
      'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT', 'CASCADE',
      'IF', 'EXISTS', 'AUTOINCREMENT', 'INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'
    ];
    
    // Escape HTML first
    let highlighted = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Highlight comments first (so they don't interfere with other highlighting)
    highlighted = highlighted.replace(/(--.*$)/gm, '<span class="sql-comment">$1</span>');
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>');
    
    // Highlight strings
    highlighted = highlighted.replace(/('([^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');
    highlighted = highlighted.replace(/("([^"\\]|\\.)*")/g, '<span class="sql-string">$1</span>');
    
    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');
    
    // Highlight keywords (case-insensitive, but preserve original case)
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => `<span class="sql-keyword">${match}</span>`);
    });
    
    return highlighted;
  };

  const handleCSVImport = async (file: File, tableName: string) => {
    if (!db) return;
    const text = await file.text();
    const { header, rows } = parseCSV(text);
    if (!header.length) return alert("Empty CSV");

    const colDefs = header.map((h) => `"${h}" TEXT`).join(", ");
    db.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});`);

    const placeholders = `(${header.map(() => "?").join(",")})`;
    const stmt = db.prepare(`INSERT INTO "${tableName}" (${header.map((h) => `"${h}"`).join(",")}) VALUES ${placeholders};`);
    db.run("BEGIN;");
    try {
      for (const r of rows) stmt.run(r);
      db.run("COMMIT;");
      stmt.free();
      refreshTables();
      setActiveTable(tableName);
    } catch (e) {
      db.run("ROLLBACK;");
      console.error(e);
      alert("CSV import failed");
    }
  };

  const downloadCSV = () => {
    if (!tableData) return;
    const csv = arrayToCSV(tableData.columns, tableData.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTable || "table"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveQueryToFile = () => {
    const blob = new Blob([query], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadQueryFromFile = async (file: File) => {
    const text = await file.text();
    setQuery(text);
  };

  const loadQueriesFromFolder = async (files: FileList) => {
    const queries: Array<{name: string, sql: string}> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.sql')) {
        const text = await file.text();
        queries.push({ name: file.name, sql: text });
      }
    }
    setSavedQueries(queries);
  };

  const clearSavedQueries = () => {
    setSavedQueries([]);
  };

  const createNewDatabase = () => {
    if (!SQL) return;
    const confirmed = confirm("Δημιουργία νέας κενής βάσης δεδομένων; Η τρέχουσα βάση θα χαθεί αν δεν την έχετε αποθηκεύσει.");
    if (!confirmed) return;
    
    const newDb = new SQL.Database();
    setDb(newDb);
    setTables([]);
    setActiveTable("");
    setQueryResult(null);
    setQueryError("");
    setTableData(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const gridColumns: GridColDef[] = useMemo(() => {
    if (!tableData) return [];
    return tableData.columns.map((c, i) => ({ field: String(i), headerName: c, width: 150 }));
  }, [tableData]);

  const gridRows = useMemo(() => {
    if (!tableData) return [];
    return tableData.rows.map((r, idx) => {
      const obj: any = { id: idx };
      r.forEach((v, i) => (obj[String(i)] = v));
      return obj;
    });
  }, [tableData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading SQL engine…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
      <div className="flex items-center gap-3 border-b pb-4">
        <DbIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">SQLite Visualizer</h1>
          <p className="text-sm text-muted-foreground">Ολοκληρωμένο περιβάλλον διαχείρισης SQLite βάσεων δεδομένων</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3 items-start flex-wrap">
          <Button onClick={createNewDatabase} variant="default">
            <DbIcon className="mr-2 h-4 w-4"/>Νέα Βάση
          </Button>
          <div className="flex items-center gap-2">
            <Input ref={fileInputRef} type="file" accept=".sqlite,.db" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} className="w-auto" />
            <Button variant="secondary"><Upload className="mr-2 h-4 w-4"/>Άνοιγμα .sqlite</Button>
          </div>
          <div className="flex items-center gap-2">
            <Input type="file" accept=".csv" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const t = prompt("Εισαγωγή CSV στον πίνακα:", f.name.replace(/\.[^.]+$/, "")) || "imported";
              handleCSVImport(f, t);
            }} className="w-auto" />
            <Button variant="secondary"><Upload className="mr-2 h-4 w-4"/>Εισαγωγή CSV</Button>
          </div>
          <Button onClick={() => {
            if (!db) return;
            const name = prompt("Όνομα νέου πίνακα:", "demo");
            if (!name) return;
            db.run(`CREATE TABLE IF NOT EXISTS "${name}" (id INTEGER PRIMARY KEY, value REAL, category TEXT);`);
            db.run(`INSERT INTO "${name}" (value, category) VALUES (1.2,'A'),(2.1,'B'),(2.7,'A'),(4.3,'C');`);
            refreshTables();
          }} variant="outline">Δημιουργία Demo</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables"><TableIcon className="mr-2 h-4 w-4"/>Tables</TabsTrigger>
          <TabsTrigger value="sql"><Play className="mr-2 h-4 w-4"/>SQL</TabsTrigger>
          <TabsTrigger value="diagram"><Network className="mr-2 h-4 w-4"/>ER Diagram</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Πίνακες Βάσης Δεδομένων</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {tables.length === 0 && (
                <div className="w-full text-center py-8 text-muted-foreground">
                  <DbIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">Δεν βρέθηκαν πίνακες</p>
                  <p className="text-sm">Δημιουργήστε έναν νέο πίνακα ή εισάγετε δεδομένα για να ξεκινήσετε</p>
                </div>
              )}
              {tables.map((t) => (
                <Button key={t.name} variant={t.name === activeTable ? "default" : "outline"} onClick={() => setActiveTable(t.name)}>
                  {t.name}
                </Button>
              ))}
              {tables.length > 0 && (
                <>
                  <div className="ml-auto"/>
                  <Button variant="outline" onClick={downloadCSV} disabled={!tableData}>
                    <Download className="mr-2 h-4 w-4"/>Εξαγωγή CSV
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{activeTable || "Select a table"}</CardTitle>
            </CardHeader>
            <CardContent>
              {tableData ? (
                <div style={{ height: 520, width: "100%" }}>
                  <DataGrid rows={gridRows} columns={gridColumns} disableRowSelectionOnClick pageSizeOptions={[25, 50, 100]} initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }} />
                </div>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sql" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>SQL Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative bg-white rounded border overflow-hidden">
                <div 
                  className="absolute inset-0 p-3 font-mono text-sm whitespace-pre-wrap break-words pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: highlightSQL(query) }}
                  style={{
                    lineHeight: '1.5'
                  }}
                />
                <Textarea 
                  rows={8} 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  className={`font-mono relative z-10 bg-transparent border-0 focus-visible:ring-0 resize-none ${queryError ? "border-red-500" : ""}`}
                  style={{
                    color: 'rgba(0, 0, 0, 0.01)',
                    caretColor: 'black',
                    lineHeight: '1.5'
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      runQuery();
                    }
                  }}
                  placeholder="Enter your SQL query here..."
                />
                <style>{`
                  .sql-keyword { color: #0066cc; font-weight: 600; }
                  .sql-string { color: #008800; }
                  .sql-number { color: #cc6600; }
                  .sql-comment { color: #999999; font-style: italic; }
                  textarea::selection {
                    background-color: rgba(0, 123, 255, 0.3);
                    color: inherit;
                  }
                `}</style>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <Button onClick={runQuery}><Play className="mr-2 h-4 w-4"/>Run (Ctrl+Enter)</Button>
                <Button variant="outline" onClick={() => { setQueryResult(null); setQueryError(""); }}>Clear Results</Button>
                <Button variant="outline" onClick={saveQueryToFile}><Download className="mr-2 h-4 w-4"/>Save Query</Button>
                <Button variant="outline" onClick={() => sqlFileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4"/>Load Query
                </Button>
                <input 
                  ref={sqlFileInputRef} 
                  type="file" 
                  accept=".sql,.txt" 
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && loadQueryFromFile(e.target.files[0])}
                />
                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                <Button size="sm" variant="ghost" onClick={() => setQuery("SELECT * FROM sqlite_master WHERE type='table';")}>
                  Show Tables
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuery(activeTable ? `SELECT * FROM "${activeTable}" LIMIT 100;` : "SELECT * FROM ")}>
                  SELECT *
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuery(activeTable ? `SELECT COUNT(*) as count FROM "${activeTable}";` : "SELECT COUNT(*) FROM ")}>
                  COUNT
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setQuery(activeTable ? `PRAGMA table_info("${activeTable}");` : "PRAGMA table_info()")}>
                  Table Info
                </Button>
              </div>

              {/* Saved Queries Section */}
              {savedQueries.length > 0 && (
                <Card className="bg-blue-50">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Αποθηκευμένα Queries ({savedQueries.length})</CardTitle>
                      <Button size="sm" variant="ghost" onClick={clearSavedQueries}>
                        Clear All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {savedQueries.map((sq, idx) => (
                        <Button 
                          key={idx} 
                          size="sm" 
                          variant="outline" 
                          className="bg-white"
                          onClick={() => setQuery(sq.sql)}
                        >
                          {sq.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Load Multiple Queries */}
              <div className="flex gap-2 items-center text-sm">
                <Label htmlFor="folderInput">Φόρτωση πολλαπλών queries από φάκελο:</Label>
                <Input 
                  id="folderInput"
                  type="file" 
                  accept=".sql,.txt" 
                  multiple
                  className="w-auto"
                  onChange={(e) => e.target.files && loadQueriesFromFolder(e.target.files)}
                />
              </div>

              {queryError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative">
                  <strong className="font-bold">SQL Error: </strong>
                  <span className="block sm:inline">{queryError}</span>
                </div>
              )}

              {queryResult && queryResult.length > 0 && (
                <div className="space-y-4">
                  {queryResult.map((res, i) => (
                    <div key={i} className="border rounded p-2 overflow-auto">
                      <div className="font-medium mb-2">Result {i + 1}</div>
                      <table className="text-sm w-full">
                        <thead>
                          <tr>
                            {res.columns.map((c) => (
                              <th key={c} className="text-left p-1 border-b">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {res.values.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((v, cIdx) => (
                                <td key={cIdx} className="p-1 border-b align-top">{String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Database Schema & Relationships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tables.length === 0 ? (
                <div className="text-muted-foreground">No tables in database</div>
              ) : (
                <div className="space-y-4">
                  {tables.map((table) => {
                    if (!db) return null;
                    try {
                      const tableInfo = db.exec(`PRAGMA table_info("${table.name}");`);
                      const foreignKeys = db.exec(`PRAGMA foreign_key_list("${table.name}");`);
                      
                      return (
                        <Card key={table.name} className="border-2">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{table.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-semibold">Column</th>
                                    <th className="text-left p-2 font-semibold">Type</th>
                                    <th className="text-left p-2 font-semibold">Nullable</th>
                                    <th className="text-left p-2 font-semibold">Default</th>
                                    <th className="text-left p-2 font-semibold">Key</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableInfo[0]?.values.map((col: any[], idx) => {
                                    const [cid, name, type, notnull, dflt_value, pk] = col;
                                    return (
                                      <tr key={idx} className="border-b">
                                        <td className="p-2 font-mono">{String(name)}</td>
                                        <td className="p-2">{String(type)}</td>
                                        <td className="p-2">{notnull ? 'No' : 'Yes'}</td>
                                        <td className="p-2 text-muted-foreground">{dflt_value || '-'}</td>
                                        <td className="p-2">
                                          {pk ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">PK</span> : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            
                            {foreignKeys[0]?.values && foreignKeys[0].values.length > 0 && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                <h4 className="font-semibold text-sm mb-2 text-blue-900">Foreign Key Relationships:</h4>
                                <ul className="space-y-1 text-sm">
                                  {foreignKeys[0].values.map((fk: any[], idx) => {
                                    const [id, seq, table, from, to] = fk;
                                    return (
                                      <li key={idx} className="flex items-center gap-2">
                                        <span className="font-mono bg-white px-2 py-1 rounded border">{String(from)}</span>
                                        <span>→</span>
                                        <span className="font-semibold text-blue-700">{String(table)}</span>
                                        <span className="font-mono bg-white px-2 py-1 rounded border">{String(to)}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    } catch (e) {
                      return null;
                    }
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagram" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Entity Relationship Diagram</CardTitle>
            </CardHeader>
            <CardContent>
              {schemas.length === 0 ? (
                <div className="w-full text-center py-12 text-muted-foreground">
                  <Network className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">Δεν υπάρχουν πίνακες για οπτικοποίηση</p>
                  <p className="text-sm">Δημιουργήστε πίνακες για να δείτε το ER Diagram</p>
                </div>
              ) : (
                <div className="w-full bg-gray-50 p-8 rounded-lg border-2 border-dashed relative min-h-[600px]">
                  {/* Tables Grid */}
                  <div 
                    className="grid gap-8" 
                    style={{ 
                      gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`
                    }}
                  >
                    {schemas.map((schema) => (
                      <div 
                        key={schema.name} 
                        className="relative justify-self-center"
                      >
                        {/* Table Box */}
                        <div className="bg-white border-2 border-blue-600 rounded-lg shadow-lg w-[300px]">
                          {/* Table Header */}
                          <div className="bg-blue-600 text-white px-4 py-2 font-bold text-center rounded-t-md flex items-center justify-center gap-2">
                            <TableIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="break-words">{schema.name}</span>
                          </div>
                          
                          {/* Columns */}
                          <div className="divide-y">
                            {schema.columns.map((col) => {
                              const fk = schema.foreignKeys.find(fk => fk.from === col.name);
                              const isFk = !!fk;
                              const tooltipText = fk ? `Foreign Key → ${fk.table}.${fk.to}` : '';
                              
                              return (
                                <div 
                                  key={col.name} 
                                  className="px-3 py-2 flex items-start gap-2 hover:bg-gray-50 group relative"
                                  id={`col-${schema.name}-${col.name}`}
                                >
                                  {col.pk && <Key className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" title="Primary Key" />}
                                  {isFk && (
                                    <div className="relative flex-shrink-0 mt-0.5">
                                      <Link2 className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        {tooltipText}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                      </div>
                                    </div>
                                  )}
                                  <span className={`font-mono text-sm flex-1 break-words ${col.pk ? 'font-bold text-blue-700' : isFk ? 'text-blue-600' : ''}`}>
                                    {col.name}
                                  </span>
                                  <span className="text-xs text-gray-500 uppercase flex-shrink-0">{col.type}</span>
                                  {col.notnull && <span className="text-xs text-red-600 font-semibold flex-shrink-0">NN</span>}
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Foreign Keys Info */}
                          {schema.foreignKeys.length > 0 && (
                            <div className="bg-blue-50 px-3 py-2 border-t-2 border-blue-200">
                              <div className="text-xs font-semibold text-blue-800 mb-1">References:</div>
                              {schema.foreignKeys.map((fk, fkIdx) => (
                                <div key={fkIdx} className="text-xs text-blue-700 mb-1 break-words">
                                  <span className="font-mono">{fk.from}</span>
                                  <span> → </span>
                                  <span className="font-semibold">{fk.table}</span>
                                  <span className="font-mono"> ({fk.to})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-8 p-4 bg-white rounded-lg border">
                    <h3 className="font-semibold mb-2 text-sm">Υπόμνημα:</h3>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-yellow-600" />
                        <span>Primary Key</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-500" />
                        <span>Foreign Key (hover για λεπτομέρειες)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-semibold">NN</span>
                        <span>NOT NULL</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      
    </div>
  );
}
