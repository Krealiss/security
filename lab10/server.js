// Camp Booking Validator — Labs 9 & 10
// Usage:
//   node server.js                    -> vulnerable mode  (Lab 9 Task 1, Lab 10 Task 1)
//   MODE=validated node server.js     -> validated mode   (Lab 9 Task 4)
//   MODE=validated-sql node server.js -> validated + safe SQL (Lab 10 Task 2)

const express = require('express');
const path = require('path');
const { initDb, searchVulnerable, searchSafe, insertBooking, execAsRole, getAllBookings } = require('./db');

const app = express();
const PORT = 9000;
const MODE = process.env.MODE || 'vulnerable';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

console.log(`[System] Camp Booking Server starting...`);
console.log(`[System] mode: "${MODE}"  http://localhost:${PORT}`);

// --- validation helpers (Lab 9 Task 4) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE  = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'\- ]{1,60}$/u;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function validateBooking(body) {
  const errors = [];
  const { name, surname, email, age, date } = body;
  if (!name || !NAME_RE.test(name.trim()))       errors.push('Name: required, letters only, max 60 chars');
  if (!surname || !NAME_RE.test(surname.trim()))  errors.push('Surname: required, letters only, max 60 chars');
  if (!email || !EMAIL_RE.test(email.trim()))     errors.push('Email: invalid format');
  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum < 5 || ageNum > 100)
    errors.push('Age: must be a whole number between 5 and 100');
  if (!date) { errors.push('Date: required'); }
  else {
    const d = new Date(date);
    if (isNaN(d.getTime())) errors.push('Date: not a valid date');
    else if (d < new Date()) errors.push('Date: must be in the future');
  }
  return errors;
}

// --- HTML helpers ---
const badge = `<span class="badge ${MODE.replace(/[^a-z-]/g,'')}">${MODE}</span>`;

