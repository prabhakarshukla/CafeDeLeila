const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });
  const snapshots = [];
  try {
    for (const timezoneId of ['America/Los_Angeles', 'Asia/Kolkata']) {
      const context = await browser.newContext({timezoneId, serviceWorkers: 'block'});
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://shop.fixture.invalid') return route.fulfill({body: ''});
        const file = path.resolve('.' + url.pathname);
        if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file)) return route.fulfill({status: 404});
        if (url.pathname === '/data/config.json') {
          const config = JSON.parse(fs.readFileSync(file, 'utf8'));
          delete config.supabase;
          return route.fulfill({json: config});
        }
        const contentType = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
          '.json':'application/json', '.svg':'image/svg+xml', '.css':'text/css'}[path.extname(file)];
        return route.fulfill({path: file, contentType});
      });
      const page = await context.newPage();
      await page.clock.setFixedTime(new Date('2026-11-20T20:00:00Z'));
      await page.goto('https://shop.fixture.invalid/book-table.html');
      await page.waitForSelector('body.app-ready');
      const first = page.locator('.date-option').first();
      const snapshot = {
        date: await first.getAttribute('data-date'),
        day: await first.locator('.date-option__day').textContent(),
        label: await first.getAttribute('aria-label'),
        valid: await page.evaluate(async () => {
          const {bookingDateAllowed, bookingSlotAvailable} = await import('/supabase/functions/_shared/booking-rules.mjs');
          return [bookingDateAllowed('2026-11-20'), bookingDateAllowed('2026-11-21'),
            bookingSlotAvailable('2026-11-21', '11:00'), bookingSlotAvailable('2026-11-21', '11:15')];
        }),
      };
      assert.equal(snapshot.date, '2026-11-21');
      assert.equal(snapshot.day, '21');
      assert.deepEqual(snapshot.valid, [false, true, true, false]);
      snapshots.push(snapshot);
      await context.close();
    }
    assert.deepEqual(snapshots[0], snapshots[1]);
    console.log('PASS booking labels and validation match in Los Angeles and Kolkata browser contexts.');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error.message);process.exitCode = 1;});
