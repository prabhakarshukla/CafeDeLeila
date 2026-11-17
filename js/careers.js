/**
 * CAFÉ DE LEILA — CAREERS PAGE
 * Handles careers form with file upload validation
 */

import { $, $$, createEl, on, delegate, validateEmail, validateRequired, validateFile, showToast, generateId, trapFocus, initLazyLoading } from './utils.js';

// ========================================
// STATE
// ========================================

const state = window.cafeState;

let careersState = {
  config: null,
  selectedFile: null
};

// ========================================
// INITIALIZATION
// ========================================

// Global init function
window.initCareersPage = function() {
  if (!document.body.classList.contains('careers-page')) return;
  if (!state.config) return;
  
  careersState.config = state.config;
  _initCareersPage();
};

// Also listen for cafe:ready event as backup
window.addEventListener('cafe:ready', () => {
  window.initCareersPage();
});

// Also initialize if data is already loaded when module executes
if (state.config && document.body.classList.contains('careers-page')) {
  window.initCareersPage();
}

function _initCareersPage() {
  renderRoleOptions();
  initFileUpload();
  initFormValidation();
  initLazyLoading();
}

function renderRoleOptions() {
  const select = $('#careers-role');
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
  const fileInput = $('#careers-cv');
  const fileLabel = $('.careers-form__file-label');
  const fileNameContainer = $('#careers-file-name');

  if (!fileInput || !fileLabel || !fileNameContainer) return;

  // Click handler
  on(fileLabel, 'click', (e) => {
    if (e.target === fileLabel || e.target.closest('.careers-form__file-label') === fileLabel) {
      fileInput.click();
    }
  });

  // Drag and drop
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

  // File input change
  on(fileInput, 'change', (e) => {
    if (e.target.files.length) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Remove file
  delegate(document, '.careers-form__file-remove', 'click', () => {
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
  const fileInput = $('#careers-cv');
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

function initFormValidation() {
  const form = $('#careers-form');
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

  // File validation
  const fileInput = $('#careers-cv');
  if (fileInput) {
    on(fileInput, 'change', () => validateFileField(fileInput));
  }

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

  // Validate file
  if (!validateFileField(form.querySelector('#careers-cv'))) {
    allValid = false;
  }

  if (!allValid) {
    const firstError = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    firstError?.focus();
    return;
  }

  // Build application object
  const application = {
    id: generateId('APP'),
    role: form.role.value,
    customer: {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim()
    },
    cv: careersState.selectedFile ? careersState.selectedFile.name : null,
    createdAt: new Date().toISOString(),
    status: 'submitted'
  };

  // Save application
  const applications = storageGet('applications', []);
  applications.unshift(application);
  storageSet('applications', applications.slice(0, 50));

  // Show success
  showApplicationConfirmation(application);
  form.reset();
  clearFile();
}

function showApplicationConfirmation(application) {
  const modalHtml = createEl('div', { class: 'modal-overlay careers-confirmation-modal', id: 'careers-confirmation-modal' },
    createEl('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'careers-confirmation-title' },
      createEl('div', { class: 'modal__body booking-success' },
        createEl('div', { class: 'booking-success__icon' },
          createEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: '#66BB6A', 'stroke-width': '2', width: '48', height: '48' }, createEl('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), createEl('polyline', { points: '22 4 12 14.01 9 11.01' }))
        ),
        createEl('h2', { class: 'booking-success__title', id: 'careers-confirmation-title' }, 'Application Submitted!'),
        createEl('p', {}, `Thank you for your interest in joining our team. Your application has been received. Reference ID: <strong>${application.id}</strong>`),
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

function closeCareersConfirmation() {
  const modal = $('#careers-confirmation-modal');
  if (modal) {
    modal.classList.remove('is-open');
    setTimeout(() => modal.remove(), 250);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function validateIndianPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
}