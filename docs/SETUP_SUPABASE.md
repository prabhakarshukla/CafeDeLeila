# Set up a new Supabase project

Use a fresh project dedicated to this branch. All commands below are for you to run. The repository task did not access a hosted Supabase project.

1. Create a project in the Supabase dashboard. In PowerShell, navigate to the repo and confirm the CLI account and the **new** project reference. If the CLI is installed through npm on Windows, use supabase.cmd wherever the command below says supabase.

   ```powershell
   cd 'C:\cafe de lelia'
   git switch feat/admin-backend
   supabase login
   $projectRef = Read-Host 'New project reference'
   supabase link --project-ref $projectRef
   ```

2. Open **SQL Editor for the new project** and execute each complete file in a separate query in this order. Use Get-Content -Raw to copy each file to the clipboard. Stop if any migration errors. Use this manual setup path consistently, since it does not record CLI migration history.

   ```powershell
   Get-Content -Raw supabase/migrations/001_core_schema.sql | Set-Clipboard
   # Run SQL in the dashboard before copying the next file.
   Get-Content -Raw supabase/migrations/002_admin_settings.sql | Set-Clipboard
   Get-Content -Raw supabase/migrations/003_order_status_history.sql | Set-Clipboard
   Get-Content -Raw supabase/migrations/004_admin_rls_storage_realtime.sql | Set-Clipboard
   ```

3. In **Storage**, verify 004 created cv-uploads (private, PDF/DOC/DOCX, 2 MB), menu-images and og-images (public, JPEG/PNG/WebP, 2 MB). Keep all three definitions in SQL.

4. Set the custom origin allowlist and deploy the functions. Add your exact Vercel preview origin if you use one. Trailing slashes and wildcards are not supported. Supabase injects built-in function credentials. [Function environment variables](https://supabase.com/docs/guides/functions/secrets).

   ```powershell
   supabase secrets set 'ALLOWED_ORIGINS=https://cafedeleila.vercel.app,http://localhost:8080' --project-ref $projectRef
   foreach ($name in 'orders','bookings','menu','applications','contact') {
     supabase functions deploy $name --project-ref $projectRef --no-verify-jwt
     if ($LASTEXITCODE -ne 0) { throw "Deployment failed for $name" }
   }
   ```

   On a previously used project only, check the function list for the obsolete endpoint and remove it if present using `supabase functions delete webhooks` on the intended project. This is unnecessary on a new project. [CLI reference](https://supabase.com/docs/reference/cli/global-flags).

5. In **Authentication → Providers → Email**, keep email/password enabled. Disable **Allow new users to sign up** in Authentication settings. Under **Authentication → Users**, create your admin with **Auto Confirm User** on. Copy the new user's UUID.

6. Grant owner access in SQL Editor using that UUID and a display name. Auth passwords stay in the dashboard.

   ```sql
   insert into public.admin_users (user_id, role, display_name)
   values ('REPLACE_WITH_AUTH_USER_UUID', 'owner', 'Café owner');
   ```

7. In data/config.json set supabase.url and supabase.publishableKey from the new project's Connect/API Keys panel. Use the browser-facing publishable key. From the root run `python -m http.server 8080`, then open http://localhost:8080/admin/ and sign in. Create an available menu item in an active category with a known test price. Confirm ordering is enabled in Settings.

8. On a disposable project or local stack, run supabase/tests/behavior.sql in SQL Editor. It asserts role and transition behaviour and rolls back the rows. PostgreSQL sequences may advance across rollbacks. Never run archived SQL.

9. Run an anonymous insert and a real order through the Edge Function on the **fresh test project**. Use a test catalog item UUID and fictional customer details. The first command should fail. The second should return an order number and a subtotal equal to the database price × 2, ignoring the supplied subtotal and item price. Compare tax and total with Settings.

   ```powershell
   $config = Get-Content data/config.json -Raw | ConvertFrom-Json
   $headers = @{ apikey = $config.supabase.publishableKey; Origin = 'http://localhost:8080' }
   $itemId = Read-Host 'Available test menu item UUID'
   $payload = @{
     customer_name = 'Smoke Test'; customer_phone = '919876543210'; order_type = 'takeaway'
     items = @(@{ id = $itemId; quantity = 2; price_inr = 1 }); subtotal_inr = 1
   } | ConvertTo-Json -Depth 4
   $directInsert = @{
     customer_name = 'Smoke Test'; customer_phone = '919876543210'; items = @()
     subtotal_inr = 1; tax_inr = 0; total_inr = 1
   } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri "$($config.supabase.url)/rest/v1/orders" -Headers $headers -ContentType 'application/json' -Body $directInsert
   Invoke-RestMethod -Method Post -Uri "$($config.supabase.url)/functions/v1/orders" -Headers $headers -ContentType 'application/json' -Body $payload
   ```

10. In the admin panel confirm the test order and check it appears on the dashboard. Repeat with a staff user assigned through Staff, and confirm Settings and Menu are owner-only. Try a booking, an application with a dummy PDF, and a contact message. Inspect the active order row and remove test data from your test project when done.
