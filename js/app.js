/**
 * CAFÉ DE LEILA — MAIN APPLICATION
 * Shared functionality: Header, Footer, Cart, Mobile Menu, Config Loading
 */

import {
  $, $$, createEl, on, delegate, storageGet, storageSet, storageRemove,
  formatPrice, formatPhone, validateIndianPhone, validateEmail, validateRequired, validateFile,
  generateId, generateOrderId, debounce, throttle,
  formatDate, formatTime, isPastDate, getAvailableDates,
  getWhatsAppUrl, openWhatsAppOrder, initLazyLoading, showToast, trapFocus, announce,
  prefersReducedMotion, animate,
  escapeHtml
} from '/js/utils.js';

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

// Make state globally accessible for other modules
window.cafeState = state;

// ========================================
// CONFIG & DATA LOADING
// ========================================

async function loadConfig() {
  try {
    const response = await fetch('/data/config.json');
    if (!response.ok) throw new Error('Failed to load config');
    state.config = await response.json();
    applyConfigToPage();
  } catch (error) {
    console.error('Config load failed:', error);
    showToast('Failed to load configuration', 'error');
  }
}

async function loadMenu() {
  try {
    const response = await fetch('/data/menu.json');
    if (!response.ok) throw new Error('Failed to load menu');
    const data = await response.json();
    state.menu = data.categories;
  } catch (error) {
    console.error('Menu load failed:', error);
    showToast('Failed to load menu', 'error');
  }
}

function applyConfigToPage() {
  if (!state.config) return;

  // Update page title
  if (state.config.seo?.defaultTitle) {
    document.title = state.config.seo.defaultTitle;
  }

  // Update meta description
  const metaDesc = $('meta[name="description"]');
  if (metaDesc && state.config.seo?.defaultDescription) {
    metaDesc.setAttribute('content', state.config.seo.defaultDescription);
  }

  // Update WhatsApp number in config for order flow
  window.CAFE_CONFIG = state.config;
}

// ========================================
// CART MANAGEMENT
// ========================================

const CART_STORAGE_KEY = 'cart';

function loadCart() {
  state.cart = storageGet(CART_STORAGE_KEY, []);
  updateCartUI();
}

function saveCart() {
  storageSet(CART_STORAGE_KEY, state.cart);
  updateCartUI();
}

function updateCartUI() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEls = $$('.cart-btn__count');
  countEls.forEach(el => {
    el.textContent = count > 0 ? count : '';
  });

  // Update cart drawer if open
  renderCartDrawer();
}

function addToCart(item, quantity = 1) {
  const existingIndex = state.cart.findIndex(i => i.id === item.id);
  if (existingIndex >= 0) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      ...item,
      quantity,
      addedAt: Date.now()
    });
  }
  saveCart();
  showToast(`${item.name} added to cart`, 'success');
  openCartDrawer();
}

function updateCartQuantity(itemId, quantity) {
  const index = state.cart.findIndex(i => i.id === itemId);
  if (index >= 0) {
    if (quantity <= 0) {
      state.cart.splice(index, 1);
    } else {
      state.cart[index].quantity = quantity;
    }
    saveCart();
  }
}

function removeFromCart(itemId) {
  const index = state.cart.findIndex(i => i.id === itemId);
  if (index >= 0) {
    const item = state.cart[index];
    state.cart.splice(index, 1);
    saveCart();
    showToast(`${item.name} removed from cart`, 'info');
  }
}

