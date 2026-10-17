/* Guarda o app no celular pra abrir sem internet (academia costuma ter sinal ruim).
   Ao publicar versao nova, trocar VERSAO: o iPhone baixa tudo de novo na abertura seguinte. */
const VERSAO = 'faixa-preta-2026-10-17j';
const ARQUIVOS = [
  './', 'index.html', 'base.css', 'faixa-preta.css', 'app.css', 'visual.js', 'motor.js',
  'manifest.webmanifest', 'icone-180.png', 'icone-192.png', 'icone-512.png',
  'sons/beep.wav', 'sons/gongo.wav', 'faixa-amarrada.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Arquivo do app: do celular primeiro. Fonte do Google: guarda na primeira vez que baixar.
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET') return;
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonte) return;
  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: true }).then(achou => achou || fetch(ev.request).then(resp => {
      if (resp.ok || resp.type === 'opaque') {
        const copia = resp.clone();
        caches.open(VERSAO).then(c => c.put(ev.request, copia));
      }
      return resp;
    }))
  );
});
