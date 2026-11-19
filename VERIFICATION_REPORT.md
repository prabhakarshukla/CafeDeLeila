# Café De Leila verification report

Audit target: `feat/admin-backend` at `24daa3d` on 20 November 2026. The initial working tree was clean and matched the local `origin/feat/admin-backend` tracking ref. This audit changes only this report. Assumptions are recorded here to honor the report-only edit rule. Existing assumption files were read.

## Summary

| Section | PASS | FAIL | PARTIAL | UNVERIFIED |
|---|---:|---:|---:|---:|
| A. Frontend and content | 12 | 0 | 4 | 0 |
| B. Config and secrets | 6 | 0 | 0 | 0 |
| C. Database | 9 | 0 | 3 | 0 |
| D. Edge Functions | 3 | 0 | 3 | 0 |
| E. Admin panel | 2 | 0 | 3 | 0 |
| F. Git and delivery | 0 | 0 | 2 | 0 |
| G. Documentation | 2 | 1 | 3 | 0 |
| H. Live Supabase | 0 | 0 | 0 | 7 |
| **Total** | **34** | **1** | **18** | **7** |

PASS for source or local execution has that scope. PARTIAL means a compound item has evidence for only part of the requirement or a known exception. Every H verdict is UNVERIFIED (LIVE).

## Evidence and assumptions

- Ran `git ls-files`, `git status` and `git log --stat -n 30`. The read-only sweep opened all 151 tracked files, including historical assets, and inspected the active entry points, SQL, API handlers, admin modules, docs, tests and relevant diffs. Archived code and screenshots are historical evidence. Configuration checks emit booleans only.
- Node syntax passed for 31 JS/CJS/TS source files. All 10 tracked JSON documents parsed. A local link/reference scan found only the embedded SVG fragment `%23n` in `css/pages.css`, which resolves inside its data URI and is not a missing file. An in-memory run of `audit/static.cjs` passed its six-page links, labels, sample catalog and color checks and suppressed the evidence-file write.
- `audit/db-replay.cjs`, `audit/order-contract.cjs` and `audit/generate-menu-seed.cjs --check` passed. PGlite runs real PostgreSQL with stubbed Supabase Auth/Storage relations and a local publication. Docker and Deno executables were unavailable. Full local Supabase, `deno check`, and `deno test` remain unverified. Node's TS parse is syntax-only.
- Playwright reran all six public pages at 360, 768 and 1280 px and saved 18 screenshots to a temporary directory. A rerun of the admin harness captured 27 screenshots at the same widths, tested owner/staff/guest navigation, and reported no page errors. All browser requests were intercepted and non-fixture origins blocked or stubbed. No configured Supabase URL, account, secret, or deployment was contacted.
- Interpret “page” in A6 as the six public pages listed immediately before it. Admin has its separate requirements. Treat the latest staff guard as allowing order `payment_status` at the database level, with the owner-only payment control still in the UI. Consider the repo schema distinct from the operator's historical nine-table list. Read-only assumptions are recorded here because the task restricts workspace writes.

## A. Frontend and content

