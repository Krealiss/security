// react-mock.js — імітація бібліотеки React, що віддається з CDN (порт 6000).
// Реального React тут немає; скрипт лише підтверджує факт завантаження з CDN.
console.log('React v1.0.0 loaded from CDN (Port 6000)');

window.ReactMock = {
  version: '1.0.0',
  createElement() {
    console.log('[ReactMock] createElement викликано (заглушка)');
  }
};
