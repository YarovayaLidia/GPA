// Simple version without Leaflet for testing

console.log("Simple script loaded");

const priceTable = [
  { from: "Airport", to: "City Center", price: 40 },
  { from: "Airport", to: "Hotel Zone", price: 55 },
  { from: "City Center", to: "Hotel Zone", price: 25 },
  { from: "City Center", to: "Airport", price: 40 },
  { from: "Hotel Zone", to: "Airport", price: 55 },
  { from: "Hotel Zone", to: "City Center", price: 25 }
];

window.onload = function() {
  console.log("Window onload fired");
  
  const totalEl = document.getElementById("total");
  console.log("Total element:", totalEl);
  
  if (totalEl) {
    totalEl.innerText = "99";
  }
  
  // Setup event listeners
  const fromSelect = document.getElementById("from");
  const toSelect = document.getElementById("to");
  
  if (fromSelect) {
    fromSelect.addEventListener("change", function() {
      updatePrice();
    });
  }
  
  if (toSelect) {
    toSelect.addEventListener("change", function() {
      updatePrice();
    });
  }
  
  console.log("Event listeners attached");
};

function updatePrice() {
  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();
  
  console.log("updatePrice called: from=" + from + ", to=" + to);
  
  const route = priceTable.find(r => r.from === from && r.to === to);
  console.log("Found route:", route);
  
  const totalEl = document.getElementById("total");
  if (route && totalEl) {
    totalEl.innerText = route.price;
    console.log("Set price to:", route.price);
  }
}
