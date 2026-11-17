/**
 * CAFÉ DE LEILA — HOME PAGE
 * Handles home page initialization: featured dishes, hours, reviews
 * ES Module - imports from utils.js and uses window.cafeState
 */

import { 
  $, $$, formatDate, formatTime, formatPrice, escapeHtml 
} from '/js/utils.js';

// ========================================
// HOME PAGE INITIALIZATION
// ========================================

export function initHomePage() {
  const state = window.cafeState;
  if (!state) return;
  
  populateFeaturedDishes(state);
  populateOpeningHours(state);
  populateReviews();
}

function populateFeaturedDishes(state) {
  const grid = $('#featured-grid');
  if (!grid || !state.menu) return;
  
  const featured = [];
  state.menu.forEach(cat => {
    cat.items.forEach(item => {
      if (featured.length < 6) {
        featured.push({ ...item, categoryName: cat.name });
      }
    });
  });
  
  grid.innerHTML = featured.map(item => `
    <article class="dish-card" role="listitem">
      <div class="dish-card__image">
        ${item.image ? `<img class="lazy" data-src="${item.image}" alt="" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
        <div class="dish-card__badges">
          ${item.veg ? '<span class="badge badge--veg">Veg</span>' : '<span class="badge badge--nonveg">Non-Veg</span>'}
          ${item.tags?.includes('popular') ? '<span class="badge badge--popular">Popular</span>' : ''}
          ${item.tags?.includes('signature') ? '<span class="badge badge--popular">Signature</span>' : ''}
        </div>
      </div>
      <div class="dish-card__content">
        <div class="dish-card__header">
          <h3 class="dish-card__name">${escapeHtml(item.name)}</h3>
          <span class="dish-card__price">${formatPrice(item.price)}</span>
        </div>
        <p class="dish-card__description">${escapeHtml(item.description)}</p>
        <div class="dish-card__footer">
          <button class="dish-card__add" 
                  data-id="${item.id}" 
                  data-name="${escapeHtml(item.name)}"
                  data-price="${item.price}"
                  data-veg="${item.veg}"
                  data-image="${item.image || ''}"
                  data-description="${escapeHtml(item.description)}"
                  aria-label="Add ${escapeHtml(item.name)} to cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

function populateOpeningHours(state) {
  const hoursGrid = $('#hours-grid');
  if (!hoursGrid || !state.config?.hours?.schedule) return;
  
  const icons = {
    'Monday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Tuesday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Wednesday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Thursday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Friday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Saturday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Sunday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };
  
  const hoursGrid = $('#hours-grid');
  if (!hoursGrid) return;
  
  hoursGrid.innerHTML = state.config.hours.schedule.map(h => `
    <div class="hours-card">
      <div class="hours-card__icon" aria-hidden="true">${icons[h.day] || ''}</div>
      <h3 class="hours-card__title">${h.day}</h3>
      <div class="hours-card__times">
        ${h.closed 
          ? '<span>Closed</span>' 
          : `<span>${formatTime(h.open)} - ${formatTime(h.close)}</span>`}
      </div>
    </div>
  `).join('');
}

function populateReviews() {
  const reviewsSlider = $('#reviews-slider');
  if (!reviewsSlider) return;

  const reviews = [
    { name: 'Priya Sharma', date: '2 weeks ago', rating: 5, text: 'Absolutely loved the Butter Chicken and Garlic Naan! The flavors are authentic and the portion sizes are generous. The garden seating area is beautiful in the evenings.' },
    { name: 'Rahul Verma', date: '1 month ago', rating: 5, text: 'Best pizza in Lucknow hands down. The Tandoori Chicken Pizza is a must-try - perfect fusion of Indian and Italian flavors. Great service too!' },
    { name: 'Anita Singh', date: '3 weeks ago', rating: 4, text: 'Visited for a family dinner. The Mutton Biryani was exceptional - each grain of rice perfectly cooked. Kids loved the Chocolate Lava Cake. Will definitely return.' },
    { name: 'Vikash Gupta', date: '1 week ago', rating: 5, text: 'Ordered delivery via WhatsApp - seamless experience. Food arrived hot and well-packaged. The Paneer Tikka was perfectly charred. Highly recommend!' }
  ];

  reviewsSlider.innerHTML = reviews.map(r => `
    <article class="review-card" role="listitem">
      <div class="review-card__stars" aria-label="${r.rating} out of 5 stars">
        ${'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 6.91 8.26 12 2"/></svg>'.repeat(r.rating)}
      </div>
      <p class="review-card__text">"${r.text}"</p>
      <div class="review-card__author">
        <div class="review-card__avatar">${r.name.charAt(0)}</div>
        <div>
          <div class="review-card__name">${r.name}</div>
          <div class="review-card__date">${r.date}</div>
        </div>
      </div>
    </article>
  `).join('');
}

// Initialize when data is ready
if (window.cafeState?.menu) {
  initHomePage();
} else {
  window.addEventListener('cafe:ready', initHomePage);
}

export { initHomePage };