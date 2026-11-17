/**
 * CAFÉ DE LEILA — BOOK A TABLE PAGE
 * Handles booking form, validation, date/time selection, and confirmation
 */

import { $, $$, createEl, on, delegate, formatDate, formatTime, validateIndianPhone, validateRequired, showToast, generateId, trapFocus } from './utils.js';

// ========================================
// STATE
// ========================================

const state = window.cafeState;

let bookingState = {
  config: null,
  availableDates: [],
  timeSlots: [],
  selectedDate: null,
  selectedTime: null,
  selectedGuests: 2
};

// ========================================
// INITIALIZATION
// ========================================

// Global init function
window.initBookingPage = function() {
  if (!document.body.classList.contains('booking-page')) return;
  if (!state.config) return;
  
  bookingState.config = state.config;
  _initBookingPage();
};

// Also listen for cafe:ready event as backup
window.addEventListener('cafe:ready', () => {
  window.initBookingPage();
});

// Also initialize if data is already loaded when module executes
if (state.config && document.body.classList.contains('booking-page')) {
  window.initBookingPage();
}

function _initBookingPage() {
  loadBookingConfig();
  renderDateOptions();
  renderTimeSlots();
  renderGuestOptions();
  initFormValidation();
  initLazyLoading();
}

function loadBookingConfig() {
  const config = bookingState.config?.booking || {};
  bookingState.timeSlots = config.timeSlots || [
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00"
  ];
  bookingState.maxGuests = config.maxGuests || 20;
  bookingState.maxAdvanceDays = config.maxAdvanceDays || 60;
  bookingState.minAdvanceMinutes = config.minAdvanceMinutes || 30;

  // Generate available dates
  const today = new Date();
  bookingState.availableDates = [];
  for (let i = 0; i <= bookingState.maxAdvanceDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    bookingState.availableDates.push({
      value: date.toISOString().split('T')[0],
      label: formatDate(date, { weekday: 'short', month: 'short' }),
      fullLabel: formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })
    });
  }

  // Set default to today
  bookingState.selectedDate = bookingState.availableDates[0].value;
}

