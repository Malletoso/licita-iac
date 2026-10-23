// Gera duas saídas a partir de src/:
//   web/   -> site estático instalável (PWA) para o GitHub Pages, funciona offline
//   dist/licita-iac-artifact.html -> arquivo único para publicar como artefato no claude.ai
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = p => readFileSync(join(raiz, p), 'utf8');
const DOCX_VERSAO = JSON.parse(ler('node_modules/docx/package.json')).version;

const shell = ler('src/shell.html');
const core = ler('src/core.js');
const ui = ler('src/ui.js');
const simples = ler('src/simples.js');
const app = `${core}\n${simples}\n${ui}`;

// ---------- artefato (claude.ai): página única, docx pela CDN ----------
mkdirSync(join(raiz, 'dist'), { recursive: true });
writeFileSync(join(raiz, 'dist/licita-iac-artifact.html'),
  `${shell}\n<script src="https://cdn.jsdelivr.net/npm/docx@${DOCX_VERSAO}/dist/index.iife.js"></script>\n<script>\n${app}\n</script>\n`);

// ---------- site (GitHub Pages / PWA) ----------
const web = join(raiz, 'web');
rmSync(web, { recursive: true, force: true });
mkdirSync(join(web, 'vendor'), { recursive: true });
mkdirSync(join(web, 'icons'), { recursive: true });

copyFileSync(join(raiz, 'node_modules/docx/dist/index.iife.js'), join(web, 'vendor/docx.iife.js'));
for (const f of readdirSync(join(raiz, 'static/icons'))) copyFileSync(join(raiz, 'static/icons', f), join(web, 'icons', f));
writeFileSync(join(web, 'app.js'), app);

const reset = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';
const registroSW = `<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
</script>`;
writeFileSync(join(web, 'index.html'), `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Gerador de processos de licitação e contratação direta pela Lei nº 14.133/2021.">
<meta name="theme-color" content="#0d6466">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>${reset}</style>
</head>
<body>
${shell}
<script src="vendor/docx.iife.js"></script>
<script src="app.js"></script>
${registroSW}
</body>
</html>
`);

writeFileSync(join(web, 'manifest.webmanifest'), JSON.stringify({
  name: 'Licita IAC',
  short_name: 'Licita IAC',
  description: 'Processos de licitação e contratação direta pela Lei nº 14.133/2021, com peças em Word.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#f4f7f7',
  theme_color: '#0d6466',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));

// versão do cache muda sempre que o conteúdo do app muda
const versao = createHash('sha256').update(app + shell + DOCX_VERSAO).digest('hex').slice(0, 10);
writeFileSync(join(web, 'sw.js'), `// Gerado por scripts/build.mjs — não editar à mão
const CACHE = 'licita-iac-${versao}';
const FONTES = 'licita-iac-fontes';
const ARQUIVOS = ['./', 'index.html', 'app.js', 'vendor/docx.iife.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // app: rede primeiro (pega versões novas), cache se offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else if (/fonts\\.(googleapis|gstatic)\\.com$/.test(url.hostname)) {
    // fontes: cache primeiro
    e.respondWith(caches.open(FONTES).then(c => c.match(req).then(r => r || fetch(req).then(n => { c.put(req, n.clone()); return n; }))));
  }
});
`);

console.log(`build ok — docx ${DOCX_VERSAO}, cache ${versao}`);
