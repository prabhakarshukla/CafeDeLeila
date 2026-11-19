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
                    'generate_application_number', 'update_updated_at_column',
                    'validate_order_status_transition', 'insert_order_status_history',
                    'validate_booking_status_transition', 'validate_application_status_transition',
                    'guard_staff_columns')
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
- Expect `anon_exec = false` and `authenticated_exec = false` for all three generators, the five transition/history/timestamp trigger helpers in the query, and `guard_staff_columns`. For `get_admin_dashboard_stats`, expect false and true, respectively. An authenticated caller without admin membership still receives `42501`.
- For both membership helpers, expect both execution columns to be true. Their definitions should use language `sql`, stable volatility (`s`), `SECURITY DEFINER`, an empty search path, and qualified references to `public.admin_users` and `auth.uid()`.
- On a disposable project, run `supabase/tests/behavior.sql` to check actual row visibility and permissions, along with reference generation when the service role inserts an order, booking, or application.

```powershell
supabase functions list --project-ref $projectRef
```

Expect `orders`, `bookings`, `menu`, `applications` and `contact`. The retired `webhooks` endpoint should be absent. Run the anonymous commands in [setup step 9](SETUP_SUPABASE.md#9-run-the-smoke-tests) on a disposable project. The anonymous GET reads an empty list and the valid anonymous POST receives HTTP 401 or 403 with PostgreSQL code `42501`. A revoked table grant can report “permission denied for table orders” before the RLS policy check. Either authorization denial is expected. A malformed-request error or a successful insert fails the test.

## Check function origins

Use PowerShell 7. In `$allowedOrigin`, enter an exact origin configured in `ALLOWED_ORIGINS`, with no trailing slash. Keep the publishable key in memory. Run the write-capable probes below on a disposable project configured the same way as the target.

```powershell
$base = (Read-Host 'Supabase project URL').TrimEnd('/')
$headers = @{ apikey = Read-Host 'Browser publishable key' }
$allowedOrigin = Read-Host 'Configured allowed origin'
$deniedOrigin = 'https://unlisted-origin.example.invalid'
$routes = @{ menu='GET'; orders='POST'; bookings='POST'; applications='POST'; contact='POST' }
foreach ($route in $routes.Keys) {
  foreach ($origin in @($allowedOrigin, $deniedOrigin)) {
    $probe = $headers.Clone()
    $probe.Origin = $origin
    $probe['Access-Control-Request-Method'] = $routes[$route]
    $probe['Access-Control-Request-Headers'] = 'apikey,content-type'
    $response = Invoke-WebRequest "$base/functions/v1/$route" -Method Options -Headers $probe -SkipHttpErrorCheck
    $http = [int]$response.StatusCode
    $corsOrigin = $response.Headers['Access-Control-Allow-Origin'] -join ','
    if ($origin -eq $allowedOrigin) {
      if ($http -ne 204 -or $corsOrigin -cne $allowedOrigin -or
          ($response.Headers['Access-Control-Allow-Methods'] -join ',') -notmatch "\b$($routes[$route])\b") {
        throw "$route did not accept the configured origin"
      }
    } elseif ($http -ne 403 -or $corsOrigin) {
      throw "$route did not reject the unlisted origin"
    }
  }
  "$route origin checks passed"
}
```

The function list should contain exactly the five active routes if this project hosts only Café De Leila. To confirm the secret name exists, run `(supabase secrets list --project-ref $projectRef | Select-String -Quiet ALLOWED_ORIGINS)` after setting `$projectRef` to the project reference. Expect `True`. The preflight test verifies that its configured value takes effect without printing it.

## Check anonymous reads and writes

Run this on the disposable project. Expect an empty JSON array from the orders GET. Each valid anonymous POST must return HTTP 401 or 403 with database code `42501`. A successful insert or a schema error fails the check.

```powershell
$read = Invoke-WebRequest "$base/rest/v1/orders?select=id" -Headers $headers -SkipHttpErrorCheck
if ([int]$read.StatusCode -ne 200 -or $read.Content.Trim() -ne '[]') { throw 'Anonymous orders GET must return []' }
$phone = '919876543210'
$fixture = @{
  orders = @{customer_name='Access fixture';customer_phone=$phone;items=@();subtotal_inr=10;tax_inr=0;total_inr=10}
  bookings = @{customer_name='Access fixture';customer_phone=$phone;booking_date='2099-06-20';booking_time='12:00';guests=2}
  job_applications = @{full_name='Access fixture';email='cafe-fixture@example.com';phone=$phone;role='Kitchen'}
  contact_messages = @{name='Access fixture';email='cafe-fixture@example.com';subject='Access check';message='Disposable fixture'}
}
foreach ($table in $fixture.Keys) {
  $response = Invoke-WebRequest "$base/rest/v1/$table" -Method Post -Headers $headers -ContentType 'application/json' -Body ($fixture[$table] | ConvertTo-Json -Depth 4) -SkipHttpErrorCheck
  if ([int]$response.StatusCode -notin 401,403 -or (ConvertFrom-Json $response.Content).code -ne '42501') {
    throw "Expected anonymous INSERT denial for $table"
  }
  "$table anonymous INSERT denied"
}
```

## Check public signup is disabled

Use a disposable email address that you control. Run the check on the disposable project after disabling signup. Good means an HTTP 4xx response with Auth code `signup_disabled`.

```powershell
$signupEmail = Read-Host 'Disposable signup email'
$signupBody = @{email=$signupEmail;password=([guid]::NewGuid().ToString() + 'aA1!')} | ConvertTo-Json
try {
  $signup = Invoke-WebRequest "$base/auth/v1/signup" -Method Post -Headers $headers -ContentType 'application/json' -Body $signupBody -SkipHttpErrorCheck
  $http = [int]$signup.StatusCode
  if ($http -lt 400 -or $http -ge 500 -or (ConvertFrom-Json $signup.Content).error_code -ne 'signup_disabled') {
    throw 'Expected Auth to reject public signup as disabled'
  }
  'Public signup disabled'
} finally {
  Remove-Variable signupEmail,signupBody,signup -ErrorAction SilentlyContinue
}
```

## Check staff updates through REST

Create an auto-confirmed staff member and a fresh **pending** order on the disposable project. Use the order ID from the owner's order creation response or Table Editor. Good means the staff account confirms that order, a changed total is rejected with `42501`, and changing the sample flag is rejected or updates zero rows. The protected values must remain as they were. Keep the staff token in memory.

```powershell
$orderId = [guid](Read-Host 'Disposable pending order UUID')
$credential = Get-Credential -Message 'Disposable staff account'
$authBody = @{email=$credential.UserName;password=$credential.GetNetworkCredential().Password} | ConvertTo-Json
try {
  $auth = Invoke-WebRequest "$base/auth/v1/token?grant_type=password" -Method Post -Headers $headers -ContentType 'application/json' -Body $authBody -SkipHttpErrorCheck
  if ([int]$auth.StatusCode -ne 200) { throw 'Staff login failed' }
  $staff = $headers.Clone()
  $staff.Authorization = 'Bearer ' + (ConvertFrom-Json $auth.Content).access_token
  $staff.Prefer = 'return=representation'
  $orderUrl = "$base/rest/v1/orders?id=eq.$orderId&select=id,status,total_inr"
  $settingsUrl = "$base/rest/v1/settings?key=eq.menu_is_sample"
  $flagUrl = "$base/rest/v1/public_settings?key=eq.menu_is_sample&select=value"
  $before = Invoke-RestMethod $orderUrl -Headers $staff
  if ($before.Count -ne 1 -or $before[0].status -ne 'pending') { throw 'Expected a single pending fixture order' }
  $total = $before[0].total_inr
  $flag = Invoke-RestMethod $flagUrl -Headers $headers
  if ($flag.Count -ne 1) { throw 'Expected one menu sample setting' }
  $sample = $flag[0].value.is_sample

  $confirmed = Invoke-WebRequest $orderUrl -Method Patch -Headers $staff -ContentType 'application/json' -Body '{"status":"confirmed"}' -SkipHttpErrorCheck
  if ([int]$confirmed.StatusCode -ne 200 -or (ConvertFrom-Json $confirmed.Content -NoEnumerate)[0].status -ne 'confirmed') {
    throw 'Staff could not confirm the fixture order'
  }
  $change = @{total_inr=($total + 1)} | ConvertTo-Json
  $protected = Invoke-WebRequest $orderUrl -Method Patch -Headers $staff -ContentType 'application/json' -Body $change -SkipHttpErrorCheck
  if ([int]$protected.StatusCode -ne 403 -or (ConvertFrom-Json $protected.Content).code -ne '42501') {
    throw 'Expected staff total update denial with code 42501'
  }
  $change = @{value=@{is_sample=(-not $sample)}} | ConvertTo-Json -Depth 4
  $protected = Invoke-WebRequest $settingsUrl -Method Patch -Headers $staff -ContentType 'application/json' -Body $change -SkipHttpErrorCheck
  $noRows = [int]$protected.StatusCode -eq 200 -and $protected.Content.Trim() -eq '[]'
  $denied = [int]$protected.StatusCode -in 401,403 -and (ConvertFrom-Json $protected.Content).code -eq '42501'
  if (!$noRows -and !$denied) { throw 'Expected staff settings denial' }
  $after = Invoke-RestMethod $orderUrl -Headers $staff
  $afterFlag = Invoke-RestMethod $flagUrl -Headers $headers
  if ($after[0].total_inr -ne $total -or $afterFlag[0].value.is_sample -ne $sample) {
    throw 'A protected value changed'
  }
  'Staff status allowed, total and settings protected'
} finally {
  Remove-Variable credential,authBody,auth,staff,confirmed,protected -ErrorAction SilentlyContinue
}
```

## Check hosted customer and Realtime flows

On the disposable project, open **Orders** as owner or staff and select **Enable alert sound**. Submit a new fixture order in another browser tab. The order page should show the new-order alert and play a tone when the browser permits it. Refresh Orders and look for the new reference. An entry in `pg_publication_tables` proves publication membership only.

Run the remaining order price, signed CV and admin login checks in [setup step 9](SETUP_SUPABASE.md#9-run-the-smoke-tests). Use the bucket query at the top of this page to compare public flags, MIME types and byte limits to the expected values there. The test project should have no anonymous Storage upload policy.
