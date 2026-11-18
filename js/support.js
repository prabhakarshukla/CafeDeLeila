// Shared helpers for the existing buildless application.
function indiaDate(date) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
}

function handoffUrl(message) {
  const contact = window.cafeState.config.contact;
  if (contact.whatsappVerified && /^91[6-9]\d{9}$/.test(contact.whatsapp)) {
    return 'https://wa.me/' + contact.whatsapp + '?text=' + encodeURIComponent(message);
  }
  return 'mailto:' + contact.email + '?subject=' + encodeURIComponent('Café De Leila demo request') + '&body=' + encodeURIComponent(message);
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
    note.textContent = 'Address differs across listings. Please confirm with the café before travelling.';
    el.after(note);
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
