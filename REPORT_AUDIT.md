# Report audit

## Baseline before changes

Branch feat/admin-backend at c8d80d0. Reviewed moved documentation from docs and inspected the tracked inventory. The config URL and publishable-key formats match Supabase conventions. No values were printed. Hosted facts below come from the operator and remain independently unverified.

| Claim in prior report | Verdict | Evidence |
|---|---|---|
| 1. Six customer pages for the café pitch | PASS | Six root HTML pages |
| 2. Frontend/backend exist, production integration unverified | PASS | js/main.js and supabase/functions; docs/BACKEND_AUDIT.md |
| 3. Static JS and Supabase Auth, PostgREST, Storage, functions | PASS | admin/js/app.js; js/support.js; applications/index.ts |
| 4. Customer pages load main.js and support.js | PASS | Script tags in six HTML files |
| 5. Obsidian, sand, serif/sans theme | PASS | css/variables.css |
| 6. Four customer write calls | PASS | apiRequest call sites in js/main.js |
| 7. Ten repository tables and three sequences | PASS | CREATE statements in 001–004. Live counts UNVERIFIED |
| 8. Five function entrypoints | PASS | supabase/functions |
| 9. Eight admin views | PASS | admin/js/app.js pages |
| 10. Catalog read policies, private operational rows and role helpers | PASS for source | Policies in 001, 002 and 004. Known legacy policies on earlier installs require cleanup |
| 11. Whitelist and sample catalog counts | PASS | 002 has 12 keys. data/menu.json has 19 categories and 80 sample dishes |
| 12. Setup path and automatic built-in credentials | PASS for prior branch | docs/SETUP_SUPABASE.md; deployment unverified |
| 13. Prior screenshots are mock or historical | PASS | audit/browser.cjs and audit/admin-browser.cjs |
| 14. Actual business data and deployed behavior remain unverified | UNVERIFIED | Operator report only |
| 15. Use fictional details | PASS | Demo guidance |
| 16. Publishable key identifies the client, Auth/RLS restrict access | PASS | publicSupabase and role policies |
| 17. New project needs smoke tests | PASS | No recorded live verification |
| Admin addendum: dashboard, queues and owner tools present | PASS for source | admin/js modules |
| Admin addendum: three sequences, five views and 25 policies | PASS for source | 001–004 |
| Admin addendum: Auth, uploads, Realtime and migrations unverified | UNVERIFIED | Earlier mock run only |

| Claim in prior README | Verdict | Evidence |
|---|---|---|
| Six pages and admin source | PASS | Root HTML and admin/ |
| Local Python command and customer/admin routes | PASS | Earlier localhost HTTP checks in moved BACKEND_AUDIT.md |
| Blank config permits sample preview | PASS | loadMenu and publicSupabase. Current config is populated |
| 19 categories and 80 dishes; checkout uses DB prices | PASS for source | data/menu.json and orders/index.ts. Empty database means no online orders |
| Owner and staff capabilities | PASS for source | role guard, queries and SQL policies. Runtime UNVERIFIED |
| 001–004, buckets, rollback test, skip legacy | PASS at baseline | Current migration tree and behavior.sql |
| Setup, deploy and audit references | FAIL | Moved audit and owner checklist still referenced at root |
| Owner data pending, manual payment tracking, no gateway | PASS for source | Config, admin orders and function inventory |

Tracked Supabase CLI metadata and malformed ignore rule were found. The operator's 18 categories are compatible with the old SQL seed. The catalog needs a nineteenth category and all dishes. Existing 005 checks sit outside migrations in legacy, and active behavioral checks already live in supabase/tests.

## A1–A4

- PASS source and generator checks. Migration 006 replaces the known public insert and Storage write policies and upserts the three bucket definitions. 001 and 006 seed the same 19 category slugs. 004 and 006 use 5 MiB for menu images and 2 MiB for CV and OG files.
- PASS sample generator check. All 80 rows use deterministic database UUIDs and integer rupees. Checkout uses the IDs returned by the database, while fallback JSON IDs remain display-only. The seed leaves existing UUIDs unchanged.
- PASS 12 expected settings keys counted in migration 002 and copied into 006. A missing key cannot be inferred from the reported count of 12.
- Existing China category uses slug main-course-chinese. 006 renames it when the target is free, retaining the UUID. If both slugs already exist, 006 retains both rather than moving or deleting owner data.
Embedded PostgreSQL PASS after fixing migration 003 to use gen_random_uuid(). Clean apply, full replay, simulated legacy cleanup and repeat seed passed using local auth and Storage schema stubs.
