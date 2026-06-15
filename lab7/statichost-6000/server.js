// StaticHost / CDN (http://localhost:6000) - shared libs, styles, logo
// Usage:
//   node server.js                -> no CORS, react v1.0.0
//   node server.js --mode mode1   -> open CORS (*)
//   node server.js --react breach -> serve tampered react-mock.js
//   node server.js --react v101   -> serve updated good v1.0.1

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 6000;

const argMode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1] : 'default';
const reactState = process.argv.includes('--react')
  ? process.argv[process.argv.indexOf('--react') + 1] : 'normal';

console.log('[System] Starting CDN (StaticHost) v1.0.0...');

if (argMode === 'mode1') {
  app.use(cors());
  console.log('[CORS] mode1 - Access-Control-Allow-Origin: *');
} else {
  console.log('[CORS] default - no CORS headers');
}

// react-mock.js served via route; content depends on --react.
// ACAO header is required because the SRI <script> uses crossorigin="anonymous".
const REACT_FILES = {
  normal: 'react-mock.good.js',   // v1.0.0
  breach: 'react-mock.breach.js', // malicious alert
  v101:   'react-mock.v101.js'    // v1.0.1, different bytes -> different hash
};
const reactFile = REACT_FILES[reactState] || REACT_FILES.normal;
console.log(`[React] state "${reactState}" -> ${reactFile}`);

app.get('/react-mock.js', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.type('application/javascript');
  res.send(fs.readFileSync(path.join(__dirname, reactFile)));
});

// other assets (theme.css, logo.png)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[System] CDN listening on http://localhost:${PORT}`);
});
