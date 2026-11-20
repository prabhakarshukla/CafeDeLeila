// Shared helpers for the existing buildless application.
function verifiedWhatsAppUrl(contact) {
  const number = contact?.whatsapp;
  return contact?.whatsappVerified === true && typeof number === 'string' && /^91\d{10}$/.test(number)
    ? 'https://wa.me/' + number : '';
}

function syncPickers() {
  document.querySelectorAll('.date-option,.time-slot,.guest-option').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('is-selected')));
  });
}

function populateBusinessDetails() {
  const config = window.cafeState.config;
  if (!config) return;
  const contact = config.contact;
  document.querySelectorAll('main a[href^="tel:"]').forEach(a => {
    a.href = 'tel:+' + contact.phoneRaw;
    if (a.classList.contains('contact-info__value')) a.textContent = contact.phone;
  });
  document.querySelectorAll('main a[href^="mailto:"]').forEach(a => {a.href = 'mailto:' + contact.email; a.textContent = contact.email;});
  document.querySelectorAll('main address').forEach(a => {a.textContent = contact.address.full;});
  document.querySelectorAll('main a[href*="google.com/maps"]').forEach(a => {a.href = contact.mapLinkUrl; a.textContent = 'Open in Maps';});
  document.querySelectorAll('main iframe').forEach(frame => {
    frame.removeAttribute('data-src'); frame.src = contact.mapEmbedUrl; frame.loading = 'lazy';
  });
  document.querySelectorAll('#contact-hours,#location-hours').forEach(el => {
    el.textContent = config.hours.verified ? config.hours.schedule.map(h => h.day + ': ' + (h.closed ? 'Closed' : h.open + ' to ' + h.close)).join(' · ') : 'Hours awaiting confirmation. Please call before visiting.';
  });
  document.querySelectorAll('main address,footer address').forEach(el => {
    const note = document.createElement('p'); note.className = 'address-note';
    note.textContent = contact.address.note || '';
    if (note.textContent) el.after(note);
  });
}

// Keep dynamic dialogs isolated from the page and return focus on close.
function installDialogAccessibility() {
  let active = null;
  let returnTo = null;
  let cleanups = [];
  function sync() {
    document.querySelectorAll('.form-group').forEach(group => {
      const input = group.querySelector('input,textarea,select');
      const error = group.querySelector('.form-error');
      if (input && error && input.id) {
        error.id = input.id + '-error';
        const descriptions = new Set((input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
        descriptions.add(error.id); input.setAttribute('aria-describedby', [...descriptions].join(' '));
        input.setAttribute('aria-invalid', String(group.classList.contains('has-error')));
      }
    });
    const dialogs = [...document.querySelectorAll('.modal-overlay.is-open .modal,.cart-drawer.is-open,.mobile-menu.is-open')];
    const next = dialogs.at(-1) || null;
    document.querySelectorAll('.cart-drawer,.mobile-menu').forEach(el => {el.inert = !el.classList.contains('is-open');});
    if (next === active) return;
    cleanups.forEach(fn => fn()); cleanups = [];
    if (next) {
      if (!active) returnTo = document.activeElement;
      let branch = next;
      while (branch.parentElement && branch !== document.body) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && !['SCRIPT','STYLE','LINK'].includes(sibling.tagName)) {
            const previous = sibling.inert; sibling.inert = true;
            cleanups.push(() => {sibling.inert = previous;});
          }
        }
        branch = branch.parentElement;
      }
      document.body.style.overflow = 'hidden';
      next.querySelector('button:not(:disabled),input:not([type=hidden]),a[href]')?.focus();
    } else {
      document.body.style.overflow = '';
      if (returnTo?.isConnected && returnTo.getClientRects().length) returnTo.focus();
      else document.getElementById('cart-btn')?.focus();
    }
    active = next;
  }
  const observer = new MutationObserver(sync);
  observer.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') {
      const overlay = active.closest('.modal-overlay');
      if (overlay) overlay.remove();
      else if (active.id === 'cart-drawer') closeCartDrawer();
      else closeMobileMenu();
      sync(); return;
    }
    if (e.key === 'Tab') {
      const elements = [...active.querySelectorAll('button:not(:disabled),a[href],input:not([type=hidden]),textarea,select,[tabindex="0"]')].filter(el => !el.closest('[hidden]') && el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (e.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) {e.preventDefault();last?.focus();}
      else if (!e.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) {e.preventDefault();first?.focus();}
    }
  }, true);
  sync();
}
async function publicSupabase(path, options = {}) {
  const {url, publishableKey} = window.CAFE_CONFIG?.supabase || {};
  if (!url || !publishableKey) throw new Error('Online requests are unavailable in this preview.');
  try {
    const response = await fetch(url.replace(/\/$/, '') + path, {
      ...options,
      headers: {apikey: publishableKey, 'Content-Type': 'application/json', ...options.headers},
    });
    if (response.ok) return await response.json();
  } catch {
    // The caller supplies the customer-facing failure message.
  }
  throw new Error('Online request failed.');
}

function showFormFailure(form, message) {
  const contact = window.CAFE_CONFIG?.contact;
  const text = document.createElement('p');
  text.className = 'submission-error';
  text.setAttribute('role', 'alert');
  text.textContent = message;
  if (contact?.phone && /^\d+$/.test(contact.phoneRaw)) {
    const phone = document.createElement('a');
    phone.href = 'tel:+' + contact.phoneRaw;
    phone.textContent = contact.phone;
    text.append(' Please call the café at ', phone, '.');
  }
  form.querySelector('.submission-error')?.remove();
  const submit = form.querySelector('[type="submit"]');
  (submit?.parentElement || form).append(text);
}

async function loadPublicSettings(config) {
  if (!config.supabase?.url || !config.supabase?.publishableKey) return;
  const rows = await publicSupabase('/rest/v1/public_settings?select=key,value');
  const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
  const contact = config.contact;
  if (settings.address?.full) contact.address = {...contact.address, ...settings.address};
  if (settings.phone?.formatted) contact.phone = settings.phone.formatted;
  if (settings.phone?.raw) contact.phoneRaw = settings.phone.raw;
  if (settings.email?.value) contact.email = settings.email.value;
  if (settings.opening_hours) config.hours = {...config.hours, ...settings.opening_hours};
  if (settings.whatsapp_number) {
    contact.whatsapp = settings.whatsapp_number.value;
    contact.whatsappVerified = settings.whatsapp_number.verified;
  }
  config.menu.is_sample = settings.menu_is_sample?.is_sample ?? config.menu.is_sample;
  config.ordering.enabled = settings.ordering_enabled?.enabled ?? true;
  config.ordering.deliveryEnabled = settings.delivery_enabled?.enabled ?? false;
  config.ordering.deliveryFee = settings.delivery_fee?.amount ?? 0;
  config.ordering.minOrderDelivery = settings.min_order?.amount ?? 0;
  config.ordering.taxRate = (settings.tax_percent?.value ?? 0) / 100;
}

function catalogFromDatabase({categories, items}) {
  return categories.map(category => ({
    id: category.slug, name: category.name,
    items: items.filter(item => item.category_id === category.id).map(item => {
      const image = item.image_url;
      return {
        id: item.id, name: item.name, description: item.description ?? '', price: item.price_inr,
        veg: item.veg, image: menuImageUrl(image, window.CAFE_CONFIG?.supabase?.url) || 'assets/meal.svg',
        tags: item.tags ?? [],
      };
    }),
  }));
}
