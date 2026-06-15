// main.js - client-side mail logic (port 3000)
// Session cookie is now set by the server on /login (Set-Cookie),
// so it can carry HttpOnly. No client-side document.cookie here.

const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const usernameEl = document.getElementById('username');
const statusEl = document.getElementById('auth-status');
const formEl = document.getElementById('login-form');

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

// reflect login state (server reads the cookie, works with HttpOnly too)
function refreshAuth() {
  fetch('/api/whoami')
    .then((r) => r.json())
    .then((s) => {
      if (s.loggedIn) {
        usernameEl.innerText = s.name;
        statusEl.innerText = 'Logged in as ' + s.name;
        formEl.style.display = 'none';
      } else {
        usernameEl.innerText = 'Guest';
        statusEl.innerText = '';
        formEl.style.display = '';
      }
    });
}

function login() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  fetch(`/login?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`)
    .then((r) => r.json())
    .then((res) => {
      if (res.ok) refreshAuth();
      else statusEl.innerText = 'Невірний логін або пароль';
    });
}

document.getElementById('login-btn').addEventListener('click', login);

// fetch email list from same origin (no CORS needed)
fetch('/api/emails')
  .then((r) => r.json())
  .then(renderList)
  .catch((e) => {
    main.innerHTML = '<div class="empty">Не вдалося завантажити листи</div>';
    console.error('[main] failed to load emails:', e);
  });

refreshAuth();
