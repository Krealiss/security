// Camp Booking Validator — Lab 9
// Usage:
//   node server.js              -> vulnerable mode (no server-side validation)
//   MODE=validated node server.js -> validated mode (full server-side checks + XSS escape)

const express = require('express');
const path = require('path');

const app = express();
const PORT = 9000;
const MODE = process.env.MODE || 'vulnerable';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// in-memory booking store
const bookings = [];

console.log(`[System] Camp Booking Server starting...`);
console.log(`[System] mode: "${MODE}"`);
console.log(`[System] http://localhost:${PORT}`);

// --- validation helpers (Task 4) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE  = /^[A-Za-zА-Яа-яІіЇїЄєҐґ'\- ]{1,60}$/u;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function validateBooking(body) {
  const errors = [];
  const { name, surname, email, age, date } = body;

  if (!name || !NAME_RE.test(name.trim()))
    errors.push('Name: required, letters only, max 60 chars');
  if (!surname || !NAME_RE.test(surname.trim()))
    errors.push('Surname: required, letters only, max 60 chars');
  if (!email || !EMAIL_RE.test(email.trim()))
    errors.push('Email: invalid format');

  const ageNum = Number(age);
  if (!age || !Number.isInteger(ageNum) || ageNum < 5 || ageNum > 100)
    errors.push('Age: must be a whole number between 5 and 100');

  if (!date) {
    errors.push('Date: required');
  } else {
    const d = new Date(date);
    if (isNaN(d.getTime()))
      errors.push('Date: not a valid date');
    else if (d < new Date())
      errors.push('Date: must be in the future');
  }

  return errors;
}

// --- HTML templates ---
function formHtml(flash = '') {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8"/>
  <title>Camp Booking</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#1f2937}
    h1{font-size:1.5rem;margin-bottom:4px}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-bottom:20px}
    .vulnerable{background:#fee2e2;color:#b91c1c}
    .validated{background:#dcfce7;color:#15803d}
    label{display:block;font-size:14px;font-weight:600;margin:14px 0 4px}
    input{width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
    button{margin-top:20px;width:100%;padding:11px;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-weight:600}
    button:hover{background:#1e40af}
    .flash{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#b91c1c;font-size:14px}
    .hint{font-size:12px;color:#6b7280;margin-top:3px}
  </style>
</head>
<body>
  <h1>🏕️ Camp Booking</h1>
  <span class="badge ${MODE}">${MODE} mode</span>
  ${flash}
  <form method="POST" action="/book">
    <label>Name
      <input name="name" placeholder="Іван" required minlength="1" maxlength="60" pattern="[A-Za-zА-Яа-яІіЇїЄєҐґ'\\- ]+" />
    </label>
    <label>Surname
      <input name="surname" placeholder="Петренко" required minlength="1" maxlength="60" pattern="[A-Za-zА-Яа-яІіЇїЄєҐґ'\\- ]+" />
    </label>
    <label>Email
      <input name="email" type="email" placeholder="ivan@example.com" required />
    </label>
    <label>Age
      <input name="age" type="number" placeholder="18" required min="5" max="100" />
      <span class="hint">5 – 100 years</span>
    </label>
    <label>Date of Booking
      <input name="date" type="date" required />
    </label>
    <button type="submit">Book Now</button>
  </form>
</body>
</html>`;
}

function confirmHtml(data, safe = false) {
  const d = safe
    ? {
        name:    escapeHtml(data.name),
        surname: escapeHtml(data.surname),
        email:   escapeHtml(data.email),
        age:     escapeHtml(data.age),
        date:    escapeHtml(data.date)
      }
    : data; // raw, unescaped (vulnerable mode - XSS possible)

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8"/>
  <title>Booking Confirmed</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#1f2937}
    .card{background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:24px}
    .card h2{margin-top:0;color:#15803d}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    td{padding:7px 0;font-size:14px;border-bottom:1px solid #d1fae5}
    td:first-child{font-weight:600;width:40%}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600}
    .vulnerable{background:#fee2e2;color:#b91c1c}
    .validated{background:#dcfce7;color:#15803d}
    a{display:inline-block;margin-top:20px;color:#1d4ed8;text-decoration:none;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <h2>✅ Booking received</h2>
    <span class="badge ${MODE}">${MODE} mode — output ${safe ? 'escaped (safe)' : 'RAW (XSS possible)'}</span>
    <table>
      <tr><td>Name</td><td>${d.name}</td></tr>
      <tr><td>Surname</td><td>${d.surname}</td></tr>
      <tr><td>Email</td><td>${d.email}</td></tr>
      <tr><td>Age</td><td>${d.age}</td></tr>
      <tr><td>Date</td><td>${d.date}</td></tr>
      <tr><td>Total bookings</td><td>${bookings.length}</td></tr>
    </table>
  </div>
  <a href="/">← New booking</a>
</body>
</html>`;
}

// --- routes ---
app.get('/', (req, res) => res.send(formHtml()));

app.post('/book', (req, res) => {
  const { name, surname, email, age, date } = req.body;
  console.log(`[POST /book] mode=${MODE}`, { name, surname, email, age, date });

  if (MODE === 'validated') {
    // Task 4: server-side validation
    const errors = validateBooking(req.body);
    if (errors.length > 0) {
      console.log(`[REJECTED]`, errors);
      const flash = `<div class="flash"><strong>Validation failed:</strong><ul style="margin:6px 0 0;padding-left:18px">${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      return res.status(400).send(formHtml(flash));
    }
    // sanitize before storing
    const booking = {
      name: name.trim(), surname: surname.trim(),
      email: email.trim(), age: Number(age), date
    };
    bookings.push(booking);
    console.log(`[ACCEPTED]`, booking);
    return res.send(confirmHtml(booking, true)); // escaped output
  }

  // Task 1/3: vulnerable mode — store and echo raw, no validation
  const booking = { name, surname, email, age, date };
  bookings.push(booking);
  console.log(`[STORED RAW]`, booking);
  res.send(confirmHtml(booking, false)); // raw output = XSS possible
});

// JSON API (same logic, for Task 3 curl/Postman demo)
app.post('/api/book', (req, res) => {
  const { name, surname, email, age, date } = req.body;
  console.log(`[POST /api/book] mode=${MODE}`, { name, surname, email, age, date });

  if (MODE === 'validated') {
    const errors = validateBooking(req.body);
    if (errors.length > 0) {
      console.log(`[REJECTED]`, errors);
      return res.status(400).json({ ok: false, errors });
    }
    const booking = { name: name.trim(), surname: surname.trim(), email: email.trim(), age: Number(age), date };
    bookings.push(booking);
    return res.json({ ok: true, booking });
  }

  const booking = { name, surname, email, age, date };
  bookings.push(booking);
  res.json({ ok: true, booking });
});

app.get('/api/bookings', (req, res) => res.json(bookings));

app.listen(PORT, () => {
  console.log(`[System] Listening on http://localhost:${PORT}`);
});
