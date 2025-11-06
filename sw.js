const CACHE_NAME = 'shopping-list-v1';
const urlsToCache = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Instalar Service Worker e fazer cache dos arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Erro ao cachear alguns arquivos:', err);
          // Continuar mesmo se alguns arquivos falharem
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Ativar Service Worker e limpar caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições e servir do cache quando offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar do cache se disponível
        if (response) {
          // Tentar atualizar em background se online
          fetch(event.request)
            .then(freshResponse => {
              if (freshResponse && freshResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, freshResponse.clone());
                });
              }
            })
            .catch(() => {
              // Offline, usar cache
            });
          
          return response;
        }

        // Se não está no cache, buscar da rede
        return fetch(event.request)
          .then(response => {
            // Cachear novas requisições válidas
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Retornar página offline básica se necessário
            console.log('Requisição falhou e não está no cache');
          });
      })
  );
});