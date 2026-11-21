// CAFÉ DE LEILA — MAIN APPLICATION
// Single-file bundle for reliable browser execution (no ES modules)
// Handles: Header, Footer, Cart, Mobile Menu, Config Loading, Home Page, Menu Page

// Debug: Script started
window.__mainJSLoaded = true;
window.__scriptParseComplete = true;

// Global error handler
window.addEventListener('error', (e) => {
  console.error('[main.js] Global error:', e.message, e.filename, e.lineno, e.colno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[main.js] Unhandled rejection:', e.reason);
});

// ========================================
// UTILITIES (IIFE)
// ========================================

const utils = (function() {
  // DOM UTILITIES
  function createEl(tag, attrs = {}, ...children) {
    const svgTags = ['svg','path','line','circle','rect','polyline','polygon'];
    const el = svgTags.includes(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([k, v]) => el.dataset[k] = v);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    });
    children.flat().forEach(child => {
      if (child instanceof Node) {
        el.appendChild(child);
      } else if (child != null && child !== false) {
        el.appendChild(document.createTextNode(String(child)));
      }
    });
    return el;
  }

  function $(selector, context = document) {
    return context.querySelector(selector);
  }

  function $$(selector, context = document) {
    return context.querySelectorAll(selector);
  }

  function on(el, event, handler, options = {}) {
    el.addEventListener(event, handler, options);
    return () => el.removeEventListener(event, handler, options);
  }

  function delegate(parent, selector, event, handler) {
    return on(parent, event, e => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e, target);
      }
    });
  }

  // STORAGE UTILITIES
  const STORAGE_PREFIX = 'cafe_de_leila_';

  function storageGet(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`Storage get failed for ${key}:`, e);
      return defaultValue;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage set failed for ${key}:`, e);
      return false;
    }
  }

  function storageRemove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.warn(`Storage remove failed for ${key}:`, e);
    }
  }

  // FORMATTING UTILITIES
  function formatPrice(amount, options = {}) {
    const { symbol = '₹', showDecimals = false } = options;
    const formatted = Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    });
    return `${symbol}${formatted}`;
  }

  function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
    }
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{1})(\d{5})(\d{5})/, '$1 $2 $3');
    }
    return phone;
  }

  function validateIndianPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.trim());
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateRequired(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function validateFile(file, allowedTypes, maxSizeMB) {
    if (!file) return { valid: false, error: 'No file selected' };
    if (!/\.(pdf|doc|docx)$/i.test(file.name) || (file.type && !allowedTypes.includes(file.type))) {
      return { valid: false, error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `File too large. Maximum ${maxSizeMB}MB` };
    }
    return { valid: true };
  }

  function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `CDL${dateStr}${random}`;
  }

  function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  function throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  function formatTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  // ACCESSIBILITY UTILITIES
  function trapFocus(element) {
    // The shared dynamic dialog controller handles Tab, Escape and restoration.
    element.querySelector('button:not(:disabled),input,a[href]')?.focus();
    return () => {};
  }

  function announce(message, politeness = 'polite') {
    const region = document.getElementById('a11y-announcer') || createEl('div', {
      id: 'a11y-announcer',
      role: 'status',
      'aria-live': politeness,
      'aria-atomic': 'true',
      class: 'sr-only'
    });
    if (!region.isConnected) document.body.appendChild(region);
    region.setAttribute('aria-live', politeness);
    region.textContent = message;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animate(el, animationClass, duration = 300) {
    return new Promise(resolve => {
      if (prefersReducedMotion()) {
        resolve();
        return;
      }
      el.classList.add(animationClass);
      setTimeout(() => {
        el.classList.remove(animationClass);
        resolve();
      }, duration);
    });
  }

  async function apiRequest(functionName, body) {
    return publicSupabase('/functions/v1/' + functionName, {method: 'POST', body: JSON.stringify(body)});
  }

  // LAZY LOADING
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

      document.querySelectorAll('img.lazy[data-src], iframe.lazy[data-src]').forEach(img => observer.observe(img));
    } else {
      document.querySelectorAll('img.lazy[data-src], iframe.lazy[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        img.classList.add('loaded');
      });
    }
  }

  // TOAST NOTIFICATIONS
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = createEl('div', { class: 'toast-container', id: 'toast-container' });
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 4000) {
    const container = ensureToastContainer();
    const toast = createEl('div', {
      class: `toast toast--${type}`,
      role: 'alert',
      'aria-live': 'polite'
    },
      createEl('div', { class: 'toast__icon' }, getToastIcon(type)),
      createEl('div', { class: 'toast__message' }, message),
      createEl('button', {
        class: 'toast__close',
        'aria-label': 'Dismiss',
        onclick: () => toast.remove()
      }, createEl('svg', { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('path', { d: 'M18 6L6 18M6 6l12 12' })))
    );

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'toast-in 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  }

  function getToastIcon(type) {
    const icons = {
      success: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' })),
      error: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('circle', { cx: '12', cy: '12', r: '10' }), createEl('line', { x1: '15', y1: '9', x2: '9', y2: '15' }), createEl('line', { x1: '9', y1: '9', x2: '15', y2: '15' })),
      warning: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }), createEl('line', { x1: '12', y1: '9', x2: '12', y2: '13' }), createEl('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })),
      info: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('circle', { cx: '12', cy: '12', r: '10' }), createEl('line', { x1: '12', y1: '16', x2: '12', y2: '12' }), createEl('line', { x1: '12', y1: '8', x2: '12.01', y2: '8' }))
    };
    return icons[type] || icons.info;
  }

  // ESCAPE HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  // PUBLIC API
  return {
    createEl, $, $$, on, delegate, storageGet, storageSet, storageRemove,
    formatPrice, formatPhone, validateIndianPhone, validateEmail, validateRequired, validateFile,
    generateId, generateOrderId, debounce, throttle,
    formatTime,
    trapFocus, announce, prefersReducedMotion, animate,
    initLazyLoading, showToast, escapeHtml,
    apiRequest
  };
})();


// Make utils globally available
window.utils = utils;
window.utils.addToCart = addToCart;
window.utils.updateCartQuantity = updateCartQuantity;
window.utils.removeFromCart = removeFromCart;
window.utils.clearCart = clearCart;
window.utils.getCartSubtotal = getCartSubtotal;
window.utils.getCartItemCount = getCartItemCount;
window.utils.openCartDrawer = openCartDrawer;
window.utils.closeCartDrawer = closeCartDrawer;
window.utils.openMobileMenu = openMobileMenu;
window.utils.closeMobileMenu = closeMobileMenu;
window.utils.openCheckout = openCheckout;
window.utils.closeCheckout = closeCheckout;
window.utils.showOrderConfirmation = showOrderConfirmation;
window.utils.closeConfirmation = closeConfirmation;

const CART_STORAGE_KEY = 'cart';

window.$ = utils.$;
window.$$ = utils.$$;
window.createEl = utils.createEl;
window.on = utils.on;
window.delegate = utils.delegate;
window.storageGet = utils.storageGet;
window.storageSet = utils.storageSet;
window.storageRemove = utils.storageRemove;
window.formatPrice = utils.formatPrice;
window.formatPhone = utils.formatPhone;
window.validateIndianPhone = utils.validateIndianPhone;
window.validateEmail = utils.validateEmail;
window.validateRequired = utils.validateRequired;
window.validateFile = utils.validateFile;
window.generateId = utils.generateId;
window.generateOrderId = utils.generateOrderId;
window.debounce = utils.debounce;
window.throttle = utils.throttle;
window.formatTime = utils.formatTime;
window.trapFocus = utils.trapFocus;
window.announce = utils.announce;
window.prefersReducedMotion = utils.prefersReducedMotion;
window.animate = utils.animate;
window.initLazyLoading = utils.initLazyLoading;
window.showToast = utils.showToast;
window.escapeHtml = utils.escapeHtml;
window.apiRequest = utils.apiRequest;
window.showOrderConfirmation = showOrderConfirmation;
window.closeConfirmation = closeConfirmation;

// ========================================
// STATE
// ========================================

const state = {
  config: null,
  menu: null,
  cart: [],
  isCartOpen: false,
  isMobileMenuOpen: false
};

window.cafeState = state;

window.__stateInitialized = true;

// ========================================
// DATA LOADING
// ========================================

async function loadConfig() {
    try {
    const response = await fetch('data/config.json');
    if (!response.ok) throw new Error('Failed to load config');
    state.config = await response.json();
    applyConfigToPage();
    try { await loadPublicSettings(state.config); } catch { /* Keep local defaults if settings are unavailable. */ }
  } catch (error) {
    console.error('Config load failed:', error);
    utils.showToast('Failed to load configuration', 'error');
  }
}

let menuImageUrl;

async function loadMenu() {
    try {
    if (state.config?.supabase?.url) {
      try {
        const catalog = await publicSupabase('/functions/v1/menu');
        state.menu = catalogFromDatabase(catalog);
        if (!state.menu.some(category => category.items.length)) throw new Error('Catalog is empty');
        state.onlineCatalog = true;
        return;
      } catch { /* Show the sample catalog without enabling checkout. */ }
    }
    const response = await fetch('data/menu.json');
    if (!response.ok) throw new Error('Failed to load menu');
    const data = await response.json();
    state.menu = data.categories.map(category => ({
      ...category,
      items: category.items.map(item => ({
        ...item, image: menuImageUrl(item.image, state.config?.supabase?.url) || 'assets/meal.svg',
      })),
    }));
  } catch (error) {
    console.error('Menu load failed:', error);
    utils.showToast('Failed to load menu', 'error');
  }
}

function applyConfigToPage() {
  if (!state.config) return;

  window.CAFE_CONFIG = state.config;
}

// ========================================
// CART MANAGEMENT
// ========================================

function loadCart() {
  const saved = utils.storageGet(CART_STORAGE_KEY, []);
  const items = (state.menu || []).flatMap(c => c.items);
  state.cart = Array.isArray(saved) ? saved.flatMap(row => {
    const item = items.find(i => i.id === row?.id);
    return item && Number.isInteger(row.quantity) && row.quantity > 0 ? [{...item, quantity: Math.min(row.quantity, 50)}] : [];
  }) : [];
  state.cartNotes = utils.storageGet('cartNotes', '');
  updateCartUI();
}

function saveCart() {
  utils.storageSet(CART_STORAGE_KEY, window.cafeState.cart);
  updateCartUI();
}

function updateCartUI() {
  const count = window.cafeState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEls = $$('.cart-btn__count');
  countEls.forEach(el => {
    el.textContent = count > 0 ? count : '';
  });
  renderCartDrawer();
}

function addToCart(item, quantity = 1) {
  const existingIndex = window.cafeState.cart.findIndex(i => i.id === item.id);
  if (existingIndex >= 0) {
    window.cafeState.cart[existingIndex].quantity = Math.min(50, window.cafeState.cart[existingIndex].quantity + quantity);
  } else {
    window.cafeState.cart.push({
      ...item,
      quantity,
      addedAt: Date.now()
    });
  }
  saveCart();
  utils.showToast(`${item.name} added to cart`, 'success');
  openCartDrawer();
}

function updateCartQuantity(itemId, quantity) {
  const index = window.cafeState.cart.findIndex(i => i.id === itemId);
  if (index >= 0) {
    if (quantity <= 0) {
      window.cafeState.cart.splice(index, 1);
    } else {
      window.cafeState.cart[index].quantity = Math.min(50, quantity);
    }
    saveCart();
  }
}

function removeFromCart(itemId) {
  const index = window.cafeState.cart.findIndex(i => i.id === itemId);
  if (index >= 0) {
    const item = window.cafeState.cart[index];
    window.cafeState.cart.splice(index, 1);
    saveCart();
    utils.showToast(`${item.name} removed from cart`, 'info');
  }
}

function clearCart() {
  window.cafeState.cart = [];
  saveCart();
}

function getCartSubtotal() {
  return window.cafeState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartItemCount() {
  return window.cafeState.cart.reduce((sum, item) => sum + item.quantity, 0);
}

// ========================================
// CART DRAWER RENDERING
// ========================================

function renderCartDrawer() {
  const drawer = $('#cart-drawer');
  if (!drawer) return;

  const body = drawer.querySelector('.cart-drawer__body');
  const footer = drawer.querySelector('.cart-drawer__footer');

  if (window.cafeState.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-drawer__empty">
        <svg class="cart-drawer__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Your cart is empty</p>
        <a class="btn btn--primary" href="menu.html">Start Ordering</a>
      </div>
    `;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';

  const config = window.CAFE_CONFIG;
  const deliveryFee = config?.ordering?.deliveryFee ?? 0;
  const minOrderDelivery = config?.ordering?.minOrderDelivery ?? 0;
  const taxRate = config?.ordering?.taxRate ?? 0;

  const subtotal = getCartSubtotal();
  const needsDeliveryFee = false;
  const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + deliveryFeeAmount + tax;

  body.innerHTML = window.cafeState.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item__image">
        ${item.image ? `<img src="${item.image}" alt="" width="48" height="48" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
      </div>
      <div class="cart-item__details">
        <div class="cart-item__name">${utils.escapeHtml(item.name)}</div>
        <div class="cart-item__price">${utils.formatPrice(item.price)} each</div>
      </div>
      <div class="cart-item__controls">
        <div class="qty-stepper" role="group" aria-label="Quantity for ${utils.escapeHtml(item.name)}">
          <button class="qty-stepper__btn" data-action="decrease" aria-label="Decrease quantity" ${item.quantity <= 1 ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <input type="text" class="qty-stepper__input" value="${item.quantity}" readonly aria-label="Quantity">
          <button class="qty-stepper__btn" data-action="increase" aria-label="Increase quantity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <button class="cart-item__remove" aria-label="Remove ${utils.escapeHtml(item.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  footer.innerHTML = `
    <div class="cart-drawer__row cart-drawer__row--total"><span>Subtotal</span><span>${utils.formatPrice(subtotal)}</span></div>
    <label for="cart-notes">Order notes</label><textarea id="cart-notes" rows="2" placeholder="Preferences or special requests"></textarea>
    <p class="cart-drawer__note">Review quantities and notes before checkout.</p>
    <button class="btn btn--primary cart-drawer__checkout">Proceed to Checkout</button>`;
  const notes = drawer.querySelector('#cart-notes');
  notes.value = state.cartNotes || '';
  notes.addEventListener('input', () => { state.cartNotes = notes.value; utils.storageSet('cartNotes', notes.value); });
}

function openCartDrawer() {
  const drawer = $('#cart-drawer');
  const overlay = $('#cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    state.isCartOpen = true;
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
    setTimeout(() => {
      const firstBtn = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (state.isCartOpen) firstBtn?.focus();
    }, 100);
  }
}

function closeCartDrawer() {
  const drawer = $('#cart-drawer');
  const overlay = $('#cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    state.isCartOpen = false;
    document.body.style.overflow = '';
  }
}

// ========================================
// MOBILE MENU
// ========================================

function openMobileMenu() {
  const menu = $('#mobile-menu');
  const overlay = $('#mobile-menu-overlay');
  const btn = $('.menu-btn');
  if (menu && overlay && btn) {
    menu.classList.add('is-open');
    overlay.classList.add('is-visible');
    btn.setAttribute('aria-expanded', 'true');
    state.isMobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
    setTimeout(() => { if (state.isMobileMenuOpen) menu.querySelector('a')?.focus(); }, 100);
  }
}

function closeMobileMenu() {
  const menu = $('#mobile-menu');
  const overlay = $('#mobile-menu-overlay');
  const btn = $('.menu-btn');
  if (menu && overlay && btn) {
    menu.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    btn.setAttribute('aria-expanded', 'false');
    state.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }
}

// ========================================
// HEADER SCROLL EFFECT
// ========================================

function initHeaderScroll() {
  const header = $('.site-header');
  if (!header) return;

  let lastScroll = 0;
  const onScroll = utils.throttle(() => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });
}

// ========================================
// SHARED HEADER HTML
// ========================================

function renderHeader() {
  const placeholder = $('#header-placeholder');
  if (!placeholder) return;

  const config = state.config;
  const navItems = [
    { href: 'menu.html', label: 'Menu', icon: 'menu' },
    { href: 'book-table.html', label: 'Book a Table', icon: 'calendar' },
    { href: 'careers.html', label: 'Careers', icon: 'briefcase' },
    { href: 'locations.html', label: 'Locations', icon: 'map-pin' },
    { href: 'contact.html', label: 'Contact', icon: 'phone' }
  ];

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  placeholder.innerHTML = `
    <header class="site-header" role="banner">
      <div class="header-inner container">
        <a href="index.html" class="logo" aria-label="Café De Leila - Home">
          <img class="logo__art" src="assets/logo_delelia.svg" alt="" width="48" height="48">
          <span class="logo__text">
            <span class="logo__name">CAFÉ DE LEILA</span>
            <span class="logo__tagline">Magical Delight</span>
          </span>
        </a>

        <nav class="nav-desktop" aria-label="Main navigation">
          <ul class="nav-desktop__list">
            ${navItems.map(item => `
              <li>
                <a href="${item.href}" class="nav-desktop__link" ${currentPath === item.href || (item.href !== '/index.html' && currentPath.startsWith(item.href.replace('.html', ''))) ? 'aria-current="page"' : ''}>
                  ${item.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </nav>

        <div class="header-actions">
          <button class="cart-btn" id="cart-btn" aria-label="Shopping cart" aria-haspopup="dialog" aria-controls="cart-drawer">
            <svg class="cart-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <span class="cart-btn__count" aria-live="polite"></span>
          </button>
          <button class="menu-btn" id="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
            <svg class="menu-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <div class="mobile-menu-overlay" id="mobile-menu-overlay" aria-hidden="true"></div>

    <!-- Mobile Menu Drawer -->
    <aside class="mobile-menu" id="mobile-menu" role="dialog" aria-label="Mobile menu" aria-modal="true">
      <div class="mobile-menu__header">
        <span class="mobile-menu__title">Menu</span>
        <button class="mobile-menu__close" aria-label="Close menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <nav class="mobile-menu__nav">
        <ul class="mobile-menu__list">
          ${navItems.map(item => `
            <li>
              <a href="${item.href}" class="mobile-menu__link" ${currentPath === item.href || (item.href !== '/index.html' && currentPath.startsWith(item.href.replace('.html', ''))) ? 'aria-current="page"' : ''}>
                ${item.label}
              </a>
            </li>
          `).join('')}
        </ul>
      </nav>
      <div class="mobile-menu__cta">
        <a href="menu.html" class="btn btn--primary">Order Online</a>
        <a href="book-table.html" class="btn btn--secondary">Book a Table</a>
      </div>
    </aside>

    <!-- Cart Drawer Overlay -->
    <div class="mobile-menu-overlay" id="cart-drawer-overlay" aria-hidden="true"></div>

    <!-- Cart Drawer -->
    <aside class="cart-drawer" id="cart-drawer" role="dialog" aria-label="Shopping cart" aria-modal="true">
      <div class="cart-drawer__header">
        <h2 class="cart-drawer__title">Your Cart</h2>
        <button class="cart-drawer__close" aria-label="Close cart">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="cart-drawer__body"></div>
      <div class="cart-drawer__footer" style="display: none;"></div>
    </aside>
  `;
}

// ========================================
// SHARED FOOTER HTML
// ========================================

function renderFooter() {
  const placeholder = $('#footer-placeholder');
  if (!placeholder || !state.config) return;

  const config = state.config;
  const hours = config.hours?.schedule || [];

  placeholder.innerHTML = `
    <footer class="site-footer" role="contentinfo">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="index.html" class="logo" aria-label="Café De Leila - Home">
              <img class="logo__art" src="assets/logo_delelia.svg" alt="" width="48" height="48" loading="lazy">
              <span class="logo__text">
                <span class="logo__name">CAFÉ DE LEILA</span>
                <span class="logo__tagline">Magical Delight</span>
              </span>
            </a>
            <p class="footer-brand__description">Indian, Continental and Chinese flavours in Gomti Nagar. A table for your everyday catch-ups and celebrations.</p>
            <div class="footer-social">
              ${config.social?.facebook ? `<a href="${config.social.facebook}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>` : ''}
              ${config.social?.instagram ? `<a href="${config.social.instagram}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>` : ''}
              ${config.social?.youtube ? `<a href="${config.social.youtube}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>` : ''}
            </div>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Quick Links</h3>
            <ul class="footer-links">
              <li><a href="menu.html">Menu</a></li>
              <li><a href="book-table.html">Book a Table</a></li>
              <li><a href="locations.html">Locations</a></li>
              <li><a href="careers.html">Careers</a></li>
              <li><a href="contact.html">Contact Us</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Contact</h3>
            <div class="footer-contact">
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <div>
                  <div class="footer-contact__label">Phone</div>
                  <a class="footer-contact__value" href="tel:+${utils.escapeHtml(config.contact?.phoneRaw)}">${utils.escapeHtml(config.contact?.phone)}</a>
                </div>
              </div>
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <div>
                  <div class="footer-contact__label">Email</div>
                  <a class="footer-contact__value" href="mailto:${utils.escapeHtml(config.contact?.email)}">${utils.escapeHtml(config.contact?.email)}</a>
                </div>
              </div>
              ${verifiedWhatsAppUrl(config.contact) ? '<div class="footer-contact__item"><a class="footer-contact__value" href="' + verifiedWhatsAppUrl(config.contact) + '">WhatsApp</a></div>' : ''}
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <div class="footer-contact__label">Address</div>
                  <address class="footer-contact__value" style="font-style: normal;">${utils.escapeHtml(config.contact?.address?.full)}</address>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Opening Hours</h3>
            <div class="footer-hours">
              ${!config.hours.verified ? '<p>Hours awaiting confirmation. Please call before visiting.</p>' : hours.map(h => `
                <div class="footer-hours__day">
                  <span>${utils.escapeHtml(h.day)}</span>
                  <span>${h.closed ? 'Closed' : `${utils.formatTime(h.open)} - ${utils.formatTime(h.close)}`}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="footer-bottom__copyright">&copy; ${new Date().getFullYear()} ${config.site?.name}. All rights reserved.</p>
          <p>Pitch demo. Orders, reservations and applications need café confirmation.</p>
        </div>
      </div>
    </footer>
  `;
}

// ========================================
// HOME PAGE INITIALIZATION
// ========================================

function populateFeaturedDishes(state) {
  const grid = $('#featured-grid');
  if (!grid || !state.menu) return;

  const items = state.menu.flatMap(category => category.items);
  const featured = state.onlineCatalog
    ? [...items.filter(item => item.tags.includes('popular')), ...items.filter(item => !item.tags.includes('popular'))].slice(0, 6)
    : ['imc-1','pizza-1','kebab-3','biryani-1','pasta-2','dessert-1'].map(id => items.find(item => item.id === id)).filter(Boolean);

  grid.innerHTML = featured.map(item => `
    <article class="dish-card" role="listitem">
      <div class="dish-card__image">
        ${item.image ? `<img src="${item.image}" alt="Illustrative dish placeholder" width="640" height="480" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
        <div class="dish-card__badges">
          ${item.veg ? '<span class="badge badge--veg">● Veg</span>' : '<span class="badge badge--nonveg">● Non-veg</span>'}
          ${item.tags?.includes('popular') ? '<span class="badge badge--popular">Popular</span>' : ''}
          ${item.tags?.includes('signature') ? '<span class="badge badge--popular">Signature</span>' : ''}
        </div>
      </div>
      <div class="dish-card__content">
        <div class="dish-card__header">
          <h3 class="dish-card__name">${utils.escapeHtml(item.name)}</h3>
          <span class="dish-card__price">${utils.formatPrice(item.price)}${state.config?.menu?.is_sample || !state.onlineCatalog ? ' <small>sample</small>' : ''}</span>
        </div>
        <p class="dish-card__description">${utils.escapeHtml(item.description)}</p>
        <div class="dish-card__footer">
          <button class="dish-card__add"
                  data-id="${item.id}"
                  data-name="${utils.escapeHtml(item.name)}"
                  data-price="${item.price}"
                  data-veg="${item.veg}"
                  data-image="${item.image || ''}"
                  data-description="${utils.escapeHtml(item.description)}"
                  aria-label="Add ${utils.escapeHtml(item.name)} to cart">
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
  if (!state.config.hours.verified) { hoursGrid.innerHTML = '<p>Opening hours are awaiting confirmation. Please call before visiting.</p>'; return; }

  const icons = {
    'Monday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Tuesday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Wednesday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Thursday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Friday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Saturday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'Sunday': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  hoursGrid.innerHTML = state.config.hours.schedule.map(h => `
    <div class="hours-card">
      <div class="hours-card__icon" aria-hidden="true">${icons[h.day] || ''}</div>
      <h3 class="hours-card__title">${utils.escapeHtml(h.day)}</h3>
      <div class="hours-card__times">
        ${h.closed
          ? '<span>Closed</span>'
          : `<span>${utils.formatTime(h.open)} - ${utils.formatTime(h.close)}</span>`}
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
          <div class="review-card__date">Sample review · fictional guest</div>
        </div>
      </div>
    </article>
  `).join('');
}

function initHomePage() {
  const state = window.cafeState;
  if (!state) return;

  populateFeaturedDishes(state);
  populateOpeningHours(state);
  populateReviews();
}

function initMenuPage() {
  // Initialize menu state
  if (state.menu && document.body.classList.contains('menu-page')) {
    menuState.categories = state.menu;
    renderCategoryChips();
    renderFilterChips();
    initSearch();
    applyFilters();
    initLazyLoading();
  }
}

let menuState = {
  categories: [],
  activeCategory: 'all',
  activeFilter: 'all',
  searchQuery: '',
  filteredItems: []
};

function renderCategoryChips() {
  if (!state.menu) return;
  const container = utils.$('.menu-toolbar__category-chips');
  if (!container) return;

  const categories = [
    { id: 'all', name: 'All' },
    ...menuState.categories.map(c => ({ id: c.id, name: c.name }))
  ];

  container.innerHTML = categories.map(cat => `
    <button class="category-chip ${cat.id === menuState.activeCategory ? 'is-active' : ''}"
            data-category="${cat.id}"
            role="button"
            aria-pressed="${cat.id === menuState.activeCategory}"
            aria-controls="menu-grid">
      ${utils.escapeHtml(cat.name)}
    </button>
  `).join('');
}

function renderFilterChips() {
  const container = utils.$('.menu-toolbar__filters');
  if (!container) return;

  const filters = [
    { id: 'all', name: 'All', icon: '' },
    { id: 'veg', name: 'Veg', icon: '<svg class="badge badge--veg" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>' },
    { id: 'nonveg', name: 'Non-Veg', icon: '<svg class="badge badge--nonveg" style="width:14px;height:14px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 12c0 2.21-1.79 4-4 4S10 14.21 10 12"/><path d="M18 12l-4 4"/><path d="M14 8l-4 4"/><path d="M10 12l-4-4"/><circle cx="12" cy="12" r="10"/></svg>' }
  ];

  container.innerHTML = filters.map(f => `
    <button class="filter-chip ${f.id === menuState.activeFilter ? 'is-active' : ''}"
            data-filter="${f.id}"
            role="button"
            aria-pressed="${f.id === menuState.activeFilter}"
            aria-controls="menu-grid">
      ${f.icon} ${utils.escapeHtml(f.name)}
    </button>
  `).join('');
}

function initSearch() {
  const searchInput = utils.$('.menu-toolbar__search input');
  if (!searchInput) return;

  const debouncedSearch = utils.debounce((query) => {
    menuState.searchQuery = query.toLowerCase().trim();
    applyFilters();
  }, 200);

  utils.on(searchInput, 'input', (e) => debouncedSearch(e.target.value));
  utils.on(searchInput, 'search', (e) => debouncedSearch(e.target.value));
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
  const grid = utils.$('.menu-grid');
  if (!grid) return;

  const notice = document.getElementById('menu-sample-notice');
  if (notice) notice.hidden = !(state.config?.menu?.is_sample || !state.onlineCatalog);

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
        ${item.image ? `<img src="${item.image}" alt="Illustrative dish placeholder" width="640" height="480" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
        <div class="dish-card__badges">
          ${item.veg ? '<span class="badge badge--veg">● Veg</span>' : '<span class="badge badge--nonveg">● Non-veg</span>'}
          ${item.tags?.includes('spicy') ? '<span class="badge badge--spicy">Spicy</span>' : ''}
          ${item.tags?.includes('popular') ? '<span class="badge badge--popular">Popular</span>' : ''}
          ${item.tags?.includes('signature') ? '<span class="badge badge--popular">Signature</span>' : ''}
          ${item.tags?.includes('new') ? '<span class="badge badge--new">New</span>' : ''}
          ${item.tags?.includes('healthy') ? '<span class="badge badge--popular">Healthy</span>' : ''}
          ${item.tags?.includes('vegan') ? '<span class="badge badge--popular">Vegan</span>' : ''}
          ${item.tags?.includes('vegan-option') ? '<span class="badge badge--popular">Vegan Option</span>' : ''}
        </div>
      </div>
      <div class="dish-card__content">
        <div class="dish-card__header">
          <h3 class="dish-card__name">${utils.escapeHtml(item.name)}</h3>
          <span class="dish-card__price">${utils.formatPrice(item.price)}${state.config?.menu?.is_sample || !state.onlineCatalog ? ' <small>sample</small>' : ''}</span>
        </div>
        <p class="dish-card__description">${utils.escapeHtml(item.description)}</p>
        <div class="dish-card__footer">
          <div class="dish-card__tags">
            ${item.tags?.slice(0, 3).map(tag => `<span class="badge" style="background:var(--color-wash);color:var(--color-sand);border-color:var(--color-wash)">${utils.escapeHtml(tag)}</span>`).join('') || ''}
          </div>
          <button class="dish-card__add"
                  data-id="${item.id}"
                  data-name="${utils.escapeHtml(item.name)}"
                  data-price="${item.price}"
                  data-veg="${item.veg}"
                  data-image="${item.image || ''}"
                  data-description="${utils.escapeHtml(item.description)}"
                  aria-label="Add ${utils.escapeHtml(item.name)} to cart">
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

    document.querySelectorAll('img.lazy[data-src], iframe.lazy[data-src]').forEach(img => observer.observe(img));
  } else {
    document.querySelectorAll('img.lazy[data-src], iframe.lazy[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
    });
  }
}

// ========================================
// CHECKOUT FLOW
// ========================================

function openCheckout() {
  if (state.cart.length > 50) {
    utils.showToast('Limit each order to 50 different dishes.', 'info');
    return;
  }
  if (!state.onlineCatalog || state.config.ordering.enabled === false) {
    utils.showToast('Online ordering is currently unavailable.', 'info');
    return;
  }
  if (window.cafeState.cart.length === 0) {
    utils.showToast('Your cart is empty', 'warning');
    return;
  }

  closeCartDrawer();

  const config = window.CAFE_CONFIG;
  const orderTypes = config?.ordering?.types || [
    { id: 'dine_in', label: 'Dine In', description: 'Enjoy your meal at our cafe' },
    { id: 'takeaway', label: 'Takeaway', description: 'Pick up your order' },
    { id: 'delivery', label: 'Delivery', description: 'Delivered to your door' }
  ];

  const subtotal = getCartSubtotal();
  const deliveryFee = config?.ordering?.deliveryFee ?? 0;
  const minOrderDelivery = config?.ordering?.minOrderDelivery ?? 0;
  const taxRate = config?.ordering?.taxRate ?? 0;
  const needsDeliveryFee = false;
  const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + deliveryFeeAmount + tax;

  const modalHtml = utils.createEl('div', { class: 'modal-overlay checkout-modal', id: 'checkout-modal' },
    utils.createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'checkout-title' },
      utils.createEl('div', { class: 'modal__header' },
        utils.createEl('h2', { class: 'modal__title', id: 'checkout-title' }, 'Checkout'),
        utils.createEl('button', { class: 'modal__close', 'aria-label': 'Close', onclick: closeCheckout },
          utils.createEl('svg', { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, utils.createEl('line', { x1: '18', y1: '6', x2: '6', y2: '18' }), utils.createEl('line', { x1: '6', y1: '6', x2: '18', y2: '18' }))
        )
      ),
      utils.createEl('div', { class: 'modal__body' },
        utils.createEl('form', { id: 'checkout-form', novalidate: '' },
          utils.createEl('div', { class: 'checkout-form__section' },
            utils.createEl('h3', { class: 'checkout-form__section-title' }, 'Order Type'),
            utils.createEl('div', { class: 'checkout-form__order-type', role: 'radiogroup', 'aria-label': 'Order type' },
              orderTypes.filter(type => type.id !== 'delivery' || state.config.ordering.deliveryEnabled).map(type => utils.createEl('button', {
                type: 'button',
                class: `order-type-btn ${type.id === 'dine_in' ? 'is-active' : ''}`,
                'data-type': type.id,
                role: 'radio',
                'aria-checked': type.id === 'dine_in',
              }, type.label))
            ),
            utils.createEl('div', { class: 'checkout-form__address', id: 'delivery-address-field', hidden: '' },
              utils.createEl('div', { class: 'form-group' },
                utils.createEl('label', { for: 'checkout-address' }, 'Delivery Address *'),
                utils.createEl('textarea', { id: 'checkout-address', name: 'address', rows: 3, placeholder: 'Enter full delivery address including landmark', 'aria-describedby': 'address-hint' }),
                utils.createEl('span', { id: 'address-hint', class: 'form-error' }, 'Please enter delivery address')
              )
            )
          ),
          utils.createEl('div', { class: 'checkout-form__section' },
            utils.createEl('h3', { class: 'checkout-form__section-title' }, 'Your Details'),
            utils.createEl('div', { class: 'booking-form__row' },
              utils.createEl('div', { class: 'form-group' },
                utils.createEl('label', { for: 'checkout-name' }, 'Full Name *'),
                utils.createEl('input', { type: 'text', id: 'checkout-name', name: 'name', required: '', autocomplete: 'name', placeholder: 'Your full name' }),
                utils.createEl('span', { class: 'form-error' }, 'Please enter your name')
              ),
              utils.createEl('div', { class: 'form-group' },
                utils.createEl('label', { for: 'checkout-phone' }, 'Phone Number *'),
                utils.createEl('input', { type: 'tel', id: 'checkout-phone', name: 'phone', required: '', autocomplete: 'tel', placeholder: '10 digit mobile number', pattern: '[6-9]\\d{9}', inputmode: 'numeric', maxlength: '10' }),
                utils.createEl('span', { class: 'form-error' }, 'Please enter a valid 10-digit Indian mobile number')
              )
            ),
            utils.createEl('div', { class: 'form-group' },
              utils.createEl('label', { for: 'checkout-notes' }, 'Special Instructions'),
              utils.createEl('textarea', { id: 'checkout-notes', name: 'notes', rows: 2, placeholder: 'Any allergies, preferences, or delivery instructions...' })
            )
          ),
          utils.createEl('div', { class: 'checkout-form__section' },
            utils.createEl('h3', { class: 'checkout-form__section-title' }, 'Order Summary'),
            utils.createEl('div', { class: 'checkout-summary' },
              state.cart.map(item => utils.createEl('div', { class: 'checkout-summary__item' },
                utils.createEl('span', {}, `${item.name} x${item.quantity}`),
                utils.createEl('span', {}, utils.formatPrice(item.price * item.quantity))
              )),
              utils.createEl('div', { class: 'checkout-summary__item checkout-summary__item--total' },
                utils.createEl('span', {}, 'Total'),
                utils.createEl('span', { id: 'checkout-total' }, utils.formatPrice(total))
              )
            )
          ),
          utils.createEl('div', { class: 'modal__footer' },
            utils.createEl('button', { type: 'button', class: 'btn btn--secondary', onclick: closeCheckout }, 'Cancel'),
            utils.createEl('button', { type: 'submit', class: 'btn btn--primary btn--lg' }, 'Place Order')
          )
        )
      )
    )
  );

  document.body.appendChild(modalHtml);

  modalHtml.classList.add('is-open');
  utils.trapFocus(modalHtml.querySelector('.modal'));
  modalHtml.querySelector('[name=notes]').value = state.cartNotes || '';
  // Initialize form
  const form = modalHtml.querySelector('#checkout-form');
  const orderTypeBtns = modalHtml.querySelectorAll('.order-type-btn');
  const addressField = modalHtml.querySelector('#delivery-address-field');
  const addressInput = modalHtml.querySelector('#checkout-address');
  const totalEl = modalHtml.querySelector('#checkout-total');

  function updateTotal() {
    const subtotal = getCartSubtotal();
    const config = window.CAFE_CONFIG;
    const deliveryFee = config?.ordering?.deliveryFee ?? 0;
    const minOrderDelivery = config?.ordering?.minOrderDelivery ?? 0;
    const taxRate = config?.ordering?.taxRate ?? 0;
    const activeType = modalHtml.querySelector('.order-type-btn.is-active')?.dataset.type || 'dine_in';
    const needsDeliveryFee = activeType === 'delivery';
    const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + deliveryFeeAmount + tax;
    totalEl.textContent = utils.formatPrice(total);
  }

  function selectOrderType(type) {
    orderTypeBtns.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.type === type);
      btn.setAttribute('aria-checked', btn.dataset.type === type);
    });
    addressField.hidden = type !== 'delivery';
    addressInput.required = type === 'delivery';
    updateTotal();
  }

  orderTypeBtns.forEach(btn => {
    utils.on(btn, 'click', () => selectOrderType(btn.dataset.type));
  });

  selectOrderType('dine_in');
  form.prepend(utils.createEl('p', {class: 'demo-notice'}, 'The café will review your order request. Payment is arranged separately.'));
  utils.on(form, 'submit', async (e) => {
    e.preventDefault();
    form.querySelector('.submission-error')?.remove();
    if (!validateCheckoutForm(form)) {
      showFormFailure(form, 'Please check the highlighted order fields.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const order = {
      id: utils.generateOrderId(),
      type: modalHtml.querySelector('.order-type-btn.is-active')?.dataset.type || 'dine_in',
      customer: {
        name: form.elements.namedItem('name').value.trim(),
        phone: form.elements.namedItem('phone').value.trim()
      },
      items: state.cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: getCartSubtotal(),
      deliveryFee: 0,
      taxRate: window.CAFE_CONFIG?.ordering?.taxRate ?? 0,
      tax: getCartSubtotal() * (window.CAFE_CONFIG?.ordering?.taxRate ?? 0),
      total: 0,
      notes: form.elements.namedItem('notes').value.trim(),
      address: modalHtml.querySelector('.order-type-btn.is-active')?.dataset.type === 'delivery' ? form.elements.namedItem('address').value.trim() : null,
      createdAt: new Date().toISOString()
    };

    const config = window.CAFE_CONFIG;
    const minOrderDelivery = config?.ordering?.minOrderDelivery ?? 0;
    const deliveryFee = config?.ordering?.deliveryFee ?? 0;
    const needsDeliveryFee = order.type === 'delivery';
    order.deliveryFee = needsDeliveryFee ? deliveryFee : 0;
    order.total = order.subtotal + order.deliveryFee + order.tax;

    try {
      const result = await utils.apiRequest('orders', {
        customer_name: order.customer.name,
        customer_phone: '91' + order.customer.phone,
        order_type: order.type,
        items: order.items.map(({id, quantity}) => ({id, quantity})),
        notes: order.notes,
        delivery_address: order.address ? {full: order.address} : null,
      });
      if (!result?.order_number || !Array.isArray(result.items) || !Number.isFinite(result.total_inr)) {
        throw new Error('Invalid order response');
      }
      const items = result.items.map(item => ({...item, price: item.price_inr}));
      clearCart();
      closeCheckout();
      state.cartNotes = '';
      utils.storageRemove('cartNotes');
      showOrderConfirmation({
        ...result, id: result.order_number, subtotal: result.subtotal_inr,
        deliveryFee: result.delivery_fee_inr, tax: result.tax_inr, total: result.total_inr,
        items,
      });
    } catch {
      showFormFailure(form, 'We could not confirm your order. Please check with us before resubmitting.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  });
}

function validateCheckoutForm(form) {
  let valid = true;
  const groups = form.querySelectorAll('.form-group');

  groups.forEach(group => {
    const input = group.querySelector('input, textarea, select');
    const error = group.querySelector('.form-error');
    if (input && input.required && !utils.validateRequired(input.value)) {
      group.classList.add('has-error');
      if (error) error.textContent = input.validationMessage || 'This field is required';
      valid = false;
    } else if (input && input.type === 'tel' && input.required) {
      if (!utils.validateIndianPhone(input.value)) {
        group.classList.add('has-error');
        if (error) error.textContent = 'Please enter a valid 10-digit Indian mobile number';
        valid = false;
      } else {
        group.classList.remove('has-error');
      }
    } else {
      group.classList.remove('has-error');
    }
  });

  const addressField = form.querySelector('#delivery-address-field');
  if (!addressField.hidden) {
    const addressInput = form.querySelector('#checkout-address');
    if (!addressInput.value.trim()) {
      addressInput.closest('.form-group').classList.add('has-error');
      valid = false;
    }
  }

  if (!valid) form.querySelector('.has-error input, .has-error textarea')?.focus();
  return valid;
}

function closeCheckout() {
  const modal = $('#checkout-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function showOrderConfirmation(order) {
  const config = window.CAFE_CONFIG;

  const modalHtml = utils.createEl('div', { class: 'modal-overlay confirmation-modal', id: 'confirmation-modal' },
    utils.createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmation-title' },
      utils.createEl('div', { class: 'modal__body confirmation' },
        utils.createEl('div', { class: 'confirmation__icon' },
          utils.createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '40', height: '40' }, utils.createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), utils.createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        utils.createEl('h2', { class: 'confirmation__title', id: 'confirmation-title' }, 'Order received'),
        utils.createEl('p', { class: 'confirmation__subtitle' }, `The café will review your request. Reference: ${order.order_number || order.id}`),
        utils.createEl('div', { class: 'confirmation__order-id' }, order.id),
        utils.createEl('div', { class: 'confirmation__summary' },
          utils.createEl('h3', { class: 'confirmation__summary-title' }, 'Order Summary'),
          utils.createEl('div', { class: 'confirmation__items' },
            order.items.map(item => utils.createEl('div', { class: 'confirmation__item' },
              utils.createEl('span', { class: 'confirmation__item-name' }, `${item.name} x${item.quantity}`),
              utils.createEl('span', { class: 'confirmation__item-total' }, utils.formatPrice(item.price * item.quantity))
            ))
          ),
          utils.createEl('div', { class: 'confirmation__totals' },
            utils.createEl('div', { class: 'confirmation__total-row' },
              utils.createEl('span', {}, 'Subtotal'),
              utils.createEl('span', {}, utils.formatPrice(order.subtotal))
            ),
            order.deliveryFee > 0 && utils.createEl('div', { class: 'confirmation__total-row' },
              utils.createEl('span', {}, 'Delivery Fee'),
              utils.createEl('span', {}, utils.formatPrice(order.deliveryFee))
            ),
            utils.createEl('div', { class: 'confirmation__total-row' },
              utils.createEl('span', {}, 'Tax'),
              utils.createEl('span', {}, utils.formatPrice(order.tax))
            ),
            utils.createEl('div', { class: 'confirmation__total-row confirmation__total-row--grand' },
              utils.createEl('span', {}, 'Total'),
              utils.createEl('span', {}, utils.formatPrice(order.total))
            )
          )
        ),
        utils.createEl('div', { class: 'confirmation__actions' },
          utils.createEl('button', { class: 'btn btn--primary btn--lg', onclick: closeConfirmation }, 'Done')
        ),
        utils.createEl('p', { class: 'confirmation__note' }, 'We have received your order. We\'ll confirm shortly.')
      )
    )
  );

  document.body.appendChild(modalHtml);
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    utils.trapFocus(modalHtml.querySelector('.modal'));
  });
}

function closeConfirmation() {
  const modal = $('#confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function buildWhatsAppMessage(order) {
  const lines = [
    `*New Order - ${order.id}*`,
    `*Type:* ${order.type.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    `*Customer:* ${order.customer.name}`,
    `*Phone:* ${order.customer.phone}`,
    '',
    '*Items:*'
  ];

  order.items.forEach(item => {
    lines.push(`• ${item.name} x${item.quantity} - ${utils.formatPrice(item.price * item.quantity)}`);
  });

  lines.push('', `*Subtotal:* ${utils.formatPrice(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`*Delivery Fee:* ${utils.formatPrice(order.deliveryFee)}`);
  }
  if (order.tax > 0) {
    lines.push(`*Tax (${(order.taxRate * 100).toFixed(0)}%):* ${utils.formatPrice(order.tax)}`);
  }
  lines.push(`*Total:* ${utils.formatPrice(order.total)}`);

  if (order.type === 'delivery' && order.address) {
    lines.push('', `*Delivery Address:* ${order.address}`);
  }

  if (order.notes) {
    lines.push('', `*Notes:* ${order.notes}`);
  }

  lines.push('', 'Thank you for ordering from Café De Leila!');

  return lines.join('\n');
}

// ========================================
// PAGE-SPECIFIC INITIALIZATION
// ========================================

function initBookingPage() {
  if (!document.body.classList.contains('booking-page')) return;
  if (!state.config) return;

  _initBookingPage();
}

function _initBookingPage() {
  loadBookingConfig();
  renderDateOptions();
  renderTimeSlots();
  renderGuestOptions();
  bookingInitFormValidation();
  initLazyLoading();
}

const bookingState = {
  availableDates: [],
  timeSlots: [],
  selectedDate: null,
  selectedTime: null,
  selectedGuests: 2
};

let bookingDates;
let bookingRules;

function loadBookingConfig() {
  Object.assign(bookingState, bookingRules.bookingRules);
  const today = bookingDates.indiaDate();
  bookingState.availableDates = Array.from({length: bookingState.maxAdvanceDays + 1}, (_, offset) => {
    const value = bookingDates.addCalendarDays(today, offset);
    return {
      value,
      label: bookingDates.formatIndiaDate(value, {weekday: 'short', month: 'short'}),
      fullLabel: bookingDates.formatIndiaDate(value, {weekday: 'long', month: 'long', day: 'numeric'}),
    };
  });
  bookingState.selectedDate = today;
}

function renderDateOptions() {
  const container = $('#booking-date');
  if (!container) return;

  container.innerHTML = bookingState.availableDates.map(date => `
    <button type="button"
            class="date-option ${date.value === bookingState.selectedDate ? 'is-selected' : ''}"
            data-date="${date.value}"
            aria-pressed="${date.value === bookingState.selectedDate}"
            role="button"
            aria-label="${date.fullLabel}">
      <span class="date-option__day">${Number(date.value.slice(-2))}</span>
      <span class="date-option__label">${date.label}</span>
    </button>
  `).join('');

  const selected = container.querySelector('.is-selected');
  if (selected) {
    selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderTimeSlots() {
  const container = $('#booking-time');
  if (!container) return;

  const now = new Date();
  const slots = bookingState.timeSlots.map(time => ({
    time, isPast: !bookingRules.bookingSlotAvailable(bookingState.selectedDate, time, now),
  }));
  if (!slots.some(slot => slot.time === bookingState.selectedTime && !slot.isPast)) {
    bookingState.selectedTime = slots.find(slot => !slot.isPast)?.time ?? null;
  }

  container.innerHTML = slots.map(slot => `
    <button type="button"
            class="time-slot ${slot.time === bookingState.selectedTime ? 'is-selected' : ''} ${slot.isPast ? 'is-past' : ''}"
            data-time="${slot.time}"
            aria-pressed="${slot.time === bookingState.selectedTime}"
            role="button"
            ${slot.isPast ? 'disabled aria-disabled="true"' : ''}
            aria-label="${formatTime(slot.time)}${slot.isPast ? ' (past)' : ''}">
      ${formatTime(slot.time)}
    </button>
  `).join('');

}

function renderGuestOptions() {
  const container = $('#booking-guests');
  if (!container) return;

  const options = Array.from({ length: bookingState.maxGuests }, (_, i) => i + 1);

  container.innerHTML = options.map(num => `
    <button type="button"
            class="guest-option ${num === bookingState.selectedGuests ? 'is-selected' : ''}"
            data-guests="${num}"
            aria-pressed="${num === bookingState.selectedGuests}"
            role="button"
            aria-label="${num} guest${num > 1 ? 's' : ''}">
      ${num}
    </button>
  `).join('');
}

function bookingInitFormValidation() {
  const form = $('#booking-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    on(input, 'blur', () => bookingValidateField(input));
    on(input, 'input', () => {
      if (input.closest('.form-group').classList.contains('has-error')) {
        bookingValidateField(input);
      }
    });
  });

  on(form, 'submit', bookingHandleSubmit);
}

function bookingValidateField(input) {
  const group = input.closest('.form-group');
  const error = group?.querySelector('.form-error');
  let valid = true;
  let message = '';

  if (input.required && !validateRequired(input.value)) {
    valid = false;
    message = `${bookingGetFieldLabel(input)} is required`;
  } else if (input.type === 'tel' && input.value && !validateIndianPhone(input.value)) {
    valid = false;
    message = 'Please enter a valid 10-digit Indian mobile number';
  } else if (input.type === 'email' && input.value && !validateEmail(input.value)) {
    valid = false; message = 'Please enter a valid email address';
  } else if (input.type === 'date' && input.value && !bookingRules.bookingDateAllowed(input.value)) {
    valid = false;
    message = 'Choose a valid booking date';
  }

  if (group) {
    group.classList.toggle('has-error', !valid);
  }
  if (error) {
    error.textContent = message;
  }

  return valid;
}

function bookingGetFieldLabel(input) {
  const label = input.closest('.form-group')?.querySelector('label');
  return label ? label.textContent.replace('*', '').trim() : 'This field';
}

async function bookingHandleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  form.querySelector('.submission-error')?.remove();

  const inputs = form.querySelectorAll('input, select, textarea');
  let allValid = true;

  inputs.forEach(input => {
    if (!bookingValidateField(input)) {
      allValid = false;
    }
  });

  if (!bookingRules.bookingDateAllowed(bookingState.selectedDate)) {
    showToast('Please select a date', 'error');
    allValid = false;
  }

  if (!bookingRules.bookingSlotAvailable(bookingState.selectedDate, bookingState.selectedTime)) {
    showToast('Please select a time', 'error');
    allValid = false;
  }

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    showFormFailure(form, 'Please check the highlighted fields and your selections.');
    return;
  }

  const booking = {
    id: generateId('BK'),
    date: bookingState.selectedDate,
    time: bookingState.selectedTime,
    guests: bookingState.selectedGuests,
    customer: {
      name: form.elements.namedItem('name').value.trim(),
      phone: form.elements.namedItem('phone').value.trim(),
      email: form.elements.namedItem('email').value.trim() || null
    },
    notes: form.elements.namedItem('notes').value.trim() || null,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  // Submit booking to Supabase
  try {
    utils.showToast('Booking table...', 'info');
    const result = await utils.apiRequest('bookings', {
      customer_name: booking.customer.name, customer_phone: '91' + booking.customer.phone,
      customer_email: booking.customer.email, booking_date: booking.date,
      booking_time: booking.time, guests: booking.guests, special_requests: booking.notes,
    });
    if (result.id) {
      showBookingConfirmation({...booking, id: result.booking_number});
    } else {
      throw new Error(result.error || 'Booking failed');
    }
  } catch {
    showFormFailure(form, 'We could not confirm your booking request.');
    return;
  }

  form.reset();
  resetPickers();
}

function resetPickers() {
  bookingState.selectedDate = bookingState.availableDates[0].value;
  bookingState.selectedTime = null;
  bookingState.selectedGuests = 2;
  renderDateOptions();
  renderTimeSlots();
  renderGuestOptions();
}

function showBookingConfirmation(booking) {
  const config = state.config;

  const modalHtml = createEl('div', { class: 'modal-overlay booking-confirmation-modal', id: 'booking-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'booking-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'booking-confirmation-title' }, 'Booking Confirmed'),
        createEl('p', {}, `Your table has been booked. Reference: ${booking.booking_number || booking.id}`),
        createEl('div', { class: 'booking-success__details' },
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Date'),
            createEl('span', { class: 'booking-success__value' }, bookingDates.formatIndiaDate(booking.date, { weekday: 'long', month: 'long', day: 'numeric' }))
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Time'),
            createEl('span', { class: 'booking-success__value' }, formatTime(booking.time))
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Guests'),
            createEl('span', { class: 'booking-success__value' }, `${booking.guests} guest${booking.guests > 1 ? 's' : ''}`)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Name'),
            createEl('span', { class: 'booking-success__value' }, booking.customer.name)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Phone'),
            createEl('span', { class: 'booking-success__value' }, booking.customer.phone)
          )
        ),
        createEl('div', { class: 'booking-success__actions' },
          createEl('button', { class: 'btn btn--primary btn--lg', onclick: () => closeBookingConfirmation() }, 'Done')
        ),
        createEl('p', { class: 'confirmation__note' }, 'We have received your booking request. We\'ll confirm shortly.')
      )
    )
  );

  document.body.appendChild(modalHtml);
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    trapFocus(modalHtml.querySelector('.modal'));
  });
}

