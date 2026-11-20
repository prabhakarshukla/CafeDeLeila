import {randomUUID} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {addCalendarDays, indiaDate} from '../supabase/functions/_shared/india-date.mjs';
import {bookingRules} from '../supabase/functions/_shared/booking-rules.mjs';
import {nextStatuses, workflows} from '../js/workflow.mjs';

const productionUrl = 'https://dqzmyahsedhvgbfqprks.supabase.co';
let projectUrl = productionUrl;
const origins = ['http://localhost:8080', 'https://cafedeleila.vercel.app'];
const methods = {orders:'POST', bookings:'POST', contact:'POST', menu:'GET', applications:'POST'};
let reportName = 'live-smoke-result.json';
const configFile = new URL('../data/config.json', import.meta.url);
const results = [];
const add = (check, verdict, evidence = {}) => results.push({check, verdict, ...evidence});
const record = (check, pass, evidence) => add(check, pass ? 'PASS' : 'FAIL', evidence);
let key;

async function request(path, {method = 'GET', body, token, headers = {}} = {}) {
  try {
    const response = await fetch(projectUrl + path, {
      method, headers: {apikey: key, ...(token && {Authorization:'Bearer ' + token}),
        ...(body !== undefined && {'Content-Type':'application/json'}), ...headers},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000), redirect:'error',
    });
    const data = method === 'OPTIONS' ? null : await response.json().catch(() => null);
    return {status:response.status, headers:response.headers, data};
  } catch {
    return {status:0, headers:new Headers(), data:null};
  }
}

async function promptForOwner() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return {status:0};
  let hidden = false;
  const output = new Writable({write(chunk, _encoding, done) {
    if (!hidden) process.stdout.write(chunk);
    done();
  }});
  const rl = createInterface({input:process.stdin, output, terminal:true, historySize:0});
  rl.on('SIGINT', () => rl.close());
  let password;
  try {
    const email = (await rl.question('Owner email: ')).trim();
    hidden = true;
    process.stdout.write('Owner password (hidden): ');
    password = await rl.question('');
    process.stdout.write('\n');
    if (!email || !password) return {status:0};
    return await request('/auth/v1/token?grant_type=password', {method:'POST', body:{email,password}});
  } finally {
    password = undefined;
    rl.close();
  }
}

async function checkAnonymous() {
  const auth = await request('/auth/v1/settings');
  record('Public signups disabled', auth.status === 200 && auth.data?.disable_signup === true,
    {http:auth.status, disabled: typeof auth.data?.disable_signup === 'boolean' ? auth.data.disable_signup : null});
  const publicKeys = await request('/rest/v1/public_settings?select=key');
  const expected = JSON.parse(await readFile(new URL('./expected-live-state.json', import.meta.url), 'utf8'));
  const keys = Array.isArray(publicKeys.data) ? new Set(publicKeys.data.map(row => row.key)) : new Set();
  record('Public settings exposes exactly the expected keys',
    publicKeys.status === 200 && keys.size === expected.settings_keys.length && expected.settings_keys.every(name => keys.has(name)),
    {http:publicKeys.status, keys:keys.size});
  const catalog = await request('/functions/v1/menu');
  const categories = Array.isArray(catalog.data?.categories) ? catalog.data.categories : [];
  const items = Array.isArray(catalog.data?.items) ? catalog.data.items : [];
  record('Public menu has categories, items and Soups',
    catalog.status === 200 && categories.length >= 19 && items.length > 0 && categories.some(row => row.slug === 'soups'),
    {http:catalog.status, categories:categories.length, items:items.length, soups:categories.some(row => row.slug === 'soups')});
  const invalidMenu = await request('/functions/v1/menu?veg=invalid');
  record('Deployed menu validates query fields', invalidMenu.status === 400 && invalidMenu.data?.code === 'invalid_fields',
    {http:invalidMenu.status});
  for (const table of ['orders','bookings','job_applications','contact_messages']) {
    const rows = await request('/rest/v1/' + table + '?select=id&limit=1');
    record('Anonymous ' + table + ' is empty',
      rows.status === 200 && Array.isArray(rows.data) && rows.data.length === 0, {http:rows.status});
  }
  for (const [name, method] of Object.entries(methods)) {
    for (const [index, origin] of [...origins, 'https://unlisted.example.invalid'].entries()) {
      const response = await request('/functions/v1/' + name, {
        method:'OPTIONS', headers:{Origin:origin, 'Access-Control-Request-Method':method,
          'Access-Control-Request-Headers':'apikey,content-type'},
      });
      const allowed = index < origins.length;
      const cors = response.headers.get('access-control-allow-origin');
      const allowedMethods = response.headers.get('access-control-allow-methods')?.split(',').map(value => value.trim());
      record(name + ' CORS ' + (allowed ? origin : 'unlisted origin'),
        allowed ? response.status === 204 && cors === origin && allowedMethods?.includes(method)
          : response.status === 403 && cors === null, {http:response.status});
    }
  }
  add('Anonymous direct inserts', 'UNVERIFIED', {reason:'Use SQL policy/grant checks. A live anonymous POST could create an unapproved row.'});
  add('CV upload', 'UNVERIFIED',
    {reason:'The owner cannot delete CV objects under the current policies.'});
  return items;
}

