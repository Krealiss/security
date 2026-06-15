// GoodHost — main WebMail app (http://localhost:3000)
// config.json "mode":
//   default         - no CORS, no CSP
//   mode1           - open CORS (*)
//   csp-strict      - CSP: default-src 'self'
//   csp-balanced    - CSP: open media/style, scripts from allowlist
//   mode-insecure   - balanced CSP, React tag WITHOUT integrity
//   mode-sri-active - balanced CSP, React tag WITH integrity + crossorigin
//   session-naive   - login cookie: Path=/ (no flags)
//   session-httponly- login cookie: Path=/; HttpOnly
//   session-path-api- login cookie: Path=/api; HttpOnly

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// BOM-safe JSON read (Notepad on Windows prepends \uFEFF)
const readJSON = (f) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/^\uFEFF/, ''));

const version = fs.readFileSync(path.join(__dirname, 'version.txt'), 'utf8').trim();
const config = readJSON('config.json');
const emails = readJSON('emails.json');

// SHA-256 base64 of the good react-mock.js v1.0.0 (integrity value)
const SRI_HASH = 'sha256-Tn933QWBNzE3kV3dMqfNcjcmV6yEJDYxSzFpeZmAfA8=';

// demo users + in-memory session store
const USERS = {
  john: { password: 'john123', name: 'John Smith', sid: 'abc-123-xyz' },
  mary: { password: 'mary123', name: 'Mary Jones',  sid: 'def-456-uvw' }
};
const sessions = {}; // SessionID -> username

console.log(`[System] Starting ${config.appName} v${version}...`);
console.log(`[System] mode: "${config.mode}"`);

// CORS
if (config.mode === 'mode1') {
  app.use(cors());
  console.log('[CORS] mode1 - any origin (*)');
}

// CSP; Lab 3 modes inherit the balanced policy
const CSP_BALANCED =
  "default-src 'self'; img-src *; style-src *; " +
  "script-src 'self' http://localhost:4000 http://localhost:6000;";
const CSP_BY_MODE = {
  'csp-strict': "default-src 'self';",
  'csp-balanced': CSP_BALANCED,
  'mode-insecure': CSP_BALANCED,
  'mode-sri-active': CSP_BALANCED
};
if (CSP_BY_MODE[config.mode]) {
  const policy = CSP_BY_MODE[config.mode];
  app.use((req, res, next) => { res.setHeader('Content-Security-Policy', policy); next(); });
  console.log(`[CSP] ${config.mode} -> ${policy}`);
}

// cookie flags by mode (naive baseline, hardened in session-* modes)
function cookieFlags() {
  if (config.mode === 'session-httponly') return '; Path=/; HttpOnly';
  if (config.mode === 'session-path-api') return '; Path=/api; HttpOnly';
  return '; Path=/';
}
console.log(`[Cookie] Set-Cookie flags: SessionID=<sid>${cookieFlags()}`);

function getSessionId(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)SessionID=([^;]+)/);
  return m ? m[1] : null;
}

// inject React script tag with/without integrity based on mode
const sriActive = config.mode === 'mode-sri-active';
const reactTag = sriActive
  ? `<script src="http://localhost:6000/react-mock.js" integrity="${SRI_HASH}" crossorigin="anonymous"></script>`
  : `<script src="http://localhost:6000/react-mock.js"></script>`;

function sendIndex(req, res) {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('<!--REACT_SCRIPT-->', reactTag);
  res.type('html').send(html);
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);

// --- auth ---
app.get('/login', (req, res) => {
  const { username, password } = req.query;
  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }
  sessions[user.sid] = username;
  res.setHeader('Set-Cookie', `SessionID=${user.sid}${cookieFlags()}`);
  console.log(`[Auth] login: ${username} -> SessionID=${user.sid}`);
  res.json({ ok: true, name: user.name, username });
});

app.get('/logout', (req, res) => {
  const sid = getSessionId(req);
  if (sid) delete sessions[sid];
  res.setHeader('Set-Cookie', 'SessionID=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// who is logged in (server reads the cookie, so works even when HttpOnly)
app.get('/api/whoami', (req, res) => {
  const sid = getSessionId(req);
  const username = sid ? sessions[sid] : null;
  const user = username ? USERS[username] : null;
  res.json({ loggedIn: !!user, name: user ? user.name : null, cookieReceived: !!sid });
});

// Task 4: shows whether the browser sent the cookie to this path
app.get('/other', (req, res) => {
  const sid = getSessionId(req);
  res.json({ path: '/other', cookieReceived: !!sid, sessionId: sid });
});

app.get('/api/emails', (req, res) => res.json(emails));
app.get('/api/version', (req, res) =>
  res.json({ appName: config.appName, version, mode: config.mode }));

// static (main.js, local.css, ...)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[System] GoodHost listening on http://localhost:${PORT}`);
});
