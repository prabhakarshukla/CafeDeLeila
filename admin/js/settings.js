import {action, button, el, field, result} from './ui.js';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const limits = {delivery_fee:[0,100000], min_order:[0,100000], tax_percent:[0,100], booking_capacity_per_slot:[1,100]};
const labels = {delivery_fee:'Delivery fee in rupees', min_order:'Delivery minimum in rupees',
  tax_percent:'Tax percent', booking_capacity_per_slot:'Reservations per slot'};

export async function render(context) {
  if (context.role !== 'owner') return;
  if (context.key === 'staff') return staff(context);
  return settings(context);
}

async function settings({client, view, user, notice}) {
  const rows = await result(client.from('settings').select('key,value'));
  const stored = Object.fromEntries(rows.map(row => [row.key,row.value]));
  const form = el('form');
  const address = el('textarea', {required:true, maxlength:350, value:stored.address?.full ?? ''});
  const addressNote = el('input', {maxlength:300, value:stored.address?.note ?? ''});
  const phone = el('input', {type:'tel', required:true, maxlength:24, value:stored.phone?.formatted ?? ''});
  const email = el('input', {type:'email', required:true, maxlength:254, value:stored.email?.value ?? ''});
  const verified = el('input',{type:'checkbox',checked:stored.opening_hours?.verified ?? false});
  const openFields = days.map(day => {
    const row = stored.opening_hours?.schedule?.find(entry => entry.day === day);
    const closed = el('input', {type:'checkbox', checked:row?.closed ?? true});
    const open = el('input', {type:'time', value:row?.open ?? ''});
    const close = el('input', {type:'time', value:row?.close ?? ''});
    return {day, closed, open, close, card:el('article',{},el('h3',{},day),
      field(day + ' closed',closed), field(day + ' opens',open),field(day + ' closes',close))};
  });
  const ordering = el('input',{type:'checkbox',checked:stored.ordering_enabled?.enabled ?? false});
  const delivery = el('input',{type:'checkbox',checked:stored.delivery_enabled?.enabled ?? false});
  const figures = Object.entries(limits).map(([key,[min,max]]) => {
    const value = stored[key]?.amount ?? stored[key]?.value ?? stored[key]?.capacity ?? min;
    return [key, el('input',{type:'number',min,max,step:key === 'tax_percent' ? '0.01' : '1',required:true,value})];
  });
  const save = el('button',{},'Save settings');
  form.append(field('Street address', address), field('Address note or confirmation needed',addressNote),
    field('Phone with +91 country code',phone),field('Business email',email),
    el('h2',{},'Opening hours'),field('Owner verified the schedule',verified),
    el('div',{className:'grid'},openFields.map(row => row.card)),
    el('h2',{},'Ordering and reservations'),field('Accept orders',ordering),field('Offer delivery',delivery),
    ...figures.map(([key,input]) => field(labels[key],input)),save);
  form.addEventListener('submit',event => {
    event.preventDefault();
    action(save,notice,async () => {
      const raw = phone.value.replace(/[+ ()-]/g,'');
      if (!/^91\d{10}$/.test(raw)) throw new Error('Enter the Indian phone number with +91.');
      if (!address.value.trim()) throw new Error('Enter the address.');
      const schedule = openFields.map(row => ({day:row.day,closed:row.closed.checked,open:row.open.value,close:row.close.value}));
      if (verified.checked && (!schedule.some(row => !row.closed) || schedule.some(row => !row.closed && (!row.open || !row.close || row.open >= row.close)))) {
        throw new Error('Verified hours need at least one open day and a valid same-day opening and closing time.');
      }
      const values = {
        address:{full:address.value.trim(),note:addressNote.value.trim()},
        phone:{formatted:phone.value.trim(),raw}, email:{value:email.value.trim()},
        opening_hours:{verified:verified.checked,schedule:verified.checked ? schedule : []},
        ordering_enabled:{enabled:ordering.checked}, delivery_enabled:{enabled:delivery.checked},
      };
      for (const [key,input] of figures) {
        const value = input.valueAsNumber;
        const [min,max] = limits[key];
        if (!Number.isFinite(value) || value < min || value > max || (!Number.isInteger(value) && key !== 'tax_percent')) throw new Error('Invalid ' + labels[key].toLowerCase());
        values[key] = {[key === 'tax_percent' ? 'value' : key === 'booking_capacity_per_slot' ? 'capacity' : 'amount']:value};
      }
      await result(client.from('settings').upsert(Object.entries(values).map(([key,value]) =>
        ({key,value,updated_by:user.id,updated_at:new Date().toISOString()}))));
      notice('Settings saved.');
    });
  });
  view.replaceChildren(el('h1',{},'Settings'),form,el('h2',{},'Order export'),
    button('Download orders CSV',event => action(event.currentTarget,notice,async () => {
      await exportOrders(client);
      notice('Order export ready.');
    })));
}

async function staff({client, view, notice}) {
  const list = el('div');
  const userId = el('input',{required:true,maxlength:36});
  const name = el('input',{required:true,maxlength:100});
  const submit = el('button',{},'Grant staff access');
  const form = el('form',{},field('Existing Auth user ID',userId),field('Display name',name),submit);
  view.replaceChildren(el('h1',{},'Staff'),el('p',{},'Create the person in Supabase Authentication first, then enter their user ID.'),form,list);
  form.addEventListener('submit',event => {
    event.preventDefault();
    action(submit,notice,async () => {
      const id = userId.value.trim();
      if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) || !name.value.trim()) throw new Error('Enter a valid user ID and display name.');
      await result(client.from('admin_users').insert({user_id:id,display_name:name.value.trim(),role:'staff'}));
      form.reset(); await load(); notice('Staff access granted.');
    });
  });
  await load();
  async function load() {
    list.replaceChildren(el('p',{},'Loading staff…'));
    try {
      const rows = await result(client.from('admin_users').select('user_id,display_name,role').order('display_name'));
      list.replaceChildren(rows.length ? el('div',{},rows.map(row => el('article',{},
        el('h2',{},row.display_name || row.user_id),el('p',{},row.role),
        row.role === 'staff' ? button('Revoke access',event => action(event.currentTarget,notice,async () => {
          if (!confirm('Revoke this staff member’s admin access?')) {notice('');return;}
          await result(client.from('admin_users').delete().eq('user_id',row.user_id).eq('role','staff').select('user_id').single());
          await load(); notice('Staff access revoked.');
        })) : null))) : el('p',{},'No staff accounts.'));
    } catch (error) { list.replaceChildren(el('p',{role:'alert'},error.message),button('Retry',load)); }
  }
}

async function exportOrders(client) {
  const columns = ['id','order_number','created_at','customer_name','customer_phone','order_type','status',
    'payment_status','subtotal_inr','delivery_fee_inr','tax_inr','total_inr','notes'];
  const csvCell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"','""') + '"';
  };
  const lines = [columns.map(csvCell).join(',')];
  let after;
  do {
    let query = client.from('orders').select(columns.join(',')).order('id').limit(250);
    if (after) query = query.gt('id',after);
    const rows = await result(query);
    for (const row of rows) lines.push(columns.map(column => csvCell(row[column])).join(','));
    after = rows.length === 250 ? rows.at(-1).id : null;
  } while (after);
  const href = URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a = el('a',{href,download:'cafe-de-leila-orders.csv'});
  a.click();
  setTimeout(() => URL.revokeObjectURL(href),1000);
}
