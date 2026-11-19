const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const context = await browser.newContext({timezoneId:'Asia/Kolkata'});
    const page = await context.newPage();
    page.setDefaultTimeout(4500); const errors = []; page.on('console', msg => { if (msg.type() === 'error') console.log(msg.text()); });
    page.on('pageerror',error => errors.push(error.message));
    await page.route('https://cdn.jsdelivr.net/**',route => route.fulfill({contentType:'application/javascript',body:mock}));
    await page.route('http://127.0.0.1:8080/**',route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/data/config.json') return route.fulfill({json:{supabase:{url:'https://example.invalid',publishableKey:'test'}}});
      const file = path.resolve('.'+pathname+(pathname.endsWith('/')?'index.html':''));
      if (!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      return route.fulfill({path:file});
    });
    const output = 'audit/admin-screenshots';
    fs.mkdirSync(output,{recursive:true});
    for (const width of [360,768,1280]) {
      await page.setViewportSize({width,height:800});
      await page.goto('http://127.0.0.1:8080/admin/');
      await page.getByRole('heading',{name:'Admin sign in'}).waitFor();
      await page.screenshot({path:output+'/login-'+width+'.png',fullPage:true});
      await page.getByLabel('Email').fill('owner@example.invalid');
      await page.getByLabel('Password').fill(require('node:crypto').randomUUID());
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.locator('#nav').waitFor().catch(async error => { console.log(await page.locator('#notice').textContent(), errors); throw error; }); for (const title of ['Dashboard','Orders','Menu','Bookings','Applications','Messages','Settings','Staff']) {
        await page.locator('nav').getByRole('link',{name:title,exact:true}).click();
        await page.getByRole('heading',{name:title === 'Menu' ? 'Menu manager' : title,exact:true,level:1}).waitFor();
        await page.screenshot({path:output+'/'+title.toLowerCase()+'-'+width+'.png',fullPage:true});
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),title+' overflow at '+width);
      }
      await page.getByRole('button',{name:'Sign out'}).click();
      await page.getByRole('heading',{name:'Admin sign in'}).waitFor();
    }
    await page.getByLabel('Email').fill('staff@example.invalid');
    await page.getByLabel('Password').fill(require('node:crypto').randomUUID());
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.locator('nav').getByRole('link',{name:'Orders',exact:true}).waitFor();
    assert.equal(await page.locator('nav').getByRole('link',{name:'Settings'}).count(),0);
    await page.evaluate(() => { location.hash='settings'; });
    await page.getByRole('heading',{name:'Dashboard',level:1}).waitFor();
    await page.getByRole('button',{name:'Sign out'}).click();
    await page.getByLabel('Email').fill('guest@example.invalid');
    await page.getByLabel('Password').fill(require('node:crypto').randomUUID());
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByText('Not authorised',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: 27 screenshots, 24 routed layouts, owner/staff/guest, zero page errors (mocked Supabase)');
  } finally { await browser.close(); }
}

const mock = `
export function createClient() {
  let user;
  let listener;
  const ok = (data,count) => ({data,error:null,count});
  return {
    auth: {
      onAuthStateChange(callback) { listener=callback; },
      async getSession() { return ok({session:null}); },
      async signInWithPassword({email}) { user={id:email}; return ok({session:{user}}); },
      async signOut() { listener?.('SIGNED_OUT',null); return ok(null); },
    },
    from(table) {
      let response=ok([],0);
      const chain={
        select(){return chain}, order(){return chain}, eq(){return chain}, range(){return chain},
        single(){ response=ok({value:{is_sample:true}}); return chain; },
        maybeSingle(){ response=ok(user.id.startsWith('guest') ? null : {role:user.id.split('@')[0]}); return chain; },
        then(resolve){ return Promise.resolve(response).then(resolve); },
      };
      return chain;
    },
    async rpc(){ return ok({today:{orders:{order_count:2,pending_count:1,revenue_inr:400},bookings:{booking_count:2},pending_applications:0,new_messages:0},top_items_7d:[]}); },
    channel(){const channel={on(){return channel},subscribe(){return channel}}; return channel;},
    removeChannel(){},
  };
}
`;
main().catch(error => {console.error(error.message); process.exitCode=1;});
