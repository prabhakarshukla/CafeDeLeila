const assert = require('node:assert/strict');
const fs = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');

const migrations = fs.readdirSync('supabase/migrations').filter(file => file.endsWith('.sql')).sort();
const read = file => fs.readFileSync(file,'utf8');
const apply = (db,file) => db.exec(read('supabase/migrations/' + file));
const cleanupMigration = '006_cleanup_legacy.sql';

async function setupDatabase(db) {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE "service_role" BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;
      CREATE TABLE storage.objects (id uuid, bucket_id text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
      CREATE PUBLICATION supabase_realtime;
    `);
}

module.exports = {setupDatabase};
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});

async function main() {
  const db = new PGlite();
  try {
    await setupDatabase(db);
    for (const file of migrations) await apply(db,file);
    for (const file of migrations) await apply(db,file);
    const keys = (await db.query('SELECT count(*)::int AS n FROM public.settings')).rows[0].n;
    assert.equal(keys,12);
    await db.exec(`
      DELETE FROM public.settings WHERE key = 'menu_is_sample';
      DELETE FROM public.menu_categories WHERE slug = 'main-course';
      UPDATE public.menu_categories SET slug = 'main-course-chinese', name = 'Main Course Chinese' WHERE slug = 'chinese';
      UPDATE storage.buckets SET file_size_limit = null;
      DROP FUNCTION public.protect_payment_update();
      GRANT ALL ON public.public_settings TO PUBLIC, anon, authenticated;
      CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
      CREATE POLICY "Authenticated upload CVs" ON storage.objects FOR INSERT WITH CHECK (true);
      CREATE POLICY "Admins can manage menu images" ON storage.objects FOR UPDATE USING (is_admin());
    `);
    const before = (await db.query("SELECT id FROM menu_categories WHERE slug = 'main-course-chinese'")).rows[0].id;
    await apply(db,cleanupMigration);
    await apply(db,cleanupMigration);
    assert.equal((await db.query("SELECT id FROM menu_categories WHERE slug = 'chinese'")).rows[0].id,before);
    assert.deepEqual((await db.query("SELECT id, file_size_limit::int AS bytes FROM storage.buckets ORDER BY id")).rows,
      [{id:'cv-uploads',bytes:2097152},{id:'menu-images',bytes:5242880},{id:'og-images',bytes:2097152}]);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policies WHERE policyname LIKE 'Anyone can create %' OR policyname IN ('Authenticated upload CVs','Admins can manage menu images')")).rows[0].n,0);
    assert.equal((await db.query("SELECT to_regprocedure('public.protect_payment_update()') IS NULL AS absent")).rows[0].absent,true);
    for (const role of ['anon','authenticated']) {
      const privileges = (await db.query(
        "SELECT has_table_privilege($1,'public.public_settings','SELECT') AS can_read, " +
        "has_table_privilege($1,'public.public_settings','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS extra_grants",
        [role],
      )).rows[0];
      assert.deepEqual(privileges,{can_read:true,extra_grants:false});
    }
    const seed = read('supabase/seed/menu_items.sql');
    await db.exec(seed);
    await db.exec("UPDATE menu_items SET price_inr = 777 WHERE id = (SELECT min(id::text)::uuid FROM menu_items)");
    await db.exec(seed);
    assert.deepEqual((await db.query("SELECT count(*)::int AS n, count(*) FILTER (WHERE price_inr = 777)::int AS edits FROM menu_items")).rows,[{n:80,edits:1}]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM menu_categories')).rows[0].n,19);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public_settings')).rows[0].n,12);
    await db.exec(read('supabase/tests/behavior.sql'));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,0);
    console.log('PASS Embedded Postgres: clean migrations, full replay, legacy cleanup replay, seed repeat, owner price preserved, rollback behaviors.');
  } finally { await db.close(); }
}