async function checkOwner() {
  const response = await promptForOwner();
  const token = response.data?.access_token;
  const user = response.data?.user?.id;
  if (!response.status) {
    add('Owner login', 'UNVERIFIED', {reason:'Run in a terminal with interactive input.'});
    return;
  }
  const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  const signedIn = response.status === 200 && typeof token === 'string' && uuid.test(user);
  record('Owner login', signedIn, {http:response.status});
  if (!signedIn) return;
  const roles = await request('/rest/v1/admin_users?select=role&user_id=eq.' + user, {token});
  const owner = roles.status === 200 && roles.data?.length === 1 && roles.data[0].role === 'owner';
  record('Owner role exists and is readable', owner, {http:roles.status});
  if (!owner) return;
  const dashboard = await request('/rest/v1/rpc/get_admin_dashboard_stats', {token, method:'POST', body:{}});
  record('Owner dashboard RPC', dashboard.status === 200 && !!dashboard.data?.today?.orders, {http:dashboard.status});
  return token;
}

async function watchOrders(token, marker) {
  const {createClient} = await import('@supabase/supabase-js');
  const client = createClient(projectUrl, key, {
    auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false},
  });
  await client.realtime.setAuth(token);
  let received = false;
  const channel = client.channel(marker).on('postgres_changes', {
    event:'INSERT', schema:'public', table:'orders', filter:'customer_name=eq.' + marker,
  }, event => {received = event.new?.customer_name === marker;});
  const subscribed = await new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), 10_000);
    channel.subscribe(status => {
      if (['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
        clearTimeout(timer);
        resolve(status === 'SUBSCRIBED');
      }
    });
  });
  return {
    subscribed,
    async received() {
      for (let attempt = 0; attempt < 20 && !received; attempt++) await new Promise(resolve => setTimeout(resolve,500));
      return received;
    },
    async close() {try { await client.removeChannel(channel); } finally { client.realtime.disconnect(); }},
  };
}

