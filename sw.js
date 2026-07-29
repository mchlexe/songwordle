self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
    // Apenas deixa as requisições passarem normalmente
    e.respondWith(fetch(e.request).catch(() => new Response('Sem conexão com a internet.')));
});