/*** IndexedDB ***/
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

if(!window.indexedDB){
  console.log("This browser doesn't support IndexedDB");
}

var db;
var request = window.indexedDB.open("MyDatabase", 1);

request.onerror = function(event) {
  console.log("Error connecting to the db");
};

request.onupgradeneeded = function(event){
  var db = event.target.result;
  var objectStore = db.createObjectStore("restaurants", {keyPath: "name"});

  fetch(DBHelper.DATABASE_URL).then(function(res){
    if (res.status === 200) { // Got a success response from server!
      return res.json();
    } else { // Oops!. Got an error from server.
      const error = (`Request failed. Returned status of ${res.status}`);
      callback(error, null);
    }
  }).then(function(res){
    const restaurants = res;

    console.log(res);

    for(res in restaurants){
      add2DB(restaurants[res], db);
    }

    //Fix problem with google maps for
    window.setTimeout(() => location.reload(), 400);
  });
}

function add2DB(restaurant, db){
  var request = db.transaction(["restaurants"], "readwrite")
    .objectStore("restaurants")
    .add(restaurant);

  request.onsuccess = function(event) {
    console.log("The restaurant has been added to the db");
  };

  request.onerror = function(event) {
    console.log("Unable to add to the db");
  }
}
/*** ./indexedDB ***/


/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `http://localhost:1337/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
static fetchRestaurants(callback) {
  var objectStore = db.transaction("restaurants").objectStore("restaurants");

  var items = [];
  objectStore.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;

    if(cursor){
      items.push(cursor.value);
      cursor.continue();
    }else{
      callback(null, items);
    }
  };
}

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    fetch(DBHelper.DATABASE_URL+"/"+id).then(function(res){
      if (res.status === 200) { // Got a success response from server!
        return res.json();
      } else { // Oops!. Got an error from server.
        callback(error, null);
      }
    }).then(function(res){
      const restaurant = res;
      callback(null, restaurant);
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, size) {
    //If the restaurant has no photo
    if(!restaurant.photograph) return ("https://via.placeholder.com/800x600?text=No%20Photo");

    //If it asks for a different size, show that size
    if(size)restaurant.photograph = restaurant.photograph.replace(/.jpg/, `_${size}.jpg`);

    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