| No. | Status | Finding and evidence |
|---|---|---|
| A1 | PASS | `css/variables.css:7–25` defines both named colors and the derived screen palette. The current static WCAG luminance check produced 15.98, 14.10, 8.42, 5.36 and 6.08 for the tested text pairs. Admin print uses black and white intentionally (`admin/admin.css:34–35`). |
| A2 | PASS | All six HTML entry points exist and rendered in the current Playwright run. |
| A3 | PASS | Footer contains contact and business details (`js/main.js:857–936`), with no contact bar above nav. Contact and Locations intentionally repeat details in their main content. At 360 px the header is in flow on entry and the first-screen content remains visible. Sticky positioning and anchor padding are defined at `css/refinements.css:10–11`. |
| A4 | PASS | Both hero CTAs ended at y=417 in the 360×640 browser run. |
| A5 | PARTIAL | All 18 public layouts matched viewport width and computed body text was 16 px. Some visible anchors, including Contact's telephone and email links, fell below 44 px at each width (`contact.html:83,90`). |
| A6 | PASS | Current static suite passed title, description, viewport, icon, lang, one h1, labels, skip links and asset checks on six public pages. Image alt appears in static and rendered markup (`index.html:37,95`, `js/main.js:962–965,1200–1203`). Focus and reduced-motion rules in `css/refinements.css:8,130`. |
| A7 | PARTIAL | Active admin has no inline event handlers and loads pinned Supabase JS (`admin/index.html:10`, `admin/js/app.js:91)). Online catalog images accept HTTPS URLs (`js/support.js:144–147`), including Storage URLs from `admin/js/menu.js:77–80`. This conflicts with a literal no-remote-images requirement. |
| A8 | PASS | Current fixture run added a dish, changed its quantity, restored quantity 2 and notes after reload, and removed the item. Subtotal calculation is in `js/main.js:582–586`. Storage reads/writes are wrapped in try/catch at lines 72–94. |
| A9 | PASS | The mock menu rendered and `loadMenu` has local fallback (`js/main.js:483–502`). The current static catalog check passed exact category names, including Soups, and the generator matched the 19-category SQL source. No targeted misspellings in current catalog data. |
| A10 | PASS | All 80 JSON items carry `_sample`, the generated SQL file is explicitly headed SAMPLE DATA ONLY, and the banner uses `menu_is_sample` with config fallback (`js/support.js:118–137`, `js/main.js:1164–1176`). The fixture with live flag false hid the banner. The database uses a global sample flag. |
| A11 | PASS | Source implements booking-date, guest and field checks (`js/main.js:1679–1728,1765–1835`); the 10-digit mobile helper is at line 121. CV selection and JS file checks are at lines 133–145 and 2039–2055. Contact field validation is at 2339–2363. Hosted form writes were outside this audit. |
| A12 | PARTIAL | Active confirmation says the order was received and confirmation will follow (`js/main.js:1568`), with no WhatsApp send. The active config number is empty. Inactive `js/app.js:778` and `js/booking.js:285` use the café landline as a WhatsApp fallback, and `data/config.json:116` still claims WhatsApp is used for confirmation. The current confirmation does not render those legacy buttons. |
| A13 | PARTIAL | The rejected order fixture displayed the API error and kept quantity 2, but the failure message has no café phone (`js/main.js:1473–1476`). Non-JSON failures can also surface parsing text (`js/support.js:106–115`). |
| A14 | PASS | Config labels hours, address conflict, tax/fee and prices as unconfirmed or sample (`data/config.json:18,26–29,58–62`). SQL has unverified hours, a TODO address note and configurable rates (`002_admin_settings.sql:116–128`). The online settings note is less specific than the fallback conflict wording. |
| A15 | PASS | Historical audit mentions the disputed reports as checks or denials (`docs/BACKEND_STATE.md:144–145`). No current UI or tracked document was found asserting the four allegations as fact. |
| A16 | PASS | Checkout POSTs via `apiRequest` (`js/main.js:293–295,1456–1462`); public reads are the catalog and public settings. No active customer order-lookup uses a removed GET endpoint. |

## B. Config and secrets

| No. | Status | Finding and evidence |
|---|---|---|
| B17 | PASS | A redacted structural check of `data/config.json` returned `publicConfig: true, onlyPublicFields: true`. No private key field or token shape was found. Nothing proves validity of the hosted key. |
| B18 | PASS | A tracked-file regex sweep for the specified build-variable prefix returned no hits. Static entry points use no build pipeline. |
| B19 | PASS | `docs/SETUP_SUPABASE.md:47–59` sets only the custom origin secret and explains injected runtime credentials. No current actionable setup instruction sets the reserved prefix. |
| B20 | PASS | `git ls-files -- '.env*' supabase/.temp '*node_modules*'` returned empty. `git check-ignore --no-index` matched .env, .env.production and a supabase/.temp path. |
| B21 | PASS | Searched all 23 revisions reachable at audit start, with match values suppressed. The exact match census and rotation assessment follow this table. |
| B22 | PASS | The shared `cors` helper reads the exact comma-separated `ALLOWED_ORIGINS` list (`supabase/functions/_shared/http.ts:1–12`). Function sources contain no production café domain allowlist. |

### Redacted history census

Using `git rev-list --all` and `git grep -I -n -E` over those revisions returned **67 text-line occurrences**. These counts include repeat occurrences across commits. None had a plausible private-token shape.

| Signature | Text match locations and counts |
|---|---|
| `service_role` | `audit/db-replay.cjs` 8 (fixture role); `supabase/migrations/004_admin_rls_storage_realtime.sql` 54 and `006_cleanup_legacy.sql` 2 (SQL role names); `supabase/tests/behavior.sql` 1 (SET ROLE). |
| `rzp_` | 2 in the historical `PROJECT_REPORT.md:592–593` at `6372e1a`. Example prefixes; no live-looking key. |
| `eyJ`, `sk_`, `EAA`, `sb_secret` | Zero text matches. |

Binary grep separately matched `sk_` bytes in `audit/screenshots/menu-768.png` (22 revision/path occurrences) and `EAA` bytes in `audit/screenshots/contact-sheet.png` and `audit/screenshots/index-1280.png` (44 total). These are raw compressed-image byte matches, not text or proof of a visible key. The old pooler URL at `ac0cc8d` parsed without a password. No private credential requiring rotation was identified in available history. This does not certify screenshot pixels, remote-only history or previously deleted refs. A browser publishable key is expected public config.

## C. Database

| No. | Status | Finding and evidence |
|---|---|---|
| C23 | PASS | `audit/db-replay.cjs` applied 001–004 and 006 in order to empty embedded PostgreSQL with Supabase schema stubs, replayed the full sequence, and replayed 006 over simulated manual changes. Full managed Supabase parity remains unverified. |
| C24 | PASS | `006_cleanup_legacy.sql:4–34` removes the four legacy INSERT and three upload policies, makes menu/OG writes owner-only and upserts bucket MIME/size. Lines 202–208 apply view privileges. Lines 232–242 explicitly revoke the three generators, five named trigger functions and dashboard access from the specified roles, with dashboard restored to authenticated. |
| C25 | PARTIAL | No listed legacy policy is created by 001 or 004. Clean and simulated upgrade replay passed. Actual equality with the user-edited live database is unproven; H.a notes an explicit table-count discrepancy. |
| C26 | PASS | `006_cleanup_legacy.sql:124–139,232` declares stable SECURITY DEFINER SQL with empty search_path and qualified `public.admin_users` and `auth.uid()`, granting EXECUTE to anon and authenticated. Current rollback exercised helper access and membership checks. |
| C27 | PASS | `006_cleanup_legacy.sql:163–200` guards four BEFORE UPDATE triggers. Allowed fields are `status`, order `payment_status`, and `updated_at` where defined; NULL UID and owner bypass the guard. `behavior.sql:113–182` confirms permitted status/payment and forbidden protected changes, plus owner edits. |
| C28 | PASS | `002_admin_settings.sql:91–129` declares the 12-key view and matching seed; `006_cleanup_legacy.sql:63–76` backfills the same keys. Replay returned 12 rows in both settings and public_settings, and current docs did not assert 13. |
| C29 | PASS | `001_core_schema.sql:168–219` and 006 use three sequences, Asia/Kolkata date and untruncated suffixes. `behavior.sql:3–25,184–194` verified all three triggers as service role and 1,100 order references without collisions. |
| C30 | PARTIAL | All three state-transition triggers exist (`003_order_status_history.sql:36–195`). Persisted transition history and a writer exist only for orders, at lines 11–25,88–106. No booking/application history relation or writer. |
| C31 | PASS | Repository setup adds both publication tables (`004_admin_rls_storage_realtime.sql:141–154`), allows public images, admin CV reads and removes ordinary CV upload policies (004:107–137 and 006:10–34). Runtime event delivery and hosted object access are H checks. |
| C32 | PASS | Generator check confirmed 80 sample-marked rows from JSON across 19 categories. A replay preserved an edited price. Deterministic SQL IDs map to catalog response IDs and order lookup; local slugs only serve the offline UI (`seed/menu_items.sql:1–10,91–96`, `js/support.js:140–149`, `orders/index.ts:125–136`). |
| C33 | PARTIAL | Old 005 is historical text outside migrations; active test uses `BEGIN/ROLLBACK`. Role, catalog, generator/RPC, totals and reference checks run. A separate read-only, in-memory augmentation explicitly proved history was written after trigger EXECUTE revoke, but the tracked test does not assert the history row. PostgreSQL sequences still advance on a rolled-back insert. |
| C34 | PASS | `supabase/legacy/supabase-schema.sql` is outside migrations and `supabase/legacy/README.md` says not to run it. |

## D. Edge Functions

| No. | Status | Finding and evidence |
|---|---|---|
| D35 | PASS | All five function entrypoints exist and `supabase/config.toml` configures them. No Razorpay/WhatsApp webhook entrypoint remains. |
| D36 | PARTIAL | The actual orders handler with a stubbed DB passed price tampering, unknown/unavailable items, quantity bounds, duplicates and the ordering switch. It persists name/price snapshots (`orders/index.ts:134–189,219–237`). Strict validation has holes: falsy non-string `order_type` silently selects dine-in at line 106, and sanitization can empty a previously accepted name (81,223). |
| D37 | PARTIAL | `reserve_booking` reads settings, checks India time and locks by slot in 004:329–352. `bookings/index.ts:38–40,117–145` checks shape and future date but not calendar validity. Hosted/concurrent booking execution was not tested. |
| D38 | PASS | `applications/index.ts:40–47,79–106,151–158` checks extension, MIME and size, randomizes and signs a path, and checks the object before writing. 006:26–34 sets matching private bucket limits. This is source/DDL evidence; hosted upload and object validation are H.g. |
| D39 | PARTIAL | CORS, streamed 64 KiB limiting on JSON and documented per-instance/database limits exist (`_shared/http.ts:1–39`, `docs/DEPLOY.md)). Strict schemas do not: bookings checks presence then calls `.slice` on unchecked types (93–144); contact regex-coerces the optional phone (16–22); menu does not enforce a body cap on its GET. Handled failures are JSON but no proof of stack-free responses for unexpected exceptions. Deno unavailable. |
| D40 | PASS | Method guards in orders, bookings and applications admit POST and preflight only. Public menu GET contains no customer records. |

