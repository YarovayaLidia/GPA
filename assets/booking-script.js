let map, currentPolyline;
// TODO: replace with the driver's/owner's WhatsApp number in international format without the leading '+'
const driverWhatsAppNumber = "393476308563";

const locations = {
  "Airport": { lat: 51.4700, lng: -0.4543 },
  "City Center": { lat: 51.5074, lng: -0.1278 },
  "Hotel Zone": { lat: 51.5150, lng: -0.1420 },
  "Olbia via Marina, Sardegna": { lat: 40.9294, lng: 9.5145 }
};

const priceTable = [
  { from: "Airport", to: "City Center", price: 40 },
  { from: "Airport", to: "Hotel Zone", price: 55 },
  { from: "City Center", to: "Hotel Zone", price: 25 },
  { from: "City Center", to: "Airport", price: 40 },
  { from: "Hotel Zone", to: "Airport", price: 55 },
  { from: "Hotel Zone", to: "City Center", price: 25 }
];

// Mock travel times for routes
const travelTimes = {
  "Airport-City Center": { duration: "35 mins", distance: "24 km" },
  "Airport-Hotel Zone": { duration: "42 mins", distance: "28 km" },
  "City Center-Hotel Zone": { duration: "15 mins", distance: "8 km" },
  "City Center-Airport": { duration: "38 mins", distance: "24 km" },
  "Hotel Zone-Airport": { duration: "40 mins", distance: "28 km" },
  "Hotel Zone-City Center": { duration: "18 mins", distance: "8 km" }
};

