const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const site = 'https://shop.fixture.invalid';
const project = 'https://project.fixture.invalid';
const photos = fs.mkdtempSync(path.join(os.tmpdir(), 'cafe-storefront-'));
const config = JSON.parse(fs.readFileSync('data/config.json','utf8'));
config.supabase = {url:project,publishableKey:'fixture-public-value'};
const original = JSON.parse(fs.readFileSync('data/menu.json','utf8')).categories;
const categories = original.map(({id,name}) => ({id,slug:id,name}));
const items = original.flatMap(category => category.items.map(({id,name,description,price,veg,tags}, index) => ({
  id,name,description,price_inr:price,veg,tags,category_id:category.id,
  image_url:category === original[0] && index === 0 ? 'https://untrusted.fixture.invalid/external.png' : 'assets/meal.svg',
})));

async function installStoreFixture(context,{origin=site,serveFiles=false} = {}) {
  const attempts = [];
  const forbidden = [];
  const state = {};
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === project) {
      if (url.pathname === '/rest/v1/public_settings') return route.fulfill({json:[
        {key:'ordering_enabled',value:{enabled:true}},
        {key:'delivery_enabled',value:{enabled:true}},
        ...(state.whatsapp ? [{key:'whatsapp_number',value:state.whatsapp}] : []),
      ]});
      if (url.pathname === '/functions/v1/menu') return route.fulfill({json:{items,categories}});
      if (url.pathname === '/signed-upload-fixture' && request.method() === 'PUT') {
        return state.fail === 'upload' ? route.abort('failed') : route.fulfill({status:200});
      }
      const name = url.pathname.replace('/functions/v1/','');
      const body = request.postDataJSON();
      attempts.push({name,body});
      if (name === state.fail) return route.fulfill({status:502,contentType:'text/html',body:'<html>opaque gateway failure</html>'});
      if (name === 'orders') {
        const lines = body.items.map(({id,quantity}) => ({...items.find(item => item.id === id),quantity}));
        const subtotal = lines.reduce((sum, item) => sum + item.price_inr * item.quantity,0);
        return route.fulfill({json:{order_number:'CDL-FIXTURE',items:lines,subtotal_inr:subtotal,
          delivery_fee_inr:0,tax_inr:0,total_inr:subtotal}});
      }
      if (name === 'bookings') return route.fulfill({json:{id:'booking',booking_number:'BK-FIXTURE'}});
      if (name === 'applications/get-upload-url') {
        return route.fulfill({json:{signedUrl:project + '/signed-upload-fixture',path:'cvs/mock.pdf'}});
      }
      if (name === 'applications') return route.fulfill({json:{id:'application',application_number:'APP-FIXTURE'}});
      if (name === 'contact') return route.fulfill({json:{received:true}});
    }
    if (url.origin !== origin) {
      if (url.hostname === 'untrusted.fixture.invalid') forbidden.push(url.pathname);
      return route.fulfill({status:200,body:''});
    }
    if (url.pathname === '/data/config.json') return route.fulfill({json:config});
    if (serveFiles) return route.continue();
    const file = path.resolve('.' + url.pathname);
    if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404});
    const contentType = {'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.svg':'image/svg+xml',
      '.css':'text/css','.json':'application/json'}[path.extname(file)];
    return route.fulfill({path:file,contentType});
  });

  return {state,attempts,forbidden};
}

