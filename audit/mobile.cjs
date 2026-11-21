const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium, devices} = require('playwright');
const {installStoreFixture} = require('./browser.cjs');
const {installAdminFixture} = require('./admin-browser.cjs');

const output = path.resolve('audit/mobile-output');
const publicPages = ['index','menu','book-table','careers','contact','locations'];
const adminPages = ['dashboard','orders','menu','bookings','applications','messages','settings','staff'];
const profiles = [
  ...[320,360,390,412,768].map(width => [String(width), {viewport:{width,height:Math.round(width * 1.8)},isMobile:true,hasTouch:true}]),
  ['iPhone 13', devices['iPhone 13']],
  ['Pixel 5', devices['Pixel 5']],
  ['Small Android', {...devices['Pixel 5'],viewport:{width:320,height:568},screen:{width:320,height:568}}],
];
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};

async function listen() {
  const server = http.createServer((req,res) => {
    const url = new URL(req.url, 'http://fixture.invalid');
    const file = path.resolve('.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end(); return;
    }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] ?? 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return {server, origin:'http://127.0.0.1:' + server.address().port};
}

async function inspect(page) {
  return page.evaluate(viewportWidth => {
    const root = document.documentElement;
    const visible = el => !el.closest('[inert]') && getComputedStyle(el).visibility !== 'hidden' &&
      el.getBoundingClientRect().width > 1 && el.getBoundingClientRect().height > 1;
    const tag = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
      (el.classList.length ? '.' + [...el.classList].join('.') : '');
    const controls = [...document.querySelectorAll('button, a[href], summary, select, textarea, input, label[for="cv"]')]
      .filter(el => visible(el) && !el.matches('.skip,.skip-link,[type=hidden]'));
    const fields = controls.filter(el => el.matches('input:not([type=checkbox]),textarea,select'));
    const rects = controls.filter(el => el.matches('a,button,summary')).map(el => [el,el.getBoundingClientRect()]);
    const tightPairs = rects.flatMap(([el,a],index) => rects.slice(index+1).filter(([other,b]) =>
      el.parentElement === other.parentElement &&
      (Math.min(a.right,b.right) - Math.max(a.left,b.left) > 4 && Math.max(a.top,b.top) - Math.min(a.bottom,b.bottom) < 4 ||
        Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top) > 4 && Math.max(a.left,b.left) - Math.min(a.right,b.right) < 4))
      .map(([other]) => tag(el)+' / '+tag(other)));
    const smallTargets = controls.filter(el => {
      const box = el.getBoundingClientRect();
      return box.width < 43.99 || box.height < 43.99;
    }).map(tag);
    const main = document.querySelector('main');
    const header = document.querySelector('#header-placeholder');
    main?.scrollIntoView({block:'start', behavior:'instant'});
    const anchorCovered = !!header && main.getBoundingClientRect().top + 1 < header.getBoundingClientRect().bottom;
    scrollTo({top:0,behavior:'instant'});
    const images = [...document.images].filter(visible);
    return {
      pageWidth:innerWidth,
      horizontalOverflow:Math.max(0,root.scrollWidth-viewportWidth),
      anchorCovered,
      usesSafeArea:document.querySelector('meta[name=viewport]')?.content.includes('viewport-fit=cover') &&
        getComputedStyle(root).getPropertyValue('--safe-top').trim() !== '',
      bodyPx:parseFloat(getComputedStyle(document.body).fontSize),
      smallTargets,tightPairs,
      smallFields:fields.filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(tag),
      unlabelled:fields.filter(el => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
        [...(el.labels ?? [])].some(label => visible(label) && label.textContent.trim()))).map(tag),
      phoneHints:fields.filter(el => el.name === 'phone').every(el =>
        el.type === 'tel' && el.inputMode === 'numeric' && el.autocomplete === 'tel'),
      emailHints:fields.filter(el => el.name === 'email').every(el =>
        el.type === 'email' && ['email','username'].includes(el.autocomplete)),
      noDimensions:images.filter(el => !el.hasAttribute('width') || !el.hasAttribute('height')).map(tag),
      eagerBelowFold:images.filter(el => el.getBoundingClientRect().top > innerHeight && el.loading !== 'lazy').map(tag),
      responsiveImages:images.filter(el => el.hasAttribute('srcset')).length,
      imageCount:images.length,
      fontSwap:[...document.querySelectorAll('link[href*="fonts.googleapis.com"][rel="stylesheet"]')]
        .every(link => new URL(link.href).searchParams.get('display') === 'swap'),
    };
  },page.viewportSize().width);
}

