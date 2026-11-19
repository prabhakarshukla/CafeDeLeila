# Set up and publish a test deployment

## How it works

1. Choose a disposable Supabase project. From the SQL Editor apply 001, 002, 003, 004 and 006 in order. There is no deployable 005.
2. For the reported existing install, check installed functions and grants. Apply current 004 if the limiter and booking reservation function are absent, then 006. Review any policies outside the known cleanup names.
3. Apply `supabase/seed/menu_items.sql` while preparing the sample menu. Check 19 categories, 80 sample rows and the three buckets. On replays the seed preserves edited rows by UUID.
4. Link the intended project with the CLI. Set the allowlist, deploy all five Edge Functions, and delete the retired webhook if present.
5. Turn off public signup. Create the first confirmed Auth user and add their owner row. Configure the site's project URL and publishable key, run the local static server, and follow the smoke tests.
6. On Vercel use a branch preview, a static project with the repository root as the output, and an empty build command. Use the exact Vercel preview origin in the allowlist. The public storefront and admin can share a host. Browser login and database permissions gate admin data.
7. Verify the preview through HTTPS before considering a production release. Keep business-facing values labelled until the owner confirms them.

## Where to look

[Numbered setup and all copy-paste commands](../SETUP_SUPABASE.md), [hosted verification commands and expected results](../VERIFY_SUPABASE.md), [deployment notes](../DEPLOY.md), `supabase/config.toml` and `data/config.json`.
