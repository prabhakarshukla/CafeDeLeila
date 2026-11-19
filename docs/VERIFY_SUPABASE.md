# Verify the Supabase setup

Run these checks yourself on the intended project. The SQL below only reads metadata and counts. Use [the database chapter](report/06-database.md) to compare all policy definitions and grants.

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('cv-uploads','menu-images','og-images') order by id;

select schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'generate_order_number','generate_booking_number','generate_application_number',
  'update_updated_at_column','is_admin','is_owner','validate_order_status_transition',
  'insert_order_status_history','validate_booking_status_transition',
  'validate_application_status_transition','get_admin_dashboard_stats',
  'allow_submission','reserve_booking','protect_payment_update','guard_staff_columns'
) order by p.proname;

select role, count(*) from public.admin_users group by role order by role;
select key from public.settings order by key;
select count(*) as public_key_count, array_agg(key order by key) as public_keys
from public.public_settings;
select slug, count(i.id) as dishes from public.menu_categories c
left join public.menu_items i on i.category_id = c.id group by slug order by slug;
```

- All ten application tables have RLS enabled. The 20 application policies and five Storage policies in the database chapter should match. The four public INSERT policies, three old CV/menu upload policies and two staff-wide image management names should be absent. Review any extra policy that affects these tables before accepting customer data.
- CV storage is private with 2,097,152 bytes and MIME types PDF, Microsoft Word DOC and OpenXML DOCX. Menu images are public with 5,242,880 bytes and JPEG, PNG and WebP. OG images are public with 2,097,152 bytes and the same image formats.
- The public tables in the Realtime publication include `orders` and `bookings`. The function inventory above returns 15 application functions. The older payment-check function is retained without an attached trigger.
- After bootstrapping the first administrator, expect one owner and zero staff on a fresh project. After 006 the 12 expected keys are `opening_hours`, `address`, `phone`, `email`, `whatsapp_number`, `ordering_enabled`, `delivery_enabled`, `delivery_fee`, `min_order`, `tax_percent`, `booking_capacity_per_slot` and `menu_is_sample`. Existing extra rows are preserved. After the clean seed, expect 19 categories and 80 items.

## Check staff guards and dashboard privileges

```sql
select c.relname as relation, t.tgname, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
  and c.relname in ('orders', 'bookings', 'job_applications', 'contact_messages')
order by relation, t.tgname;

select c.relname as view_name,
       'security_invoker=true' = any(c.reloptions) as security_invoker,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
  and c.relname in ('admin_today_stats', 'admin_today_bookings',
                    'admin_recent_activity', 'admin_top_items_7d')
order by view_name;

select p.proname as function_name,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.pronargs = 0
  and p.proname in ('is_admin', 'is_owner', 'get_admin_dashboard_stats',
                    'generate_order_number', 'generate_booking_number',
                    'generate_application_number')
order by function_name;

select p.proname, l.lanname as language, p.provolatile as volatility,
       p.prosecdef as security_definer, p.proconfig as configuration,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public' and p.pronargs = 0
  and p.proname in ('is_admin', 'is_owner')
order by p.proname;
```

- Expect `aa_guard_staff_columns` as a row-level BEFORE UPDATE trigger on each of the four tables. The old `protect_payment_update` trigger should be absent. Staff can change order `status` and `payment_status`, status on the other tables, and `updated_at` where it exists. Existing status transitions still apply. The rollback suite checks that protected fields are rejected with `42501` for staff and can be edited by owners.
- For all four views, expect `security_invoker = true`, `anon_select = false`, and `authenticated_select = true`.
- Expect `anon_exec = false` and `authenticated_exec = false` for all three generators. For `get_admin_dashboard_stats`, expect false and true, respectively. An authenticated caller without admin membership still receives `42501`.
- For both membership helpers, expect both execution columns to be true. Their definitions should use language `sql`, stable volatility (`s`), `SECURITY DEFINER`, an empty search path, and qualified references to `public.admin_users` and `auth.uid()`.
- On a disposable project, run `supabase/tests/behavior.sql` to check actual row visibility and permissions, along with reference generation when the service role inserts an order, booking, or application.

```powershell
supabase functions list --project-ref $projectRef
```

Expect `orders`, `bookings`, `menu`, `applications` and `contact`. The retired `webhooks` endpoint should be absent. Run the anonymous commands in [setup step 9](SETUP_SUPABASE.md#9-run-the-smoke-tests) on a disposable project. The anonymous GET reads an empty list and the valid anonymous POST receives HTTP 401 or 403 with PostgreSQL code `42501`. A revoked table grant can report “permission denied for table orders” before the RLS policy check. Either authorization denial is expected. A malformed-request error or a successful insert fails the test.
