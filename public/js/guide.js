const GUIDE_DESCRIPTIONS = {
  Land: 'Laser Tag at Laserdome Plus in North Vancouver is highly rated (4.6★) and offers group birthday packages — perfect for a class celebration. Escape rooms at Find and Seek or Exit Gastown are great for teamwork and brain challenges; both are very popular with teens. Grandview Lanes on Commercial Drive has glow bowling upstairs, which is a huge hit for groups and costs around $30 for 2 hours including shoe rental. Game On GO! in Richmond is an active game room experience with rotating challenge rooms. For a more scenic option, renting bikes at Stanley Park and riding the Seawall together is a classic Vancouver activity that\'s hard to beat.',
  Sea: 'Prince of Whales out of Granville Island runs whale watching tours that typically run 4–5 hours — there\'s a good chance of seeing humpbacks and orcas. Deep Cove Kayak Centre offers guided group sea kayaking with gorgeous fjord scenery. Harbour Cruises runs dinner and lunch cruises from Coal Harbour if you want something more formal and celebratory. Vancouver Water Adventures offers a City & Seals boat tour that\'s fun, affordable, and highly rated (4.9★).',
  Beach: 'Kitsilano Beach has sand volleyball courts that are free and available all summer — organize a grad tournament! Spanish Banks is one of the best spots in the city for a large group picnic or BBQ, with wide open sandy areas and amazing mountain views. Jericho Beach Kayak Centre runs a well-loved sunset kayak tour on weekends. And a simple sandcastle building contest at Jericho Beach is a free, low-key activity that can be surprisingly competitive and fun for that age group.'
};

const VENUES = {
  Land: [
    { name: 'Laserdome Plus', rating: 4.6, reviews: 390, desc: 'Group birthday packages available', tag: 'North Vancouver', emoji: '🎯', lat: 49.3236, lng: -123.0697 },
    { name: 'Find and Seek Escape Room', rating: 4.9, reviews: 495, desc: 'Best-rated escape room in Vancouver', tag: 'Downtown', emoji: '🔐', lat: 49.2834, lng: -123.1212 },
    { name: 'Exit Gastown Escape Room', rating: 4.7, reviews: 280, desc: 'Great teamwork challenges for teens', tag: 'Gastown', emoji: '🔐', lat: 49.2847, lng: -123.1063 },
    { name: 'Grandview Lanes', rating: 4.0, reviews: 1177, desc: 'Glow bowling upstairs, ~$30 for 2 hrs incl. shoes', tag: 'Commercial Drive', emoji: '🎳', lat: 49.2723, lng: -123.0686 },
    { name: 'Game On GO!', rating: 4.2, reviews: 340, desc: 'Active game rooms with rotating challenges', tag: 'Richmond', emoji: '🎮', lat: 49.1668, lng: -123.1375 },
    { name: 'Stanley Park Bike Ride', rating: 4.8, reviews: 520, desc: 'Rent bikes and ride the Seawall together', tag: 'Stanley Park', emoji: '🚴', lat: 49.3008, lng: -123.1415 }
  ],
  Sea: [
    { name: 'Prince of Whales', rating: 4.7, reviews: 890, desc: '4–5 hour whale watching — humpbacks & orcas', tag: 'Granville Island', emoji: '🐋', lat: 49.2717, lng: -123.1342 },
    { name: 'Deep Cove Kayak Centre', rating: 4.8, reviews: 430, desc: 'Guided group sea kayaking in fjord scenery', tag: 'Deep Cove', emoji: '🚣', lat: 49.3258, lng: -122.9483 },
    { name: 'Harbour Cruises', rating: 4.5, reviews: 620, desc: 'Dinner & lunch cruises — formal and celebratory', tag: 'Coal Harbour', emoji: '🛳️', lat: 49.2901, lng: -123.1254 },
    { name: 'Vancouver Water Adventures', rating: 4.9, reviews: 310, desc: 'City & Seals boat tour — fun and affordable', tag: 'Granville Island', emoji: '⛵', lat: 49.2880, lng: -123.1350 }
  ],
  Beach: [
    { name: 'Kitsilano Beach Volleyball', rating: 4.7, reviews: 150, desc: 'Free courts all summer — organize a grad tournament!', tag: 'Kitsilano', emoji: '🏐', lat: 49.2742, lng: -123.1553 },
    { name: 'Spanish Banks BBQ & Picnic', rating: 4.9, reviews: 280, desc: 'Best large-group BBQ spot, amazing mountain views', tag: 'Spanish Banks', emoji: '🔥', lat: 49.2742, lng: -123.1961 },
    { name: 'Jericho Beach Sunset Kayak', rating: 4.7, reviews: 195, desc: 'Well-loved sunset kayak tour on weekends', tag: 'Jericho Beach', emoji: '🌅', lat: 49.2740, lng: -123.1815 },
    { name: 'Jericho Beach Sandcastle', rating: 4.5, reviews: 120, desc: 'Free activity — surprisingly competitive & fun!', tag: 'Jericho Beach', emoji: '🏖️', lat: 49.2738, lng: -123.1825 }
  ]
};

