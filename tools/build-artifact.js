// Junta index.html + style.css + plan.js + app.js num arquivo único para publicar como artifact do Claude.
// Uso: node tools/build-artifact.js  (gera artifact/minha-rotina.html)
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
const inline = (f) => {
  const js = read(f);
  if (/<\/script/i.test(js)) throw new Error(`${f} contém </script>`);
  return `<script>\n${js}\n</script>`;
};
const page = [
  '<title>Minha Rotina</title>',
  '<style>\n' + read('style.css') + '\n</style>',
  body
    .replace('<script src="plan.js"></script>', inline('plan.js'))
    .replace('<script src="app.js"></script>', inline('app.js'))
    .trim(),
].join('\n');
if (/src="(plan|app)\.js"/.test(page)) throw new Error('script não foi embutido');
fs.mkdirSync(path.join(root, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifact', 'minha-rotina.html'), page + '\n');
console.log(`artifact/minha-rotina.html: ${(page.length / 1024).toFixed(0)} KB`);