async function main() {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const context = await browser.newContext({timezoneId:'America/Los_Angeles',serviceWorkers:'block'});
    const {state, attempts, forbidden} = await installStoreFixture(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-20T20:00:00Z'));
    async function go(name) {
      await page.goto(site + '/' + name + '.html');
      await page.waitForSelector('body.app-ready');
    }
    async function failure(form, text) {
      const alert = page.locator(form + ' .submission-error');
      await alert.waitFor();
      assert.match(await alert.textContent(),text);
      assert.doesNotMatch(await alert.textContent(),/opaque|JSON|fetch|network|gateway/i);
      assert.equal(await alert.getByRole('link').getAttribute('href'),'tel:+' + config.contact.phoneRaw);
      assert.equal(await alert.getByRole('link').textContent(),config.contact.phone);
    }
    for (const width of [360,768,1280]) {
      await page.setViewportSize({width,height:width === 360 ? 640 : 900});
      for (const name of ['index','menu','book-table','careers','contact','locations']) {
        await go(name);
        await page.screenshot({path:path.join(photos,name + '-' + width + '.png'),fullPage:true,animations:'disabled'});
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),name + ' overflow at ' + width);
        assert.equal(await page.locator('h1').count(),1);
        if (name === 'index' && width === 360) {
          for (const cta of await page.locator('.hero__actions a').all()) {
            const rect = await cta.boundingBox();
            assert(rect.y + rect.height <= 640,'Hero CTA below first screen');
          }
        }
        if (name === 'contact') {
          for (const control of await page.locator('main :is(input,select,textarea,button,a[href])').all()) {
            const rect = await control.boundingBox();
            if (rect) assert(rect.width >= 44 && rect.height >= 44,'Small contact control at ' + width);
          }
        }
      }
    }

    await page.setViewportSize({width:360,height:640});
    await go('menu');
    assert.equal(await page.locator('.dish-card').count(),80);
    assert.equal(await page.locator('.dish-card img').first().getAttribute('src'),'assets/meal.svg');
    assert.equal(await page.locator('a[href^="https://wa.me/"]').count(),0);
    state.whatsapp = {value:'9152245843',verified:true};
    await go('menu');
    assert.equal(await page.locator('a[href^="https://wa.me/"]').count(),0);
    state.whatsapp = {value:'919000000001',verified:false};
    await go('menu');
    assert.equal(await page.locator('a[href^="https://wa.me/"]').count(),0);
    state.whatsapp.verified = true;
    await go('menu');
    assert.equal(await page.getByRole('link',{name:'WhatsApp',exact:true}).getAttribute('href'),'https://wa.me/919000000001');

    await page.locator('.filter-chip[data-filter=veg]').click();
    assert.equal(await page.locator('.dish-card .badge--nonveg').count(),0);
    await page.locator('.filter-chip[data-filter=all]').click();
    await page.locator('input[type=search]').fill('garlic naan');
    await page.waitForFunction(() => document.querySelectorAll('.dish-card').length === 1);
    await page.locator('.dish-card__add').click();
    await page.locator('[data-action=increase]').click();
    await page.locator('#cart-notes').fill('No chilli');
    await page.reload();
    await page.waitForSelector('body.app-ready');
    assert.equal(await page.locator('.cart-btn__count').first().textContent(),'2');
    await page.locator('#cart-btn').click();
    assert.equal(await page.locator('#cart-notes').inputValue(),'No chilli');
    await page.locator('.cart-drawer__checkout').click();
    await page.locator('#checkout-form [type=submit]').click();
    await failure('#checkout-form',/highlighted order fields/);
    await page.locator('#checkout-name').fill('Test Guest');
    await page.locator('#checkout-phone').fill('9876543210');
    await page.locator('[data-type=delivery]').click();
    await page.locator('[data-type=takeaway]').click();
    assert.equal(await page.locator('#delivery-address-field').isVisible(),false);
    state.fail = 'orders';
    await page.locator('#checkout-form [type=submit]').click();
    await failure('#checkout-form',/could not confirm your order/);
    assert.equal(await page.locator('.cart-btn__count').first().textContent(),'2');
    assert.deepEqual(Object.keys(attempts.at(-1).body.items[0]).sort(),['id','quantity']);
    assert.equal(attempts.at(-1).body.notes,'No chilli');
    state.fail = undefined;
    await page.locator('#checkout-form [type=submit]').click();
    await page.waitForSelector('#confirmation-modal.is-open');
    assert.match(await page.locator('#confirmation-modal').textContent(),/CDL-FIXTURE/);
    assert.equal(await page.locator('.cart-btn__count').first().textContent(),'');

    await go('book-table');
    await page.locator('.date-option').nth(1).click();
    await page.locator('.time-slot').nth(2).click();
    await page.locator('[data-guests="4"]').click();
    await page.locator('#name').fill('Test Guest');
    await page.locator('#phone').fill('9876543210');
    state.fail = 'bookings';
    await page.locator('#booking-form [type=submit]').click();
    await failure('#booking-form',/could not confirm your booking/);
    state.fail = undefined;
    await page.locator('#booking-form [type=submit]').click();
    await page.waitForSelector('#booking-confirmation-modal.is-open');
    assert.match(await page.locator('#booking-confirmation-modal').textContent(),/BK-FIXTURE/);

    await go('careers');
    await page.locator('#name').fill('Test Applicant');
    await page.locator('#email').fill('applicant@example.invalid');
    await page.locator('#phone').fill('9876543210');
    await page.locator('#role').selectOption('Chef');
    await page.locator('#address').fill('Test address');
    for (const file of [{name:'cv.exe',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')},
      {name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(2*1024*1024+1)}]) {
      await page.locator('#cv').setInputFiles(file);
      assert.equal(await page.evaluate(() => careersState.selectedFile),null);
    }
    await page.locator('#cv').setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fixture')});
    state.fail = 'upload';
    await page.locator('#careers-form [type=submit]').click();
    await failure('#careers-form',/could not submit your application/);
    state.fail = undefined;
    await page.locator('#careers-form [type=submit]').click();
    await page.waitForSelector('#careers-confirmation-modal.is-open');
    assert.match(await page.locator('#careers-confirmation-modal').textContent(),/APP-FIXTURE/);

    await go('contact');
    await page.locator('#name').fill('Test Guest');
    await page.locator('#email').fill('contact@example.invalid');
    await page.locator('#phone').fill('9876543210');
    await page.locator('#subject').selectOption('general');
    await page.locator('#message').fill('Test only');
    state.fail = 'contact';
    await page.locator('#contact-form [type=submit]').click();
    await failure('#contact-form',/could not send your message/);
    state.fail = undefined;
    await page.locator('#contact-form [type=submit]').click();
    await page.waitForSelector('#contact-confirmation-modal.is-open');

    await go('index');
    await page.locator('#menu-btn').click();
    await page.locator('.mobile-menu__cta a').last().focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className),'mobile-menu__close');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id),'menu-btn');
    await page.emulateMedia({reducedMotion:'reduce'});
    await go('index');
    assert.equal(await page.locator('.hero__title').evaluate(el => getComputedStyle(el).animationName),'none');
    assert.deepEqual(errors,[]);
    assert.deepEqual(forbidden,[]);
    console.log('PASS mocked storefront: 18 captures, 44px contact controls, cart resilience, four submissions, verified contact link, safe image fallback.');
  } finally {
    await browser.close();
  }
}
module.exports = {installStoreFixture,site};
if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode = 1;});
