let restaurant;
var map;

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
      var objectStore = window.db.createObjectStore("restaurants", {keyPath: "id"});
    }

    //Once the db is connected
    request.onsuccess = function(event){
      window.db = request.result;

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
fillRestaurantHTML = (restaurant = window.restaurant) => {
  console.log(restaurant, window.restaurant);
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  let image_lg = DBHelper.imageUrlForRestaurant(restaurant);
  let image_sm = DBHelper.imageUrlForRestaurant(restaurant, "sm");

  image.src = image_sm;
  image.setAttribute("srcset", `${image_lg} 800w, ${image_sm} 300w`);
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
  fetch('http://localhost:1337/reviews/?restaurant_id='+self.restaurant.id).then(function(res){
    if (res.status === 200) { // Got a success response from server!
      return res.json();
    }
  }).then(function(reviews){
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
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  });
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
