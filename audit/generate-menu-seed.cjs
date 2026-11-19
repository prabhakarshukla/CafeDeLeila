const {createHash} = require('node:crypto');
const {readFileSync, writeFileSync} = require('node:fs');
const path = 'supabase/seed/menu_items.sql';
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const uuid = key => {
  const hex = createHash('sha256').update('cafe-de-leila/sample/' + key).digest('hex');
  return hex.slice(0,8) + '-' + hex.slice(8,12) + '-8' + hex.slice(13,16) + '-8' + hex.slice(17,20) + '-' + hex.slice(20,32);
};
const {categories} = JSON.parse(readFileSync('data/menu.json','utf8'));
const ids = new Set();
const rows = categories.flatMap(category => category.items.map((item,index) => {
  if (!item._sample || !Number.isSafeInteger(item.price) || item.price < 1 || ids.has(item.id)) throw new Error('Invalid sample item: ' + item.id);
  ids.add(item.id);
  return '  (' + [quote(uuid(item.id)), quote(category.id), quote(item.name), quote(item.description), item.price,
    Boolean(item.veg), 'ARRAY[' + item.tags.map(quote).join(', ') + ']::text[]', index + 1].join(', ') + ')';
}));
const sql = [
  '-- SAMPLE DATA ONLY. Generated from data/menu.json by audit/generate-menu-seed.cjs.',
  '-- Existing IDs are left alone so repeat runs preserve owner edits. The global sample flag stays unchanged.',
  'BEGIN;',
  'DO $$ BEGIN',
  '  IF EXISTS (SELECT 1 FROM unnest(ARRAY[' + categories.map(c => quote(c.id)).join(', ') + ']) AS expected(slug)',
  '    WHERE NOT EXISTS (SELECT 1 FROM public.menu_categories c WHERE c.slug = expected.slug)) THEN',
  "    RAISE EXCEPTION 'Apply migration 006 before seeding the menu';",
  '  END IF;',
  'END $$;',
  'WITH sample_items(id, slug, name, description, price_inr, veg, tags, display_order) AS (VALUES',
  rows.join(',\n'),
  ')',
  'INSERT INTO public.menu_items (id, category_id, name, description, price_inr, veg, tags, display_order)',
  'SELECT s.id::uuid, c.id, s.name, s.description, s.price_inr, s.veg, s.tags, s.display_order',
  'FROM sample_items s JOIN public.menu_categories c ON c.slug = s.slug',
  'ON CONFLICT (id) DO NOTHING;',
  'COMMIT;',
  '',
].join('\n');
if (process.argv.includes('--check')) {
  if (readFileSync(path,'utf8').replaceAll('\r\n','\n') !== sql) throw new Error('Generated menu SQL is stale');
  console.log('Menu seed matches ' + ids.size + ' sample dishes and ' + categories.length + ' categories.');
} else writeFileSync(path, sql);
