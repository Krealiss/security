// GoodHost - main WebMail app (http://localhost:3000)
// config.json "mode":
//   default         - no CORS, no CSP
//   mode1           - open CORS (*)
//   csp-strict      - CSP: default-src 'self'
//   csp-balanced    - CSP: open media/style, scripts from allowlist
//   mode-insecure   - balanced CSP, React tag WITHOUT integrity (SRI off)
//   mode-sri-active - balanced CSP, React tag WITH integrity + crossorigin

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

// inject React script tag with/without integrity based on mode
const sriActive = config.mode === 'mode-sri-active';
const reactTag = sriActive
  ? `<script src="http://localhost:6000/react-mock.js" integrity="${SRI_HASH}" crossorigin="anonymous"></script>`
  : `<script src="http://localhost:6000/react-mock.js"></script>`;
console.log(`[SRI] integrity ${sriActive ? 'ON' : 'off'}`);

function sendIndex(req, res) {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('<!--REACT_SCRIPT-->', reactTag);
  res.type('html').send(html);
}
app.get('/', sendIndex);
app.get('/index.html', sendIndex);

// static (main.js, local.css, ...)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/emails', (req, res) => res.json(emails));
app.get('/api/version', (req, res) =>
  res.json({ appName: config.appName, version, mode: config.mode }));

app.listen(PORT, () => {
  console.log(`[System] GoodHost listening on http://localhost:${PORT}`);
});
