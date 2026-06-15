// Proxy (http://localhost:8080) - sits between the browser and GoodHost (3000).
// Usage:
//   node server.js               -> normal mode (transparent forward)
//   node server.js --mode breach -> sniffer: also logs the Cookie header of every request

const http = require('http');

const PORT = 8080;
const TARGET = { host: 'localhost', port: 3000 };

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'normal';

console.log('[System] Starting Proxy v1.0.0...');
console.log(`[System] proxy mode: "${mode}" (target http://localhost:3000)`);
if (mode === 'breach') console.log('[!] SNIFFER active - logging Cookie header of every request');

const server = http.createServer((creq, cres) => {
  // sniffer: raw HTTP headers are visible on the network path, HttpOnly or not
  if (mode === 'breach' && creq.headers.cookie) {
    console.log(`[SNIFFER] ${creq.method} ${creq.url}  Cookie: ${creq.headers.cookie}`);
  } else {
    console.log(`[proxy] ${creq.method} ${creq.url}`);
  }

  // forward to GoodHost
  const options = {
    host: TARGET.host,
    port: TARGET.port,
    method: creq.method,
    path: creq.url,
    headers: { ...creq.headers, host: `${TARGET.host}:${TARGET.port}` }
  };
  const preq = http.request(options, (pres) => {
    cres.writeHead(pres.statusCode, pres.headers);
    pres.pipe(cres);
  });
  preq.on('error', () => { cres.writeHead(502); cres.end('proxy error'); });
  creq.pipe(preq);
});

server.listen(PORT, () => {
  console.log(`[System] Proxy listening on http://localhost:${PORT}`);
});