function initMap() {
  // Initialize Leaflet map with OpenStreetMap tiles - centered on Olbia
  const olbiaLoc = locations["Olbia via Marina, Sardegna"];
  map = L.map('map', {
    center: [olbiaLoc.lat, olbiaLoc.lng],
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: false
  });

  // Add OpenStreetMap tile layer with better styling
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Add fixed marker for Olbia
  const olbiaIcon = L.divIcon({
    className: 'custom-marker olbia-marker',
    html: `<div class="marker-pin olbia" role="button" aria-label="Olbia location marker" title="Olbia"><span class="marker-icon"></span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });
  
  L.marker([olbiaLoc.lat, olbiaLoc.lng], { icon: olbiaIcon })
    .addTo(map)
    .bindPopup(`<div class="custom-popup"><strong>Olbia</strong><br>via Marina, Sardegna</div>`);
}

// Initialize on page load
window.onload = function() {
  console.log("DEBUG: Page loaded, initializing...");
  
  // Set Italian as default language
  const savedLanguage = localStorage.getItem('selectedLanguage') || 'it';
  setLanguage(savedLanguage);
  
  try {
    console.log("DEBUG: Calling initMap...");
    initMap();
    console.log("DEBUG: initMap completed");
  } catch (e) {
    console.error("DEBUG: Map initialization failed:", e.message, e.stack);
  }
  
  try {
    console.log("DEBUG: Calling setDateConstraints...");
    setDateConstraints();
    console.log("DEBUG: setDateConstraints completed");
  } catch (e) {
    console.error("DEBUG: setDateConstraints failed:", e.message, e.stack);
  }

  try {
    console.log("DEBUG: Calling populateTimeOptions...");
    populateTimeOptions();
    console.log("DEBUG: populateTimeOptions completed");
  } catch (e) {
    console.error("DEBUG: populateTimeOptions failed:", e.message, e.stack);
  }
  
  try {
    console.log("DEBUG: Calling attachAutoRecalcListeners...");
    attachAutoRecalcListeners();
    console.log("DEBUG: attachAutoRecalcListeners completed");
  } catch (e) {
    console.error("DEBUG: attachAutoRecalcListeners failed:", e.message, e.stack);
  }
  
  try {
    console.log("DEBUG: Calling computeAndRenderQuote...");
    computeAndRenderQuote({ silent: true, sendWhatsApp: false });
    console.log("DEBUG: computeAndRenderQuote completed");
  } catch (e) {
    console.error("DEBUG: computeAndRenderQuote failed:", e.message, e.stack);
  }
  
  console.log("DEBUG: Initialization complete");
};

// Ensure dates cannot be set in the past and default to tomorrow
function setDateConstraints() {
  const dateInput = document.getElementById("date");
  if (!dateInput) return;

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const iso = tomorrow.toISOString().slice(0, 10);

  dateInput.min = iso;
  if (!dateInput.value) {
    dateInput.value = iso;
  }
}

// Set default locations to show a price on page load
function setDefaultLocations() {
  const fromSelect = document.getElementById("from");
  const toSelect = document.getElementById("to");
  
  if (fromSelect && !fromSelect.value) {
    fromSelect.value = "Airport";
  }
  if (toSelect && !toSelect.value) {
    toSelect.value = "City Center";
  }
}

// Populate time options in 30-minute steps
function populateTimeOptions() {
  const timeSelect = document.getElementById("time");
  if (!timeSelect) return;

  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const hh = hour.toString().padStart(2, "0");
      const mm = minute.toString().padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }

  timeSelect.innerHTML = options
    .map(t => `<option value="${t}">${t}</option>`)
    .join("");
}

function computeAndRenderQuote({ silent = true, sendWhatsApp = false } = {}) {
  const fromSelect = document.getElementById("from");
  const toSelect = document.getElementById("to");
  const from = fromSelect?.value?.trim() || "";
  const to = toSelect?.value?.trim() || "";
  
  console.log("DEBUG: computeAndRenderQuote called - from=", from, "to=", to);
  
  // Require both locations before calculating; leave total unchanged until then
  if (!from || !to) {
    console.log("DEBUG: Locations not selected yet - skipping calculation");
    return null;
  }
  
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const people = document.getElementById("people").value;
  const children = document.getElementById("children").value;
  const extraTimeSelect = document.getElementById("extraTime");
  const extraTime = Number(extraTimeSelect.value);
  const extraTimeLabel = extraTimeSelect.options[extraTimeSelect.selectedIndex]?.text || "None";

  console.log("DEBUG: from=", from, "to=", to);
  const route = priceTable.find(r => r.from === from && r.to === to);
  console.log("DEBUG: found route=", route);
  const basePrice = route?.price || 0;
  console.log("DEBUG: basePrice=", basePrice);

  if (!basePrice) {
    // Not priced or same location: show 0 quietly in silent mode
    if (!silent) {
      const msg = from === to
        ? "Please choose different pickup and drop-off locations to get a price."
        : "This route is not priced. Please select another combination.";
      alert(msg);
    }
    animateValue("total", getCurrentTotal(), 0, 400);
    setTotalDirect(0);
    calculateRoute(from, to);
    return null;
  }

  let extras = 0;
  const extraNames = [];
  document.querySelectorAll(".extra:checked").forEach(e => {
    extras += Number(e.value);
    const label = e.closest(".checkbox-label");
    if (label) extraNames.push(label.innerText.trim());
  });

  const total = basePrice + extras + extraTime;
  console.log("DEBUG: extras=", extras, "extraTime=", extraTime, "total=", total);
  animateValue("total", getCurrentTotal(), total, 800);
  setTotalDirect(total);

  calculateRoute(from, to);

  if (sendWhatsApp) {
    sendToWhatsApp({
      from,
      to,
      date,
      time,
      people,
      children,
      basePrice,
      extras,
      extraNames,
      extraTimeLabel,
      extraTime,
      total
    });
  }

  return { from, to, date, time, people, children, basePrice, extras, extraNames, extraTimeLabel, extraTime, total };
}

// Backward-compatible function name (used earlier by the button)
function calculateQuote() {
  computeAndRenderQuote({ silent: false, sendWhatsApp: true });
}

function onGetQuoteClick() {
  computeAndRenderQuote({ silent: false, sendWhatsApp: true });
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait);
  };
}

function attachAutoRecalcListeners() {
  const debounced = debounce(() => computeAndRenderQuote({ silent: true, sendWhatsApp: false }), 200);

  const ids = ["from", "to", "date", "time", "people", "children", "extraTime"]; 
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn("DEBUG: Element not found:", id);
      return;
    }
    console.log("DEBUG: Attaching listener to", id);
    const evt = (id === "people" || id === "children") ? "input" : "change";
    el.addEventListener(evt, function() {
      console.log("DEBUG: Event fired for", id, "value=", el.value);
      debounced();
    });
  });

  document.querySelectorAll('.extra').forEach(cb => {
    cb.addEventListener('change', debounced);
  });
  console.log("DEBUG: All listeners attached");
}

let pickupMarker, dropoffMarker;

function calculateRoute(from, to) {
  try {
    // Only attempt map operations if map is initialized
    if (typeof map === 'undefined' || !map) {
      console.log("DEBUG: Map not initialized, skipping route calculation");
      return;
    }
    
    // Remove previous route and markers
    if (currentPolyline) {
      map.removeLayer(currentPolyline);
    }
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);

    const routeKey = `${from}-${to}`;
    const routeData = travelTimes[routeKey];
    
    if (routeData && locations[from] && locations[to]) {
      const fromLoc = locations[from];
      const toLoc = locations[to];
      
      // Create custom pickup marker (green)
      const pickupIcon = L.divIcon({
        className: 'custom-marker pickup-marker',
        html: `<div class="marker-pin pickup" role="button" aria-label="Pickup location marker" title="Pickup location"><span class="marker-icon"></span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });
      
      // Create custom dropoff marker (red)
      const dropoffIcon = L.divIcon({
        className: 'custom-marker dropoff-marker',
        html: `<div class="marker-pin dropoff" role="button" aria-label="Drop-off location marker" title="Drop-off location"><span class="marker-icon"></span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      });
      
      pickupMarker = L.marker([fromLoc.lat, fromLoc.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<div class="custom-popup"><strong>Pickup</strong><br>${from}</div>`);
      
      dropoffMarker = L.marker([toLoc.lat, toLoc.lng], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup(`<div class="custom-popup"><strong>Drop-off</strong><br>${to}</div>`);
      
      // Draw route line with animation
      currentPolyline = L.polyline([
        [fromLoc.lat, fromLoc.lng],
        [toLoc.lat, toLoc.lng]
      ], {
        color: '#070607',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
        className: 'route-line'
      }).addTo(map);

      // Fit map to show the route with padding
      map.fitBounds(currentPolyline.getBounds(), { 
        padding: [80, 80],
        maxZoom: 13
      });

      // Update journey section at bottom of map
      const journeySection = document.querySelector('.journey-section');
      const routeDetailsDiv = document.getElementById('routeDetails');
      if (routeDetailsDiv) {
        routeDetailsDiv.innerHTML = `
          <div class="journey-card">
            <div class="journey-stats-container">
              <div class="journey-stat">
                <span class="stat-icon"></span>
                <div class="stat-content">
                  <div class="stat-label">Expected Travel Time</div>
                  <div class="stat-value">${routeData.duration}</div>
                </div>
              </div>
              <div class="stat-divider"></div>
              <div class="journey-stat">
                <span class="stat-icon"></span>
                <div class="stat-content">
                  <div class="stat-label">Distance</div>
                  <div class="stat-value">${routeData.distance}</div>
                </div>
              </div>
            </div>
          </div>
        `;
        // Show the journey section when route is calculated
        if (journeySection) {
          journeySection.classList.add('active');
        }
      }

      // Update travel time badge
      document.getElementById("travelTime").innerHTML =
        `<span style="color: #31b2d2;"></span> ${routeData.duration} <span style="color: #cbd5e0;">•</span> ${routeData.distance}`;
    }
  } catch (e) {
    console.warn("DEBUG: calculateRoute error:", e);
  }
}

