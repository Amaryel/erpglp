/*
 * Service worker do ErpGLP (instalação como aplicativo).
 * - Páginas: busca na rede primeiro; sem internet, abre a última versão salva.
 * - Arquivos versionados (/assets) e ícones: usa a cópia salva.
 * - Dados do banco (Supabase) nunca passam por aqui: são sempre buscados ao vivo.
 */
const CACHE = 'erpglp-v2';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon-32.png',
];

// Guarda a página e os arquivos (JS/CSS) que ela usa, para abrir sem internet
async function cacheAppShell() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  try {
    const html = await (await fetch('/', { cache: 'no-store' })).text();
    const assets = [...new Set(html.match(/\/assets\/[^"' )]+/g) || [])];
    await cache.addAll(assets);
  } catch (err) {
    console.warn('Não foi possível guardar os arquivos para uso offline:', err);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          // Nova versão publicada: guarda também os arquivos novos
          res
            .clone()
            .text()
            .then((html) => {
              const assets = [...new Set(html.match(/\/assets\/[^"' )]+/g) || [])];
              return caches.open(CACHE).then((c) => c.addAll(assets));
            })
            .catch(() => {});
          return res;
        })
        .catch(() => caches.match('/', { ignoreVary: true, ignoreSearch: true }))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req, { ignoreVary: true, ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
