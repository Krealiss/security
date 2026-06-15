// ============================================================
//  TrustCo — партнерський віджет підтримки (http://localhost:4000)
//  Запуск:
//    node server.js              -> без CORS (default)
//    node server.js --mode mode1 -> CORS дозволено всім (*)
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 4000;

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'default';

console.log('[System] Starting TrustCo Support v1.0.0...');

if (mode === 'mode1') {
  app.use(cors());
  console.log('[CORS] mode1 — Access-Control-Allow-Origin: *');
} else {
  console.log('[CORS] default — заголовки CORS не додаються (fetch буде заблоковано)');
}

app.use(express.static(path.join(__dirname, 'public')));

// Ендпоінт, який смикає support.js при кліку на кнопку
app.get('/api/messages', (req, res) => {
  res.json({
    unread: 2,
    messages: [
      { from: 'Support Bot', text: 'Привіт! Чим можемо допомогти?' },
      { from: 'Support Bot', text: 'Середній час відповіді — 3 хвилини.' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[System] TrustCo слухає на http://localhost:${PORT}`);
});
