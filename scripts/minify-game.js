// Minifies the game's inline <script> inside www/index.html before the app is packaged.
//
// Safety notes (why this file is a bit more careful than a one-liner):
//  * String.prototype.replace treats "$&", "$'", "$`" and "$$" in a *string* replacement as
//    special patterns. Minifiers legitimately emit them (for example a variable that is
//    mangled to the name "$" followed by "&&"), which silently corrupts the page and ships a
//    game that never starts. We therefore use a replacer FUNCTION, which has no such patterns.
//  * The minified code is compiled once and the written page is read back and compared, so a
//    bad minification can never reach the store build: if anything looks wrong we simply keep
//    the readable (unminified) script.
const fs = require('fs');
const vm = require('vm');
const { minify } = require('terser');

(async () => {
  const htmlPath = 'www/index.html';
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    console.log('No inline <script> block found — skipping minification.');
    return;
  }
  const originalCode = match[1];

  let result;
  try {
    result = await minify(originalCode, {
      compress: { drop_console: false },
      mangle: true
    });
  } catch (e) {
    console.error('Minification failed, shipping unminified code instead:', e);
    return;
  }
  if (!result || result.error || !result.code) {
    console.error('Minification produced no code, shipping unminified code instead:', result && result.error);
    return;
  }

  // 1) the minified code must still be valid JavaScript
  try {
    new vm.Script(result.code);
  } catch (e) {
    console.error('Minified code does not compile, shipping unminified code instead:', e.message);
    return;
  }

  // 2) build the page with a replacer function (no "$" pattern handling)
  const out = html.replace(match[0], () => '<script>' + result.code + '</script>');

  // 3) read the script back out of the new page and make sure it is exactly the minified code
  const check = out.match(/<script>([\s\S]*?)<\/script>/);
  if (!check || check[1] !== result.code) {
    console.error('Page verification failed after minification, shipping unminified code instead.');
    return;
  }

  fs.writeFileSync(htmlPath, out);
  console.log('Minified game script: ' + originalCode.length + ' -> ' + result.code.length + ' chars (verified)');
})();
