// db.js - SQLite database layer for Lab 10
// Uses sql.js (pure-JS SQLite, no native build needed).
//
// PoLP simulation: SQLite has no built-in user accounts, so we simulate
// two roles with a JS wrapper that allows or blocks specific SQL operations.
//   superuser    - executes any SQL (used in vulnerable mode)
//   camp_web_user - restricted: only SELECT and INSERT allowed
//     (DROP TABLE, DELETE, ALTER, etc. are rejected before reaching SQLite)

const initSqlJs = require('sql.js');

let db = null;

// allowed prefixes for the restricted "camp_web_user" role
const ALLOWED_FOR_WEB_USER = ['SELECT', 'INSERT'];

function isAllowed(sql, role) {
  if (role === 'superuser') return { ok: true };
  const upper = sql.trim().toUpperCase();
  const allowed = ALLOWED_FOR_WEB_USER.some(op => upper.startsWith(op));
  if (!allowed) {
    const op = upper.split(/\s+/)[0];
    return { ok: false, error: `[PoLP] REJECTED: camp_web_user has no privilege for ${op}. Superuser is required.` };
  }
  return { ok: true };
}

async function initDb() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  // create bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      email TEXT NOT NULL,
      age   INTEGER NOT NULL,
      date  TEXT NOT NULL
    )
  `);

  // seed with a couple of rows
  db.run(`INSERT INTO bookings (name, email, age, date) VALUES
    ('John Smith',  'john@example.com',  22, '2027-07-15'),
    ('Mary Jones',  'mary@example.com',  35, '2027-08-01'),
    ('Ivan Petrenko','ivan@example.com', 18, '2027-09-10')`);

  console.log('[DB] SQLite initialised, bookings seeded');
  return db;
}

// VULNERABLE: string concatenation (Task 1)
function searchVulnerable(nameInput) {
  const sql = `SELECT * FROM bookings WHERE name = '${nameInput}'`;
  console.log(`[DB VULNERABLE] SQL: ${sql}`);
  try {
    const stmt = db.exec(sql);
    return { sql, rows: stmtToRows(stmt), error: null };
  } catch (e) {
    return { sql, rows: [], error: e.message };
  }
}

// SAFE: parameterized query (Task 2)
function searchSafe(nameInput) {
  const sql = `SELECT * FROM bookings WHERE name = ?`;
  console.log(`[DB SAFE] SQL: ${sql}  param: "${nameInput}"`);
  try {
    const stmt = db.prepare(sql);
    const rows = [];
    stmt.bind([nameInput]);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return { sql: `${sql}  -- param: "${nameInput}"`, rows, error: null };
  } catch (e) {
    return { sql, rows: [], error: e.message };
  }
}

// INSERT booking (parameterized always)
function insertBooking({ name, email, age, date }) {
  const stmt = db.prepare(
    `INSERT INTO bookings (name, email, age, date) VALUES (?, ?, ?, ?)`
  );
  stmt.run([name, email, age, date]);
  stmt.free();
}

// PoLP: execute arbitrary SQL as a specific role (Task 3)
function execAsRole(sql, role = 'camp_web_user') {
  const check = isAllowed(sql, role);
  if (!check.ok) {
    console.log(check.error);
    return { sql, role, allowed: false, error: check.error, rows: [] };
  }
  console.log(`[DB ${role}] ${sql}`);
  try {
    const result = db.exec(sql);
    return { sql, role, allowed: true, rows: stmtToRows(result), error: null };
  } catch (e) {
    return { sql, role, allowed: true, rows: [], error: e.message };
  }
}

function getAllBookings() {
  const result = db.exec('SELECT * FROM bookings');
  return stmtToRows(result);
}

function stmtToRows(execResult) {
  if (!execResult || execResult.length === 0) return [];
  const { columns, values } = execResult[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

module.exports = { initDb, searchVulnerable, searchSafe, insertBooking, execAsRole, getAllBookings };
