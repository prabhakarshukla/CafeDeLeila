import {el, result} from './ui.js';
import {adminSessionStorage} from './session-storage.mjs';

const nav = document.querySelector('#nav');
const view = document.querySelector('#view');
const login = document.querySelector('#login');
const logout = document.querySelector('#logout');
const remember = login.elements.keepSignedIn;
const password = login.elements.password;
const togglePassword = document.querySelector('#toggle-password');
const notice = message => { document.querySelector('#notice').textContent = message; };
const pages = {
  dashboard:['Dashboard', './dashboard.js'],
  orders:['Orders', './orders.js'],
  menu:['Menu', './menu.js', true],
  bookings:['Bookings', './requests.js'],
  applications:['Applications', './requests.js'],
  messages:['Messages', './requests.js'],
  settings:['Settings', './settings.js', true],
  staff:['Staff', './settings.js', true],
};
let client;
let sessionStorageAdapter;
let projectUrl;
let user;
let role;
let dispose;
let generation = 0;
let authGeneration = 0;

function hideWorkspace() {
  generation++;
  dispose?.();
  dispose = undefined;
  view.replaceChildren();
  nav.hidden = view.hidden = logout.hidden = true;
}

async function showPage() {
  if (!role) return;
  dispose?.();
  dispose = undefined;
  const current = ++generation;
  const requested = location.hash.slice(1);
  const key = Object.hasOwn(pages, requested) && (!pages[requested][2] || role === 'owner') ? requested : 'dashboard';
  const stage = el('div');
  view.replaceChildren(stage);
  for (const a of nav.querySelectorAll('a')) {
    if (a.hash === '#' + key) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  }
  notice('Loading…');
  try {
    const module = await import(pages[key][1]);
    const cleanup = await module.render({client, projectUrl, view:stage, role, user, key, notice: message => {
      if (generation === current) notice(message);
    }});
    if (generation !== current) cleanup?.();
    else { dispose = cleanup; if (document.querySelector('#notice').textContent === 'Loading…') notice(''); }
  } catch (error) {
    if (generation === current) notice(error.message || 'Could not load this page.');
  }
}

async function access(session) {
  const current = ++authGeneration;
  if (!session) {
    role = user = null;
    hideWorkspace();
    login.hidden = false;
    return;
  }
  hideWorkspace();
  const record = await result(client.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle());
  if (authGeneration !== current) return;
  if (!['owner','staff'].includes(record?.role)) {
    await endSession('Not authorised');
    return;
  }
  user = session.user;
  role = record.role;
  login.hidden = true;
  nav.replaceChildren(...Object.entries(pages).filter(([,page]) => !page[2] || role === 'owner')
    .map(([key,page]) => el('a', {href:'#' + key}, page[0])));
  view.hidden = nav.hidden = logout.hidden = false;
  await showPage();
}

async function start() {
  const response = await fetch('../data/config.json');
  if (!response.ok) throw new Error('Configuration is unavailable.');
  const {supabase} = await response.json();
  if (!supabase?.url || !supabase.publishableKey) throw new Error('Add the Supabase URL and publishable key in data/config.json to enable sign in.');
  const {createClient} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
  projectUrl = supabase.url;
  const storageKey = 'sb-' + new URL(projectUrl).hostname.split('.')[0] + '-auth-token';
  sessionStorageAdapter = adminSessionStorage(storageKey);
  remember.checked = sessionStorageAdapter.keepSignedIn;
  client = createClient(projectUrl, supabase.publishableKey, {
    auth: {storageKey, storage:sessionStorageAdapter, persistSession:true, autoRefreshToken:true},
  });
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') setTimeout(() => access(null), 0);
  });
  await restoreAccess();
}

async function restoreAccess() {
  try {
    const {session} = await result(client.auth.getSession());
    if (!session) notice('');
    await access(session);
  } catch {
    await access(null);
    notice('Could not check access. Sign in again to retry.');
  }
}

async function endSession(message) {
  await access(null);
  try { await client.auth.signOut(); }
  catch { /* The browser session is still cleared below. */ }
  finally {
    sessionStorageAdapter.clear();
    history.replaceState(null, '', location.pathname + location.search);
    notice(message);
  }
}

function showPassword(visible) {
  password.type = visible ? 'text' : 'password';
  togglePassword.setAttribute('aria-pressed', String(visible));
  togglePassword.textContent = visible ? 'Hide password' : 'Show password';
}

togglePassword.addEventListener('click', () => showPassword(password.type === 'password'));
remember.addEventListener('change', () => sessionStorageAdapter?.setPreference(remember.checked));

login.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = login.querySelector('[type="submit"]');
  submit.disabled = true;
  notice('Signing in…');
  const fields = new FormData(login);
  try {
    const {session} = await result(client.auth.signInWithPassword({email: fields.get('email'), password: fields.get('password')}));
    login.reset();
    remember.checked = sessionStorageAdapter.keepSignedIn;
    showPassword(false);
    await access(session);
  } catch (error) { notice(error.message); }
  finally { submit.disabled = false; }
});
logout.addEventListener('click', async () => {
  await endSession('Signed out');
});
window.addEventListener('hashchange', () => { if (client && role) void restoreAccess(); });
start().catch(error => notice(error.message));
