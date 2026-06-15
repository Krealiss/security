// ============================================================
//  StaticHost / CDN (http://localhost:6000)
//  Віддає спільні бібліотеки, стилі та логотип.
//  Запуск:
//    node server.js              -> без CORS (default)
//    node server.js --mode mode1 -> CORS дозволено всім (*)
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 6000;

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'default';

console.log('[System] Starting CDN (StaticHost) v1.0.0...');

if (mode === 'mode1') {
  app.use(cors());
  console.log('[CORS] mode1 — Access-Control-Allow-Origin: *');
} else {
  console.log('[CORS] default — заголовки CORS не додаються');
}

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[System] CDN слухає на http://localhost:${PORT}`);
});
