var CACHE_NAME = '-restaurant-cache-v1';
var urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/dbhelper.js',
  '/restaurant.html',
  '/css/styles.css',
  '/data/restaurants.json',
  'https://fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2',
  'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
  '/img/1.jpg',
  '/img/2.jpg',
  '/img/3.jpg',
  '/img/4.jpg',
  '/img/5.jpg',
  '/img/6.jpg',
  '/img/7.jpg',
  '/img/8.jpg',
  '/img/9.jpg',
  '/img/10.jpg',
  '/img/1_sm.jpg',
  '/img/2_sm.jpg',
  '/img/3_sm.jpg',
  '/img/4_sm.jpg',
  '/img/5_sm.jpg',
  '/img/6_sm.jpg',
  '/img/7_sm.jpg',
  '/img/8_sm.jpg',
  '/img/9_sm.jpg',
  '/img/10_sm.jpg'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event){
  event.respondWith(
    caches.match(event.request)
      .then(function(response){
        if(response) return response;

        return fetch(event.request);
      }
    )
  );
});