async function ready(page, name, origin) {
  if (name === 'login' || name.startsWith('admin:')) {
    const section = name.split(':')[1] || '';
    await page.goto(origin + '/admin/' + (section ? '#' + section : ''));
    await page.getByRole('heading',{name:'Admin sign in'}).waitFor();
    if (!section) return;
    await page.getByLabel('Email').fill('owner@example.invalid');
    await page.getByLabel('Password',{exact:true}).fill('mock input');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.locator('#view h1').waitFor();
    await page.waitForFunction(() => document.querySelector('#notice').textContent === '');
    return;
  }
  await page.goto(origin + '/' + (name === 'checkout' ? 'menu' : name) + '.html');
  await page.waitForSelector('body.app-ready');
  if (name === 'checkout') {
    await page.locator('.dish-card__add').first().click();
    await page.locator('.cart-drawer__checkout').click();
    await page.locator('#checkout-form').waitFor();
  }
}

async function layout(browser, label, orientation, specification) {
  const {defaultBrowserType,viewport,screen,...options} = specification;
  const rotate = size => orientation === 'landscape' ? {width:size.height,height:size.width} : size;
  const context = await browser.newContext({...options,viewport:rotate(viewport),screen:rotate(screen ?? viewport),
    serviceWorkers:'block',reducedMotion:'reduce'});
  try {
    await installStoreFixture(context);
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const results = [];
    for (const name of [...publicPages,'checkout']) {
      await ready(page,name,'https://shop.fixture.invalid');
      results.push({label,orientation,page:name,...await inspect(page)});
    }
    await installAdminFixture(context);
    if (label === '360' && orientation === 'portrait') {
      await page.screenshot({path:path.join(output,'checkout-360.png')});
    }
    for (const name of ['login',...adminPages.map(section=>'admin:'+section)]) {
      await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
      await ready(page,name,'https://admin.fixture.invalid');
      results.push({label,orientation,page:name,...await inspect(page)});
      if (name === 'admin:orders' && label === '360' && orientation === 'portrait') {
        await page.screenshot({path:path.join(output,'admin-orders-360.png')});
      }
    }
    return results;
  } finally { await context.close(); }
}

