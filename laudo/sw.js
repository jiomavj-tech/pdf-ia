/* Service worker do Laudo.

   Serve para a aplicação abrir sem rede depois de instalada. Nada mais:
   não observa, não envia, não guarda relatórios nem fotos — isso vive
   na IndexedDB do aparelho e nunca passa por aqui.

   Estratégia deliberada, por causa de uma armadilha conhecida: um
   service worker que serve primeiro da cache faz a página velha
   continuar a aparecer depois de publicada uma correção, e o sintoma é
   indistinguível de um erro no código.

     - Navegação (o HTML): rede primeiro, cache só se a rede falhar.
     - Ficheiros fixos (ícones, manifesto): cache primeiro, atualizados
       em segundo plano. Mudam raramente.

   Ao mudar a aplicação, incrementar VERSAO: as caches antigas são
   apagadas no activate.
*/

// Ao incrementar, atualizar também o número mostrado no rodapé do
// index.html (elemento #versaoApp): é por ele que se vê a versão a
// correr, e é ele que o app compara com este ficheiro para avisar que
// há uma versão nova.
const VERSAO = 'laudo-v5';
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './icone-mascara.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      // addAll falha inteira se um recurso falhar; guardamos um a um.
      .then((cache) => Promise.all(
        ESSENCIAIS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;

  if (pedido.method !== 'GET') return;
  if (new URL(pedido.url).origin !== self.location.origin) return;

  // O HTML: rede primeiro.
  if (pedido.mode === 'navigate' || pedido.destination === 'document') {
    evento.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(() => caches.match(pedido).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // O resto: cache primeiro, a atualizar por trás.
  evento.respondWith(
    caches.match(pedido).then((emCache) => {
      const daRede = fetch(pedido).then((resposta) => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      }).catch(() => emCache);
      return emCache || daRede;
    })
  );
});
