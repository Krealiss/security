// GoodHost - main WebMail app (http://localhost:3000)
// config.json "mode":
//   default           - no CORS, no CSP
//   mode1             - open CORS (*)
//   csp-strict        - CSP: default-src 'self'
//   csp-balanced      - CSP: open media/style, scripts from allowlist
//   mode-insecure     - balanced CSP, React tag WITHOUT integrity
//   mode-sri-active   - balanced CSP, React tag WITH integrity + crossorigin
//   session-naive     - login cookie: Path=/ (no flags)
//   session-httponly  - login cookie: Path=/; HttpOnly
//   session-secure    - login cookie: Path=/; HttpOnly; Secure
//   session-path-api  - login cookie: Path=/api; HttpOnly
//   lifecycle-naive   - HttpOnly cookie, /api/emails open (zombie sessions possible)
//   lifecycle-secure  - HttpOnly cookie, /api/emails validates session, TTL 2 min
//   csrf-vulnerable   - GET delete, no SameSite, no token (CSRF possible)
//   csrf-samesite-lax - GET delete, SameSite=Lax
//   csrf-samesite-strict - GET delete, SameSite=Strict
//   csrf-token        - POST delete, requires _csrf_token in header

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
app.use(express.json());

const readJSON = (f) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/^\uFEFF/, ''));

const version = fs.readFileSync(path.join(__dirname, 'version.txt'), 'utf8').trim();
const config = readJSON('config.json');

// in-memory email store (reset on restart)
let emails = readJSON('emails.json');

const SRI_HASH = 'sha256-Tn933QWBNzE3kV3dMqfNcjcmV6yEJDYxSzFpeZmAfA8=';

const USERS = {
  john: { password: 'john123', name: 'John Smith', sid: 'abc-123-xyz' },
  mary: { password: 'mary123', name: 'Mary Jones',  sid: 'def-456-uvw' }
};

// session store: sid -> { username, createdAt, csrfToken }
const sessions = {};
const SESSION_TTL = 2 * 60 * 1000; // 2 min
const isLifecycleSecure = config.mode === 'lifecycle-secure';

if (isLifecycleSecure) {
  setInterval(() => {
    const now = Date.now();
    for (const sid of Object.keys(sessions)) {
      if (now - sessions[sid].createdAt > SESSION_TTL) {
        console.log(`[TTL] session expired: ${sid} (${sessions[sid].username})`);
        delete sessions[sid];
      }
    }
  }, 30000);
}

console.log(`[System] Starting ${config.appName} v${version}...`);
console.log(`[System] mode: "${config.mode}"`);

// CORS
if (config.mode === 'mode1') {
  app.use(cors());
  console.log('[CORS] mode1 - any origin (*)');
}

// CSP
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

// cookie flags per mode
function cookieFlags() {
  if (config.mode === 'session-httponly')     return '; Path=/; HttpOnly';
  if (config.mode === 'session-secure')       return '; Path=/; HttpOnly; Secure';
  if (config.mode === 'session-path-api')     return '; Path=/api; HttpOnly';
  if (config.mode === 'lifecycle-naive')      return '; Path=/';
  if (config.mode === 'lifecycle-secure')     return '; Path=/; HttpOnly';
  if (config.mode === 'csrf-vulnerable')      return '; Path=/; HttpOnly';
  if (config.mode === 'csrf-samesite-lax')    return '; Path=/; HttpOnly; SameSite=Lax';
  if (config.mode === 'csrf-samesite-strict') return '; Path=/; HttpOnly; SameSite=Strict';
  if (config.mode === 'csrf-token')           return '; Path=/; HttpOnly; SameSite=Lax';
  return '; Path=/';
}
console.log(`[Cookie] flags: ${cookieFlags()}`);

function getSessionId(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)SessionID=([^;]+)/);
  return m ? m[1] : null;
}