const orderPaths = [
  ['dine_in', ['confirmed','preparing','ready','completed']],
  ['takeaway', ['confirmed','preparing','cancelled']],
  ['delivery', ['confirmed','preparing','ready','out_for_delivery','completed']],
  ['takeaway', ['confirmed','cancelled']],
  ['takeaway', ['confirmed','ready','cancelled']],
];
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function runMarkedFixtures(token, items, disposable) {
  const marker = 'SMOKE_TEST_' + randomUUID().replaceAll('-', '');
  const fixtures = new Map();
  const remember = (table, markerColumn = 'customer_name') => {
    const path = '/rest/v1/' + table + '?' + markerColumn + '=eq.' + encodeURIComponent(marker);
    fixtures.set(table, path);
    return path;
  };
  let watcher;
  let interrupted = false;
  const interrupt = () => {interrupted = true;};
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  function patchStatus(path, id, previous, status) {
    if (!uuid.test(id)) throw new Error('Missing fixture identifier');
    return request(path + '&id=eq.' + id + '&status=eq.' + previous + '&select=id,status', {
      method:'PATCH', body:{status}, token, headers:{Prefer:'return=representation'},
    });
  }
  async function transition(table, path, id, from, to) {
    if (interrupted) return false;
    const update = await patchStatus(path, id, from, to);
    const pass = update.status === 200 && update.data?.length === 1 && update.data[0].status === to;
    record(table + ' ' + from + ' to ' + to, pass, {http:update.status});
    return pass;
  }

  try {
    console.log('Fixture cleanup marker ' + marker);
    const settings = await request('/rest/v1/public_settings?select=key,value');
    const config = new Map(Array.isArray(settings.data) ? settings.data.map(row => [row.key,row.value]) : []);
    const tax = config.get('tax_percent')?.value;
    const min = config.get('min_order')?.amount ?? 0;
    const deliveryFee = config.get('delivery_fee')?.amount ?? 0;
    const item = items.filter(row => uuid.test(row.id) && Number.isInteger(row.price_inr) && row.price_inr > 0)
      .sort((a,b) => b.price_inr - a.price_inr)[0];
    const covered = new Set();
    if (!interrupted && item && config.get('ordering_enabled')?.enabled === true && Number.isFinite(tax)) {
      try { watcher = await watchOrders(token, marker); } catch {
        add('Realtime subscription', 'UNVERIFIED', {reason:'Install the pinned scripts dependency and retry.'});
      }
      if (watcher) record('Realtime subscription', watcher.subscribed);
      let verifiedOrder = false;
      let invalidTested = false;
      for (const [type,statuses] of orderPaths) {
        if (interrupted) break;
        const delivery = type === 'delivery';
        const quantity = delivery ? Math.max(2,Math.ceil(min / item.price_inr)) : 2;
        if (delivery && (config.get('delivery_enabled')?.enabled !== true || quantity > 50)) {
          add('Marked delivery order', 'UNVERIFIED', {reason:'Delivery is disabled or the minimum cannot be met by this fixture.'});
          continue;
        }
        const path = remember('orders');
        const order = await request('/functions/v1/orders', {method:'POST', body:{
          customer_name:marker, customer_phone:'919000000001', order_type:type,
          items:[{id:item.id,quantity,price_inr:1}], subtotal_inr:1,total_inr:1,
          ...(delivery && {delivery_address:{full:'SMOKE_TEST fixture address'}}),
        }});
        const row = order.data;
        const subtotal = quantity * item.price_inr;
        const pass = order.status === 200 && row?.customer_name === marker && uuid.test(row.id) &&
          row.order_type === type && row.payment_status === 'unpaid' && row.status === 'pending' &&
          /^CDL-\d{8}-\d{3,}$/.test(row.order_number ?? '') && row.items?.[0]?.price_inr === item.price_inr &&
          row.subtotal_inr === subtotal && row.total_inr === subtotal + Math.round(subtotal * tax / 100) + (delivery ? deliveryFee : 0);
        record('Marked ' + type + ' order uses server pricing', pass, {http:order.status});
        if (!pass) continue;
        verifiedOrder = true;
        if (!invalidTested && !interrupted) {
          invalidTested = true;
          const denied = await patchStatus(path,row.id,'pending','completed');
          record('Order pending to completed is rejected', denied.status === 400 && denied.data?.code === 'P0001',
            {http:denied.status});
          if (denied.status === 200 && denied.data?.length) continue;
        }
        let from = 'pending';
        for (const to of statuses) {
          if (!await transition('orders',path,row.id,from,to)) break;
          covered.add(from + ':' + to);
          from = to;
        }
      }
      const everyEdge = Object.keys(workflows.orders.next).flatMap(from =>
        nextStatuses('orders',from,'delivery').map(to => from + ':' + to));
      const allCovered = everyEdge.every(edge => covered.has(edge));
      add('All order transition branches', allCovered ? 'PASS' : 'UNVERIFIED',
        {verified:covered.size, expected:everyEdge.length});
      if (verifiedOrder && watcher?.subscribed) record('Marked order INSERT reached Realtime',await watcher.received());
      else add('Marked order INSERT reached Realtime', 'UNVERIFIED', {reason:'Needs a subscription and a successful order.'});
    } else add('Order pricing, transitions and Realtime smoke', 'UNVERIFIED',
      {reason:'Ordering is disabled or an available item or tax setting could not be read.'});

    if (interrupted) return;
    const bookingPath = remember('bookings');
    const booking = await request('/functions/v1/bookings', {method:'POST', body:{
      customer_name:marker, customer_phone:'919000000001', booking_date:addCalendarDays(indiaDate(), 2),
      booking_time:bookingRules.timeSlots[0], guests:2,
    }});
    const row = booking.data;
    const booked = booking.status === 200 && row?.customer_name === marker && uuid.test(row.id) &&
      row.status === 'pending' && /^BK-\d{8}-\d{3,}$/.test(row.booking_number ?? '');
    record('Marked booking and generated reference',booked,{http:booking.status});
    if (booked && await transition('bookings',bookingPath,row.id,'pending','confirmed')) {
      await transition('bookings',bookingPath,row.id,'confirmed','no_show');
    }

    if (interrupted) return;
    if (disposable) {
      const messagePath = remember('contact_messages','name');
      const sent = await request('/functions/v1/contact', {method:'POST',body:{
        name:marker,email:'smoke@example.invalid',subject:'Smoke test',message:'Disposable verification fixture.',
      }});
      const found = await request(messagePath + '&select=id,status', {token});
      const message = found.data?.[0];
      const created = sent.status === 201 && sent.data?.received === true && found.status === 200 &&
        found.data?.length === 1 && uuid.test(message?.id) && message.status === 'new';
      record('Marked contact message',created,{http:sent.status});
      if (created) {
        let from = 'new';
        for (const to of ['read','replied','archived']) {
          if (!await transition('contact_messages',messagePath,message.id,from,to)) break;
          from = to;
        }
      }
    } else add('Contact status and cleanup smoke', 'UNVERIFIED',
      {reason:'Use a disposable project. The contact function writes a rate-limit row the owner cannot delete.'});
  } finally {
    let cleanupFailed = false;
    for (const [table,path] of [...fixtures].reverse()) {
      let cleaned = false;
      for (let attempt = 0; attempt < 3 && !cleaned; attempt++) {
        // Keep the exact fixture marker even if the write response was lost.
        const removed = await request(path, {method:'DELETE', token, headers:{Prefer:'return=minimal'}});
        const remains = await request(path + '&select=id&limit=1', {token});
        cleaned = removed.status >= 200 && removed.status < 300 &&
          remains.status === 200 && Array.isArray(remains.data) && remains.data.length === 0;
        if (!cleaned) await new Promise(resolve => setTimeout(resolve,750));
      }
      record('Cleanup of marked ' + table, cleaned,
        cleaned ? {} : {marker, reason:'Find and delete only rows with this exact marker.'});
      cleanupFailed ||= !cleaned;
    }
    await watcher?.close().catch(() => {});
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
    if (cleanupFailed || interrupted) process.exitCode = 1;
  }
}

