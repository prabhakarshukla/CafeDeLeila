const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context = await browser.newContext({timezoneId:'Asia/Kolkata'});
 await context.route('http://127.0.0.1:8080/**', async route => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\//,'') || 'index.html';
  if (path.includes('..') || !fs.existsSync(path)) return route.fulfill({status:404,body:'Not found'});
  const ext=path.split('.').pop();
  await route.fulfill({status:200,contentType:({html:'text/html',js:'application/javascript',css:'text/css',json:'application/json',svg:'image/svg+xml'})[ext]||'text/plain',body:fs.readFileSync(path)});
 });
 // External services are not under test. Record this limit in the audit.
 await context.route(/https:\/\/(fonts\.|www.google.com\/maps)/, route => route.fulfill({status:200,body:''}));
 const page = await context.newPage(); const errors=[]; const results=[];
 page.on('pageerror', e=>{errors.push(e.message); console.error(e.message);});
 page.on('console',msg=>{if(msg.type()==='error'){errors.push(msg.text()); console.error(msg.text());}});
 fs.mkdirSync('audit/screenshots',{recursive:true});
 async function go(name) {await page.goto('http://127.0.0.1:8080/'+name+'.html');await page.waitForSelector('body.app-ready');}
 for(const width of [360,768,1280]) {
  await page.setViewportSize({width,height:width===360?640:900});
  for(const name of ['index','menu','book-table','careers','contact','locations']) {
   await go(name); await page.screenshot({path:`audit/screenshots/${name}-${width}.png`,fullPage:true,animations:'disabled'});
   const check=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,title:document.title, small:[...document.querySelectorAll('button,a.btn,input,select')].filter(el=>el.getClientRects().length&&!el.closest('[inert]')).filter(el=>{const r=el.getBoundingClientRect();return r.height<43||r.width<43;}).map(el=>el.className)}));
   results.push({name,width,...check});
   assert(check.scroll<=width,`${name} overflow at ${width}: ${check.scroll}`);assert.equal(check.h1,1);
   if(name==='index'&&width===360) for(const a of await page.locator('.hero__actions a').all()) {const r=await a.boundingBox();assert(r.y+r.height<=640,'Hero CTA below first screen');}
  }
 }
 fs.writeFileSync('audit/layout-results.json',JSON.stringify(results,null,2));
 await page.setViewportSize({width:360,height:640});await go('menu');
 assert.equal(await page.locator('.dish-card').count(),80);
 await page.locator('.filter-chip[data-filter=veg]').click();assert((await page.locator('.dish-card').count())<80);
 assert.equal(await page.locator('.dish-card .badge--nonveg').count(),0);
 await page.locator('.filter-chip[data-filter=nonveg]').click();assert.equal(await page.locator('.dish-card .badge--veg').count(),0);
 await page.locator('.filter-chip[data-filter=all]').click();
 await page.locator('input[type=search]').fill('garlic naan');await page.waitForTimeout(250);assert.equal(await page.locator('.dish-card').count(),1);
 await page.locator('.dish-card__add').click();assert.equal(await page.locator('.cart-btn__count').textContent(),'1');
 await page.locator('[data-action=increase]').click();assert.equal(await page.locator('.cart-btn__count').textContent(),'2');
 await page.locator('#cart-notes').fill('No chilli');await page.reload();await page.waitForSelector('body.app-ready');
 assert.equal(await page.locator('.cart-btn__count').textContent(),'2');await page.locator('#cart-btn').click();assert.equal(await page.locator('#cart-notes').inputValue(),'No chilli');
 await page.locator('.cart-drawer__checkout').click();await page.waitForSelector('#checkout-modal.is-open');
 await page.locator('#checkout-form [type=submit]').click();assert(await page.locator('#checkout-form .has-error').count()>0);
 await page.locator('#checkout-name').fill('Test Guest');await page.locator('#checkout-phone').fill('9876543210');
 await page.locator('[data-type=delivery]').click();await page.locator('#checkout-address').fill('Test address, Lucknow');
 await page.locator('[data-type=takeaway]').click();assert.equal(await page.locator('#delivery-address-field').isVisible(),false);
 await page.locator('#checkout-form [type=submit]').click();await page.waitForSelector('#confirmation-modal.is-open');
 assert((await page.locator('#confirmation-modal').textContent()).includes('Order summary ready'));
 const orders=await page.evaluate(()=>JSON.parse(localStorage.getItem('cafe_de_leila_orders')));assert.equal(orders[0].items[0].quantity,2);assert.equal(orders[0].notes,'No chilli');assert.equal(orders[0].total,160);
 assert((await page.locator('.confirmation__whatsapp').getAttribute('href')).startsWith('mailto:'));
 await page.keyboard.press('Escape');
 await go('book-table');await page.locator('.date-option').nth(1).click();await page.locator('.time-slot').nth(2).click();await page.locator('[data-guests="4"]').click();
 await page.locator('#name').fill('Test Guest');await page.locator('#phone').fill('9876543210');await page.locator('#booking-form [type=submit]').click();await page.waitForSelector('#booking-confirmation-modal.is-open');
 assert((await page.locator('#booking-confirmation-modal').textContent()).includes('4 guests'));
 await go('careers');await page.locator('#name').fill('Test Applicant');await page.locator('#email').fill('test@example.com');await page.locator('#phone').fill('9876543210');await page.locator('#role').selectOption('Chef');await page.locator('#address').fill('Test address');
 await page.locator('#cv').setInputFiles({name:'cv.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 test')});await page.locator('#careers-form [type=submit]').click();await page.waitForSelector('#careers-confirmation-modal.is-open');
 await go('contact');await page.locator('#name').fill('Test Guest');await page.locator('#email').fill('test@example.com');await page.locator('#phone').fill('9876543210');await page.locator('#subject').selectOption('general');await page.locator('#message').fill('Test only');await page.locator('#contact-form [type=submit]').click();await page.waitForSelector('#contact-confirmation-modal.is-open');
 assert.deepEqual(errors,[]);
 // Negative cases and accessibility regressions.
 await go('careers');
 for (const file of [
  {name:'cv.exe',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')},
  {name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(2*1024*1024+1)}
 ]) {
  await page.locator('#cv').setInputFiles(file);
  assert.equal(await page.evaluate(()=>careersState.selectedFile),null);
 }
 for (const [name,mimeType] of [['cv.doc','application/msword'],['cv.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document']]) {
  await page.locator('#cv').setInputFiles({name,mimeType,buffer:Buffer.from('demo')});
  assert.equal(await page.evaluate(()=>careersState.selectedFile.name),name);
 }
 await go('book-table');
 await page.locator('#name').fill('Guest');await page.locator('#phone').fill('1234567890');
 await page.locator('#booking-form [type=submit]').click();assert(await page.locator('.has-error').count()>0);
 await page.locator('#phone').fill('9876543210');
 await page.locator('#email').fill('invalid');
 await page.locator('#booking-form [type=submit]').click();assert.equal(await page.locator('#email').getAttribute('aria-invalid'),'true');
 await page.locator('#email').fill('');
 await page.evaluate(()=>bookingState.selectedDate='2000-01-01');
 await page.locator('#booking-form [type=submit]').click();assert.equal(await page.locator('#booking-confirmation-modal').count(),0);
 await go('index');await page.locator('#menu-btn').click();
 await page.locator('.mobile-menu__cta a').last().focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.className),'mobile-menu__close');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'menu-btn');
 await page.locator('#cart-btn').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'cart-btn');
 await page.evaluate(()=>localStorage.setItem('cafe_de_leila_cart','{"bad":"shape"}'));await page.reload();await page.waitForSelector('body.app-ready');assert.equal(await page.locator('.cart-btn__count').textContent(),'');
 await go('menu');await page.locator('.dish-card__add').first().click();await page.locator('.cart-item__remove').click();
 assert.equal(await page.locator('.cart-btn__count').textContent(),'');assert((await page.locator('.cart-drawer__empty').textContent()).includes('Your cart is empty'));
 await page.locator('.cart-drawer__empty a').click();await page.waitForSelector('body.app-ready');assert.equal(await page.locator('.dish-card').count(),80);
 // Dry-run a verified WhatsApp setting. Capture the URL, never contact the service.
 await go('menu');await page.locator('.dish-card__add').first().click();await page.locator('.cart-drawer__checkout').click();
 await page.evaluate(()=>{cafeState.config.contact.whatsapp='919999999999';cafeState.config.contact.whatsappVerified=true;window.open=url=>{window.testHandoff=url;return null;};});
 await page.locator('#checkout-name').fill('Demo');await page.locator('#checkout-phone').fill('9876543210');await page.locator('#checkout-form [type=submit]').click();
 const handoff=await page.evaluate(()=>window.testHandoff);assert(handoff.startsWith('https://wa.me/919999999999?text='));assert(decodeURIComponent(handoff).includes('Gulab Jamun Cheesecake'));
 await context.addInitScript(()=>{Storage.prototype.getItem=function(){throw new Error('Storage blocked for test');};Storage.prototype.setItem=function(){throw new Error('Storage blocked for test');};});
 await go('menu');await page.locator('.dish-card__add').first().click();assert.equal(await page.locator('.cart-btn__count').textContent(),'1');
 await page.locator('.cart-drawer__checkout').click();await page.locator('#checkout-name').fill('Guest');await page.locator('#checkout-phone').fill('9876543210');await page.locator('#checkout-form [type=submit]').click();
 await page.waitForSelector('#confirmation-modal.is-open');assert((await page.locator('.confirmation__subtitle').textContent()).includes('Storage unavailable'));
 await page.emulateMedia({reducedMotion:'reduce'});await go('index');assert.equal(await page.locator('.hero__title').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(errors,[]);
 fs.writeFileSync('audit/browser-results.json',JSON.stringify({status:'PASS',screenshots:18,errors,flows:['menu filters/search','single add','quantity','persistence and notes','checkout validation','delivery toggle','takeaway order and totals','email fallback','booking date/time/guests','careers PDF/DOC/DOCX','invalid and oversized files','contact preview','invalid phone and optional email','past booking date','keyboard trap and focus restoration','malformed storage','unavailable storage checkout','reduced motion','verified WhatsApp URL dry-run'],externalServices:'Local files served through request routing. Remote fonts and map content stubbed. WhatsApp window.open intercepted; no external messages sent.'},null,2));
 await browser.close(); console.log('PASS: 18 layouts and core interaction flows');
})().catch(e=>{console.error(e);process.exit(1);});
