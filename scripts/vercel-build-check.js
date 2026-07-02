const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'frontend/index.html',
  'frontend/admin-login.html',
  'frontend/admin.html',
  'frontend/js/main.js',
  'frontend/js/admin.js',
  'frontend/css/style.css',
  'frontend/css/admin.css',
  'backend/app.js',
  'backend/server.js',
  'api/index.js',
  'api/[...path].js',
  'vercel.json',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(__dirname, '..', file)));
if (missing.length) {
  console.error(`Missing required deployment files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Vercel build check passed.');
