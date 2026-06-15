// main.js - client-side mail logic (port 3000)

const sidebar = document.getElementById('sidebar');
const main = document.getElementById('main');
const usernameEl = document.getElementById('username');
const statusEl = document.getElementById('auth-status');
const formEl = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

let currentMode = 'default';
let csrfToken = null; // stored in JS memory, never in a cookie

function renderList(emailList) {
  sidebar.innerHTML = '';
  emailList.forEach((mail) => {
    const item = document.createElement('div');
    item.className = 'email-item';
    item.dataset.id = mail.id;
    item.innerHTML =
      `<div class="from">${mail.sender}</div>` +
      `<div class="subj">${mail.subject}</div>` +
      `<button class="del-btn" data-id="${mail.id}" title="Delete">✕</button>`;
    item.querySelector('.del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteEmail(mail.id);
    });
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

function deleteEmail(id) {
  if (currentMode === 'csrf-token') {
    // Task 4: POST with CSRF token in custom header
    fetch(`/api/emails/delete/${id}`, {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken, 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(res => { if (res.ok) loadEmails(); else console.error('[delete]', res); });
  } else {
    // Tasks 1-3: GET delete (vulnerable to CSRF via image tag)
    fetch(`/api/emails/delete/${id}`)
      .then(r => r.json())
      .then(res => { if (res.ok) loadEmails(); else console.error('[delete]', res); });
  }
}

function loadEmails() {
  fetch('/api/emails')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(renderList)
    .catch(e => {
      main.innerHTML = '<div class="empty">Не вдалося завантажити листи</div>';
      console.error('[main] failed to load emails:', e);
    });
}

function refreshAuth() {
  fetch('/api/whoami')
    .then(r => r.json())
    .then(s => {
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
        csrfToken = null;
      }
    });
}

function login() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  fetch(`/login?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}`)
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        csrfToken = res.csrfToken; // store in JS memory only
        console.log('[login] csrfToken stored in memory (not in cookie)');
        refreshAuth();
      } else {
        statusEl.innerText = 'Невірний логін або пароль';
      }
    });
}

function logout() {
  if (currentMode === 'lifecycle-secure') {
    fetch('/api/logout').then(() => {
      document.cookie = 'SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      csrfToken = null;
      refreshAuth();
    });
  } else {
    document.cookie = 'SessionID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    csrfToken = null;
    refreshAuth();
  }
}

document.getElementById('login-btn').addEventListener('click', login);
logoutBtn.addEventListener('click', logout);

fetch('/api/version').then(r => r.json()).then(v => { currentMode = v.mode; });

loadEmails();
refreshAuth();
