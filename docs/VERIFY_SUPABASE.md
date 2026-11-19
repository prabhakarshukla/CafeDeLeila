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
  'allow_submission','reserve_booking','protect_payment_update'
) order by p.proname;

select role, count(*) from public.admin_users group by role order by role;
select key from public.settings order by key;
select slug, count(i.id) as dishes from public.menu_categories c
left join public.menu_items i on i.category_id = c.id group by slug order by slug;
```

- All ten application tables have RLS enabled. The 20 application policies and five Storage policies in the database chapter should match. The four public INSERT policies, three old CV/menu upload policies and two staff-wide image management names should be absent. Review any extra policy that affects these tables before accepting customer data.
- CV storage is private with 2,097,152 bytes and MIME types PDF, Microsoft Word DOC and OpenXML DOCX. Menu images are public with 5,242,880 bytes and JPEG, PNG and WebP. OG images are public with 2,097,152 bytes and the same image formats.
- The public tables in the Realtime publication include `orders` and `bookings`. The function inventory above returns 14 application functions.
- After bootstrapping the first administrator, expect one owner and zero staff on a fresh project. After 006 the 12 expected keys are `opening_hours`, `address`, `phone`, `email`, `whatsapp_number`, `ordering_enabled`, `delivery_enabled`, `delivery_fee`, `min_order`, `tax_percent`, `booking_capacity_per_slot` and `menu_is_sample`. Existing extra rows are preserved. After the clean seed, expect 19 categories and 80 items.

```powershell
supabase functions list --project-ref $projectRef
```

Expect `orders`, `bookings`, `menu`, `applications` and `contact`. The retired `webhooks` endpoint should be absent. Run the anonymous commands in [setup step 9](SETUP_SUPABASE.md#9-run-the-smoke-tests) on a disposable project. The anonymous GET reads an empty list and the valid anonymous POST receives HTTP 401 or 403 with PostgreSQL code `42501`. A revoked table grant can report “permission denied for table orders” before the RLS policy check. Either authorization denial is expected. A malformed-request error or a successful insert fails the test.
