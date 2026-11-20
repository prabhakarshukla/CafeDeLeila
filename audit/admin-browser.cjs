const {chromium} = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const shop = 'https://admin.fixture.invalid';
const project = 'https://project.fixture.invalid';
const clientModule = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
const pictures = fs.mkdtempSync(path.join(os.tmpdir(), 'cafe-admin-'));

async function main() {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const context = await browser.newContext({timezoneId:'Asia/Kolkata', serviceWorkers:'block', acceptDownloads:true});
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.href === clientModule) return route.fulfill({contentType:'text/javascript', body:mock});
      if (url.origin !== shop) return route.abort();
      if (url.pathname === '/data/config.json') {
        return route.fulfill({json:{supabase:{url:project,publishableKey:'fixture-public-value'}}});
      }
      const file = path.resolve('.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
      if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404});
      const contentType = {'.mjs':'text/javascript', '.js':'text/javascript'}[path.extname(file)];
      return route.fulfill({path:file, contentType});
    });
    await context.addInitScript(() => {
      window.toneCount = 0;
      window.AudioContext = class {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        async resume() {this.state = 'running';}
        async suspend() {this.state = 'suspended';}
        async close() {this.state = 'closed';}
        createGain() {return {gain:{value:0}, connect(){}};}
        createOscillator() {return {
          frequency:{value:0},
          connect(gain) {return gain;},
          start(){window.toneCount++;},
          stop(){},
        };}
      };
      window.print = () => {
        const slip = document.querySelector('.printing .print-target');
        window.printed = {
          content: slip?.querySelector('ul')?.textContent,
          notes: slip?.querySelector('ul + p')?.textContent,
          hidesPrivate: [...slip.querySelectorAll('.no-print')].every(node => getComputedStyle(node).display === 'none'),
          hidesOther: [...document.querySelectorAll('#view details:not(.print-target)')].every(node => getComputedStyle(node).display === 'none'),
          visible: slip.getClientRects().length > 0,
        };
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const heading = title => page.getByRole('heading', {name:title, exact:true, level:1});
    const nav = title => page.locator('nav').getByRole('link', {name:title, exact:true});
    const notice = message => page.locator('#notice').getByText(message, {exact:true}).waitFor();
    const go = async title => {
      await nav(title).click();
      await heading(title === 'Menu' ? 'Menu manager' : title).waitFor();
      await page.waitForFunction(() => document.getElementById('notice').textContent !== 'Loading…');
    };
    const signIn = async role => {
      await page.getByLabel('Email').fill(role + '@example.invalid');
      await page.getByLabel('Password').fill('fixture-password');
      await page.getByRole('button', {name:'Sign in', exact:true}).click();
    };
    const signOut = async () => {
      await page.getByRole('button', {name:'Sign out'}).click();
      await heading('Admin sign in').waitFor();
    };
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({width,height:800});
      await page.goto(shop + '/admin/');
      await heading('Admin sign in').waitFor();
      await page.getByLabel('Email').waitFor();
      await page.screenshot({path:path.join(pictures,'login-' + width + '.png'),fullPage:true});
      await signIn('owner');
      await nav('Orders').waitFor();
      for (const title of ['Dashboard','Orders','Menu','Bookings','Applications','Messages','Settings','Staff']) {
        await go(title);
        await page.screenshot({path:path.join(pictures,title.toLowerCase() + '-' + width + '.png'),fullPage:true});
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),title + ' overflow at ' + width);
      }
      await signOut();
    }
    await signIn('owner');
    await nav('Orders').waitFor();
    await go('Orders');
    const order = page.locator('details').filter({hasText:'CDL-FIXTURE-1'});
    await order.locator('summary').click();
    await order.getByRole('button',{name:'confirmed',exact:true}).click();
    await notice('Order updated.');
    assert.match(await order.locator('summary').textContent(),/confirmed/);
    assert.deepEqual(await page.evaluate(() => window.mockCalls.mutations[0]),{
      table:'orders', type:'update', fields:{status:'confirmed'}, filters:[['id','order-1'],['status','pending']],
    });
    await order.locator('summary').click();
    assert.equal(await order.getByRole('button',{name:'out for delivery',exact:true}).count(),0);
    await order.getByLabel('Payment status').selectOption('paid');
    await order.getByRole('button',{name:'Save payment'}).click();
    await notice('Payment status updated.');
    await order.locator('summary').click();
    await page.emulateMedia({media:'print'});
    await order.getByRole('button',{name:'Print kitchen slip'}).click();
    assert.deepEqual(await page.evaluate(() => window.printed),{
      content:'2 × Fixture Naan', notes:'Kitchen notes: =test, "quoted"', hidesPrivate:true, hidesOther:true, visible:true,
    });
    assert.equal(await page.locator('.print-target').count(),0);
    await page.emulateMedia({media:'screen'});
    await page.getByRole('button',{name:'Enable alert sound'}).click();
    await page.getByRole('button',{name:'Mute alert sound'}).waitFor();
    await page.evaluate(() => window.emitOrderInsert());
    await page.getByText('New order received. Refresh to see it.').waitFor();
    assert.equal(await page.evaluate(() => window.toneCount),1);
    await page.getByRole('button',{name:'Mute alert sound'}).click();
    await page.getByRole('button',{name:'Enable alert sound'}).waitFor();
    await page.evaluate(() => window.emitOrderInsert());
    assert.equal(await page.evaluate(() => window.toneCount),1);

    await go('Menu');
    const create = page.locator('form').filter({has:page.getByRole('button',{name:'Create item'})});
    await create.getByLabel('Name',{exact:true}).fill('Fixture Pakora');
    await create.getByLabel('Price in rupees').fill('90');
    await create.getByLabel('Image path or project Storage URL').fill('https://outside.fixture.invalid/pic.png');
    await create.getByRole('button',{name:'Create item'}).click();
    await page.locator('#notice').getByText(/Use a local image path/).waitFor();
    assert.equal(await page.evaluate(() => window.mockCalls.mutations.filter(call => call.table === 'menu_items').length),0);
    await create.getByLabel('Image path or project Storage URL').fill('assets/meal.svg');
    await create.getByRole('button',{name:'Create item'}).click();
    await notice('Saved.');
    const edit = page.locator('details').filter({hasText:'Fixture Pakora'});
    await edit.locator('summary').click();
    await edit.getByLabel('Name',{exact:true}).fill('Fixture Pakora edited');
    const storageImage = project + '/storage/v1/object/public/menu-images/fixture.webp';
    await edit.getByLabel('Image path or project Storage URL').fill(storageImage);
    await edit.getByRole('button',{name:'Save changes'}).click();
    await page.locator('summary').getByText(/Fixture Pakora edited/).waitFor();
    const mutations = await page.evaluate(() => window.mockCalls.mutations.filter(call => call.table === 'menu_items'));
    assert.deepEqual(mutations.map(call => [call.type, call.fields.name, call.fields.image_url]),[
      ['insert','Fixture Pakora','assets/meal.svg'], ['update','Fixture Pakora edited',storageImage],
    ]);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button',{name:'Mark menu as real prices'}).click();
    await page.getByRole('button',{name:'Mark menu as sample prices'}).waitFor();

    await go('Settings');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button',{name:'Download orders CSV'}).click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(),'cafe-de-leila-orders.csv');
    const csv = fs.readFileSync(await download.path(),'utf8').split('\r\n');
    assert.match(csv[0],/^"id","order_number","created_at","customer_name",.*"total_inr","notes"$/);
    assert.equal(csv[1], '"order-1","CDL-FIXTURE-1","2026-11-20T16:30:00Z","Mock Guest","919876543210","takeaway","confirmed","paid","200","0","0","200","\'=test, ""quoted"""');
    assert.match(csv[2], /CDL-FIXTURE-2/);

    await go('Applications');
    await page.getByRole('button',{name:'Prepare CV link'}).click();
    const cv = page.getByRole('link',{name:'Open CV (expires in 60 seconds)'});
    await cv.waitFor();
    assert.equal(await cv.getAttribute('href'),project + '/signed-cv-fixture');
    assert.deepEqual(await page.evaluate(() => window.mockCalls.signing),[
      {bucket:'cv-uploads',path:'cvs/fixture.pdf',expiry:60},
    ]);
    await signOut();

    await signIn('staff');
    await nav('Orders').waitFor();
    for (const title of ['Settings','Staff','Menu']) assert.equal(await nav(title).count(),0);
    await page.evaluate(() => { location.hash='settings'; });
    await heading('Dashboard').waitFor();
    await go('Orders');
    await page.locator('details').filter({hasText:'CDL-FIXTURE-2'}).locator('summary').click();
    assert.equal(await page.getByRole('button',{name:'Save payment'}).count(),0);
    await signOut();
    await signIn('guest');
    await page.getByText('Not authorised',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS mocked admin: 27 captures, owner/staff/guest, status/payment, print, realtime/audio, menu create/edit, CSV, signed CV.');
  } finally {
    await browser.close();
  }
}

