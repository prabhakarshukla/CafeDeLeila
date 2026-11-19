# Starting handover state

Checked 20 November 2026 on feat/admin-backend at 6372e1a. The six customer pages load static CSS and JavaScript. The sample JSON has 19 categories and 80 flagged dishes. Four Edge Functions and four intended migrations exist. There is no admin directory. Previous frontend screenshots describe an earlier revision. Live branch routing, business facts and deployed functions remain unverified.

| Issue | Initial verdict | Evidence |
|---|---|---|
| 1 | FAIL | All four function entrypoints hardcode old domain in CORS headers. |
| 2 | FAIL | README:130; SETUP_SUPABASE:190; DEPLOY:25; PROJECT_REPORT:643 refer to build variables. |
| 3 | FAIL | PROJECT_REPORT:422 and setup instructions misclassify platform-injected credentials. |
| 4 | FAIL | migrations/005_tests.sql:16 runs outside a rollback and does not actually set the anon role. |
| 5 | FAIL | Root supabase-schema.sql duplicates the original schema. |
| 6 | FAIL | js/main.js:1160 uses config only. |
| 7 | FAIL | 004:102 adds an upload policy but does not configure buckets. |
| 8 | FAIL | Function handlers use instance-local maps. |
| 9 | UNVERIFIED | Removed source, stale config.toml function entry, remote deployment unknown. |
| 10 | FAIL | No prior history evidence. git ls-files and log show no tracked environment files. Reachable history scan found two example payment-key prefixes in PROJECT_REPORT (6372e1a) plus binary PNG matches. Tracked CLI metadata warrants a credential-bearing URL check. |
| 11 | FAIL | README and report overstate readiness. |
| 12 | FAIL | 001 creates six tables, 002 creates two, and 003 creates one. 003:25 and 004:79 duplicate a named policy. |
| 13 | FAIL | Duplicate history policy blocks 004; nine untracked migration drafts also appear in the working tree. Booking function:167–186 uses separate read and insert, so capacity is not atomic. |
| 14 | UNVERIFIED | Existing commits ea94ce9, 1eabb02, 6372e1a verified locally; future task boundaries pending. |

Source inspection also found a config-only sample banner, client sample IDs incompatible with the database UUID catalog, broad staff table updates and a contact form that previews locally. Orders compute catalog prices on the server in source. CV signing and public-write restrictions still need runtime proof. Old-site screenshots and remote deployment claims were not part of the checkout.

## Inventory

- HANDOVER_STATE.md
- supabase/migrations/001_core_schema_safe.sql
- supabase/migrations/002_admin_settings_safe.sql
- supabase/migrations/005_final_check.sql
- supabase/migrations/005_final_check_v2.sql
- supabase/migrations/005_tests_fixed.sql
- supabase/migrations/005_tests_fixed_v2.sql
- supabase/migrations/005_tests_simple.sql
- supabase/migrations/005_tests_simple_v2.sql
- supabase/migrations/005_verification_queries.sql
- .gitignore
- ASSUMPTIONS.md
- AUDIT.md
- BACKEND_STATE.md
- CHANGELOG.md
- PLAN.md
- PROJECT_REPORT.md
- PROJECT_STATE.md
- README.md
- TODO_FOR_OWNER.md
- assets/favicon.svg
- assets/logo_delelia.svg
- assets/meal.svg
- audit/browser-results.json
- audit/browser.cjs
- audit/layout-results.json
- audit/screenshots/book-table-1280.png
- audit/screenshots/book-table-360.png
- audit/screenshots/book-table-768.png
- audit/screenshots/careers-1280.png
- audit/screenshots/careers-360.png
- audit/screenshots/careers-768.png
- audit/screenshots/contact-1280.png
- audit/screenshots/contact-360.png
- audit/screenshots/contact-768.png
- audit/screenshots/contact-sheet.png
- audit/screenshots/index-1280.png
- audit/screenshots/index-360.png
- audit/screenshots/index-768.png
- audit/screenshots/locations-1280.png
- audit/screenshots/locations-360.png
- audit/screenshots/locations-768.png
- audit/screenshots/menu-1280.png
- audit/screenshots/menu-360.png
- audit/screenshots/menu-768.png
- audit/server-check.cjs
- audit/server-results.json
- audit/static-results.json
- audit/static.cjs
- book-table.html
- careers.html
- contact.html
- css/base.css
- css/components.css
- css/pages.css
- css/refinements.css
- css/variables.css
- data/config.json
- data/menu.json
- docs/DEPLOY.md
- docs/SETUP_SUPABASE.md
- index.html
- js/app.js
- js/booking.js
- js/careers.js
- js/contact.js
- js/home.js
- js/locations.js
- js/main.js
- js/menu.js
- js/support.js
- js/utils.js
- locations.html
- menu.html
- supabase-schema.sql
- supabase/.temp/cli-latest
- supabase/.temp/gotrue-version
- supabase/.temp/linked-project.json
- supabase/.temp/pooler-url
- supabase/.temp/postgres-version
- supabase/.temp/project-ref
- supabase/.temp/rest-version
- supabase/.temp/storage-migration
- supabase/.temp/storage-version
- supabase/config.toml
- supabase/functions/applications/.npmrc
- supabase/functions/applications/deno.json
- supabase/functions/applications/index.ts
- supabase/functions/bookings/.npmrc
- supabase/functions/bookings/deno.json
- supabase/functions/bookings/index.ts
- supabase/functions/menu/.npmrc
- supabase/functions/menu/deno.json
- supabase/functions/menu/index.ts
- supabase/functions/orders/.npmrc
- supabase/functions/orders/deno.json
- supabase/functions/orders/index.ts
- supabase/migrations/001_core_schema.sql
- supabase/migrations/002_admin_settings.sql
- supabase/migrations/003_order_status_history.sql
- supabase/migrations/004_admin_rls_storage_realtime.sql
- supabase/migrations/005_tests.sql
