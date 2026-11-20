-- SQL Editor. Copy the single report value to audit/live-sql-report.json.
WITH relations AS (
  SELECT n.nspname AS schema, c.relname AS name, c.oid, c.relkind, c.relrowsecurity AS rls,
         c.relforcerowsecurity AS force_rls, c.reloptions
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'storage') AND c.relkind IN ('r', 'p', 'v', 'm')
), tables AS (
  SELECT schema, name, rls, force_rls,
         has_table_privilege('anon', oid, 'SELECT') AS anon_select,
         has_table_privilege('anon', oid, 'INSERT') AS anon_insert,
         has_table_privilege('authenticated', oid, 'INSERT') AS authenticated_insert
  FROM relations WHERE relkind IN ('r', 'p')
), counts AS (
  SELECT r.name, x.count
  FROM relations r
  CROSS JOIN LATERAL XMLTABLE('/table/row' PASSING
    pg_catalog.query_to_xml(format('SELECT count(*) AS n FROM %I.%I', r.schema, r.name), false, false, '')
    COLUMNS count bigint PATH 'n') x
  WHERE r.schema = 'public' AND r.relkind IN ('r', 'p')
), settings AS (
  SELECT r.name, x.keys::jsonb AS keys
  FROM relations r
  CROSS JOIN LATERAL XMLTABLE('/table/row' PASSING
    pg_catalog.query_to_xml(format(
      'SELECT coalesce(jsonb_agg(key ORDER BY key), ''[]''::jsonb) AS keys FROM %I.%I', r.schema, r.name
    ), false, false, '')
    COLUMNS keys text PATH 'keys') x
  WHERE r.schema = 'public' AND r.name IN ('settings', 'public_settings')
), owners AS (
  SELECT x.roles::jsonb AS roles FROM relations r
  CROSS JOIN LATERAL XMLTABLE('/table/row' PASSING
    pg_catalog.query_to_xml('SELECT coalesce(jsonb_object_agg(role, n), ''{}''::jsonb) AS roles
      FROM (SELECT role, count(*) AS n FROM public.admin_users GROUP BY role) t', false, false, '')
    COLUMNS roles text PATH 'roles') x
  WHERE r.schema = 'public' AND r.name = 'admin_users'
), categories AS (
  SELECT x.slugs::jsonb AS slugs FROM relations r
  CROSS JOIN LATERAL XMLTABLE('/table/row' PASSING
    pg_catalog.query_to_xml('SELECT coalesce(jsonb_agg(slug ORDER BY slug), ''[]''::jsonb) AS slugs
      FROM public.menu_categories', false, false, '')
    COLUMNS slugs text PATH 'slugs') x
  WHERE r.schema = 'public' AND r.name = 'menu_categories'
), functions AS (
  SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments,
         pg_get_function_result(p.oid) AS returns, p.prosecdef AS security_definer,
         l.lanname AS language, p.provolatile AS volatility, p.proconfig AS configuration,
         has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
), views AS (
  SELECT schema, name, coalesce(reloptions, ARRAY[]::text[]) AS reloptions,
         has_table_privilege('anon', oid, 'SELECT') AS anon_select,
         has_table_privilege('authenticated', oid, 'SELECT') AS authenticated_select,
         ARRAY(SELECT privilege FROM unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS privilege
               WHERE has_table_privilege('anon', oid, privilege) ORDER BY privilege) AS anon_other,
         CASE WHEN name = 'public_settings' AND schema = 'public' THEN pg_get_viewdef(oid, false) END AS definition
  FROM relations WHERE relkind IN ('v', 'm')
), triggers AS (
  SELECT r.schema, r.name AS table_name, t.tgname AS name, t.tgenabled AS enabled,
         pg_get_triggerdef(t.oid, false) AS definition
  FROM relations r JOIN pg_trigger t ON t.tgrelid = r.oid
  WHERE NOT t.tgisinternal
)
SELECT jsonb_build_object(
  'format_version', 1,
  'tables', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY schema, name) FROM tables t), '[]'),
  'policies', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies p WHERE schemaname IN ('public','storage')), '[]'),
  'buckets', coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY id)
    FROM (SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets) b), '[]'),
  'row_counts', coalesce((SELECT jsonb_object_agg(name, count) FROM counts), '{}'),
  'settings_keys', (SELECT keys FROM settings WHERE name = 'settings'),
  'public_settings_keys', (SELECT keys FROM settings WHERE name = 'public_settings'),
  'functions', coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY name, arguments) FROM functions f), '[]'),
  'views', coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY schema, name) FROM views v), '[]'),
  'triggers', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY schema, table_name, name) FROM triggers t), '[]'),
  'realtime', coalesce((SELECT jsonb_agg(format('%s.%s',schemaname,tablename) ORDER BY schemaname,tablename)
    FROM pg_publication_tables WHERE pubname = 'supabase_realtime'), '[]'),
  'admin_users', jsonb_build_object('count', (SELECT count FROM counts WHERE name = 'admin_users'),
    'roles', (SELECT roles FROM owners)),
  'checks', coalesce((SELECT jsonb_agg(jsonb_build_object('table_name', r.name,
      'name', c.conname, 'definition', pg_get_constraintdef(c.oid)) ORDER BY r.name, c.conname)
    FROM pg_constraint c JOIN relations r ON r.oid = c.conrelid
    WHERE c.contype = 'c' AND r.schema = 'public' AND r.name IN
      ('orders','bookings','job_applications','contact_messages','admin_users')), '[]'),
  'columns', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'table_name', table_name, 'name', column_name, 'type', data_type, 'udt_name', udt_name,
      'position', ordinal_position, 'nullable', is_nullable = 'YES', 'default', column_default
    ) ORDER BY table_name, ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('orders','bookings','job_applications','contact_messages','menu_categories','menu_items','order_status_history')), '[]'),
  'category_slugs', (SELECT slugs FROM categories),
  'soups', coalesce((SELECT slugs ? 'soups' FROM categories), false)
) AS report;
