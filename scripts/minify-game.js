const fs = require('fs');
const { minify } = require('terser');

(async () => {
  const htmlPath = 'www/index.html';
  let html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    console.log('No inline <script> block found — skipping minification.');
    return;
  }
  const originalCode = match[1];
  const result = await minify(originalCode, {
    compress: { drop_console: false },
    mangle: true
  });
  if (result.error) {
    console.error('Minification failed, shipping unminified code instead:', result.error);
    return;
  }
  html = html.replace(match[0], '<script>' + result.code + '</script>');
  fs.writeFileSync(htmlPath, html);
  console.log('Minified game script: ' + originalCode.length + ' -> ' + result.code.length + ' chars');
})();
