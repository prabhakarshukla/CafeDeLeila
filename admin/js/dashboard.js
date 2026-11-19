import {el, result, rupees} from './ui.js';

export async function render({client, view}) {
  const stats = await result(client.rpc('get_admin_dashboard_stats'));
  const today = stats.today;
  const metrics = [
    ['Orders today', today.orders.order_count], ['Pending orders', today.orders.pending_count],
    ['Order value today', rupees(today.orders.revenue_inr)], ['Bookings today', today.bookings.booking_count],
    ['Pending applications', today.pending_applications], ['Unread messages', today.new_messages],
  ];
  view.replaceChildren(el('h1', {}, 'Dashboard'), el('p', {}, 'Today in Lucknow'),
    el('div', {className:'grid'}, metrics.map(([label,value]) => el('article', {}, el('h2', {}, label), el('p', {}, value)))),
    el('h2', {}, 'Top items over the past seven days'),
    stats.top_items_7d?.length
      ? el('ul', {}, stats.top_items_7d.map(item => el('li', {}, item.item_name, ' · ', item.total_quantity)))
      : el('p', {}, 'No item activity yet.'));
}
