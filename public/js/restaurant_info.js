let restaurant;
var map;

/*** Register service workers ***/
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register("sw.js").then(function(registration){
        document.getElementById('submitReview').addEventListener('click', () => {
          /*
          registration.sync.register(JSON.stringify(data)).then((reg) => {
            console.log('sync registered');
          }).catch(function(error){
            console.log('Unable to fetch.');
          });
          */

          if(navigator.onLine){
            sendReview();
          }else{
            window.addEventListener('online', sendReview);
          }
        });
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }).catch(function(err){
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
/*** ./register service workers ***/

sendReview = () => {
  const data = {
    "restaurant_id": window.restaurant.id,
    "name": document.getElementById("formName").value,
    "rating": document.getElementById("formScore").value,
    "comments": document.getElementById("formReview").value
  }
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

    let request = window.indexedDB.open("MyDatabase", Date.now());
    request.onsuccess = (result) => {
      addReview(responseAsJson, result.db);
    }
    
    window.location.reload();
  }).catch(function(error) {
    console.log(error);
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  /**
   * Initialize Google map, called from HTML.
   */
  window.initMap = () => {
    let request = window.indexedDB.open("MyDatabase", 1);

    request.onerror = function(event) {
      console.log("Error connecting to the db");
    };

    request.onupgradeneeded = function(event){
      window.db = event.target.result;
      const objectStore1 = window.db.createObjectStore("restaurants", {keyPath: "id"});
      const objectStore2 = window.db.createObjectStore("reviews", {keyPath: "id"});
    }

    //Once the db is connected
    request.onsuccess = function(event){
      window.db = event.target.result;

      let objectStore = window.db.transaction("restaurants").objectStore("restaurants");
      objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;

        if(cursor){
          if(cursor.value.id == getParameterByName('id')) window.restaurant = cursor.value;

          cursor.continue();
        }else{
          fetchRestaurantFromURL((error, restaurant) => {
            if (error) { // Got an error!
              console.error(error);
            } else {
              self.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 16,
                center: window.restaurant.latlng,
                scrollwheel: false
              });
              fillBreadcrumb();
              DBHelper.mapMarkerForRestaurant(window.restaurant, self.map);
            }
          });
        };
      }

      let objectStore2 = window.db.transaction("reviews").objectStore("reviews");
      objectStore2.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;

        if(cursor){
          if(!window.reviews) window.reviews = [];
          window.reviews.push(cursor.value);
          cursor.continue();
        }
      };
    }
  }
});

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (window.restaurant) { // restaurant already fetched!
    console.log("Already fetched", window.restaurant)
    fillRestaurantHTML();
    callback(null, restaurant)
    return;
  }

  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      window.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant) => {
  if(!restaurant) restaurant = window.restaurant;
  
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  let image_lg = DBHelper.imageUrlForRestaurant(restaurant);
  let image_sm = DBHelper.imageUrlForRestaurant(restaurant, "sm");

  image.setAttribute("data-src", image_sm);
  image.setAttribute("data-srcset", `${image_lg} 800w, ${image_sm} 300w`);
  image.setAttribute("alt", `Photo of the restaurant "${name.innerHTML}"`);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  //Add the favorite button
  let favButton = '';
  if(restaurant.is_favorite == "true"){
    favButton = `<button type='button' onclick='toggleFavorite(false)'>Remove from favorite</button>`;
  }else{
    favButton = `<button type='button' onclick='toggleFavorite(true)'>Add to favorite</button>`;
  }
  document.getElementById("favorite").innerHTML = favButton;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  var myLazyLoad = new LazyLoad();

  // fill reviews
  fillReviewsHTML();
}

toggleFavorite = (bool) => {
  console.log(`http://localhost:1337/restaurants/${window.restaurant.id}/?is_favorite=${bool?'true':'false'}`);

  fetch(`http://localhost:1337/restaurants/${window.restaurant.id}/?is_favorite=${bool?'true':'false'}`, {
    method: 'PUT'
  }).then((res) => {
    return res.json();
  }).then((res) => {
    const request =  window.db.transaction(["restaurants"], "readwrite")
      .objectStore("restaurants")
      .put(res);

      console.log("The final res is ", res.is_favorite);

      request.onsuccess = function(e){
        console.log("ok", e);

        //Refresh
        window.location.reload();
      };
      request.onerror = function(e){
          console.log('Error adding:', e);
      };
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  window.setTimeout(function(){
    const revs = [];
    if(window.reviews){
      const revs = window.reviews.filter(rev => {
        return rev.restaurant_id == window.restaurant.id;
      });
    }

    if(revs && revs.length > 0){
      console.log("dfafsdfsdfsdf", reviews);
      _fillReviewsHTML()
    }else{
      console.log("NO");
      fetch('http://localhost:1337/reviews/?restaurant_id='+window.restaurant.id).then(function(res){
        if (res.status === 200) { // Got a success response from server!
          return res.json();
        }
      }).then(function(reviews){
        window.reviews = reviews;
  
        for(let review in reviews){
          addReview(window.reviews[review], window.db);
        }

        _fillReviewsHTML()
      });
    }
  }, 300);
}

_fillReviewsHTML = () => {
  const reviews = window.reviews;

  console.log(reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h4');
  title.className += " h2";
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    console.log(review.restaurant_id,"and",window.restaurant.id);
    if(review.restaurant_id  == window.restaurant.id) ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('h4');
  name.innerHTML = review.name;
  name.className = "review-author";
  li.appendChild(name);

  const revBody = document.createElement('div');
  revBody.className = "review-body";
  li.appendChild(revBody);

  const date = document.createElement('p');
  const createdAt = new Date(review.createdAt);
  date.innerHTML = createdAt.getDate()+"/"+createdAt.getMonth()+"/"+createdAt.getFullYear();
  revBody.appendChild(date);

  const rating = document.createElement('p');
  let stars = '';
  for(let i = 0; i < review.rating; i++){
    stars += "&#9733; ";
  }
  rating.innerHTML = `<div class='review-stars' aria-label="Rating from ${review.name}: ${review.rating} stars">${stars}</div>`;
  revBody.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  revBody.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.setAttribute("aria-current", "page")
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}




// Connection Status
function isOnline() {
  var connectionStatus = document.getElementById('connectionStatus');

  if (!navigator.onLine){
    document.getElementById('connectionError').style.display = 'block';
  }else{
    document.getElementById('connectionError').style.display = 'none';
  }
}
window.addEventListener('online', isOnline);
window.addEventListener('offline', isOnline);
isOnline();

/*** IndexedDB ***/
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

  if(!window.indexedDB){
    console.log("This browser doesn't support IndexedDB");
  }

  function add2DB(restaurant, db){
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

  function addReview(review, db){
    console.log("Review added");
    window.request = db.transaction(["reviews"], "readwrite")
      .objectStore("reviews")
      .add(review);

    window.request.onsuccess = function(event) {
      console.log("The review has been added to the db");
    };

    window.request.onerror = function(event) {
      console.log("Unable to add to the db");
    }
  }
/*** ./indexedDB ***/