function renderDateOptions() {
  const container = $('#booking-date');
  if (!container) return;

  container.innerHTML = bookingState.availableDates.map(date => `
    <button type="button" 
            class="date-option ${date.value === bookingState.selectedDate ? 'is-selected' : ''}"
            data-date="${date.value}"
            aria-pressed="${date.value === bookingState.selectedDate}"
            role="radio"
            aria-label="${date.fullLabel}">
      <span class="date-option__day">${new Date(date.value).getDate()}</span>
      <span class="date-option__label">${date.label}</span>
    </button>
  `).join('');

  // Scroll to selected
  const selected = container.querySelector('.is-selected');
  if (selected) {
    selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderTimeSlots() {
  const container = $('#booking-time');
  if (!container) return;

  // Filter out past times if today is selected
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const slots = bookingState.timeSlots.map(time => {
    const isPast = bookingState.selectedDate === today && time <= currentTime;
    return { time, isPast };
  });

  container.innerHTML = slots.map(slot => `
    <button type="button" 
            class="time-slot ${slot.time === bookingState.selectedTime ? 'is-selected' : ''} ${slot.isPast ? 'is-past' : ''}"
            data-time="${slot.time}"
            aria-pressed="${slot.time === bookingState.selectedTime}"
            role="radio"
            ${slot.isPast ? 'disabled aria-disabled="true"' : ''}
            aria-label="${formatTime(slot.time)}${slot.isPast ? ' (past)' : ''}">
      ${formatTime(slot.time)}
    </button>
  `).join('');

  // Auto-select first available if none selected
  if (!bookingState.selectedTime) {
    const firstAvailable = slots.find(s => !s.isPast);
    if (firstAvailable) {
      bookingState.selectedTime = firstAvailable.time;
      container.querySelector(`[data-time="${firstAvailable.time}"]`)?.classList.add('is-selected');
    }
  }
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
            role="radio"
            aria-label="${num} guest${num > 1 ? 's' : ''}">
      ${num}
    </button>
  `).join('');
}

function initFormValidation() {
  const form = $('#booking-form');
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
  } else if (input.type === 'tel' && input.value && !validateIndianPhone(input.value)) {
    valid = false;
    message = 'Please enter a valid 10-digit Indian mobile number';
  } else if (input.type === 'date' && input.value) {
    const selected = new Date(input.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      valid = false;
      message = 'Date cannot be in the past';
    }
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

  // Validate date/time/guests from custom pickers
  if (!bookingState.selectedDate) {
    showToast('Please select a date', 'error');
    allValid = false;
  }

  if (!bookingState.selectedTime) {
    showToast('Please select a time', 'error');
    allValid = false;
  }

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    return;
  }

  // Build booking object
  const booking = {
    id: generateId('BK'),
    date: bookingState.selectedDate,
    time: bookingState.selectedTime,
    guests: bookingState.selectedGuests,
    customer: {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim() || null
    },
    notes: form.notes.value.trim() || null,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  // Save booking
  const bookings = storageGet('bookings', []);
  bookings.unshift(booking);
  storageSet('bookings', bookings.slice(0, 50));

  // Show success
  showBookingConfirmation(booking);
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
  const whatsappNumber = config?.contact?.whatsapp || '915224584372';

  const modalHtml = createEl('div', { class: 'modal-overlay booking-confirmation-modal', id: 'booking-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'booking-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#66BB6A', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'booking-confirmation-title' }, 'Table Booked!'),
        createEl('p', {}, `Your reservation has been confirmed. Booking ID: <strong>${booking.id}</strong>`),
        createEl('div', { class: 'booking-success__details' },
          createEl('div', { class: 'booking-success__detail' },
            createEl('span', { class: 'booking-success__label' }, 'Date'),
            createEl('span', { class: 'booking-success__value' }, formatDate(booking.date, { weekday: 'long', month: 'long', day: 'numeric' }))
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
          createEl('a', { 
            class: 'btn btn--primary btn--lg', 
            href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(booking))}`,
            target: '_blank',
            rel: 'noopener noreferrer'
          }, 'Confirm via WhatsApp'),
          createEl('button', { class: 'btn btn--secondary btn--lg', onclick: () => closeBookingConfirmation() }, 'Done')
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

function closeBookingConfirmation() {
  const modal = $('#booking-confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function buildWhatsAppMessage(booking) {
  const lines = [
    `*New Table Booking - ${booking.id}*`,
    `*Date:* ${formatDate(booking.date, { weekday: 'long', month: 'long', day: 'numeric' })}`,
    `*Time:* ${formatTime(booking.time)}`,
    `*Guests:* ${booking.guests}`,
    `*Name:* ${booking.customer.name}`,
    `*Phone:* ${booking.customer.phone}`,
  ];

  if (booking.customer.email) {
    lines.push(`*Email:* ${booking.customer.email}`);
  }

  if (booking.notes) {
    lines.push(`*Notes:* ${booking.notes}`);
  }

  lines.push('', 'Thank you for booking with Café De Leila!');

  return lines.join('\n');
}

// ========================================
// EVENT DELEGATION
// ========================================

delegate(document, '.date-option', 'click', (e, btn) => {
  if (btn.disabled) return;
  bookingState.selectedDate = btn.dataset.date;
  renderDateOptions();
  renderTimeSlots(); // Re-render time slots for new date
});

delegate(document, '.time-slot', 'click', (e, btn) => {
  if (btn.disabled) return;
  bookingState.selectedTime = btn.dataset.time;
  $$('.time-slot').forEach(s => s.classList.toggle('is-selected', s.dataset.time === bookingState.selectedTime));
});

delegate(document, '.guest-option', 'click', (e, btn) => {
  bookingState.selectedGuests = parseInt(btn.dataset.guests, 10);
  $$('.guest-option').forEach(s => s.classList.toggle('is-selected', parseInt(s.dataset.guests, 10) === bookingState.selectedGuests));
});

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
          img.classList.remove('lazy');
          img.classList.add('loaded');
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '100px 0px' });

    document.querySelectorAll('img.lazy[data-src]').forEach(img => observer.observe(img));
  }
}