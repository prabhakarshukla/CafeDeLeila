/**
 * CAFÉ DE LEILA — MENU PAGE
 * Handles menu rendering, filtering, search, and category navigation
 * ES Module - imports from utils.js
 */

import { 
  $, $$, createEl, on, delegate, debounce, formatPrice, addToCart, escapeHtml,
  validateIndianPhone, validateEmail, validateRequired, validateFile,
  generateId, generateOrderId, formatDate, formatTime,
  storageGet, storageSet, storageRemove,
  showToast, trapFocus, announce,
  prefersReducedMotion, animate,
  getWhatsAppUrl, openWhatsAppOrder,
  throttle, isPastDate, getAvailableDates
} from './utils.js';

// ========================================
// STATE
// ========================================

let menuState = {
  categories: [],
  activeCategory: 'all',
  activeFilter: 'all', // all, veg, nonveg
  searchQuery: '',
  filteredItems: []
};

// Global state reference (set by app.js)
let state = null;

// Function to set state from app.js
export function setMenuState(appState) {
  state = appState;
}

// ========================================
// INITIALIZATION
// ========================================

// Global init function that can be called by app.js after data loads
export function initMenuPage() {
  if (!document.body.classList.contains('menu-page')) return;
  if (!state || !state.menu) return;
  
  menuState.categories = state.menu;
  _initMenuPage();
}

function _initMenuPage() {
  renderCategoryChips();
  renderFilterChips();
  initSearch();
  applyFilters();
  initLazyLoading();
}

function renderCategoryChips() {
  const container = $('.menu-toolbar__category-chips');
  if (!container) return;

  const categories = [
    { id: 'all', name: 'All' },
    ...menuState.categories.map(c => ({ id: c.id, name: c.name }))
  ];

  container.innerHTML = categories.map(cat => `
    <button class="category-chip ${cat.id === menuState.activeCategory ? 'is-active' : ''}" 
            data-category="${cat.id}" 
            role="tab" 
            aria-selected="${cat.id === menuState.activeCategory}"
            aria-controls="menu-grid">
      ${escapeHtml(cat.name)}
    </button>
  `).join('');
}

function renderFilterChips() {
  const container = $('.menu-toolbar__filters');
  if (!container) return;

  const filters = [
    { id: 'all', name: 'All', icon: '' },
    { id: 'veg', name: 'Veg', icon: '<svg class="badge badge--veg" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>' },
    { id: 'nonveg', name: 'Non-Veg', icon: '<svg class="badge badge--nonveg" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 12c0 2.21-1.79 4-4 4S10 14.21 10 12"/><path d="M18 12l-4 4"/><path d="M14 8l-4 4"/><path d="M10 12l-4-4"/><circle cx="12" cy="12" r="10"/></svg>' }
  ];

  container.innerHTML = filters.map(f => `
    <button class="filter-chip ${f.id === menuState.activeFilter ? 'is-active' : ''}" 
            data-filter="${f.id}" 
            role="tab" 
            aria-selected="${f.id === menuState.activeFilter}"
            aria-controls="menu-grid">
      ${f.icon} ${escapeHtml(f.name)}
    </button>
  `).join('');
}

function initSearch() {
  const searchInput = $('.menu-toolbar__search input');
  if (!searchInput) return;

  const debouncedSearch = debounce((query) => {
    menuState.searchQuery = query.toLowerCase().trim();
    applyFilters();
  }, 200);

  on(searchInput, 'input', (e) => debouncedSearch(e.target.value));
  on(searchInput, 'search', (e) => debouncedSearch(e.target.value));
}

