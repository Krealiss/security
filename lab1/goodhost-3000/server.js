// ============================================================
//  GoodHost — основний застосунок WebMail (http://localhost:3000)
//  Хостить інтерфейс пошти та дані листів.
//  Режим роботи перемикається у config.json: "default" або "mode1".
// ============================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// --- 1.2 Читаємо version.txt та config.json під час старту ---
const version = fs.readFileSync(path.join(__dirname, 'version.txt'), 'utf8').trim();
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const emails = JSON.parse(fs.readFileSync(path.join(__dirname, 'emails.json'), 'utf8'));

console.log(`[System] Starting ${config.appName} v${version}...`);
console.log(`[System] Поточний режим CORS: "${config.mode}"`);

// --- Завдання 6: "mode1" відкриває CORS для всіх джерел ---
// У режимі "default" жоден заголовок CORS не додається,
// тому крос-доменні fetch() будуть заблоковані браузером.
if (config.mode === 'mode1') {
  app.use(cors()); // Access-Control-Allow-Origin: *
  console.log('[CORS] mode1 активний — дозволено будь-яке джерело (*)');
} else {
  console.log('[CORS] default — крос-доменні запити fetch блокуються');
}

// Статика: index.html, main.js
app.use(express.static(path.join(__dirname, 'public')));

// --- 3.1 Дані: список листів ---
app.get('/api/emails', (req, res) => {
  res.json(emails);
});

// Допоміжний ендпоінт для перевірки версії застосунку
app.get('/api/version', (req, res) => {
  res.json({ appName: config.appName, version, mode: config.mode });
});

app.listen(PORT, () => {
  console.log(`[System] GoodHost слухає на http://localhost:${PORT}`);
});
