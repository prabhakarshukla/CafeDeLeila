/**
 * CAFÉ DE LEILA — SHARED UTILITIES
 * Common helpers used across all pages
 */

// ========================================
// DOM UTILITIES
// ========================================

/**
 * Create an element with attributes, classes, and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {...(string|Node)} children - Child nodes or text content
 * @returns {HTMLElement}
 */
export function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
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
    } else if (child != null) {
      el.appendChild(document.createTextNode(String(child)));
    }
  });
  return el;
}

/**
 * Query selector with optional context
 * @param {string} selector
 * @param {Element} context
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query selector all with optional context
 * @param {string} selector
 * @param {Element} context
 * @returns {NodeList}
 */
export function $$(selector, context = document) {
  return context.querySelectorAll(selector);
}

/**
 * Add event listener with automatic cleanup tracking
 * @param {Element} el
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 */
export function on(el, event, handler, options = {}) {
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}

/**
 * Delegate event to parent
 * @param {Element} parent
 * @param {string} selector
 * @param {string} event
 * @param {Function} handler
 */
export function delegate(parent, selector, event, handler) {
  return on(parent, event, e => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  });
}

// ========================================
// STORAGE UTILITIES
// ========================================

const STORAGE_PREFIX = 'cafe_de_leila_';

/**
 * Safe localStorage getter with try/catch
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
export function storageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Storage get failed for ${key}:`, e);
    return defaultValue;
  }
}

/**
 * Safe localStorage setter with try/catch
 * @param {string} key
 * @param {*} value
 * @returns {boolean} Success
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Storage set failed for ${key}:`, e);
    return false;
  }
}

/**
 * Safe localStorage remover
 * @param {string} key
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.warn(`Storage remove failed for ${key}:`, e);
  }
}

// ========================================
// FORMATTING UTILITIES
// ========================================

/**
 * Format price in INR
 * @param {number} amount - Amount in rupees
 * @param {Object} options - Formatting options
 * @returns {string}
 */
export function formatPrice(amount, options = {}) {
  const { symbol = '₹', showDecimals = false } = options;
  const formatted = Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  });
  return `${symbol}${formatted}`;
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string}
 */
export function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{1})(\d{5})(\d{5})/, '$1 $2 $3');
  }
  return phone;
}

/**
 * Validate Indian phone number (10 digits)
 * @param {string} phone
 * @returns {boolean}
 */
export function validateIndianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Generate unique ID
 * @returns {string}
 */
export function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate order ID
 * @returns {string}
 */
export function generateOrderId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CDL${dateStr}${random}`;
}

/**
 * Debounce function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ========================================
// DATE/TIME UTILITIES
// ========================================

/**
 * Format date for display
 * @param {Date|string} date
 * @param {Object} options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    weekday: options.weekday || 'short',
    day: 'numeric',
    month: options.month || 'short',
    year: options.year ? 'numeric' : undefined
  });
}

/**
 * Format time for display (12-hour)
 * @param {string} time - HH:MM format
 * @returns {string}
 */
export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if date is in the past
 * @param {Date|string} date
 * @returns {boolean}
 */
export function isPastDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

/**
 * Get available dates for booking (next N days)
 * @param {number} maxDays
 * @returns {Array<{value: string, label: string}>}
 */
export function getAvailableDates(maxDays = 60) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= maxDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      value: date.toISOString().split('T')[0],
      label: formatDate(date, { weekday: 'short', month: 'short' })
    });
  }
  return dates;
}

// ========================================
// VALIDATION UTILITIES
// ========================================

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate required field
 * @param {string} value
 * @returns {boolean}
 */
export function validateRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Validate file type and size
 * @param {File} file
 * @param {string[]} allowedTypes
 * @param {number} maxSizeMB
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, allowedTypes, maxSizeMB) {
  if (!file) return { valid: false, error: 'No file selected' };
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum ${maxSizeMB}MB` };
  }
  return { valid: true };
}

// ========================================
// ACCESSIBILITY UTILITIES
// ========================================

/**
 * Trap focus within an element
 * @param {HTMLElement} element
 * @returns {Function} Cleanup function
 */
export function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => element.removeEventListener('keydown', handleTab);
}

/**
 * Announce to screen readers
 * @param {string} message
 * @param {string} politeness - 'polite' | 'assertive'
 */
export function announce(message, politeness = 'polite') {
  const region = document.getElementById('a11y-announcer') || createEl('div', {
    id: 'a11y-announcer',
    role: 'status',
    'aria-live': politeness,
    'aria-atomic': 'true',
    class: 'sr-only'
  }, document.body);
  region.setAttribute('aria-live', politeness);
  region.textContent = message;
}

// ========================================
// ANIMATION UTILITIES
// ========================================

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate element with CSS classes
 * @param {HTMLElement} el
 * @param {string} animationClass
 * @param {number} duration
 * @returns {Promise<void>}
 */
export function animate(el, animationClass, duration = 300) {
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

// ========================================
// WHATSAPP UTILITIES
// ========================================

/**
 * Generate WhatsApp URL with pre-filled message
 * @param {string} phone - Phone number with country code (no +)
 * @param {string} message
 * @returns {string}
 */
export function getWhatsAppUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Open WhatsApp with order details
 * @param {Object} order
 * @param {string} whatsappNumber
 */
export function openWhatsAppOrder(order, whatsappNumber) {
  const lines = [
    `*New Order - ${order.id}*`,
    `*Type:* ${order.type}`,
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

  const url = getWhatsAppUrl(whatsappNumber, lines.join('\n'));
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ========================================
// LAZY LOADING
// ========================================

/**
 * Initialize lazy loading for images
 */
export function initLazyLoading() {
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
    // Fallback for older browsers
    document.querySelectorAll('img.lazy[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
    });
  }
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = createEl('div', { class: 'toast-container', id: 'toast-container' });
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show toast notification
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration
 */
export function showToast(message, type = 'info', duration = 4000) {
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
    success: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#66BB6A', 'stroke-width': '2' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' })),
    error: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#EF5350', 'stroke-width': '2' }, createEl('circle', { cx: '12', cy: '12', r: '10' }), createEl('line', { x1: '15', y1: '9', x2: '9', y2: '15' }), createEl('line', { x1: '9', y1: '9', x2: '15', y2: '15' })),
    warning: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#FF9800', 'stroke-width': '2' }, createEl('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }), createEl('line', { x1: '12', y1: '9', x2: '12', y2: '13' }), createEl('line', { x1: '12', y1: '17', x2: '12.01', y2: '17' })),
    info: createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#64B5F6', 'stroke-width': '2' }, createEl('circle', { cx: '12', cy: '12', r: '10' }), createEl('line', { x1: '12', y1: '16', x2: '12', y2: '12' }), createEl('line', { x1: '12', y1: '8', x2: '12.01', y2: '8' }))
  };
  return icons[type] || icons.info;
}

// ========================================
// ESCAPE HTML
// ========================================

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// EXPORTS
// ========================================

export default {
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
  validateEmail,
  validateRequired,
  validateFile,
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