import {el, result} from './ui.js';

const nav = document.querySelector('#nav');
const view = document.querySelector('#view');
const login = document.querySelector('#login');
const logout = document.querySelector('#logout');
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
    const cleanup = await module.render({client, view:stage, role, user, key, notice: message => {
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
  if (user?.id === session.user.id && role) return;
  hideWorkspace();
  const record = await result(client.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle());
  if (authGeneration !== current) return;
  if (!['owner','staff'].includes(record?.role)) {
    await client.auth.signOut();
    notice('Not authorised');
    login.hidden = false;
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
  client = createClient(supabase.url, supabase.publishableKey);
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') setTimeout(() => access(null), 0);
  });
  const {session} = await result(client.auth.getSession());
  if (!session) notice('');
  await access(session);
}

login.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = login.querySelector('button');
  submit.disabled = true;
  notice('Signing in…');
  const fields = new FormData(login);
  try {
    const {session} = await result(client.auth.signInWithPassword({email: fields.get('email'), password: fields.get('password')}));
    login.reset();
    await access(session);
  } catch (error) { notice(error.message); }
  finally { submit.disabled = false; }
});
logout.addEventListener('click', async () => {
  try { await result(client.auth.signOut()); await access(null); notice('Signed out'); }
  catch (error) { notice(error.message); }
});
window.addEventListener('hashchange', showPage);
start().catch(error => notice(error.message));
