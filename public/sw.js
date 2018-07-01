var CACHE_NAME = 'restaurant-cache-v1';
var urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/restaurant_info.js',
  '/js/dbhelper.js',
  '/js/main.min.js',
  '/js/restaurant_info.min.js',
  '/js/dbhelper.min.js',
  '/js/lazyload.min.js',
  '/restaurant.html',
  '/restaurant.html?id=1',
  '/restaurant.html?id=2',
  '/restaurant.html?id=3',
  '/restaurant.html?id=4',
  '/restaurant.html?id=5',
  '/restaurant.html?id=6',
  '/restaurant.html?id=7',
  '/restaurant.html?id=8',
  '/restaurant.html?id=9',
  '/restaurant.html?id=10',
  '/css/styles.css',
  '/css/styles.min.css',
  '/css/styles.css?v=2',
  'https://fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2',
  'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
  '/img/1.webp',
  '/img/2.webp',
  '/img/3.webp',
  '/img/4.webp',
  '/img/5.webp',
  '/img/6.webp',
  '/img/7.webp',
  '/img/8.webp',
  '/img/9.webp',
  '/img/10.webp',
  '/img/1_sm.webp',
  '/img/2_sm.webp',
  '/img/3_sm.webp',
  '/img/4_sm.webp',
  '/img/5_sm.webp',
  '/img/6_sm.webp',
  '/img/7_sm.webp',
  '/img/8_sm.webp',
  '/img/9_sm.webp',
  '/img/10_sm.webp'
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

/*
self.addEventListener('sync', function(event) {
  console.log('firing: sync');

  const data = JSON.parse(event.tag);
  event.waitUntil(fetchReviews(data));
});

function fetchReviews(data)
{
  fetch('http://localhost:1337/reviews/', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  .then(function(response) {
    if (!response.ok) {
      throw Error(response.statusText);
    }
    // Read the response as json.
    return response.json();
  })
  .then(function(responseAsJson) {
    // Do stuff with the JSON
    console.log(responseAsJson);
  }).catch(function(error) {
    console.log(error);
  });
}*/