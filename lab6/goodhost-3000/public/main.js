// main.js - client-side mail logic (port 3000)

const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const usernameEl = document.getElementById('username');
const statusEl = document.getElementById('auth-status');
const formEl = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

let currentMode = 'default';

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

function refreshAuth() {
  fetch('/api/whoami')
    .then((r) => r.json())
    .then((s) => {
      if (s.loggedIn) {
        usernameEl.innerText = s.name;
        statusEl.innerText = 'Logged in as ' + s.name;
        formEl.style.display = 'none';
        logoutBtn.style.display = '';
      } else {
        usernameEl.innerText = 'Guest';
        statusEl.innerText = '';
        formEl.style.display = '';
        logoutBtn.style.display = 'none';
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

function logout() {
  if (currentMode === 'lifecycle-secure') {
    // Task 2: synchronized logout - invalidate server-side first, then clear cookie
    fetch('/api/logout')
      .then(() => {
        console.log('[logout] server session invalidated, clearing cookie');
        document.cookie = 'SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        refreshAuth();
      });
  } else {
    // Task 1: client-only logout - just clear the cookie, server session stays alive (zombie)
    document.cookie = 'SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('[logout] cookie cleared client-side only (server session still alive)');
    refreshAuth();
  }
}

document.getElementById('login-btn').addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

// load mode, then emails
fetch('/api/version').then(r => r.json()).then(v => { currentMode = v.mode; });

fetch('/api/emails')
  .then((r) => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then(renderList)
  .catch((e) => {
    main.innerHTML = '<div class="empty">Не вдалося завантажити листи</div>';
    console.error('[main] failed to load emails:', e);
  });

refreshAuth();