## E. Admin panel

| No. | Status | Finding and evidence |
|---|---|---|
| E41 | PARTIAL | Current mocked Playwright verified sign-in and eight route headings across three widths. `audit/admin-browser.cjs:68–87` returns empty lists and a no-op subscription, so it does not prove real list rows, print slips, CV links, menu writes, CSV export or other actions despite their implementations. |
| E42 | PASS | Current mocks cover owner/staff/guest and show “Not authorised” for a non-admin (`admin/js/app.js:59–84`). 002/004 and 006 restrict managed Menu, Settings and Staff operations to owners. Public menu read is expected for every visitor. Embedded staff/owner tests verified guard behavior with the latest payment-status and timestamp exceptions. |
| E43 | PARTIAL | `admin/js/orders.js:3–9,40–48,93–126` contains the allowed next-state buttons, owner-visible payment update and insert subscription with audio. `admin/js/menu.js:23–30` and settings RLS protect the sample switch. The mock never emits a realtime event or checks audio/mutations. |
| E44 | PASS | Exact jsDelivr pin 2.49.4 (`admin/js/app.js:91`) was released 29 March 2025. Admin is separate and noindex (`admin/index.html:6,10`). `admin/js/ui.js:1–8` uses DOM append string arguments as text nodes, equivalently safe to textContent for user display, with no user-HTML sink identified. [Supabase release v2.49.4](https://github.com/supabase/supabase-js/releases/tag/v2.49.4) |
| E45 | PARTIAL | Admin and storefront database-facing field names checked against migrations match. Order date filters and dashboard use India time. Booking picker and display still use host-local `new Date(...).getDate()` and `formatDate` without an explicit timezone, plus a date validator with local midnight (`js/main.js:174–181,1692,1787–1790`); calendar labels can differ outside India. |

## F. Git and delivery

| No. | Status | Finding and evidence |
|---|---|---|
| F46 | PARTIAL | Audited feature HEAD matched the remote-tracking ref (0/0) and tree was clean. Feature reflog shows pushes and the recent groups have separate commits. Local `main` is already one older commit ahead of `origin/main` at audit start, so “main untouched” is not globally true. Local refs cannot prove the absence of every historical force-push or that every historical commit was exactly one task. |
| F47 | PARTIAL | No dependency directories, environment files or current Supabase temporary metadata tracked. Historical screenshots are tracked, including three binary signature matches described in B21. No secret was identified, but no comprehensive pixel/OCR or off-ref artifact audit was performed. The old screenshot harness also makes stale workflow assertions. |

## G. Documentation

| No. | Status | Finding and evidence |
|---|---|---|
| G48 | PARTIAL | Index and all 15 chapters exist, including Mermaid and the access matrix. Some details are stale: `docs/report/12-testing.md` describes older browser runs and omits the later staff/anon/reference cases. `docs/report/06-database.md` does not cover the practical history and timing gaps surfaced here. |
| G49 | PARTIAL | `node audit/check-report-coverage.cjs` passed for all 151 tracked files at audit start. This required report is a new tracked path and is absent from `docs/report/03-file-guide.md`. The checker therefore fails on that single path after staging/commit. The report-only rule prevents adding the row in this turn. |
| G50 | PASS | `README.md:3,13–22` links the report, lists built pieces and names unverified hosted systems. No production-ready claim. |
| G51 | PASS | `docs/SETUP_SUPABASE.md:5–145` has the numbered fresh/upgrade, seed, bucket, CLI/secret/deploy/delete, auth/owner, config and smoke sequence. Missing specific live checks are separately captured under G52. |
| G52 | **FAIL** | `docs/VERIFY_SUPABASE.md:5–99` covers catalog/counts, policies/buckets, roles/views, generators, dashboard and function listing. Its `anon_exec` query omits the five named trigger helpers despite listing the functions themselves. It lacks exact checks for configured origin secret and disabled signup, and the linked smoke guide has no staff order-total REST test. Positive PDF/admin/Realtime checks are partly manual. |
| G53 | PARTIAL | The five requested documents exist, mostly in `docs/`, with a root assumptions pointer. Current 12-key and ten-table inventory is consistent with source. Historical `docs/BACKEND_AUDIT.md` needs a clear supersession note, `docs/ASSUMPTIONS.md:7` describes a draft handoff no longer used by the active flow, and `REPORT_AUDIT.md` retains an old correction-count snapshot. |

## H. What only the operator can verify

All seven checks are **UNVERIFIED (LIVE)**. Run read-only checks on the intended project and requests that insert or modify data on a disposable project. A policy denial can be HTTP 401 or 403 with PostgreSQL `42501`; a revoked table grant may deny access before an RLS predicate runs. A 401-only assertion would be too narrow.

| No. | Status | Operator check and exact pointer |
|---|---|---|
| H.a | UNVERIFIED (LIVE) | Run the first and last SQL queries in `docs/VERIFY_SUPABASE.md:6–36`. Confirm RLS on each of the nine core/admin business tables **and** `submission_limits`, the tenth repo table, and sum the menu counts for 80 on a fresh seed. Actual live count may differ. |
| H.b | UNVERIFIED (LIVE) | Query `pg_policies` in `VERIFY_SUPABASE.md:10–13`; ensure no public/anon INSERT or ALL permits writes to the four tables. Use the exact anonymous GET and valid POST commands at `SETUP_SUPABASE.md:88–98`. |
| H.c | UNVERIFIED (LIVE) | Run bucket and policy SELECTs in `VERIFY_SUPABASE.md:10–16`; compare limits/MIME types and policy names/roles in the guide and database chapter. |
| H.d | UNVERIFIED (LIVE) | Run `has_function_privilege` checks in `VERIFY_SUPABASE.md:65–77`. Extend that predicate with `insert_order_status_history`, `update_updated_at_column`, `validate_order_status_transition`, `validate_booking_status_transition`, and `validate_application_status_transition` to check both roles deny them. The guide currently omits this extension. |
| H.e | UNVERIFIED (LIVE) | Run the exact function list command in `VERIFY_SUPABASE.md:95–97`; confirm the five endpoints and no old webhook. The guide needs a secret **names only** check and project Authentication signup-setting check. Follow the Dashboard guidance in `SETUP_SUPABASE.md:47–68` without logging key values. |
| H.f | UNVERIFIED (LIVE) | Run the role/count SELECT at `VERIFY_SUPABASE.md:30`; look for at least one owner. |
| H.g | UNVERIFIED (LIVE) | Use order/tampered-price commands and invalid CV signing commands at `SETUP_SUPABASE.md:99–124`. Follow the PDF smoke and owner/staff route instructions at 113,125, and staff settings PATCH at 129–145. Staff direct order-total PATCH and an exact Realtime test procedure are missing; live dashboard login and CV upload need a manual run. |

## Failures and gaps ranked by severity

1. **High · D39.** Malformed booking fields can escape as exceptions, with related type-coercion and error-contract gaps across public endpoints.
2. **High · G52.** The live runbook lacks explicit checks for all trigger helper grants, origin/signup configuration and staff order-total protection. Current live enforcement cannot be confirmed.
3. **Medium · D36/D37.** Order type/name validation and booking calendar-date validation are weaker than the strict request contract.
4. **Medium · E41/E43.** Admin mocks prove navigation, not the important operational actions, writes, export, print or Realtime/audio.
5. **Medium · A13.** Failure preserves the cart but omits the café phone and can expose parser errors to customers.
6. **Medium · A12.** The config says WhatsApp confirmation exists and unused customer modules fall back to the café landline for WhatsApp.
7. **Medium · C30/C33.** Booking and application history are absent; the order history assertion exists only in an ad hoc audit run.
8. **Medium · E45.** Booking labels and one date-validation path still use the browser's local timezone.
9. **Low · A5/A7.** Some contact touch targets are undersized; remote catalog images conflict with the original local-only visual rule.
10. **Low · G49.** Committing the requested report adds one tracked file not listed in the coverage guide. This audit may not edit that guide.

Additional partial items: C25 hosted parity, F46 historical branch/provenance limits, F47 evidence screening, and G48/G53 stale documentation.

## Not done at all

- Booking and application transition-history tables and write triggers. Both workflows do have transition validation.
- A café phone fallback in the checkout failure message.
- A tracked explicit assertion that order history still writes after trigger-function EXECUTE is revoked. A disposable in-memory audit assertion passed.
- Live verification commands covering all five trigger-function permissions, the signup/secret configuration checks, and staff REST denial for totals in the consolidated verification guide.
- Populated browser fixture tests for print slips, signed CV retrieval, CSV contents and an emitted order alert. Route tests already exist.

## Ready-to-paste fix prompt

```text
Work only on feat/admin-backend. Read VERIFICATION_REPORT.md and repository instructions. Fix the FAIL/PARTIAL items in this order. Use isolated fixtures; no live Supabase access or writes. Keep business facts sample/unconfirmed. Never print or commit secrets. Stage only relevant files and scan staged content for the six signature families cited in the report, without emitting their values, and reject environment and dependency files. Review any role-name matches. Use one commit per task and push each commit to origin feat/admin-backend. Never push main, rewrite history or force-push. If a push fails, keep local commits and report the exact retry command.

1. Edge validation (D36–D39). In supabase/functions/{orders,bookings,contact,menu,applications}/index.ts and _shared/http.ts, reject wrong types, invalid calendar dates, and empty sanitized required text. Standardize bounded bodies and generic errors on unexpected exceptions, with stable client-readable statuses. Keep authoritative menu pricing and booking locks. Add offline handler tests for invalid types and dates, the existing pricing snapshot cases, and failure responses. Don't claim hosted concurrency until tested.
2. Database and runbook (C25, C30, C33, G52). Add the missing booking/application status-history coverage using additive, replay-safe SQL with appropriate read/write permissions. Extend supabase/tests/behavior.sql to directly assert durable transition history inside its rollback, including order history after trigger EXECUTE revocation. Keep 12 public keys and document ten repo tables versus the earlier live inventory. In docs/VERIFY_SUPABASE.md and docs/SETUP_SUPABASE.md include exact expected privilege results for all named helpers, names-only origin secret and signup setting checks, staff session PATCH attempting a changed total on a disposable order and checking 42501, real PDF signing/upload, and realtime/manual steps. Test clean and upgrade paths in disposable environments; leave actual live equality UNVERIFIED unless the operator supplies evidence.
3. Storefront (A5, A7, A12, A13, E45). In js/main.js, js/support.js, contact.html and CSS, make customer controls meet 44 px, retain the cart and show a clickable configured café phone on failure, normalize non-JSON failures, and use explicit India date formatting throughout booking. Remove obsolete WhatsApp claims and fallback targets in data/config.json, js/app.js, and js/booking.js while preserving a clear distinction between historical tests and runtime. Reconcile the no-remote-image requirement with admin Storage images: keep repository-hosted defaults and do not silently claim local-only if the existing owner upload feature still supplies remote images. Verify at 360/768/1280 with isolated fixtures and an outside-India browser timezone.
4. Admin and QA (E41, E43, F47). Extend audit/admin-browser.cjs with populated fixture tests for order detail and print, payment, application signing, writes, CSV contents, emitted realtime event/audio toggle, and menu sample toggle. Refresh legacy audit/browser.cjs assertions for the current API. Explicitly block external routes in tests, fake config/auth and write new captures to temp. Review tracked screenshots for sensitive displayed content without logging values; retain only safe QA artifacts within the authorized scope and record any evidence limits.
5. Documentation and delivery (F46, G48–G49, G53). Add VERIFICATION_REPORT.md to docs/report/03-file-guide.md and rerun the coverage check after staging. Update README/report chapters, assumptions and historical-audit supersession markers to match the resulting test and permission behavior. Record local vs remote main provenance and push evidence without altering main, and distinguish static, mocked, embedded SQL, full local stack and hosted verification. Run Node checks, JSON/links, the offline DB and browser suites, coverage, and Deno checks when available. Update the audit with remaining real evidence gaps.
```
