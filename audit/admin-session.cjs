const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {installAdminFixture, shop} = require('./admin-browser.cjs');

const key = 'sb-project-auth-token';

async function main() {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const open = async storageState => {
    const context = await browser.newContext({storageState,serviceWorkers:'block'});
    await installAdminFixture(context);
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    await page.goto(shop + '/admin/#orders');
    return {context,page};
  };
  const signIn = async (page, role) => {
    await page.getByLabel('Email').fill(role + '@example.invalid');
    await page.getByLabel('Password', {exact:true}).fill('mock input');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
  };
  try {
    for (const remember of [false,true]) {
      const first = await open();
      const {page} = first;
      const checkbox = page.getByRole('checkbox',{name:'Keep me signed in on this device'});
      await checkbox.waitFor();
      assert.equal(await checkbox.isChecked(),false);
      await page.getByRole('button',{name:'Show password'}).click();
      assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
      await page.getByRole('button',{name:'Hide password'}).click();
      assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'password');
      if (remember) await checkbox.check();
      await signIn(page,'owner');
      await page.getByRole('heading',{name:'Orders',exact:true}).waitFor();
      assert.deepEqual(await page.evaluate(key => [
        !!localStorage.getItem(key), !!sessionStorage.getItem(key),
      ],key),[remember,!remember]);
      await page.reload();
      await page.getByRole('heading',{name:'Orders',exact:true}).waitFor();
      const state = await first.context.storageState();
      await first.context.close();

      const second = await open(state);
      if (remember) {
        await second.page.getByRole('heading',{name:'Orders',exact:true}).waitFor();
        // Both stores must be clean even if a historical copy was left behind.
        await second.page.evaluate(key => sessionStorage.setItem(key,'{}'),key);
        await second.page.getByRole('button',{name:'Sign out',exact:true}).click();
        await second.page.getByText('Signed out',{exact:true}).waitFor();
        assert.equal(await second.page.getByRole('checkbox').isChecked(),true);
        assert.deepEqual(await second.page.evaluate(key => [
          localStorage.getItem(key), sessionStorage.getItem(key),
        ],key),[null,null]);
        await second.page.reload();
      }
      await second.page.getByRole('heading',{name:'Admin sign in'}).waitFor();
      await second.context.close();
    }
    const guest = await open();
    await guest.page.getByRole('checkbox').check();
    await signIn(guest.page,'guest');
    await guest.page.getByText('Not authorised',{exact:true}).waitFor();
    assert.equal(new URL(guest.page.url()).hash,'');
    assert.equal(await guest.page.getByRole('navigation').isVisible(),false);
    assert.deepEqual(await guest.page.evaluate(key => [
      localStorage.getItem(key),sessionStorage.getItem(key),
    ],key),[null,null]);
    console.log('PASS admin storage restart, tab reload, password toggle, role denial and sign-out');
  } finally {await browser.close();}
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