async function performance(browser, name, origin) {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    serviceWorkers:'block',reducedMotion:'reduce'});
  try {
    const options = {origin,serveFiles:true};
    if (name.startsWith('admin:')) await installAdminFixture(context,options);
    else await installStoreFixture(context,options);
    await context.addInitScript(() => {
      window.mobilePaint = {lcp:null,cls:0,tasks:[]};
      const watch = (type, fn) => {
        if (PerformanceObserver.supportedEntryTypes.includes(type)) {
          new PerformanceObserver(list => list.getEntries().forEach(fn)).observe({type,buffered:true});
        }
      };
      watch('largest-contentful-paint', entry => {window.mobilePaint.lcp=entry.startTime;});
      const windows = [];
      watch('layout-shift', entry => {
        if (entry.hadRecentInput) return;
        let current = windows.at(-1);
        if (!current || entry.startTime - current.last > 1000 || entry.startTime - current.first > 5000) {
          current = {first:entry.startTime,last:entry.startTime,total:0}; windows.push(current);
        }
        current.last=entry.startTime; current.total+=entry.value;
        window.mobilePaint.cls=Math.max(window.mobilePaint.cls,current.total);
      });
      watch('longtask', entry => window.mobilePaint.tasks.push({start:entry.startTime,duration:entry.duration}));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(35000);
    const cdp = await context.newCDPSession(page);
    let bytes = 0;
    let requests = 0;
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', event => {if (/^https?:/.test(event.request.url)) requests++;});
    cdp.on('Network.loadingFinished', event => { bytes += event.encodedDataLength; });
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,
      downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await ready(page,name,origin);
    await page.waitForLoadState('networkidle');
    const paint = await page.evaluate(() => {
      const {lcp,cls,tasks} = window.mobilePaint;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
      return {
        lcpMs:lcp === null ? null : Math.round(lcp),cls:+cls.toFixed(4),
        tbtMs:fcp == null ? null : Math.round(tasks.filter(task => task.start >= fcp)
          .reduce((total,task) => total + Math.max(0,task.duration-50),0)),
      };
    });
    return {page:name,kb:+(bytes/1024).toFixed(1),requests,...paint};
  } finally {await context.close();}
}

async function simulatedInsetsAndKeyboard(browser) {
  const context = await browser.newContext({viewport:{width:390,height:700},isMobile:true,hasTouch:true,
    serviceWorkers:'block',reducedMotion:'reduce'});
  try {
    await installStoreFixture(context);
    const page = await context.newPage();
    await ready(page,'checkout','https://shop.fixture.invalid');
    await page.evaluate(() => {
      for (const [side,pixels] of Object.entries({top:28,right:18,bottom:26,left:18})) {
        document.documentElement.style.setProperty('--safe-' + side,pixels + 'px');
      }
    });
    await page.setViewportSize({width:390,height:335});
    await page.locator('#checkout-phone').focus();
    await page.waitForFunction(() => {
      const field = document.querySelector('#checkout-phone').getBoundingClientRect();
      const modal = document.querySelector('.modal-overlay.is-open .modal').getBoundingClientRect();
      return field.top >= modal.top && field.bottom <= modal.bottom &&
        modal.left >= 18 && modal.right <= 372 && modal.top >= 28 && modal.bottom <= 309;
    });
    const submit = page.locator('#checkout-form [type=submit]');
    await submit.scrollIntoViewIfNeeded();
    const box = await submit.boundingBox();
    assert(box && box.y + box.height <= 310, 'Checkout submit reachable above inset');
    await page.keyboard.press('Escape');
    await page.locator('#checkout-form').waitFor({state:'hidden'});
    await page.waitForFunction(() => document.activeElement.matches('#cart-btn,.dish-card__add'));
    console.log('PASS simulated safe area, shortened checkout, scroll, Escape and focus return');
  } finally { await context.close(); }
}

async function main() {
  fs.mkdirSync(output,{recursive:true});
  const label = process.argv.find(value=>value.startsWith('--label='))?.slice(8) ?? 'after';
  assert(/^[a-z-]+$/.test(label));
  const browser = await chromium.launch({channel:'chrome',headless:true});
  if (process.argv.includes('--dialogs-only')) {
    try { await simulatedInsetsAndKeyboard(browser); }
    finally { await browser.close(); }
    return;
  }
  const {server,origin} = await listen();
  try {
    const jobs = profiles.flatMap(([name,spec])=>['portrait','landscape'].map(orientation=>[name,orientation,spec]));
    const layouts = [];
    while (jobs.length) {
      const group = await Promise.all(jobs.splice(0,4).map(args=>layout(browser,...args)));
      layouts.push(...group.flat());
    }
    const performanceResults = [];
    for (const name of ['index','menu','checkout','admin:orders']) {
      performanceResults.push(await performance(browser,name,origin));
    }
    fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify({layouts,performance:performanceResults},null,2));
    console.log('Measured',layouts.length,'page/profile combinations and',performanceResults.length,'performance scenarios.');
    if (!process.argv.includes('--measure-only')) {
      await simulatedInsetsAndKeyboard(browser);
      for (const suite of ['browser.cjs','admin-browser.cjs','admin-session.cjs']) {
        execFileSync(process.execPath,['audit/'+suite],{stdio:'inherit'});
      }
    }
    if (!process.argv.includes('--measure-only')) {
      assert(layouts.every(row => row.horizontalOverflow === 0 && !row.anchorCovered &&
        row.bodyPx >= 16 && row.smallFields.length === 0 && row.smallTargets.length === 0 && row.usesSafeArea), 'A mobile layout regressed. Inspect ' + output);
    }
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