try {
  const flags = new Set(process.argv.slice(2));
  if ([...flags].some(flag => !['--anonymous','--write-fixtures','--disposable-project'].includes(flag)) ||
      (flags.has('--anonymous') && flags.has('--write-fixtures'))) throw new Error('Invalid flags');
  const disposable = flags.has('--disposable-project');
  const config = disposable
    ? {url:process.env.CAFE_SMOKE_URL, publishableKey:process.env.CAFE_SMOKE_PUBLISHABLE_KEY}
    : JSON.parse(await readFile(configFile, 'utf8')).supabase;
  const target = config?.url?.replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(target ?? '') ||
      (disposable ? target === productionUrl : target !== productionUrl) ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config?.publishableKey ?? '')) throw new Error('Unexpected project configuration');
  projectUrl = target;
  if (disposable) reportName = 'disposable-smoke-result.json';
  key = config.publishableKey;

  const items = await checkAnonymous();
  const token = flags.has('--anonymous') ? undefined : await checkOwner();
  if (flags.has('--anonymous')) add('Owner login and dashboard', 'UNVERIFIED', {reason:'No owner credentials requested.'});
  if (flags.has('--write-fixtures') && token) await runMarkedFixtures(token, items, disposable);
  else add('Order, booking and Realtime write smoke', 'UNVERIFIED',
    {reason:'Requires a verified owner session and the optional fixture flag.'});
} catch {
  add('Smoke script', 'FAIL', {reason:'Could not complete the checks. Verify flags, configuration and terminal availability.'});
} finally {
  const report = {run_at:new Date().toISOString(), results};
  try {
    await writeFile(new URL('../audit/' + reportName, import.meta.url), JSON.stringify(report, null, 2) + '\n', {mode:0o600});
    for (const {check,verdict} of results) console.log(verdict + ' ' + check);
    console.log('Wrote audit/' + reportName);
  } catch {
    console.error('Could not write the redacted smoke report.');
    process.exitCode = 1;
  }
  if (results.some(row => row.verdict === 'FAIL')) process.exitCode = 1;
}
