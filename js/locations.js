/**
 * CAFÉ DE LEILA — LOCATIONS PAGE
 * Handles location cards and map interactions
 */

import { $, $$, createEl, on, delegate, initLazyLoading } from './utils.js';

// ========================================
// STATE
// ========================================

const state = window.cafeState;

let locationsState = {
  config: null
};

// ========================================
// INITIALIZATION
// ========================================

// Global init function
window.initLocationsPage = function() {
  if (!document.body.classList.contains('locations-page')) return;
  if (!state.config) return;
  
  locationsState.config = state.config;
  _initLocationsPage();
};

// Also listen for cafe:ready event as backup
window.addEventListener('cafe:ready', () => {
  window.initLocationsPage();
});

// Also initialize if data is already loaded when module executes
if (state.config && document.body.classList.contains('locations-page')) {
  window.initLocationsPage();
}

function _initLocationsPage() {
  initMapLazyLoad();
  initLazyLoading();
}

function initMapLazyLoad() {
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