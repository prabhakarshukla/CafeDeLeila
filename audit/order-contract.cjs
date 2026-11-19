const assert = require('node:assert/strict');
const fs = require('node:fs');
const {stripTypeScriptTypes} = require('node:module');
const vm = require('node:vm');

const marker = '895fbcf0-2410-80cd-8e6a-23074755466a';
let handler;
let inserted;
let menu;
let enabled;
const client = {
  from(table) {
    const query = {
      select() { return query; },
      eq(field, value) {
        assert.equal(table, 'menu_items');
        assert.deepEqual([field, value], ['category.is_active', true]);
        return query;
      },
      in() {
        return {data:table === 'menu_items' ? menu : [
          {key:'ordering_enabled',value:{enabled}},
          {key:'tax_percent',value:{value:5}},
        ]};
      },
      insert(row) { inserted = row; return query; },
      single() { return {data:{...inserted,order_number:'TEST'}}; },
    };
    return query;
  },
};
function loadHandler(name, backend = client, clock = Date) {
  let route;
  const context = vm.createContext({
    createClient: () => backend,
    Deno:{env:{get: key => key === 'ALLOWED_ORIGINS' ? 'https://shop.fixture.invalid' : undefined},
      serve: fn => {route = fn;}},
    Headers, Response, URL, TextDecoder, TextEncoder, crypto, Date: clock,
    console: {error() {}},
  });
  for (const path of ['_shared/http.ts', '_shared/india-date.mjs', '_shared/booking-rules.mjs', name + '/index.ts']) {
    const source = fs.readFileSync('supabase/functions/' + path,'utf8')
      .replace(/^import .*;$/gm,'').replace(/^export /gm,'');
    vm.runInContext(stripTypeScriptTypes(source,{mode:'transform'}),context,{filename:path});
  }
  return route;
}
handler = loadHandler('orders');
const post = (items, extra = {}) => handler(new Request('https://fixture.invalid/orders',{
  method:'POST', body:JSON.stringify({customer_name:'Fixture',customer_phone:'919876543210',
    order_type:'takeaway',items,...extra}),
}));
(async () => {
  for (const name of ['orders', 'bookings', 'contact', 'applications', 'menu']) {
    const route = loadHandler(name);
    const url = 'https://fixture.invalid/' + name;
    assert.equal((await route(new Request(url, {method:'DELETE'}))).status,405, name);
    const options = origin => route(new Request(url, {method:'OPTIONS',headers:{origin}}));
    const allowed = await options('https://shop.fixture.invalid');
    assert.equal(allowed.status,204);
    assert.equal(allowed.headers.get('access-control-allow-origin'),'https://shop.fixture.invalid');
    assert.equal((await options('https://other.fixture.invalid')).status,403);
    if (name === 'menu') {
      const response = await route(new Request(url + '?veg=maybe'));
      assert.equal(response.status,400);
      assert.ok((await response.json()).fields.veg);
      continue;
    }
    for (const body of ['{', '[]', 'null', '"abc"', '']) {
      const response = await route(new Request(url, {method:'POST', body}));
      assert.equal(response.status,400, name);
      assert.equal((await response.json()).code,'invalid_json', name);
    }
    const oversized = await route(new Request(url, {method:'POST', body:JSON.stringify({data:'x'.repeat(65536)})}));
    assert.equal(oversized.status,413, name);
    const invalid = await route(new Request(url, {method:'POST', body:JSON.stringify({
      customer_name:42, name:42, full_name:42,
    })}));
    assert.equal(invalid.status,400, name);
    assert.equal((await invalid.json()).code,'invalid_fields');
  }
  const broken = loadHandler('menu',{from() {throw new Error('private backend detail');}});
  const response500 = await broken(new Request('https://fixture.invalid/menu'));
  assert.equal(response500.status,500);
  const payload500 = await response500.json();
  assert.match(payload500.request_id,/^[0-9a-f-]{36}$/);
  assert.equal(payload500.code,'internal_error');
  assert.doesNotMatch(JSON.stringify(payload500),/private backend detail|stack/);
  console.log('PASS shared HTTP wrapper across five handlers.');
  const item = {id:marker,quantity:2,price_inr:1};
  menu = []; enabled = true;
  assert.equal((await post([item])).status,400);
  assert.equal(inserted,undefined);
  menu = [{id:marker,name:'Fixture',price_inr:125,veg:true,is_available:false}];
  assert.equal((await post([item])).status,400);
  assert.equal(inserted,undefined);
  menu[0].is_available = true;
  assert.equal((await post([{...item,quantity:51}])).status,400);
  assert.equal((await post([item,item])).status,400);
  enabled = false;
  assert.equal((await post([item])).status,403);
  assert.equal(inserted,undefined);
  enabled = true;
  const response = await post([item],{subtotal_inr:1,total_inr:1});
  assert.equal(response.status,200);
  assert.equal(inserted.items[0].price_inr,125);
  assert.equal(inserted.subtotal_inr,250);
  assert.equal(inserted.tax_inr,13);
  assert.equal(inserted.total_inr,263);
  for (const [field, extra, cart = [item]] of [
    ['customer_name', {customer_name: '<>A<> '}],
    ['customer_name', {customer_name: 'a'.repeat(81)}],
    ['customer_name', {customer_name: 42}],
    ['order_type', {order_type: false}],
    ['order_type', {order_type: ''}],
    ['order_type', {order_type: null}],
    ['order_type', {order_type: 'pickup'}],
    ['notes', {notes: 42}],
    ['notes', {notes: 'a'.repeat(501)}],
    ['items.0.quantity', {}, [{...item,quantity:'2'}]],
    ['items.0.quantity', {}, [{...item,quantity:1.5}]],
    ['items.0.quantity', {}, [{...item,quantity:0}]],
    ['items.0.quantity', {}, [{...item,quantity:51}]],
    ['items.0.id', {}, [{...item,id:'invalid'}]],
  ]) {
    const refusal = await post(cart, extra);
    assert.equal(refusal.status,400, field);
    assert.ok((await refusal.json()).fields[field], field);
  }
  const instant = Date.parse('2026-02-27T19:00:00Z'); // 28 February in India
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return instant; }
  }
  let reservations = 0;
  const booking = loadHandler('bookings',{rpc() {reservations++; return {data:{booking_number:'TEST'}};}},Clock);
  const book = (extra = {}) => booking(new Request('https://fixture.invalid/bookings',{
    method:'POST', body:JSON.stringify({
      customer_name:'Fixture',customer_phone:'919876543210',booking_date:'2026-02-28', booking_time:'11:00', guests:2,...extra,
    }),
  }));
  for (const [field, value] of [
    ['booking_date','2026-02-27'], ['booking_date','2026-02-29'], ['booking_date','2026-02-30'],
    ['booking_date','2026-04-30'], ['booking_date', 20260228],
    ['booking_time','11:15'], ['booking_time','24:00'], ['booking_time',1100],
    ['guests','2'], ['guests',0], ['guests',21], ['guests',2.5], ['special_requests',{}],
  ]) {
    const refusal = await book({[field]:value});
    assert.equal(refusal.status,400, field);
    assert.ok((await refusal.json()).fields[field], field);
  }
  assert.equal(reservations,0);
  assert.equal((await book()).status,200);
  assert.equal((await book({booking_date:'2026-04-29',guests:20})).status,200);
  assert.equal(reservations,2);
  console.log('PASS strict order/booking fields and India date boundaries.');
  console.log('PASS Order handler: unknown/unavailable IDs, quantity, duplicates, ordering switch, and server totals with mocked catalog.');
})().catch(error => {console.error(error.message);process.exitCode=1;});