function closeBookingConfirmation() {
  const modal = $('#booking-confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function initCareersPage() {
  if (!document.body.classList.contains('careers-page')) return;
  if (!state.config) return;

  careersState.config = state.config;
  _initCareersPage();
}

function _initCareersPage() {
  renderRoleOptions();
  initFileUpload();
  careersInitFormValidation();
  initLazyLoading();
}

let careersState = {
  config: null,
  selectedFile: null
};

function renderRoleOptions() {
  const select = $('#role');
  if (!select) return;

  const roles = careersState.config?.careers?.roles || [
    "Chef", "Sous Chef", "Line Cook", "Server", "Host/Hostess",
    "Barista", "Bartender", "Manager", "Assistant Manager",
    "Dishwasher", "Other"
  ];

  select.innerHTML = `
    <option value="">Select a role</option>
    ${roles.map(role => `<option value="${role}">${role}</option>`).join('')}
  `;
}

function initFileUpload() {
  const fileInput = $('#cv');
  const fileLabel = $('.careers-form__file-label');
  const fileNameContainer = $('#careers-file-name');

  if (!fileInput || !fileLabel || !fileNameContainer) return;

  on(fileLabel, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });

  on(fileLabel, 'dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('drag-over');
  });

  on(fileLabel, 'dragleave', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
  });

  on(fileLabel, 'drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  on(fileInput, 'change', (e) => {
    if (e.target.files.length) {
      handleFileSelect(e.target.files[0]);
    }
  });

  utils.delegate(document, '.careers-form__file-remove', 'click', () => {
    clearFile();
  });
}