// Animate number counter
function animateValue(id, start, end, duration) {
  const element = document.getElementById(id);
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
      clearInterval(timer);
      element.innerText = Math.round(end);
    } else {
      element.innerText = Math.round(current);
    }
  }, 16);
}

function getCurrentTotal() {
  const el = document.getElementById("total");
  const val = Number(el?.innerText || 0);
  return Number.isFinite(val) ? val : 0;
}

function setTotalDirect(total) {
  const el = document.getElementById("total");
  console.log("DEBUG: setTotalDirect called with total=", total, "element=", el);
  if (el) {
    const rounded = Math.round(total);
    el.innerText = rounded;
    el.textContent = rounded;
    console.log("DEBUG: set total innerText to", rounded, "actual content:", el.innerText);
  } else {
    console.log("DEBUG: ERROR - Could not find element with id='total'");
  }
}

// Counter functions for passengers and children with 7-person total limit
function updateTotalParticipantsDisplay() {
  const people = Number(document.getElementById("people").value) || 1;
  const children = Number(document.getElementById("children").value) || 0;
  const total = people + children;
  const display = document.getElementById("totalParticipants");
  if (display) {
    display.innerText = total;
  }
}

function incrementPeople() {
  const peopleInput = document.getElementById("people");
  const childrenInput = document.getElementById("children");
  const currentPeople = Number(peopleInput.value);
  const currentChildren = Number(childrenInput.value);
  const total = currentPeople + currentChildren;
  
  if (total < 7) {
    peopleInput.value = currentPeople + 1;
    peopleInput.dispatchEvent(new Event("input", { bubbles: true }));
    updateTotalParticipantsDisplay();
  }
}

