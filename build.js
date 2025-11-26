const fs = require('fs');
const path = require('path');

// Читаем index.html
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Заменяем плейсхолдер на реальный Client ID
html = html.replace(/%%TWITCH_CLIENT_ID%%/g, process.env.TWITCH_CLIENT_ID);

// Сохраняем обратно
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);

// Копируем callback.html
fs.copyFileSync(
  path.join(__dirname, 'callback.html'), 
  path.join(__dirname, 'dist/callback.html')
);

console.log('Build completed!');
