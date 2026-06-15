// ============================================================
//  support.js — віджет підтримки від TrustCo (порт 4000).
//  Завантажується на сторінці пошти (порт 3000) як <script>.
// ============================================================

(function () {
  const ORIGIN = 'http://localhost:4000';

  // 4.1.1 — вставляємо кнопку "Chat with Support" у правий нижній кут
  const btn = document.createElement('button');
  btn.textContent = '💬 Chat with Support';
  Object.assign(btn.style, {
    position: 'fixed',
    right: '24px',
    bottom: '24px',
    padding: '12px 18px',
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '24px',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
    zIndex: 9999
  });

  // Невелика панель для відповіді
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    right: '24px',
    bottom: '76px',
    width: '260px',
    padding: '12px 14px',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
    fontSize: '13px',
    display: 'none',
    zIndex: 9999
  });
  panel.textContent = 'Натисніть кнопку, щоб перевірити нові повідомлення.';

  // 4.1.2 — на клік робимо крос-доменний fetch() до порту 4000.
  // У режимі "default" цей запит блокується Same-Origin Policy (CORS-помилка).
  btn.addEventListener('click', () => {
    panel.style.display = 'block';
    panel.textContent = 'Завантаження…';
    fetch(`${ORIGIN}/api/messages`)
      .then((r) => r.json())
      .then((data) => {
        panel.innerHTML =
          `<strong>Нових повідомлень: ${data.unread}</strong><br>` +
          data.messages.map((m) => `• ${m.text}`).join('<br>');
      })
      .catch((err) => {
        panel.innerHTML =
          '<span style="color:#b91c1c">Не вдалося отримати повідомлення.<br>' +
          'Імовірно, заблоковано CORS (Same-Origin Policy).</span>';
        console.error('[support] fetch заблоковано:', err);
      });
  });

  document.body.appendChild(panel);
  document.body.appendChild(btn);
  console.log('[support] Віджет підтримки завантажено з', ORIGIN);
})();
