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
const source = fs.readFileSync('supabase/functions/orders/index.ts','utf8')
  .replace(/^import .*;$/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{
  serve: fn => {handler = fn;}, cors: () => new Headers(),
  readJson: request => request.json(), createClient: () => client,
  Deno:{env:{get:()=>undefined}}, Response, console,
});
const post = (items, extra = {}) => handler(new Request('https://fixture.invalid/orders',{
  method:'POST', body:JSON.stringify({customer_name:'Fixture',customer_phone:'919876543210',
    order_type:'takeaway',items,...extra}),
}));
(async () => {
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
  console.log('PASS Order handler: unknown/unavailable IDs, quantity, duplicates, ordering switch, and server totals with mocked catalog.');
})().catch(error => {console.error(error.message);process.exitCode=1;});
