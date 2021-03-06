let restaurants = [],
  neighborhoods,
  cuisines
var map
var markers = []

/*** Register service workers ***/
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register("sw.js").then(function(registration){
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }).catch(function(err){
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
/*** ./register service workers ***/

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  //Load the map
  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDZO7fxB9DC1sDmPqHnETdpcGCiPjEm9Og&libraries=places&callback=initMap";
  document.head.appendChild(s);

  //Once the db is connected
  request.onsuccess = function(event){
    db = request.result;

    let objectStore = db.transaction("restaurants").objectStore("restaurants");
    objectStore.openCursor().onsuccess = function(event) {
      let cursor = event.target.result;

      if(cursor){
        if(!window.restaurants) window.restaurants = [];
        window.restaurants.push(cursor.value);
        cursor.continue();
      }else{
        fetchNeighborhoods();
        fetchCuisines();
        updateRestaurants();
      }
    };
  };

  /**
   * Initialize Google map, called from HTML.
   */
  window.initMap = () => {
    let loc = {
      lat: 40.722216,
      lng: -73.987501
    };
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });
  }
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.classList.add("col", "col-1-4", "col-1-2-sm", "col-1-3-md");

  const card = document.createElement('div');
  card.classList.add("card");
  li.append(card);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant, "sm"));
  image.setAttribute("alt", `Photo of the restaurant "${restaurant.name}"`)
  card.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.className = 'truncate';
  card.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  card.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.className = 'truncate';
  card.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute("alt", `More details about "${restaurant.name}"`);
  more.href = DBHelper.urlForRestaurant(restaurant);
  card.append(more)

  var myLazyLoad = new LazyLoad();

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}





/*** IndexedDB ***/
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if(!window.indexedDB){
  console.log("This browser doesn't support IndexedDB");
}

let db;
let request = window.indexedDB.open("MyDatabase", 1);

request.onerror = function(event) {
  console.log("Error connecting to the db");
};

request.onupgradeneeded = function(event){
  window.db = event.target.result;
  var objectStore = window.db.createObjectStore("restaurants", {keyPath: "id"});
  var objectStore2 = window.db.createObjectStore("reviews", {keyPath: "id"});
}

function add2DB(restaurant, db){
  console.log(db);
  window.request = db.transaction(["restaurants"], "readwrite")
    .objectStore("restaurants")
    .add(restaurant);

  window.request.onsuccess = function(event) {
    console.log("The restaurant has been added to the db");
  };

  window.request.onerror = function(event) {
    console.log("Unable to add to the db");
  }
}
/*** ./indexedDB ***/