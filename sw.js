// 旅行星图 Service Worker
var CACHE_NAME = 'travelstar-v2';
var STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 安装：预缓存核心静态资源
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.log('部分资源预缓存失败（将在使用时缓存）:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存策略
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // 跳过非 GET 请求和 chrome-extension 等
  if (event.request.method !== 'GET') return;
  if (url.indexOf('chrome-extension://') === 0) return;

  // 策略1: 本地文件 — Network First（优先网络，失败时用缓存）
  if (url.indexOf('./') !== -1 || url.indexOf('index.html') !== -1) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 策略2: CDN 资源 — Cache First（优先缓存，提升速度）
  if (url.indexOf('cdnjs.cloudflare.com') !== -1 ||
      url.indexOf('unpkg.com') !== -1 ||
      url.indexOf('cdn.jsdelivr.net') !== -1) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 策略3: 其他请求 — Network First
  event.respondWith(networkFirst(event.request));
});

// 缓存优先：先从缓存取，没有则请求网络并缓存
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (!response || response.status !== 200) return response;
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(request, clone);
      });
      return response;
    }).catch(function() {
      // 离线且无缓存，返回空响应
      return new Response('', { status: 408 });
    });
  });
}

// 网络优先：先请求网络，失败时用缓存
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (!response || response.status !== 200) return response;
    var clone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(request, clone);
    });
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || new Response('离线状态下此内容不可用', { status: 503 });
    });
  });
}
