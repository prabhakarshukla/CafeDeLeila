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

## A5–A8

| Check | Result and evidence |
|---|---|
| Server prices and unknown/unavailable IDs | PASS mocked actual orders handler in audit/order-contract.cjs. Browser sends only id and quantity per item. |
| Endpoint payloads and admin queries | PASS source review. Orders use database UUID and integer rupees; booking expects date/time/guests; applications sign then PUT then submit cv_path; contact receives flat fields; public_settings returns key/value; admin queries match 001–004. Hosted response, file upload and role enforcement remain UNVERIFIED. |
| Source mismatches corrected | Orders read ordering_enabled.value.enabled rather than the wrong nested key. Cart bound now matches 50 per line. Featured items use catalog rows rather than hardcoded local IDs. Admin menu uploads match 5 MiB. |
| 005 and behavior assertions | PASS embedded PostgreSQL. Active behavior.sql rolls back, with anon read/insert, staff update, status transitions and unique order numbers covered. Old 005 kept as historical text. |
| Custom origins and gateway variables | PASS http.ts reads only ALLOWED_ORIGINS. No build-time variables found. Setup configures only the custom allowlist and documents old webhook deletion. |
| Sample label and contact | PASS source. support.js overlays public_settings; main.js preserves sample fallback, calls contact, and uses no removed GET endpoint for personal records. |
| Local metadata | PASS after staged cleanup. .env variants and Supabase CLI metadata are ignored; CLI metadata removed from Git index with local files preserved. |
| Rate limits | PASS docs. Orders, bookings and menu are per instance. Contact/applications use database counters. Hosted proxy behavior UNVERIFIED. |
| Browser config | PASS format checked without printing keys. Existing valid URL/key fields preserved. Hosted key validity UNVERIFIED. |
A9–A10 PASS documentation review. Verification guide covers schema, policies, buckets, publications, functions and anonymous REST. Setup gives fresh and existing sequences and the smoke tests. Hosted commands remain UNVERIFIED and were not run.
Numbering regression PASS. A 1,100-insert rollback loop reproduced duplicate IDs when the fixed-width padding truncated four digits. Fresh installs and 006 now preserve the full sequence. Embedded PostgreSQL replay passed after the fix.

## Part B

PASS document structure checks. The index links 15 chapters and records 14 numbered corrections. Each chapter has How it works and Where to look. The longest chapter is under 600 lines. The database chapter transcribes all columns, callers, rules and 25 final policy definitions. The coverage script is run against the final index.

UNVERIFIED full Supabase stack and hosted operations. Docker and Deno were unavailable. No project, function, database, user or Storage request targeted the existing hosted project.

## B1–B4 live-review follow-up

Embedded PostgreSQL PASS. Migration 006 installs a BEFORE UPDATE column guard on all four operational tables. Staff status and payment-status changes succeed, protected-field updates fail with 42501, and owner edits succeed. The earlier payment trigger is removed in 006. Anonymous catalog reads succeed and anonymous order reads return zero rows. Anonymous direct use of the stats views, dashboard RPC, and generators is denied. The service role still generates order, booking, and application references through existing insert triggers. Membership helpers are stable SQL with a locked search path and retain anonymous/authenticated execution. Both migration seeds and the public whitelist use the same 12 keys. Hosted REST remains unverified.