const CAT_COLORS = { Land: '#16a34a', Sea: '#2563eb', Beach: '#f59e0b' };

let leafletMap, layerGroups = {};

function initGuide() {
  leafletMap = L.map('guide-map', { zoomControl: true }).setView([49.2827, -123.1207], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(leafletMap);

  Object.entries(VENUES).forEach(([cat, venues]) => {
    const color = CAT_COLORS[cat];
    layerGroups[cat] = L.layerGroup();

    venues.forEach(v => {
      const icon = L.divIcon({
        html: `<div class="map-pin" style="background:${color}">${v.rating}<span class="map-pin-arrow" style="border-top-color:${color}"></span></div>`,
        className: '',
        iconSize: [44, 30],
        iconAnchor: [22, 35]
      });

      L.marker([v.lat, v.lng], { icon })
        .addTo(layerGroups[cat])
        .bindPopup(`
          <div class="map-popup">
            <div class="map-popup-emoji">${v.emoji}</div>
            <strong>${v.name}</strong>
            <div class="map-popup-rating"><span class="star-gold">★</span> ${v.rating} <span class="muted">(${v.reviews})</span></div>
            <div class="muted" style="font-size:11px">${v.tag}</div>
            <div style="font-size:12px;margin-top:4px">${v.desc}</div>
          </div>
        `, { maxWidth: 200 });
    });
  });

  setupTabs();
  switchCategory('Land');

  // Ensure map renders correctly after layout settles
  setTimeout(() => leafletMap.invalidateSize(), 100);
}

function setupTabs() {
  document.querySelectorAll('.guide-tab').forEach(btn => {
    btn.addEventListener('click', () => switchCategory(btn.dataset.cat));
  });
}

function switchCategory(cat) {
  document.querySelectorAll('.guide-tab').forEach(btn => {
    const active = btn.dataset.cat === cat;
    btn.classList.toggle('active', active);
    btn.style.setProperty('--tab-color', CAT_COLORS[cat]);
  });

  Object.entries(layerGroups).forEach(([c, lg]) => {
    if (c === cat) lg.addTo(leafletMap); else leafletMap.removeLayer(lg);
  });

  const coords = VENUES[cat].map(v => [v.lat, v.lng]);
  if (coords.length) leafletMap.fitBounds(L.latLngBounds(coords), { padding: [30, 30] });

  document.getElementById('guide-cat-desc').textContent = GUIDE_DESCRIPTIONS[cat];
  renderVenueList(cat);
}

function renderVenueList(cat) {
  const color = CAT_COLORS[cat];
  document.getElementById('venue-sidebar').innerHTML =
    `<div class="guide-sidebar-header">
       <div class="guide-sidebar-title">Grade 7 Grad — Vancouver Activities</div>
     </div>` +
    VENUES[cat].map(v => `
      <div class="venue-card" onclick="focusVenue(${v.lat},${v.lng})">
        <div class="venue-thumb" style="background:${color}">${v.emoji}</div>
        <div class="venue-info">
          <div class="venue-name">${v.name}</div>
          <div class="venue-meta">
            <span class="star-gold">★</span> ${v.rating}
            <span class="venue-reviews">(${v.reviews})</span>
            &nbsp;·&nbsp;<span class="venue-tag">${v.tag}</span>
          </div>
          <div class="venue-desc">${v.desc}</div>
        </div>
      </div>
    `).join('');
}

function focusVenue(lat, lng) {
  leafletMap.setView([lat, lng], 15);
}

document.addEventListener('DOMContentLoaded', initGuide);
