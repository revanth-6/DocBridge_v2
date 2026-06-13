const fs = require('fs');
const path = require('path');

const files = [
  'gateway/src/middleware/errorHandler.js',
  ...fs.readdirSync(path.join(__dirname, '..', 'services')).map(s => `services/${s}/src/app.js`)
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/\s*\.\.\.\(env\.NODE_ENV === 'development' && \{ stack: err\.stack \}\),/g, '');
    fs.writeFileSync(fullPath, content);
    console.log('Fixed', file);
  }
});