function layout(title, body) {
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="UTF-8"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box}body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1f2937}
  h1{font-size:1.5rem}nav a{margin-right:16px;color:#1d4ed8;text-decoration:none;font-size:14px}nav{margin-bottom:24px}
  .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-bottom:16px}
  .vulnerable{background:#fee2e2;color:#b91c1c}.validated{background:#dcfce7;color:#15803d}
  .validated-sql{background:#dbeafe;color:#1d4ed8}
  label{display:block;font-size:14px;font-weight:600;margin:12px 0 4px}
  input,select{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
  button{margin-top:16px;padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600}
  button:hover{background:#1e40af}
  .flash-err{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#b91c1c;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
  th{background:#f9fafb;text-align:left;padding:8px 12px;border-bottom:2px solid #e5e7eb}
  td{padding:8px 12px;border-bottom:1px solid #f0f0f0}
  .sql-box{background:#1e293b;color:#a3e635;padding:14px;border-radius:8px;font-family:monospace;font-size:13px;margin:12px 0;word-break:break-all}
  .warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;font-size:13px;color:#9a3412;margin:12px 0}
  .ok{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;font-size:13px;color:#15803d;margin:12px 0}
</style></head><body>
<h1>🏕️ Camp Booking</h1>
${badge}
<nav>
  <a href="/">📝 Book</a>
  <a href="/search">🔍 Search (vulnerable SQL)</a>
  <a href="/search-safe">🔒 Search (safe SQL)</a>
  <a href="/polp">🛡️ PoLP demo</a>
  <a href="/bookings">📋 All bookings</a>
</nav>
${body}
</body></html>`;
}

// --- routes ---

// GET /  booking form
app.get('/', (req, res) => {
  res.send(layout('Book a Spot', `
    <form method="POST" action="/book">
      <label>Name <input name="name" required minlength="1" maxlength="60" pattern="[A-Za-zА-Яа-яІіЇїЄєҐґ'\\- ]+"/></label>
      <label>Surname <input name="surname" required minlength="1" maxlength="60" pattern="[A-Za-zА-Яа-яІіЇїЄєҐґ'\\- ]+"/></label>
      <label>Email <input name="email" type="email" required/></label>
      <label>Age <input name="age" type="number" required min="5" max="100"/></label>
      <label>Date of Booking <input name="date" type="date" required/></label>
      <button type="submit">Book Now</button>
    </form>`));
});

// POST /book
app.post('/book', (req, res) => {
  const { name, surname, email, age, date } = req.body;
  console.log(`[POST /book] mode=${MODE}`, { name, surname, email, age, date });

  if (MODE !== 'vulnerable') {
    const errors = validateBooking(req.body);
    if (errors.length) {
      const flash = `<div class="flash-err"><strong>Validation failed:</strong><ul style="margin:4px 0 0;padding-left:18px">${errors.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      return res.status(400).send(layout('Error', flash + `<a href="/">← Back</a>`));
    }
  }

  const booking = { name: (name||'').trim(), email: (email||'').trim(), age: Number(age)||0, date: date||'' };
  insertBooking(booking);
  console.log(`[STORED]`, booking);

  const safe = MODE !== 'vulnerable';
  const display = safe
    ? { name: escapeHtml(booking.name), email: escapeHtml(booking.email), age: booking.age, date: escapeHtml(booking.date) }
    : { name: booking.name, email: booking.email, age: booking.age, date: booking.date };

  res.send(layout('Confirmed', `
    <div class="ok">✅ Booking confirmed! Output is ${safe ? 'escaped (safe)' : '<strong>RAW — XSS possible if name has tags</strong>'}</div>
    <table><tr><th>Field</th><th>Value</th></tr>
      <tr><td>Name</td><td>${display.name}</td></tr>
      <tr><td>Email</td><td>${display.email}</td></tr>
      <tr><td>Age</td><td>${display.age}</td></tr>
      <tr><td>Date</td><td>${display.date}</td></tr>
    </table><br><a href="/">← New booking</a>`));
});

// GET /search  — VULNERABLE: string concatenation (Lab 10 Task 1)
app.get('/search', (req, res) => {
  const q = req.query.name || '';
  let resultHtml = '';

  if (q) {
    const { sql, rows, error } = searchVulnerable(q);
    const rowsHtml = rows.length
      ? `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th><th>Date</th></tr>
         ${rows.map(r=>`<tr><td>${r.id}</td><td>${r.name}</td><td>${r.email}</td><td>${r.age}</td><td>${r.date}</td></tr>`).join('')}
         </table>`
      : `<div class="warn">No results found.</div>`;

    resultHtml = `
      <div class="sql-box">SQL executed: ${escapeHtml(sql)}</div>
      ${error ? `<div class="flash-err">DB error: ${escapeHtml(error)}</div>` : rowsHtml}
      <div class="warn">⚠️ This query uses string concatenation — try: <code>' OR '1'='1</code> or <code>'; DROP TABLE bookings; --</code></div>`;
  }

  res.send(layout('Search (Vulnerable SQL)', `
    <form method="GET">
      <label>Search by name
        <input name="name" value="${escapeHtml(q)}" placeholder="e.g. John Smith"/>
      </label>
      <button type="submit">Search</button>
    </form>
    ${resultHtml}`));
});

// GET /search-safe  — SAFE: parameterized queries (Lab 10 Task 2)
app.get('/search-safe', (req, res) => {
  const q = req.query.name || '';
  let resultHtml = '';

  if (q) {
    const { sql, rows, error } = searchSafe(q);
    const rowsHtml = rows.length
      ? `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th><th>Date</th></tr>
         ${rows.map(r=>`<tr><td>${r.id}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td><td>${r.age}</td><td>${escapeHtml(r.date)}</td></tr>`).join('')}
         </table>`
      : `<div class="ok">No results — injection payload treated as literal string.</div>`;

    resultHtml = `
      <div class="sql-box">SQL: ${escapeHtml(sql)}</div>
      ${error ? `<div class="flash-err">DB error: ${escapeHtml(error)}</div>` : rowsHtml}
      <div class="ok">✅ Parameterized query: input is <strong>data</strong>, never SQL code.</div>`;
  }

  res.send(layout('Search (Safe — Parameterized)', `
    <form method="GET">
      <label>Search by name
        <input name="name" value="${escapeHtml(q)}" placeholder="e.g. John Smith"/>
      </label>
      <button type="submit">Search</button>
    </form>
    ${resultHtml}`));
});

// GET /polp  — Principle of Least Privilege demo (Lab 10 Task 3)
app.get('/polp', (req, res) => {
  const sql = req.query.sql || '';
  const role = req.query.role || 'camp_web_user';
  let resultHtml = '';

  if (sql) {
    const result = execAsRole(sql, role);
    if (!result.allowed) {
      resultHtml = `<div class="flash-err">${escapeHtml(result.error)}</div>
        <div class="ok">✅ PoLP: even though the SQL is injected, the restricted user cannot execute DROP/DELETE/ALTER.</div>`;
    } else if (result.error) {
      resultHtml = `<div class="sql-box">SQL: ${escapeHtml(result.sql)}</div>
        <div class="flash-err">DB error: ${escapeHtml(result.error)}</div>`;
    } else {
      const rowsHtml = result.rows.length
        ? `<table><tr>${Object.keys(result.rows[0]).map(k=>`<th>${k}</th>`).join('')}</tr>
           ${result.rows.map(r=>`<tr>${Object.values(r).map(v=>`<td>${escapeHtml(String(v))}</td>`).join('')}</tr>`).join('')}
           </table>`
        : `<div class="ok">Query executed, no rows returned.</div>`;
      resultHtml = `<div class="sql-box">SQL: ${escapeHtml(result.sql)}</div>${rowsHtml}`;
    }
  }

  res.send(layout('PoLP Demo', `
    <p>Simulate running SQL as different database roles.</p>
    <form method="GET">
      <label>Role
        <select name="role">
          <option value="camp_web_user" ${role==='camp_web_user'?'selected':''}>camp_web_user (SELECT, INSERT only)</option>
          <option value="superuser" ${role==='superuser'?'selected':''}>superuser (unrestricted)</option>
        </select>
      </label>
      <label>SQL to execute
        <input name="sql" value="${escapeHtml(sql)}" placeholder="DROP TABLE bookings"/>
      </label>
      <button type="submit">Execute</button>
    </form>
    <div class="warn">Try: <code>DROP TABLE bookings</code> — blocked for camp_web_user, allowed for superuser.</div>
    ${resultHtml}`));
});

// GET /bookings  — all records
app.get('/bookings', (req, res) => {
  const rows = getAllBookings();
  const rowsHtml = rows.length
    ? `<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th><th>Date</th></tr>
       ${rows.map(r=>`<tr><td>${r.id}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td><td>${r.age}</td><td>${escapeHtml(r.date)}</td></tr>`).join('')}
       </table>`
    : '<p>No bookings yet.</p>';
  res.send(layout('All Bookings', rowsHtml));
});

// JSON API (for curl/Postman demos)
app.post('/api/book', (req, res) => {
  const { name, surname, email, age, date } = req.body;
  if (MODE !== 'vulnerable') {
    const errors = validateBooking(req.body);
    if (errors.length) return res.status(400).json({ ok: false, errors });
  }
  const booking = { name: (name||'').trim(), email: (email||'').trim(), age: Number(age)||0, date: date||'' };
  insertBooking(booking);
  res.json({ ok: true, booking });
});

app.get('/api/search', (req, res) => {
  const q = req.query.name || '';
  const result = req.query.safe === '1' ? searchSafe(q) : searchVulnerable(q);
  res.json(result);
});

// init DB then start
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`[System] Listening on http://localhost:${PORT}`);
  });
});