function applyFilters() {
  let items = [];

  if (menuState.activeCategory === 'all') {
    menuState.categories.forEach(cat => {
      cat.items.forEach(item => items.push({ ...item, categoryId: cat.id, categoryName: cat.name }));
    });
  } else {
    const cat = menuState.categories.find(c => c.id === menuState.activeCategory);
    if (cat) {
      cat.items.forEach(item => items.push({ ...item, categoryId: cat.id, categoryName: cat.name }));
    }
  }

  if (menuState.activeFilter === 'veg') {
    items = items.filter(item => item.veg === true);
  } else if (menuState.activeFilter === 'nonveg') {
    items = items.filter(item => item.veg === false);
  }

  if (menuState.searchQuery) {
    const query = menuState.searchQuery;
    items = items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  menuState.filteredItems = items;
  renderMenuGrid();
}

function renderMenuGrid() {
  const grid = $('.menu-grid');
  if (!grid) return;

  if (menuState.filteredItems.length === 0) {
    grid.innerHTML = `
      <div class="menu-empty">
        <svg class="menu-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No dishes found</p>
        <p class="menu-empty__hint">Try adjusting your filters or search</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = menuState.filteredItems.map(item => `
    <article class="dish-card" data-id="${item.id}">
      <div class="dish-card__image">
        ${item.image ? `<img class="lazy" data-src="${item.image}" alt="" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
        <div class="dish-card__badges">
          ${item.veg ? '<span class="badge badge--veg">Veg</span>' : '<span class="badge badge--nonveg">Non-Veg</span>'}
          ${item.tags?.includes('spicy') ? '<span class="badge badge--spicy">Spicy</span>' : ''}
          ${item.tags?.includes('popular') ? '<span class="badge badge--popular">Popular</span>' : ''}
          ${item.tags?.includes('signature') ? '<span class="badge badge--popular">Signature</span>' : ''}
          ${item.tags?.includes('new') ? '<span class="badge badge--new">New</span>' : ''}
          ${item.tags?.includes('healthy') ? '<span class="badge badge--veg">Healthy</span>' : ''}
          ${item.tags?.includes('vegan') ? '<span class="badge badge--veg">Vegan</span>' : ''}
          ${item.tags?.includes('vegan-option') ? '<span class="badge badge--veg">Vegan Option</span>' : ''}
        </div>
      </div>
      <div class="dish-card__content">
        <div class="dish-card__header">
          <h3 class="dish-card__name">${escapeHtml(item.name)}</h3>
          <span class="dish-card__price">${formatPrice(item.price)}</span>
        </div>
        <p class="dish-card__description">${escapeHtml(item.description)}</p>
        <div class="dish-card__footer">
          <div class="dish-card__tags">
            ${item.tags?.slice(0, 3).map(tag => `<span class="badge" style="background:rgba(178,143,111,0.1);color:var(--color-sand);border-color:rgba(178,143,111,0.2)">${escapeHtml(tag)}</span>`).join('') || ''}
          </div>
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

function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          img.classList.remove('lazy');
          img.classList.add('loaded');
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '100px 0px' });

    document.querySelectorAll('img.lazy[data-src]').forEach(img => observer.observe(img));
  } else {
    document.querySelectorAll('img.lazy[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
    });
  }
}

// ========================================
// EVENT DELEGATION
// ========================================

// Category chip selection
delegate(document, '.category-chip', 'click', (e, btn) => {
  const category = btn.dataset.category;
  menuState.activeCategory = category;
  
  $$('.category-chip').forEach(c => {
    c.classList.toggle('is-active', c.dataset.category === category);
    c.setAttribute('aria-selected', c.dataset.category === category);
  });
  
  applyFilters();
});

// Filter chip selection
delegate(document, '.filter-chip', 'click', (e, btn) => {
  const filter = btn.dataset.filter;
  menuState.activeFilter = filter;
  
  $$('.filter-chip').forEach(c => {
    c.classList.toggle('is-active', c.dataset.filter === filter);
    c.setAttribute('aria-selected', c.dataset.filter === filter);
  });
  
  applyFilters();
});

// Add to cart from dish card
delegate(document, '.dish-card__add', 'click', (e, btn) => {
  const item = {
    id: btn.dataset.id,
    name: btn.dataset.name,
    price: parseFloat(btn.dataset.price),
    veg: btn.dataset.veg === 'true',
    image: btn.dataset.image,
    description: btn.dataset.description
  };
  addToCart(item, 1);
  
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => btn.style.transform = '', 100);
});
