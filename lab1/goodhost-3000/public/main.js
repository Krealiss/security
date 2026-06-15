// ============================================================
//  main.js — клієнтська логіка пошти (порт 3000)
// ============================================================

// 3.1: ставимо cookie сесії. Саме цей cookie згодом "побачить"
// сторонній скрипт через document.cookie.
document.cookie = 'SessionID=123456; path=/';

const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');

function renderList(emails) {
  sidebar.innerHTML = '';
  emails.forEach((mail) => {
    const item = document.createElement('div');
    item.className = 'email-item';
    item.innerHTML =
      `<div class="from">${mail.sender}</div>` +
      `<div class="subj">${mail.subject}</div>`;
    item.addEventListener('click', () => {
      document.querySelectorAll('.email-item')
        .forEach((el) => el.classList.remove('active'));
      item.classList.add('active');
      showEmail(mail);
    });
    sidebar.appendChild(item);
  });
}

function showEmail(mail) {
  main.innerHTML =
    `<h2>${mail.subject}</h2>` +
    `<div class="meta">Від: ${mail.sender}</div>` +
    `<p>${mail.body}</p>`;
}

// Тягнемо список листів зі свого ж сервера (same-origin, CORS не потрібен)
fetch('/api/emails')
  .then((r) => r.json())
  .then(renderList)
  .catch((e) => {
    main.innerHTML = '<div class="empty">Не вдалося завантажити листи</div>';
    console.error('[main] помилка завантаження листів:', e);
  });
