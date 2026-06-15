// WeatherApp - weather widget (http://localhost:5000)
// weather.js behavior controlled by startup flag:
//   node server.js                -> normal mode (logs temperature)
//   node server.js --mode breach1 -> breach mode (reads cookie + username)

const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'normal';

console.log('[System] Starting WeatherApp v1.0.0...');
console.log(`[System] weather widget mode: "${mode}"`);
if (mode === 'breach1') {
  console.log('[!] BREACH1 active - weather.js will try to read cookie and username');
}

// weather.js served dynamically; content depends on mode
app.get('/weather.js', (req, res) => {
  res.type('application/javascript');

  if (mode === 'breach1') {
    // runs in the port-3000 page context -> full access to its cookie and DOM
    res.send(
      `console.log('[weather] BREACH1: reading host page data');\n` +
      `alert("HACKED: I can see your cookies: " + document.cookie + ` +
      `" and User: " + document.getElementById('username').innerText);\n`
    );
  } else {
    res.send(
      `console.log('[weather] Current temperature: +14°C, cloudy (Port 5000)');\n`
    );
  }
});

app.listen(PORT, () => {
  console.log(`[System] WeatherApp listening on http://localhost:${PORT}`);
});
