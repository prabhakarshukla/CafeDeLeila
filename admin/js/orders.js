import {addCalendarDays, indiaDateTime, isCalendarDate} from '../../supabase/functions/_shared/india-date.mjs';
import {action, button, changeStatus, el, field, labelOf, localTime, result, rupees} from './ui.js';

const next = {
  pending: ['confirmed'], confirmed: ['preparing','ready','cancelled'],
  preparing: ['ready','cancelled'], ready: ['out_for_delivery','completed','cancelled'],
  out_for_delivery: ['completed'],
};
const statuses = ['all','pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled'];
const pageSize = 20;

function printOrder(card) {
  document.body.classList.add('printing');
  card.classList.add('print-target');
  try { window.print(); }
  finally { card.classList.remove('print-target'); document.body.classList.remove('printing'); }
}

export async function render({client, view, role, notice}) {
  let filter = 'all';
  let offset = 0;
  let generation = 0;
  let audio;
  let soundOn = false;
  const rows = el('div', {'aria-live':'polite'});
  const updates = el('p', {role:'status'});
  const search = el('input', {type:'search', placeholder:'Order code or phone'});
  const date = el('input', {type:'date'});
  const tabs = statuses.map(status => button(labelOf(status), () => {
    filter = status;
    offset = 0;
    tabs.forEach((tab, index) => tab.setAttribute('aria-pressed', String(statuses[index] === status)));
    load();
  }, {'aria-pressed':String(status === 'all')}));
  const sound = button('Enable alert sound', async () => {
    try {
      if (soundOn) {
        soundOn = false;
        await audio.suspend();
      } else {
        audio ??= new AudioContext();
        await audio.resume();
        soundOn = true;
      }
      sound.textContent = soundOn ? 'Mute alert sound' : 'Enable alert sound';
      sound.setAttribute('aria-pressed', String(soundOn));
    } catch { notice('Audio is unavailable in this browser.'); }
  }, {'aria-pressed':'false'});
  const controls = el('form', {className:'filters'}, field('Search by code or phone', search), field('Date in Lucknow', date), el('button', {}, 'Apply filters'));
  controls.addEventListener('submit', event => { event.preventDefault(); offset = 0; load(); });
  view.replaceChildren(el('h1', {}, 'Orders'), el('div', {className:'actions'}, tabs), controls,
    el('div', {className:'actions'}, sound, button('Refresh orders', () => load())), updates, rows);

  async function load() {
    const request = ++generation;
    rows.replaceChildren(el('p', {}, 'Loading orders…'));
    try {
      let query = client.from('orders').select('*', {count:'exact'})
        .order('created_at', {ascending:false}).order('id').range(offset, offset + pageSize - 1);
      if (filter !== 'all') query = query.eq('status', filter);
      const term = search.value.trim();
      if (term) {
        if (!/^[a-z0-9+ -]{1,40}$/i.test(term)) throw new Error('Enter letters, digits or a phone number.');
        const phone = term.replace(/\D/g,'');
        query = /^[+\d ]+$/.test(term) && phone
          ? query.ilike('customer_phone', '%' + phone + '%')
          : query.ilike('order_number', '%' + term + '%');
      }
      if (date.value) {
        if (!isCalendarDate(date.value)) throw new Error('Choose a valid date.');
        const start = indiaDateTime(date.value);
        query = query.gte('created_at', start.toISOString())
          .lt('created_at', indiaDateTime(addCalendarDays(date.value, 1)).toISOString());
      }
      const {data, error, count} = await query;
      if (error) throw new Error(error.message);
      if (request !== generation) return;
      rows.replaceChildren(data.length ? el('div', {}, data.map(card)) : el('p', {}, 'No matching orders.'),
        el('div', {className:'actions'},
          button('Previous', () => {offset -= pageSize; load();}, {disabled:offset === 0}),
          el('span', {}, 'Page ' + (1 + Math.floor(offset / pageSize))),
          button('Next', () => {offset += pageSize; load();}, {disabled:offset + pageSize >= count})));
    } catch (error) {
      if (request === generation) rows.replaceChildren(el('p', {role:'alert'}, error.message));
    }
  }

  function card(order) {
    const details = el('details', {}, el('summary', {}, order.order_number, ' · ', labelOf(order.status), ' · ', rupees(order.total_inr)),
      el('h2', {}, order.order_number),
      el('p', {}, labelOf(order.order_type), ' · ', localTime(order.created_at)),
      el('ul', {}, (order.items || []).map(item => el('li', {}, item.quantity + ' × ', item.name))),
      el('p', {}, order.notes ? 'Kitchen notes: ' + order.notes : 'No kitchen notes'));
    const actions = el('div', {className:'actions no-print'},
      (next[order.status] || []).filter(status => status !== 'out_for_delivery' || order.order_type === 'delivery').map(status =>
        button(labelOf(status), event => action(event.currentTarget, notice, async () => {
          await changeStatus(client, 'orders', order, status);
          await load(); notice('Order updated.');
        }))),
      button('Print kitchen slip', () => printOrder(details)));
    details.append(el('p', {className:'no-print'}, order.customer_name, ' · ', order.customer_phone),
      el('p', {className:'no-print'}, order.delivery_address?.full || ''),
      el('p', {className:'no-print'}, 'Payment: ', labelOf(order.payment_status)), actions);
    if (role === 'owner') {
      const paid = el('select', {}, ['unpaid','paid','refunded'].map(status => el('option', {value:status}, status)));
      paid.value = order.payment_status;
      actions.append(field('Payment status', paid), button('Save payment', event => action(event.currentTarget, notice, async () => {
        const updated = await result(client.from('orders').update({payment_status:paid.value}).eq('id', order.id)
          .eq('payment_status', order.payment_status).select('id').maybeSingle());
        if (!updated) throw new Error('Payment status changed. Refresh and retry.');
        await load(); notice('Payment status updated.');
      })));
    }
    return details;
  }

  const channel = client.channel('admin-orders').on('postgres_changes',
    {event:'INSERT', schema:'public', table:'orders'}, () => {
      updates.textContent = 'New order received. Refresh to see it.';
      if (soundOn && audio?.state === 'running') {
        const tone = audio.createOscillator();
        const volume = audio.createGain();
        tone.frequency.value = 660; volume.gain.value = 0.1;
        tone.connect(volume).connect(audio.destination);
        tone.start(); tone.stop(audio.currentTime + 0.18);
      }
    }).subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') updates.textContent = 'Live alerts unavailable. Use Refresh orders.';
    });
  await load();
  return () => { generation++; client.removeChannel(channel); audio?.close().catch(() => {}); };
}