function clearCart() {
  state.cart = [];
  saveCart();
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartItemCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

// ========================================
// CART DRAWER RENDERING
// ========================================

function renderCartDrawer() {
  const drawer = $('#cart-drawer');
  if (!drawer) return;

  const body = drawer.querySelector('.cart-drawer__body');
  const footer = drawer.querySelector('.cart-drawer__footer');

  if (state.cart.length === 0) {
    body.innerHTML = `
      <div class="cart-drawer__empty">
        <svg class="cart-drawer__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>Your cart is empty</p>
        <button class="btn btn--primary" onclick="closeCartDrawer(); document.querySelector('.hero__actions .btn--primary')?.click()">Start Ordering</button>
      </div>
    `;
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';

  const config = window.CAFE_CONFIG;
  const deliveryFee = config?.ordering?.deliveryFee || 40;
  const minOrderDelivery = config?.ordering?.minOrderDelivery || 200;
  const taxRate = config?.ordering?.taxRate || 0.05;

  const subtotal = getCartSubtotal();
  const needsDeliveryFee = subtotal < minOrderDelivery;
  const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + deliveryFeeAmount + tax;

  body.innerHTML = state.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item__image">
        ${item.image ? `<img src="${item.image}" alt="" loading="lazy">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;color:var(--color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
      </div>
      <div class="cart-item__details">
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__price">${formatPrice(item.price)} each</div>
      </div>
      <div class="cart-item__controls">
        <div class="qty-stepper" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
          <button class="qty-stepper__btn" data-action="decrease" aria-label="Decrease quantity" ${item.quantity <= 1 ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <input type="text" class="qty-stepper__input" value="${item.quantity}" readonly aria-label="Quantity">
          <button class="qty-stepper__btn" data-action="increase" aria-label="Increase quantity">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <button class="cart-item__remove" aria-label="Remove ${escapeHtml(item.name)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  footer.innerHTML = `
    <div class="cart-drawer__summary">
      <div class="cart-drawer__row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      ${needsDeliveryFee ? `<div class="cart-drawer__row"><span>Delivery Fee</span><span>${formatPrice(deliveryFeeAmount)}</span></div><p class="cart-drawer__note">Free delivery on orders above ${formatPrice(minOrderDelivery)}</p>` : '<div class="cart-drawer__row"><span>Delivery</span><span>Free</span></div>'}
      <div class="cart-drawer__row"><span>Tax (${(taxRate * 100).toFixed(0)}%)</span><span>${formatPrice(tax)}</span></div>
      <div class="cart-drawer__row cart-drawer__row--total"><span>Total</span><span>${formatPrice(total)}</span></div>
    </div>
    <div class="cart-drawer__actions">
      <button class="btn btn--primary btn--lg cart-drawer__checkout" ${state.cart.length === 0 ? 'disabled' : ''}>Proceed to Checkout</button>
    </div>
  `;
}

// ========================================
// CART DRAWER TOGGLE
// ========================================

function openCartDrawer() {
  const drawer = $('#cart-drawer');
  const overlay = $('#cart-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    state.isCartOpen = true;
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
    // Focus first focusable element
    setTimeout(() => {
      const firstBtn = drawer.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstBtn?.focus();
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
    // Focus first link
    setTimeout(() => menu.querySelector('a')?.focus(), 100);
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
  const onScroll = throttle(() => {
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
    { href: '/menu.html', label: 'Menu', icon: 'menu' },
    { href: '/book-table.html', label: 'Book a Table', icon: 'calendar' },
    { href: '/careers.html', label: 'Careers', icon: 'briefcase' },
    { href: '/locations.html', label: 'Locations', icon: 'map-pin' },
    { href: '/contact.html', label: 'Contact', icon: 'phone' }
  ];

  const currentPath = window.location.pathname;

  placeholder.innerHTML = `
    <header class="site-header" role="banner">
      <div class="header-inner container">
        <a href="/index.html" class="logo" aria-label="Café De Leila - Home">
          <span class="logo__mark" aria-hidden="true">C</span>
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
        <a href="/menu.html" class="btn btn--primary">Order Online</a>
        <a href="/book-table.html" class="btn btn--secondary">Book a Table</a>
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
            <a href="/index.html" class="logo" aria-label="Café De Leila - Home">
              <span class="logo__mark" aria-hidden="true">C</span>
              <span class="logo__text">
                <span class="logo__name">CAFÉ DE LEILA</span>
                <span class="logo__tagline">Magical Delight</span>
              </span>
            </a>
            <p class="footer-brand__description">Experience culinary magic at Café De Leila, where every dish tells a story of flavor and tradition. Authentic Indian, Continental & Chinese cuisine in the heart of Lucknow.</p>
            <div class="footer-social">
              ${config.social?.facebook ? `<a href="${config.social.facebook}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>` : ''}
              ${config.social?.instagram ? `<a href="${config.social.instagram}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>` : ''}
              ${config.social?.youtube ? `<a href="${config.social.youtube}" class="footer-social__link" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>` : ''}
            </div>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Quick Links</h3>
            <ul class="footer-links">
              <li><a href="/menu.html">Menu</a></li>
              <li><a href="/book-table.html">Book a Table</a></li>
              <li><a href="/locations.html">Locations</a></li>
              <li><a href="/careers.html">Careers</a></li>
              <li><a href="/contact.html">Contact Us</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Contact</h3>
            <div class="footer-contact">
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <div>
                  <div class="footer-contact__label">Phone</div>
                  <a class="footer-contact__value" href="tel:${config.contact?.phoneRaw}">${config.contact?.phone}</a>
                </div>
              </div>
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <div>
                  <div class="footer-contact__label">Email</div>
                  <a class="footer-contact__value" href="mailto:${config.contact?.email}">${config.contact?.email}</a>
                </div>
              </div>
              <div class="footer-contact__item">
                <svg class="footer-contact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <div>
                  <div class="footer-contact__label">Address</div>
                  <address class="footer-contact__value" style="font-style: normal;">${config.contact?.address?.full}</address>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-section">
            <h3 class="footer-section__title">Opening Hours</h3>
            <div class="footer-hours">
              ${hours.map(h => `
                <div class="footer-hours__day">
                  <span>${h.day}</span>
                  <span>${h.closed ? 'Closed' : `${formatTime(h.open)} - ${formatTime(h.close)}`}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="footer-bottom__copyright">&copy; ${new Date().getFullYear()} ${config.site?.name}. All rights reserved.</p>
          <div class="footer-bottom__legal">
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// ========================================
// CHECKOUT FLOW
// ========================================

function openCheckout() {
  if (state.cart.length === 0) {
    showToast('Your cart is empty', 'warning');
    return;
  }

  closeCartDrawer();

  // Create checkout modal
  const modalHtml = createCheckoutModal();
  document.body.appendChild(modalHtml);

  // Initialize form
  initCheckoutForm(modalHtml);

  // Show modal
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    const firstInput = modalHtml.querySelector('input, select, button');
    firstInput?.focus();
    trapFocus(modalHtml.querySelector('.modal'));
  });
}

function createCheckoutModal() {
  const config = window.CAFE_CONFIG;
  const orderTypes = config?.ordering?.types || [
    { id: 'dine-in', label: 'Dine In', description: 'Enjoy your meal at our cafe' },
    { id: 'takeaway', label: 'Takeaway', description: 'Pick up your order' },
    { id: 'delivery', label: 'Delivery', description: 'Delivered to your door' }
  ];

  const subtotal = getCartSubtotal();
  const deliveryFee = config?.ordering?.deliveryFee || 40;
  const minOrderDelivery = config?.ordering?.minOrderDelivery || 200;
  const taxRate = config?.ordering?.taxRate || 0.05;
  const needsDeliveryFee = subtotal < minOrderDelivery;
  const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + deliveryFeeAmount + tax;

  const overlay = createEl('div', { class: 'modal-overlay checkout-modal', id: 'checkout-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'checkout-title' },
      createEl('div', { class: 'modal__header' },
        createEl('h2', { class: 'modal__title', id: 'checkout-title' }, 'Checkout'),
        createEl('button', { class: 'modal__close', 'aria-label': 'Close', onclick: () => closeCheckout() },
          createEl('svg', { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, createEl('line', { x1: '18', y1: '6', x2: '6', y2: '18' }), createEl('line', { x1: '6', y1: '6', x2: '18', y2: '18' }))
        )
      ),
      createEl('div', { class: 'modal__body' },
        createEl('form', { id: 'checkout-form', novalidate: '' },
          createEl('div', { class: 'checkout-form__section' },
            createEl('h3', { class: 'checkout-form__section-title' }, 'Order Type'),
            createEl('div', { class: 'checkout-form__order-type', role: 'radiogroup', 'aria-label': 'Order type' },
              orderTypes.map(type => createEl('button', {
                type: 'button',
                class: `order-type-btn ${type.id === 'dine-in' ? 'is-active' : ''}`,
                'data-type': type.id,
                role: 'radio',
                'aria-checked': type.id === 'dine-in',
                onclick: (e) => selectOrderType(e.currentTarget.dataset.type)
              }, type.label))
            ),
            createEl('div', { class: 'checkout-form__address', id: 'delivery-address-field', hidden: '' },
              createEl('div', { class: 'form-group' },
                createEl('label', { for: 'address' }, 'Delivery Address *'),
                createEl('textarea', { id: 'address', name: 'address', rows: 3, required: '', placeholder: 'Enter full delivery address including landmark', 'aria-describedby': 'address-hint' }),
                createEl('span', { id: 'address-hint', class: 'form-error' }, 'Please enter delivery address')
              )
            )
          ),
          createEl('div', { class: 'checkout-form__section' },
            createEl('h3', { class: 'checkout-form__section-title' }, 'Your Details'),
            createEl('div', { class: 'booking-form__row' },
              createEl('div', { class: 'form-group' },
                createEl('label', { for: 'name' }, 'Full Name *'),
                createEl('input', { type: 'text', id: 'name', name: 'name', required: '', autocomplete: 'name', placeholder: 'Your full name' }),
                createEl('span', { class: 'form-error' }, 'Please enter your name')
              ),
              createEl('div', { class: 'form-group' },
                createEl('label', { for: 'phone' }, 'Phone Number *'),
                createEl('input', { type: 'tel', id: 'phone', name: 'phone', required: '', autocomplete: 'tel', placeholder: '10 digit mobile number', pattern: '[6-9]\\d{9}', inputmode: 'numeric', maxlength: '10' }),
                createEl('span', { class: 'form-error' }, 'Please enter a valid 10-digit Indian mobile number')
              )
            ),
            createEl('div', { class: 'form-group' },
              createEl('label', { for: 'notes' }, 'Special Instructions'),
              createEl('textarea', { id: 'notes', name: 'notes', rows: 2, placeholder: 'Any allergies, preferences, or delivery instructions...' })
            )
          ),
          createEl('div', { class: 'checkout-form__section' },
            createEl('h3', { class: 'checkout-form__section-title' }, 'Order Summary'),
            createEl('div', { class: 'checkout-summary' },
              state.cart.map(item => createEl('div', { class: 'checkout-summary__item' },
                createEl('span', {}, `${item.name} x${item.quantity}`),
                createEl('span', {}, formatPrice(item.price * item.quantity))
              )),
              createEl('div', { class: 'checkout-summary__item checkout-summary__item--total' },
                createEl('span', {}, 'Total'),
                createEl('span', { id: 'checkout-total' }, formatPrice(total))
              )
            )
          ),
          createEl('div', { class: 'modal__footer' },
            createEl('button', { type: 'button', class: 'btn btn--secondary', onclick: () => closeCheckout() }, 'Cancel'),
            createEl('button', { type: 'submit', class: 'btn btn--primary btn--lg' }, 'Place Order')
          )
        )
      )
    )
  );

  return overlay;
}

function initCheckoutForm(modal) {
  const form = modal.querySelector('#checkout-form');
  const orderTypeBtns = modal.querySelectorAll('.order-type-btn');
  const addressField = modal.querySelector('#delivery-address-field');
  const addressInput = modal.querySelector('#address');
  const totalEl = modal.querySelector('#checkout-total');

  function updateTotal() {
    const subtotal = getCartSubtotal();
    const config = window.CAFE_CONFIG;
    const deliveryFee = config?.ordering?.deliveryFee || 40;
    const minOrderDelivery = config?.ordering?.minOrderDelivery || 200;
    const taxRate = config?.ordering?.taxRate || 0.05;
    const activeType = modal.querySelector('.order-type-btn.is-active')?.dataset.type || 'dine-in';
    const needsDeliveryFee = activeType === 'delivery' && subtotal < minOrderDelivery;
    const deliveryFeeAmount = needsDeliveryFee ? deliveryFee : 0;
    const tax = subtotal * taxRate;
    const total = subtotal + deliveryFeeAmount + tax;
    totalEl.textContent = formatPrice(total);
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
    on(btn, 'click', () => selectOrderType(btn.dataset.type));
  });

  on(form, 'submit', async (e) => {
    e.preventDefault();
    if (!validateCheckoutForm(form)) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Build order object
    const order = {
      id: generateOrderId(),
      type: modal.querySelector('.order-type-btn.is-active')?.dataset.type || 'dine-in',
      customer: {
        name: form.name.value.trim(),
        phone: form.phone.value.trim()
      },
      items: state.cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: getCartSubtotal(),
      deliveryFee: 0,
      taxRate: window.CAFE_CONFIG?.ordering?.taxRate || 0.05,
      tax: getCartSubtotal() * (window.CAFE_CONFIG?.ordering?.taxRate || 0.05),
      total: 0,
      notes: form.notes.value.trim(),
      address: form.address.value.trim() || null,
      createdAt: new Date().toISOString()
    };

    // Calculate totals
    const config = window.CAFE_CONFIG;
    const minOrderDelivery = config?.ordering?.minOrderDelivery || 200;
    const deliveryFee = config?.ordering?.deliveryFee || 40;
    const needsDeliveryFee = order.type === 'delivery' && order.subtotal < minOrderDelivery;
    order.deliveryFee = needsDeliveryFee ? deliveryFee : 0;
    order.total = order.subtotal + order.deliveryFee + order.tax;

    // Save order to localStorage
    const orders = storageGet('orders', []);
    orders.unshift(order);
    storageSet('orders', orders.slice(0, 50)); // Keep last 50

    // Clear cart
    clearCart();

    // Close checkout modal
    closeCheckout();

    // Show confirmation
    setTimeout(() => showOrderConfirmation(order), 300);
  });
}

function validateCheckoutForm(form) {
  let valid = true;
  const groups = form.querySelectorAll('.form-group');

  groups.forEach(group => {
    const input = group.querySelector('input, textarea, select');
    const error = group.querySelector('.form-error');
    if (input && input.required && !input.value.trim()) {
      group.classList.add('has-error');
      if (error) error.textContent = input.validationMessage || 'This field is required';
      valid = false;
    } else if (input && input.type === 'tel' && input.required) {
      if (!validateIndianPhone(input.value)) {
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

  // Check delivery address if delivery selected
  const addressField = form.querySelector('#delivery-address-field');
  if (!addressField.hidden) {
    const addressInput = form.querySelector('#address');
    if (!addressInput.value.trim()) {
      addressInput.closest('.form-group').classList.add('has-error');
      valid = false;
    }
  }

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
  const whatsappNumber = config?.contact?.whatsapp || '915224584372';

  const modalHtml = createEl('div', { class: 'modal-overlay confirmation-modal', id: 'confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirmation-title' },
      createEl('div', { class: 'modal__body confirmation' },
        createEl('div', { class: 'confirmation__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '40', height: '40' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'confirmation__title', id: 'confirmation-title' }, 'Order Confirmed!'),
        createEl('p', { class: 'confirmation__subtitle' }, 'Your order has been placed successfully.'),
        createEl('div', { class: 'confirmation__order-id' }, order.id),
        createEl('div', { class: 'confirmation__summary' },
          createEl('h3', { class: 'confirmation__summary-title' }, 'Order Summary'),
          createEl('div', { class: 'confirmation__items' },
            order.items.map(item => createEl('div', { class: 'confirmation__item' },
              createEl('span', { class: 'confirmation__item-name' }, `${item.name} x${item.quantity}`),
              createEl('span', { class: 'confirmation__item-total' }, formatPrice(item.price * item.quantity))
            ))
          ),
          createEl('div', { class: 'confirmation__totals' },
            createEl('div', { class: 'confirmation__total-row' },
              createEl('span', {}, 'Subtotal'),
              createEl('span', {}, formatPrice(order.subtotal))
            ),
            order.deliveryFee > 0 && createEl('div', { class: 'confirmation__total-row' },
              createEl('span', {}, 'Delivery Fee'),
              createEl('span', {}, formatPrice(order.deliveryFee))
            ),
            createEl('div', { class: 'confirmation__total-row' },
              createEl('span', {}, `Tax (${(order.taxRate * 100).toFixed(0)}%)`),
              createEl('span', {}, formatPrice(order.tax))
            ),
            createEl('div', { class: 'confirmation__total-row confirmation__total-row--grand' },
              createEl('span', {}, 'Total'),
              createEl('span', {}, formatPrice(order.total))
            )
          )
        ),
        createEl('div', { class: 'confirmation__actions' },
          createEl('a', { class: 'btn btn--primary btn--lg confirmation__whatsapp', href: getWhatsAppUrl(whatsappNumber, buildWhatsAppMessage(order)), target: '_blank', rel: 'noopener noreferrer' },
            createEl('svg', { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'currentColor' }, createEl('path', { d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67-.152-.197-.003-.397.05-.578.148-.196.108-.573.335-.92.729-.41.463-1.133 1.584-1.498 2.438-.346.797-.365 1.066-.365 1.195 0 .115.086.203.15.286.09.114.207.324.375.546.306.408 1.028 1.293 1.206 1.761.137.35.163.472.117.53-.05.06-.288.13-.64.144-.562.017-1.015-.055-1.383-.274-.42-.25-.912-.667-1.107-.876-.184-.196-.326-.327-.444-.417-.13-.098-.22-.11-.3-.11-.08 0-.16.01-.239.04-.126.04-.992.34-1.46.997-.32.454-.52.933-.588 1.055-.049.089-.097.178-.13.267-.06.183-.21.177-.336.098-.29-.175-1.05-.567-1.179-.645-.09-.057-.18-.077-.27-.077-.103 0-.196.01-.283.043-.16.06-.35.157-.495.33-.12.15-.212.298-.288.42-.07.123-.113.246-.113.372 0 .14.033.33.16.412.228.14.91.283 1.002.31.083.023.16.032.24.032.153 0 .3-.038.412-.13.086-.06.167-.136.253-.237.19-.236.636-.817.636-1.395 0-.714-.203-1.292-.739-1.692-.234-.175-.474-.4-.646-.594-.19-.213-.33-.446-.435-.65-.12-.226-.19-.477-.185-.69.007-.24.137-.572.41-.89.26-.307.558-.57.895-.763.338-.193.69-.327 1.04-.327.22 0 .436.025.64.07.26.05.507.124.74.22.25.1.47.225.665.32.18.09.33.173.476.213a.4.4 0 0 1 .207.07.4.4 0 0 1 .12.158c.02.06.036.133.044.21l.01.11c.01.105-.013.213-.058.305-.076.157-.2.3-.35.447-.18.176-.42.3-.693.384-.382.11-.855.075-1.192-.028zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z' })
            ),
            'Send to WhatsApp'
          ),
          createEl('button', { class: 'btn btn--secondary btn--lg', onclick: () => closeConfirmation() }, 'Done')
        ),
        createEl('p', { class: 'confirmation__note' }, 'This is a demo. No real payment was processed. A real backend and payment gateway are planned for Phase 2.')
      )
    )
  );

  document.body.appendChild(modalHtml);
  requestAnimationFrame(() => {
    modalHtml.classList.add('is-open');
    trapFocus(modalHtml.querySelector('.modal'));
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
    `*Type:* ${order.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    `*Customer:* ${order.customer.name}`,
    `*Phone:* ${order.customer.phone}`,
    '',
    '*Items:*'
  ];

  order.items.forEach(item => {
    lines.push(`• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`);
  });

  lines.push('', `*Subtotal:* ${formatPrice(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`*Delivery Fee:* ${formatPrice(order.deliveryFee)}`);
  }
  if (order.tax > 0) {
    lines.push(`*Tax (${(order.taxRate * 100).toFixed(0)}%):* ${formatPrice(order.tax)}`);
  }
  lines.push(`*Total:* ${formatPrice(order.total)}`);

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
// EVENT DELEGATION
// ========================================

function initEventDelegation() {
  // Cart button
  delegate(document, '#cart-btn', 'click', openCartDrawer);

  // Cart drawer close
  delegate(document, '.cart-drawer__close, #cart-drawer-overlay', 'click', closeCartDrawer);

  // Cart quantity buttons
  delegate(document, '.cart-item .qty-stepper__btn', 'click', (e, btn) => {
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
  delegate(document, '.cart-item__remove', 'click', (e, btn) => {
    const itemEl = btn.closest('.cart-item');
    const itemId = itemEl.dataset.id;
    removeFromCart(itemId);
  });

  // Cart checkout button
  delegate(document, '.cart-drawer__checkout', 'click', openCheckout);

  // Mobile menu
  delegate(document, '#menu-btn', 'click', openMobileMenu);
  delegate(document, '.mobile-menu__close, #mobile-menu-overlay', 'click', closeMobileMenu);
  delegate(document, '.mobile-menu__link', 'click', closeMobileMenu);

  // Header scroll
  initHeaderScroll();

  // Lazy loading
  initLazyLoading();

  // Keyboard shortcuts
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.isCartOpen) closeCartDrawer();
      if (state.isMobileMenuOpen) closeMobileMenu();
      const checkoutModal = $('#checkout-modal');
      if (checkoutModal) closeCheckout();
      const confirmationModal = $('#confirmation-modal');
      if (confirmationModal) closeConfirmation();
    }
  });
}

// ========================================
// INITIALIZATION
// ========================================

async function init() {
  // Render shared header/footer first
  renderHeader();
  await loadConfig();
  renderFooter();
  await loadMenu();
  loadCart();
  initEventDelegation();

  // Initialize page-specific components after data loads
  if (document.body.classList.contains('menu-page')) {
    const { initMenuPage, setMenuState } = await import('/js/menu.js');
    setMenuState(state);
    initMenuPage();
  }
  if (document.body.classList.contains('booking-page')) {
    const { initBookingPage } = await import('/js/booking.js');
    initBookingPage();
  }
  if (document.body.classList.contains('careers-page')) {
    const { initCareersPage } = await import('/js/careers.js');
    initCareersPage();
  }
  if (document.body.classList.contains('contact-page')) {
    const { initContactPage } = await import('/js/contact.js');
    initContactPage();
  }
  if (document.body.classList.contains('locations-page')) {
    const { initLocationsPage } = await import('/js/locations.js');
    initLocationsPage();
  }

  // Mark body as ready
  document.body.classList.add('app-ready');

  // Dispatch custom event for page-specific init (backup)
  window.dispatchEvent(new CustomEvent('cafe:ready', { detail: { config: state.config, menu: state.menu } }));
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

console.log('[app.js] Module loaded, readyState:', document.readyState);

// Expose utils on window for non-module scripts
window.utils = {
  createEl,
  $,
  $$,
  on,
  delegate,
  storageGet,
  storageSet,
  storageRemove,
  formatPrice,
  formatPhone,
  validateIndianPhone,
  generateId,
  generateOrderId,
  debounce,
  throttle,
  formatDate,
  formatTime,
  isPastDate,
  getAvailableDates,
  validateEmail,
  validateRequired,
  validateFile,
  trapFocus,
  announce,
  prefersReducedMotion,
  animate,
  getWhatsAppUrl,
  openWhatsAppOrder,
  initLazyLoading,
  showToast,
  escapeHtml
};