const mock = `
export function createClient(url) {
  let user;
  let listener;
  let shown;
  const timestamp = '2026-11-20T16:30:00Z';
  const tables = {
    admin_users:['owner','staff'].map(role => ({user_id:role + '@example.invalid',role,display_name:role})),
    orders:[1,2].map(id => ({
      id:'order-' + id, order_number:'CDL-FIXTURE-' + id, created_at:timestamp,
      customer_name:'Mock Guest', customer_phone:'919876543210', order_type:'takeaway', status:'pending',
      payment_status:'unpaid', subtotal_inr:200, delivery_fee_inr:0, tax_inr:0, total_inr:200,
      items:[{name:'Fixture Naan',quantity:2}], notes:'=test, "quoted"',
    })),
    menu_categories:[{id:'category-1',name:'Fixture snacks',slug:'fixture-snacks',display_order:0,is_active:true}],
    menu_items:[{id:'item-1',category_id:'category-1',name:'Fixture Naan',price_inr:100,veg:true,is_available:true}],
    bookings:[{id:'booking-1',booking_number:'BK-FIXTURE',status:'pending',customer_name:'Mock Guest',
      customer_phone:'919876543210',created_at:timestamp,booking_date:'2026-11-21',booking_time:'12:00',guests:2}],
    job_applications:[{id:'application-1',application_number:'APP-FIXTURE',status:'pending',
      full_name:'Mock Applicant',created_at:timestamp,role:'Chef',email:'applicant@example.invalid',
      phone:'919876543210',cv_url:'cvs/fixture.pdf'}],
    contact_messages:[{id:'message-1',subject:'Fixture message',name:'Mock Guest',status:'new',created_at:timestamp}],
    settings:[{key:'menu_is_sample',value:{is_sample:true}}],
  };
  const calls = window.mockCalls = {mutations:[],signing:[]};
  const ok = (data,count) => ({data,error:null,count});
  return {
    auth: {
      onAuthStateChange(callback) {listener = callback;},
      async getSession() {return ok({session:null});},
      async signInWithPassword({email}) {user = {id:email};return ok({session:{user}});},
      async signOut() {listener?.('SIGNED_OUT',null);return ok(null);},
    },
    from(table) {
      let fields, type, takeOne = false;
      const filters = [];
      const chain = {
        select(){return chain;}, order(){return chain;}, range(){return chain;}, limit(){return chain;},
        eq(key,value){filters.push([key,value]);return chain;},
        insert(value){type='insert';fields=value;return chain;},
        update(value){type='update';fields=value;return chain;},
        single(){takeOne=true;return chain;},
        maybeSingle(){return chain.single();},
        then(resolve){
          const matched = tables[table].filter(row => filters.every(([key,value]) => row[key] === value));
          if (type) calls.mutations.push({table,type,fields,filters});
          if (type === 'insert') tables[table].push({id:'created-' + table,...fields});
          if (type === 'update') matched.forEach(row => Object.assign(row,fields));
          return Promise.resolve(ok(takeOne ? matched[0] ?? null : matched,matched.length)).then(resolve);
        },
      };
      return chain;
    },
    storage:{from(bucket){return {
      async createSignedUrl(path,expiry){
        calls.signing.push({bucket,path,expiry});
        return ok({signedUrl:url + '/signed-cv-fixture'});
      },
    };}},
    async rpc(){return ok({today:{orders:{order_count:2,pending_count:1,revenue_inr:400},
      bookings:{booking_count:1},pending_applications:1,new_messages:1},top_items_7d:[]});},
    channel(){
      const channel = {
        on(event,filter,handler){
          if (event !== 'postgres_changes' || filter.table !== 'orders' || filter.event !== 'INSERT') throw new Error('Unexpected subscription');
          shown = handler;
          window.emitOrderInsert = () => shown?.({new:{id:'received-order'}});
          return channel;
        },
        subscribe(callback){callback('SUBSCRIBED');return channel;},
      };
      return channel;
    },
    removeChannel(){shown=null;},
  };
}
`;
main().catch(error => {console.error(error.message);process.exitCode = 1;});
