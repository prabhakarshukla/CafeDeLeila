/**
 * CAFÉ DE LEILA — CONTACT PAGE
 * Handles contact form validation and map interactions
 */

import { $, $$, createEl, on, delegate, validateEmail, validateRequired, showToast, generateId, trapFocus, initLazyLoading } from './utils.js';

// ========================================
// STATE
// ========================================

const state = window.cafeState;

let contactState = {
  config: null
};

// ========================================
// INITIALIZATION
// ========================================

// Global init function
window.initContactPage = function() {
  if (!document.body.classList.contains('contact-page')) return;
  if (!state.config) return;
  
  contactState.config = state.config;
  _initContactPage();
};

// Also listen for cafe:ready event as backup
window.addEventListener('cafe:ready', () => {
  window.initContactPage();
});

// Also initialize if data is already loaded when module executes
if (state.config && document.body.classList.contains('contact-page')) {
  window.initContactPage();
}

function _initContactPage() {
  initFormValidation();
  initMapLazyLoad();
  initLazyLoading();
}

function initFormValidation() {
  const form = $('#contact-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  
  inputs.forEach(input => {
    on(input, 'blur', () => validateField(input));
    on(input, 'input', () => {
      if (input.closest('.form-group').classList.contains('has-error')) {
        validateField(input);
      }
    });
  });

  on(form, 'submit', handleSubmit);
}

function validateField(input) {
  const group = input.closest('.form-group');
  const error = group?.querySelector('.form-error');
  let valid = true;
  let message = '';

  if (input.required && !validateRequired(input.value)) {
    valid = false;
    message = `${getFieldLabel(input)} is required`;
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

function getFieldLabel(input) {
  const label = input.closest('.form-group')?.querySelector('label');
  return label ? label.textContent.replace('*', '').trim() : 'This field';
}

function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;

  // Validate all fields
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  let allValid = true;

  inputs.forEach(input => {
    if (!validateField(input)) {
      allValid = false;
    }
  });

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    return;
  }

  // Build contact object
  const contact = {
    id: generateId('MSG'),
    subject: form.subject.value,
    customer: {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim()
    },
    message: form.message.value.trim(),
    createdAt: new Date().toISOString(),
    status: 'submitted'
  };

  // Save contact
  const contacts = storageGet('contacts', []);
  contacts.unshift(contact);
  storageSet('contacts', contacts.slice(0, 50));

  // Show success
  showContactConfirmation(contact);
  form.reset();
}

function showContactConfirmation(contact) {
  const modalHtml = createEl('div', { class: 'modal-overlay contact-confirmation-modal', id: 'contact-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'contact-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#66BB6A', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'contact-confirmation-title' }, 'Message Sent!'),
        createEl('p', {}, `Thank you for reaching out. We'll get back to you soon. Reference ID: <strong>${contact.id}</strong>`),
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
        createEl('p', { class: 'confirmation__note' }, 'This is a demo. A real backend integration is planned for Phase 2.')
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

function initMapLazyLoad() {
  const mapContainer = $('.contact-map');
  if (!mapContainer) return;

  const iframe = mapContainer.querySelector('iframe');
  if (!iframe) return;

  // Lazy load map when near viewport
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

function validateIndianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
}

function storageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem('cafe_de_leila_' + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem('cafe_de_leila_' + key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}