export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className' || key === 'value' || key === 'checked' || key === 'disabled') node[key] = value;
    else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : String(value));
  }
  node.append(...children.flat(Infinity).filter(child => child != null).map(child => child instanceof Node ? child : String(child)));
  return node;
}

export function button(label, action, attributes = {}) {
  const node = el('button', {type: 'button', ...attributes}, label);
  node.addEventListener('click', action);
  return node;
}

const money = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR'});
const indiaTime = new Intl.DateTimeFormat('en-IN', {timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'});
export const rupees = value => money.format(value);
export const localTime = value => indiaTime.format(new Date(value));
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata'}).format(new Date());
export const labelOf = value => String(value ?? '').replaceAll('_', ' ');
export const field = (label, input) => el('label', {}, label, input);

export async function result(query) {
  const {data, error} = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function action(control, notice, task) {
  if (control.disabled) return;
  control.disabled = true;
  notice('Working…');
  try { await task(); }
  catch (error) { notice(error.message || 'The request failed. Try again.'); }
  finally { control.disabled = false; }
}

export async function changeStatus(client, table, row, status) {
  const updated = await result(client.from(table).update({status}).eq('id', row.id)
    .eq('status', row.status).select('id').maybeSingle());
  if (!updated) throw new Error('This record changed. Refresh the list and try again.');
}