function handleFileSelect(file) {
  const config = careersState.config?.careers || {};
  const allowedTypes = config.allowedFileTypes || [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  const maxSizeMB = config.maxFileSizeMB || 2;

  const validation = validateFile(file, allowedTypes, maxSizeMB);

  if (!validation.valid) {
    clearFile();
    showToast(validation.error, 'error');
    return;
  }

  careersState.selectedFile = file;
  showFileName(file);
}

function showFileName(file) {
  const container = $('#careers-file-name');
  if (!container) return;

  container.innerHTML = `
    <span class="careers-form__file-name-text">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;vertical-align:middle">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      ${escapeHtml(file.name)}
      <span style="margin-left:8px;color:var(--color-text-muted);font-size:var(--text-xs)">(${formatFileSize(file.size)})</span>
    </span>
    <button type="button" class="careers-form__file-remove" aria-label="Remove file">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.style.display = 'flex';
}

function clearFile() {
  careersState.selectedFile = null;
  const fileInput = $('#cv');
  const fileNameContainer = $('#careers-file-name');
  if (fileInput) fileInput.value = '';
  if (fileNameContainer) {
    fileNameContainer.innerHTML = '';
    fileNameContainer.style.display = 'none';
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function careersInitFormValidation() {
  const form = $('#careers-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    on(input, 'blur', () => careersValidateField(input));
    on(input, 'input', () => {
      if (input.closest('.form-group').classList.contains('has-error')) {
        careersValidateField(input);
      }
    });
  });

  const fileInput = $('#cv');
  if (fileInput) {
    on(fileInput, 'change', () => validateFileField(fileInput));
  }

  on(form, 'submit', careersHandleSubmit);
}

function careersValidateField(input) {
  const group = input.closest('.form-group');
  const error = group?.querySelector('.form-error');
  let valid = true;
  let message = '';

  if (input.required && !validateRequired(input.value)) {
    valid = false;
    message = `${careersGetFieldLabel(input)} is required`;
  } else if (input.type === 'email' && input.value && !validateEmail(input.value)) {
    valid = false;
    message = 'Please enter a valid email address';
  } else if (input.type === 'tel' && input.value && !validateIndianPhone(input.value)) {
    valid = false;
    message = 'Please enter a valid 10-digit Indian mobile number';
  }

  if (group) {
    group.classList.toggle('has-error', !valid);
  }
  if (error) {
    error.textContent = message;
  }

  return valid;
}

function validateFileField(input) {
  const group = input.closest('.form-group');
  const error = group?.querySelector('.form-error');

  if (input.required && !careersState.selectedFile) {
    group.classList.add('has-error');
    if (error) error.textContent = 'Please upload your CV';
    return false;
  }

  group.classList.remove('has-error');
  return true;
}

function careersGetFieldLabel(input) {
  const label = input.closest('.form-group')?.querySelector('label');
  return label ? label.textContent.replace('*', '').trim() : 'This field';
}

async function careersHandleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  form.querySelector('.submission-error')?.remove();

  const inputs = form.querySelectorAll('input, select, textarea');
  let allValid = true;

  inputs.forEach(input => {
    if (input.type !== 'file' && !careersValidateField(input)) {
      allValid = false;
    }
  });

  if (!validateFileField(form.querySelector('#cv'))) {
    allValid = false;
  }

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    showFormFailure(form, 'Please check the highlighted fields and your selections.');
    return;
  }

  const application = {
    id: generateId('APP'),
    role: form.elements.namedItem('role').value,
    customer: {
      name: form.elements.namedItem('name').value.trim(),
      email: form.elements.namedItem('email').value.trim(),
      phone: form.elements.namedItem('phone').value.trim(),
      address: form.elements.namedItem('address').value.trim()
    },
    cv: careersState.selectedFile ? careersState.selectedFile.name : null,
    createdAt: new Date().toISOString(),
    status: 'submitted'
  };

  // Submit application to Supabase
  try {
    utils.showToast('Submitting application...', 'info');
    
    // Handle CV upload if file selected
    let cvPath = null;
    if (careersState.selectedFile) {
      // Get signed upload URL
      const { signedUrl, path } = await utils.apiRequest('applications/get-upload-url', {
        fileName: careersState.selectedFile.name,
        contentType: careersState.selectedFile.type,
        fileSize: careersState.selectedFile.size
      });
      
      if (typeof signedUrl !== 'string' || typeof path !== 'string' || !path) throw new Error('Invalid upload response');

      // Upload file directly to Supabase Storage
      const upload = await fetch(signedUrl, {
        method: 'PUT',
        body: (() => { const data = new FormData(); data.append('', careersState.selectedFile); return data; })()
      });
      if (!upload.ok) throw new Error('CV upload failed');
      cvPath = path;
    }

    const result = await utils.apiRequest('applications', {
      full_name: application.customer.name, email: application.customer.email,
      phone: '91' + application.customer.phone, address: application.customer.address,
      role: application.role, cv_path: cvPath
    });
    
    if (result.id) {
      showApplicationConfirmation({...application, id: result.application_number});
    } else {
      throw new Error(result.error || 'Application failed');
    }
  } catch {
    showFormFailure(form, 'We could not submit your application.');
    return;
  }

  form.reset();
  clearFile();
}

function showApplicationConfirmation(application) {
  const modalHtml = createEl('div', { class: 'modal-overlay careers-confirmation-modal', id: 'careers-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'careers-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'careers-confirmation-title' }, 'Application preview ready'),
        createEl('p', {}, `Application received. Reference: ${application.id}`),
        createEl('div', { class: 'booking-success__details' },
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Role Applied'),
            createEl('span', { class: 'booking-success__value' }, application.role)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Name'),
            createEl('span', { class: 'booking-success__value' }, application.customer.name)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Email'),
            createEl('span', { class: 'booking-success__value' }, application.customer.email)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Phone'),
            createEl('span', { class: 'booking-success__value' }, application.customer.phone)
          ),
          application.cv && createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'CV'),
            createEl('span', { class: 'booking-success__value' }, application.cv)
          )
        ),
        createEl('div', { class: 'booking-success__actions' },
          createEl('button', { class: 'btn btn--primary btn--lg', onclick: () => closeCareersConfirmation() }, 'Done')
        ),
        createEl('p', { class: 'confirmation__note' }, 'The café can review your request in its dashboard.')
      )
    )
  );

  document.body.appendChild(modalHtml);
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    trapFocus(modalHtml.querySelector('.modal'));
  });
}

function closeCareersConfirmation() {
  const modal = $('#careers-confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function initContactPage() {
  if (!document.body.classList.contains('contact-page')) return;
  if (!state.config) return;

  contactState.config = state.config;
  _initContactPage();
}

function _initContactPage() {
  contactInitFormValidation();
  contactInitMapLazyLoad();
  initLazyLoading();
}

let contactState = {
  config: null
};

function contactInitFormValidation() {
  const form = $('#contact-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');

  inputs.forEach(input => {
    on(input, 'blur', () => contactValidateField(input));
    on(input, 'input', () => {
      if (input.closest('.form-group').classList.contains('has-error')) {
        contactValidateField(input);
      }
    });
  });

  on(form, 'submit', contactHandleSubmit);
}

function contactValidateField(input) {
  const group = input.closest('.form-group');
  const error = group?.querySelector('.form-error');
  let valid = true;
  let message = '';

  if (input.required && !validateRequired(input.value)) {
    valid = false;
    message = `${contactGetFieldLabel(input)} is required`;
  } else if (input.type === 'email' && input.value && !validateEmail(input.value)) {
    valid = false;
    message = 'Please enter a valid email address';
  } else if (input.type === 'tel' && input.value && !validateIndianPhone(input.value)) {
    valid = false;
    message = 'Please enter a valid 10-digit Indian mobile number';
  }

  if (group) {
    group.classList.toggle('has-error', !valid);
  }
  if (error) {
    error.textContent = message;
  }

  return valid;
}

function contactGetFieldLabel(input) {
  const label = input.closest('.form-group')?.querySelector('label');
  return label ? label.textContent.replace('*', '').trim() : 'This field';
}

async function contactHandleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  form.querySelector('.submission-error')?.remove();

  const inputs = form.querySelectorAll('input, select, textarea');
  let allValid = true;

  inputs.forEach(input => {
    if (!contactValidateField(input)) {
      allValid = false;
    }
  });

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    showFormFailure(form, 'Please check the highlighted fields and your selections.');
    return;
  }

  const contact = {
    id: generateId('MSG'),
    subject: form.elements.namedItem('subject').value,
    customer: {
      name: form.elements.namedItem('name').value.trim(),
      email: form.elements.namedItem('email').value.trim(),
      phone: form.elements.namedItem('phone').value.trim()
    },
    message: form.elements.namedItem('message').value.trim(),
    createdAt: new Date().toISOString(),
    status: 'submitted'
  };

  try {
    const result = await utils.apiRequest('contact', {...contact.customer, subject: contact.subject, message: contact.message});
    if (result?.received !== true) throw new Error('Invalid contact response');
  } catch {
    showFormFailure(form, 'We could not send your message.');
    return;
  }
  showContactConfirmation(contact);
  form.reset();
}

function showContactConfirmation(contact) {
  const modalHtml = createEl('div', { class: 'modal-overlay contact-confirmation-modal', id: 'contact-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'contact-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'contact-confirmation-title' }, 'Message received'),
        createEl('p', {}, `Your message was received.`),
        createEl('div', { class: 'booking-success__details' },
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Subject'),
            createEl('span', { class: 'booking-success__value' }, contact.subject)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Name'),
            createEl('span', { class: 'booking-success__value' }, contact.customer.name)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Email'),
            createEl('span', { class: 'booking-success__value' }, contact.customer.email)
          ),
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Phone'),
            createEl('span', { class: 'booking-success__value' }, contact.customer.phone)
          )
        ),
        createEl('div', { class: 'booking-success__actions' },
          createEl('button', { class: 'btn btn--primary btn--lg', onclick: () => closeContactConfirmation() }, 'Done')
        ),
        createEl('p', { class: 'confirmation__note' }, 'The café can review your request in its dashboard.')
      )
    )
  );

  document.body.appendChild(modalHtml);
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    trapFocus(modalHtml.querySelector('.modal'));
  });
}

function closeContactConfirmation() {
  const modal = $('#contact-confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function contactInitMapLazyLoad() {
  const mapContainer = $('.contact-map');
  if (!mapContainer) return;

  const iframe = mapContainer.querySelector('iframe');
  if (!iframe) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iframe = entry.target;
          if (iframe.dataset.src) {
            iframe.src = iframe.dataset.src;
            iframe.removeAttribute('data-src');
          }
          obs.unobserve(iframe);
        }
      });
    }, { rootMargin: '200px 0px' });

    observer.observe(iframe);
  }
}

function initLocationsPage() {
  if (!document.body.classList.contains('locations-page')) return;
  if (!state.config) return;

  locationsState.config = state.config;
  _initLocationsPage();
}

function _initLocationsPage() {
  locationsInitMapLazyLoad();
  initLazyLoading();
}

let locationsState = {
  config: null
};

function locationsInitMapLazyLoad() {
  const mapIframes = $$('.location-card__map iframe');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iframe = entry.target;
          if (iframe.dataset.src) {
            iframe.src = iframe.dataset.src;
            iframe.removeAttribute('data-src');
          }
          obs.unobserve(iframe);
        }
      });
    }, { rootMargin: '200px 0px' });

    mapIframes.forEach(iframe => observer.observe(iframe));
  } else {
    mapIframes.forEach(iframe => {
      if (iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        iframe.removeAttribute('data-src');
      }
    });
  }
}

// ========================================
// EVENT DELEGATION
// ========================================

function initEventDelegation() {
  // Cart button
  utils.delegate(document, '#cart-btn', 'click', openCartDrawer);

  // Cart drawer close
  utils.delegate(document, '.cart-drawer__close, #cart-drawer-overlay', 'click', closeCartDrawer);

  // Cart quantity buttons
  utils.delegate(document, '.cart-item .qty-stepper__btn', 'click', (e, btn) => {
    const itemEl = btn.closest('.cart-item');
    const itemId = itemEl.dataset.id;
    const action = btn.dataset.action;
    const item = state.cart.find(i => i.id === itemId);
    if (item) {
      const newQty = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
      updateCartQuantity(itemId, newQty);
    }
  });

  // Cart remove button
  utils.delegate(document, '.cart-item__remove', 'click', (e, btn) => {
    const itemEl = btn.closest('.cart-item');
    const itemId = itemEl.dataset.id;
    removeFromCart(itemId);
  });

  // Cart checkout button
  utils.delegate(document, '.cart-drawer__checkout', 'click', openCheckout);

  // Mobile menu
  utils.delegate(document, '#menu-btn', 'click', openMobileMenu);
  utils.delegate(document, '.mobile-menu__close, #mobile-menu-overlay', 'click', closeMobileMenu);
  utils.delegate(document, '.mobile-menu__link', 'click', closeMobileMenu);

  delegate(document, '.date-option', 'click', (e, btn) => {
    bookingState.selectedDate = btn.dataset.date; bookingState.selectedTime = null;
    renderDateOptions(); renderTimeSlots(); syncPickers();
  });
  delegate(document, '.time-slot', 'click', (e, btn) => { if (!btn.disabled) { bookingState.selectedTime = btn.dataset.time; renderTimeSlots(); syncPickers(); } });
  delegate(document, '.guest-option', 'click', (e, btn) => { bookingState.selectedGuests = Number(btn.dataset.guests); renderGuestOptions(); });
  // Header scroll
  initHeaderScroll();

  // Keyboard shortcuts
  utils.on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.isCartOpen) closeCartDrawer();
      if (state.isMobileMenuOpen) closeMobileMenu();
      const checkoutModal = $('#checkout-modal');
      if (checkoutModal) closeCheckout();
      const confirmationModal = $('#confirmation-modal');
      if (confirmationModal) closeConfirmation();
    }
  });

  // Category chip selection
  utils.delegate(document, '.category-chip', 'click', (e, btn) => {
    const category = btn.dataset.category;
    menuState.activeCategory = category;

    utils.$$('.category-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.category === category);
      c.setAttribute('aria-pressed', c.dataset.category === category);
    });

    applyFilters();
  });

  // Filter chip selection
  utils.delegate(document, '.filter-chip', 'click', (e, btn) => {
    const filter = btn.dataset.filter;
    menuState.activeFilter = filter;

    utils.$$('.filter-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.filter === filter);
      c.setAttribute('aria-pressed', c.dataset.filter === filter);
    });

    applyFilters();
  });

  // Add to cart from dish card
  utils.delegate(document, '.dish-card__add', 'click', (e, btn) => {
    const item = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: parseFloat(btn.dataset.price),
      veg: btn.dataset.veg === 'true',
      image: btn.dataset.image,
      description: btn.dataset.description
    };
    utils.addToCart(item, 1);

    btn.style.transform = 'scale(0.9)';
    setTimeout(() => btn.style.transform = '', 100);
  });
}

// ========================================
// INITIALIZATION
// ========================================

async function init() {

  try {
    ({menuImageUrl} = await import('./menu-image.mjs'));
    // Render shared header/footer first
    renderHeader();
    await loadConfig();
    renderFooter();
    await loadMenu();
    loadCart();
    initEventDelegation();

    // Initialize page-specific components
    if (document.body.classList.contains('home-page')) {
      initHomePage();
      initLazyLoading();
    }
    if (document.body.classList.contains('menu-page')) {
      initMenuPage();
    }
    if (document.body.classList.contains('booking-page')) {
      [bookingDates, bookingRules] = await Promise.all([
        import('../supabase/functions/_shared/india-date.mjs'),
        import('../supabase/functions/_shared/booking-rules.mjs'),
      ]);
      initBookingPage();
    }
    if (document.body.classList.contains('careers-page')) {
      initCareersPage();
    }
    if (document.body.classList.contains('contact-page')) {
      initContactPage();
    }
    if (document.body.classList.contains('locations-page')) {
      initLocationsPage();
    }

    populateBusinessDetails();
    installDialogAccessibility();
    installMobileFormScrolling();
    syncPickers();
    // Mark body as ready
    document.body.classList.add('app-ready');

    // Dispatch custom event for page-specific init
    window.dispatchEvent(new CustomEvent('cafe:ready', { detail: { config: state.config, menu: state.menu } }));
  } catch (e) {
    console.error('[app.js] Init failed:', e);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      init();
    } catch (e) {
      console.error('[app.js] Init failed:', e);
    }
  });
} else {

  try {
    init();
  } catch (e) {
    console.error('[app.js] Init failed:', e);
  }
}

console.log('[app.js] Script loaded');
