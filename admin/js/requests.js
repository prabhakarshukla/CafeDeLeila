import {action, button, changeStatus, el, field, labelOf, localTime, result} from './ui.js';

const sections = {
  bookings: {title:'Bookings', table:'bookings', states:['pending','confirmed','cancelled','completed','no_show'],
    next:{pending:['confirmed','cancelled'], confirmed:['completed','cancelled','no_show']}},
  applications: {title:'Applications', table:'job_applications', states:['pending','reviewing','shortlisted','rejected','hired'],
    next:{pending:['reviewing','rejected'], reviewing:['shortlisted','rejected'], shortlisted:['hired','rejected']}},
  messages: {title:'Messages', table:'contact_messages', states:['new','read','replied','archived'],
    next:{new:['read']}},
};
const size = 25;

export async function render({client, view, key, notice}) {
  const section = sections[key];
  let page = 0;
  let request = 0;
  const rows = el('div', {'aria-live':'polite'});
  const select = el('select', {}, ['all', ...section.states].map(status => el('option', {value:status}, labelOf(status))));
  const date = el('input', {type:'date'});
  const filters = el('form', {className:'filters'}, field('Status',select),
    key === 'bookings' ? field('Booking date in Lucknow',date) : null, el('button', {}, 'Apply filters'));
  filters.addEventListener('submit', event => {event.preventDefault(); page = 0; load();});
  view.replaceChildren(el('h1', {}, section.title), filters, rows);

  async function load() {
    const current = ++request;
    rows.replaceChildren(el('p', {}, 'Loading…'));
    try {
      let query = client.from(section.table).select('*',{count:'exact'}).order('created_at',{ascending:false})
        .order('id').range(page * size, (page + 1) * size - 1);
      if (select.value !== 'all') query = query.eq('status',select.value);
      if (key === 'bookings' && date.value) query = query.eq('booking_date',date.value);
      const {data,error,count} = await query;
      if (error) throw new Error(error.message);
      if (current !== request) return;
      rows.replaceChildren(data.length ? data.map(card).reduce((fragment,item) => {fragment.append(item); return fragment;}, document.createDocumentFragment())
        : el('p', {}, 'No matching records.'),
        el('div',{className:'actions'}, button('Previous', () => {page--; load();},{disabled:page === 0}),
          el('span',{},'Page ' + (page + 1)), button('Next', () => {page++; load();},{disabled:(page + 1) * size >= count})));
    } catch (error) {
      if (current === request) rows.replaceChildren(el('p',{role:'alert'},error.message),button('Retry',load));
    }
  }

  function card(row) {
    const title = row.booking_number || row.application_number || row.subject || 'Message';
    const summary = key === 'bookings' ? [
      row.customer_name + ' · ' + row.customer_phone, row.booking_date + ' · ' + row.booking_time + ' IST',
      row.guests + ' guests', row.special_requests,
    ] : key === 'applications' ? [row.full_name, row.role, row.email, row.phone, row.address]
      : [row.name, row.email, row.phone, row.message];
    const controls = el('div',{className:'actions'});
    const card = el('article',{},el('h2',{},title),el('p',{},labelOf(row.status),' · ',localTime(row.created_at)),
      summary.filter(Boolean).map(text => el('p',{},text)),controls);
    for (const status of section.next[row.status] || []) {
      controls.append(button(key === 'messages' ? 'Mark read' : labelOf(status), event => action(event.currentTarget, notice, async () => {
        await changeStatus(client,section.table,row,status); await load(); notice('Status updated.');
      })));
    }
    if (key === 'applications' && row.cv_url) {
      controls.append(button('Prepare CV link', event => action(event.currentTarget,notice,async () => {
        const {signedUrl} = await result(client.storage.from('cv-uploads').createSignedUrl(row.cv_url,60));
        controls.querySelector('a')?.remove();
        controls.append(el('a',{href:signedUrl,target:'_blank',rel:'noopener noreferrer'},'Open CV (expires in 60 seconds)'));
        notice('CV link ready.');
      })));
    }
    return card;
  }
  await load();
}