function isSessionValid(sid) {
  if (!sid || !sessions[sid]) return false;
  if (isLifecycleSecure && Date.now() - sessions[sid].createdAt > SESSION_TTL) {
    delete sessions[sid];
    return false;
  }
  return true;
}

// SRI
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
  const csrfToken = crypto.randomBytes(16).toString('hex');
  sessions[user.sid] = { username, createdAt: Date.now(), csrfToken };
  res.setHeader('Set-Cookie', `SessionID=${user.sid}${cookieFlags()}`);
  console.log(`[Auth] login: ${username} -> SessionID=${user.sid} csrfToken=${csrfToken}`);
  // csrf token returned in JSON (stored in JS memory, not in cookie)
  res.json({ ok: true, name: user.name, username, csrfToken });
});

app.get('/api/logout', (req, res) => {
  const sid = getSessionId(req);
  if (sid && sessions[sid]) {
    console.log(`[Auth] server-side logout: ${sessions[sid].username} (${sid})`);
    delete sessions[sid];
  }
  res.setHeader('Set-Cookie', 'SessionID=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/logout', (req, res) => {
  const sid = getSessionId(req);
  if (sid) delete sessions[sid];
  res.setHeader('Set-Cookie', 'SessionID=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/whoami', (req, res) => {
  const sid = getSessionId(req);
  const valid = isSessionValid(sid);
  const s = valid ? sessions[sid] : null;
  const user = s ? USERS[s.username] : null;
  res.json({ loggedIn: !!user, name: user ? user.name : null, cookieReceived: !!sid });
});

// --- emails ---
app.get('/api/emails', (req, res) => {
  if (isLifecycleSecure) {
    const sid = getSessionId(req);
    if (!isSessionValid(sid)) {
      return res.status(401).json({ error: 'Unauthorized - session invalid or expired' });
    }
  }
  res.json(emails);
});

// Task 1/2/3: GET delete (intentionally unsafe, exploitable via CSRF image tag)
const csrfGETexposed = ['csrf-vulnerable','csrf-samesite-lax','csrf-samesite-strict'];
app.get('/api/emails/delete/:id', (req, res) => {
  const sid = getSessionId(req);
  if (!sid || !sessions[sid]) {
    console.log(`[DELETE GET] rejected: no valid session`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const id = parseInt(req.params.id, 10);
  const before = emails.length;
  emails = emails.filter(e => e.id !== id);
  const deleted = before !== emails.length;
  console.log(`[DELETE GET] id=${id} deleted=${deleted} mode=${config.mode} sid=${sid}`);
  res.json({ ok: deleted, id, remaining: emails.length });
});

// Task 4: POST delete with CSRF token
app.post('/api/emails/delete/:id', (req, res) => {
  const sid = getSessionId(req);
  if (!sid || !sessions[sid]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // verify token from custom header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf_token;
  const expected = sessions[sid].csrfToken;
  if (config.mode === 'csrf-token' && token !== expected) {
    console.log(`[DELETE POST] CSRF rejected: got="${token}" expected="${expected}"`);
    return res.status(403).json({ error: 'Forbidden - invalid CSRF token' });
  }
  const id = parseInt(req.params.id, 10);
  const before = emails.length;
  emails = emails.filter(e => e.id !== id);
  const deleted = before !== emails.length;
  console.log(`[DELETE POST] id=${id} deleted=${deleted} token OK`);
  res.json({ ok: deleted, id, remaining: emails.length });
});

// reset emails (for repeated testing)
app.get('/api/emails/reset', (req, res) => {
  emails = readJSON('emails.json');
  res.json({ ok: true, count: emails.length });
});

app.get('/other', (req, res) => {
  const sid = getSessionId(req);
  res.json({ path: '/other', cookieReceived: !!sid, sessionId: sid });
});
app.get('/api/version', (req, res) =>
  res.json({ appName: config.appName, version, mode: config.mode }));

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[System] GoodHost listening on http://localhost:${PORT}`);
});