function decrementPeople() {
  const input = document.getElementById("people");
  const currentValue = Number(input.value);
  if (currentValue > Number(input.min)) {
    input.value = currentValue - 1;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    updateTotalParticipantsDisplay();
  }
}

function incrementChildren() {
  const peopleInput = document.getElementById("people");
  const childrenInput = document.getElementById("children");
  const currentPeople = Number(peopleInput.value);
  const currentChildren = Number(childrenInput.value);
  const total = currentPeople + currentChildren;
  
  if (total < 7) {
    childrenInput.value = currentChildren + 1;
    childrenInput.dispatchEvent(new Event("input", { bubbles: true }));
    updateTotalParticipantsDisplay();
  }
}

function decrementChildren() {
  const input = document.getElementById("children");
  const currentValue = Number(input.value);
  if (currentValue > Number(input.min)) {
    input.value = currentValue - 1;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    updateTotalParticipantsDisplay();
  }
}

// Language switching function
function setLanguage(lang) {
  console.log("DEBUG: Setting language to", lang);
  
  // Update active button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-lang="${lang}"]`).classList.add('active');
  
  // Store language preference
  localStorage.setItem('selectedLanguage', lang);
  
  // TODO: Add translation logic here
}

function sendToWhatsApp({
  from,
  to,
  date,
  time,
  people,
  children,
  basePrice,
  extras,
  extraNames,
  extraTimeLabel,
  extraTime,
  total
}) {
  if (!driverWhatsAppNumber) {
    return;
  }

  const extrasText = extraNames.length ? extraNames.join(", ") : "None";
  const message = `*New booking request*%0A%0AFrom: ${from}%0ATo: ${to}%0ADate: ${date} ${time}%0APassengers: ${people} (Children: ${children})%0AExtras: ${extrasText}%0AExtra time: ${extraTimeLabel}%0ABase price: €${basePrice}%0AExtras total: €${extras}%0A*Total quote: €${total}*`;

  const url = `https://wa.me/${driverWhatsAppNumber}?text=${message}`;
  console.log("DEBUG: WhatsApp URL:", url);
  window.open(url, "_blank");
}
