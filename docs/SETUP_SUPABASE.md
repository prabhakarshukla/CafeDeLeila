# Set up Café De Leila on Supabase

Use PowerShell from the repo root. Use PowerShell 7 for the smoke-test commands. If Windows resolves the Supabase command to a blocked npm script, use supabase.cmd instead. Only run hosted commands after checking the target project.

## 1. Choose the project

For a fresh install, create a Supabase project. For the already edited project, use its existing SQL Editor. Use a separate test project for requests that insert rows.

## 2. Apply the SQL

For a fresh project, copy each file in order from PowerShell and run it in the SQL Editor. Execute each file before copying the next one.

```powershell
Get-Content -Raw supabase/migrations/001_core_schema.sql | Set-Clipboard
Get-Content -Raw supabase/migrations/002_admin_settings.sql | Set-Clipboard
Get-Content -Raw supabase/migrations/003_order_status_history.sql | Set-Clipboard
Get-Content -Raw supabase/migrations/004_admin_rls_storage_realtime.sql | Set-Clipboard
Get-Content -Raw supabase/migrations/006_cleanup_legacy.sql | Set-Clipboard
```

For the reported existing project, reapply current 004 before 006 if the limiter or booking RPC is missing. The reported list lacks both, so use **004 → 006** for that project. 006 preserves existing settings and menu rows and removes known legacy access. Use the read-only verification guide first if the installation differs. There is no deployable 005. Keep manual SQL Editor runs separate from CLI migration history.

## 3. Seed the sample catalog

Run the next file in SQL Editor while the catalog is still marked as sample.

```powershell
Get-Content -Raw supabase/seed/menu_items.sql | Set-Clipboard
```

The clean seed adds 80 items under 19 categories. Re-running it preserves owner edits for existing sample IDs. Do not rerun it on an approved menu if you have deleted sample rows, since missing rows would be restored.

## 4. Check the buckets and policies

Open Storage. Expect private CVs at 2 MiB, public menu images at 5 MiB, and public OG images at 2 MiB. Use the [verification checklist](VERIFY_SUPABASE.md) for MIME types, settings, grants and policies.

## 5. Link the CLI

```powershell
git switch feat/admin-backend
supabase login
$projectRef = Read-Host 'Intended project reference'
supabase link --project-ref $projectRef
```

## 6. Set the origin allowlist and deploy

```powershell
supabase secrets set 'ALLOWED_ORIGINS=http://localhost:8080,https://cafedeleila.vercel.app' --project-ref $projectRef
foreach ($name in 'orders','bookings','menu','applications','contact') {
  supabase functions deploy $name --project-ref $projectRef --no-verify-jwt --use-api
  if ($LASTEXITCODE -ne 0) { throw "Deploy failed for $name" }
}
supabase functions list --project-ref $projectRef
```

Supabase injects the built-in runtime credentials. Set only the custom allowlist. Add the exact preview origin when using a Vercel branch preview. Include the scheme and port where applicable. Omit trailing slashes.

If the function list still contains webhooks, run `supabase functions delete webhooks --project-ref $projectRef`.

[Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-inspect-db-role-configs) · [Function environment variables](https://supabase.com/docs/guides/functions/secrets)

## 7. Create the owner

Disable **Allow new users to sign up** in Authentication settings. Leave email/password sign-in enabled. In Authentication → Users, create the owner with **Auto Confirm User** enabled. Copy their user UUID and run:

```sql
insert into public.admin_users (user_id, role, display_name)
values ('REPLACE_WITH_AUTH_USER_UUID', 'owner', 'Café owner');
```

## 8. Set browser configuration and open the site

Use the project URL and browser publishable key for supabase.url and supabase.publishableKey in data/config.json. Keep private credentials in Supabase.

```powershell
python -m http.server 8080
```

Open http://localhost:8080/admin/ and sign in. The storefront is at http://localhost:8080/. Use a second PowerShell window for the tests.

## 9. Run the smoke tests

Run the following on a disposable or local project. Order and CV checks create test data. Use fictional customer details and a dummy PDF. Never print headers or whole response bodies containing personal details, upload links or session tokens.

```powershell
$config = Get-Content -Raw data/config.json | ConvertFrom-Json
$base = $config.supabase.url.TrimEnd('/')
$headers = @{ apikey = $config.supabase.publishableKey; Origin = 'http://localhost:8080' }
$orders = "$base/rest/v1/orders"
$anonRead = Invoke-WebRequest "$orders" -Headers $headers
if ($anonRead.Content.Trim() -ne '[]') { throw 'Anonymous GET must return []' }
$direct = @{ customer_name='Fixture'; customer_phone='919876543210'; items=@()
  subtotal_inr=1; tax_inr=0; total_inr=1 } | ConvertTo-Json
$denied = Invoke-WebRequest "$orders" -Method Post -Headers $headers -ContentType 'application/json' -Body $direct -SkipHttpErrorCheck
if ([int]$denied.StatusCode -notin 401,403 -or ($denied.Content | ConvertFrom-Json).code -ne '42501') {
  throw 'Anonymous INSERT must fail with database authorization error 42501'
}
$catalog = Invoke-RestMethod "$base/functions/v1/menu" -Headers $headers
$item = $catalog.items | Select-Object -First 1
if (!$item) { throw 'Expected an available seeded item' }
$payload = @{ customer_name='Fixture'; customer_phone='919876543210'; order_type='takeaway'
  items=@(@{id=$item.id;quantity=2;price_inr=1}); subtotal_inr=1; total_inr=1 } | ConvertTo-Json -Depth 4
$order = Invoke-RestMethod "$base/functions/v1/orders" -Method Post -Headers $headers -ContentType 'application/json' -Body $payload
$taxSetting = Invoke-RestMethod "$base/rest/v1/public_settings?key=eq.tax_percent" -Headers $headers
$subtotal = [int]$item.price_inr * 2
$tax = [math]::Floor($subtotal * [double]$taxSetting[0].value.value / 100 + 0.5)
if (!$order.order_number -or $order.subtotal_inr -ne $subtotal -or $order.total_inr -ne ($subtotal + $tax)) {
  throw 'The order must use catalog price and configured tax'
}
```

In Careers, submit a dummy PDF under 2 MiB. Expect a reference and an admin application record with a working CV link. Try an EXE and a valid-type file over 2 MiB. The UI must reject both. Verify the signing endpoint rejects invalid metadata even without browser validation:

```powershell
foreach ($bad in @(
  @{fileName='fixture.exe';contentType='application/octet-stream';fileSize=100},
  @{fileName='fixture.pdf';contentType='application/pdf';fileSize=2097153}
)) {
  $rejected = Invoke-WebRequest "$base/functions/v1/applications/get-upload-url" -Method Post -Headers $headers -ContentType 'application/json' -Body ($bad | ConvertTo-Json) -SkipHttpErrorCheck
  if ([int]$rejected.StatusCode -ne 400) { throw 'Invalid CV metadata must return 400' }
}
```

Sign in as owner and confirm the test order. Create an auto-confirmed staff Auth user and add their UUID through **Staff**. In a separate browser session, sign in as staff and try /admin/#settings and /admin/#staff. Both must return to the dashboard view.

Use a password prompt and hold the staff access token in memory to verify REST access. This writes the same value as the current public sample flag if a policy regresses.

```powershell
$credential = Get-Credential -Message 'Disposable staff account'
$authBody = @{email=$credential.UserName;password=$credential.GetNetworkCredential().Password} | ConvertTo-Json
try {
  $staffSession = Invoke-RestMethod "$base/auth/v1/token?grant_type=password" -Headers $headers -Method Post -ContentType 'application/json' -Body $authBody
  $staffHeaders = $headers.Clone()
  $staffHeaders.Authorization = "Bearer $($staffSession.access_token)"
  $staffHeaders.Prefer = 'return=representation'
  $currentFlag = Invoke-RestMethod "$base/rest/v1/public_settings?key=eq.menu_is_sample" -Headers $headers
  $body = @{value=$currentFlag[0].value} | ConvertTo-Json -Depth 4
  $change = Invoke-WebRequest "$base/rest/v1/settings?key=eq.menu_is_sample" -Headers $staffHeaders -Method Patch -ContentType 'application/json' -Body $body -SkipHttpErrorCheck
  if ([int]$change.StatusCode -notin 401,403 -and -not ([int]$change.StatusCode -eq 200 -and $change.Content.Trim() -eq '[]')) {
    throw 'Staff must not update settings'
  }
} finally {
  Remove-Variable credential,authBody,staffSession,staffHeaders -ErrorAction SilentlyContinue
}
```

Run supabase/tests/behavior.sql as the SQL Editor role on the disposable database for rollback assertions. It removes fixture rows. Numbering sequences can still advance. Check a booking, a contact message and an order alert before release.
