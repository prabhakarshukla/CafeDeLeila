# Deploy the static site

1. Configure the target project URL and publishable key in data/config.json. Keep private credentials in Supabase.
2. Use the feature branch for a Vercel preview. Import the repo as Other with an empty build command and the repository root as the output directory. Configure ALLOWED_ORIGINS with the preview's exact origin before exercising forms.
3. Check the storefront and /admin/ over HTTPS. Run the smoke checks in SETUP_SUPABASE.md against your test project.
4. Keep production on main until the owner approves launch details and runtime checks pass. Disable public Auth sign-up. The panel's noindex tag is for indexing. Auth and RLS control access.

Orders, bookings and the menu use per-instance counters. These reset on new Edge instances and are not a global quota. Applications and contact share a database limiter keyed by endpoint and a hash of the gateway-reported visitor address. It may group users behind a shared address. Confirm proxy header handling before relying on it for abuse prevention.

If upgrading a previously used Supabase project, check the function list and remove the retired function with `supabase functions delete webhooks` on the intended project. For the fresh project procedure, see SETUP_SUPABASE.md.

[Vercel static build configuration](https://vercel.com/docs/builds/configure-a-build)
