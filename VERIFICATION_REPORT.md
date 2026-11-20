# Café De Leila verification report

Follow-up to the read-only audit at `0d011ee`. F1–F11 were applied on `feat/admin-backend` with a separate commit and push per task. Verdicts reflect the latest source and local test evidence. [Project assumptions](ASSUMPTIONS.md)

## Summary

| Section | PASS | FAIL | PARTIAL | UNVERIFIED |
|---|---:|---:|---:|---:|
| A. Frontend and content | 16 | 0 | 0 | 0 |
| B. Config and secrets | 6 | 0 | 0 | 0 |
| C. Database | 11 | 0 | 1 | 0 |
| D. Edge Functions | 6 | 0 | 0 | 0 |
| E. Admin panel | 5 | 0 | 0 | 0 |
| F. Git and delivery | 1 | 0 | 1 | 0 |
| G. Documentation | 6 | 0 | 0 | 0 |
| H. Live Supabase | 0 | 2 | 1 | 4 |
| **Total** | **51** | **2** | **3** | **4** |

A PASS applies to the source or runtime named in the evidence. F6 defines history for orders only. F8 allows this project's public Storage images alongside local images.

## Local evidence

- `node audit/static.cjs` passed page markup, labels, local assets, sample catalog and color contrast.
- `node audit/order-contract.cjs`, `node audit/db-replay.cjs` and `node audit/generate-menu-seed.cjs --check` passed. The PostgreSQL runtime was embedded with test Auth, Storage and Realtime relations.
- `node audit/browser.cjs`, `node audit/admin-browser.cjs` and `node audit/booking-timezone.cjs` passed with isolated Playwright fixtures. The storefront and admin suites created 18 and 27 temporary captures, respectively.
- `node audit/check-report-coverage.cjs` passed for all tracked files. Each commit was screened for the six requested signature families before pushing.
- Deno and Docker are unavailable. `deno check`, `deno test`, a full local Supabase stack, Vercel deployment, and the remaining hosted flows are unverified. The live checks used public GET and OPTIONS plus read-only CLI listings. See section H for the results.

## A. Frontend and content

| No. | Status | Finding and evidence |
|---|---|---|
| A1 | PASS | `css/variables.css:7–25` defines both named colors and the derived screen palette. The current static WCAG luminance check produced 15.98, 14.10, 8.42, 5.36 and 6.08 for the tested text pairs. Admin print uses black and white intentionally (`admin/admin.css:34–35`). |
| A2 | PASS | All six HTML entry points exist and rendered in the current Playwright run. |
| A3 | PASS | Footer contains contact and business details (`renderFooter` in `js/main.js`), with no contact strip above nav. Contact and Locations also show details in their own page content. The 360 px layout passed. |
| A4 | PASS | Both hero CTAs ended at y=417 in the 360×640 browser run. |
| A5 | PASS | `node audit/browser.cjs` passed all 18 layouts and measured the Contact form controls and links at 44 × 44 px or larger. An additional fixture sweep across the six rendered pages found 16 px body text and measured available buttons, links and form controls at each width. Skip links are shown on focus. |
| A6 | PASS | Current static suite passed title, description, viewport, icon, lang, one h1, labels, skip links and asset checks on six public pages. Image alt appears in static and rendered markup (`index.html:37,95`, `js/main.js:962–965,1200–1203`). Focus and reduced-motion rules in `css/refinements.css:8,130`. |
| A7 | PASS | `js/menu-image.mjs` allows local image paths and the configured project's public Storage image URLs under the current F8 requirement. `audit/admin-browser.cjs` proves the menu manager rejects external URLs and saves both allowed forms. `audit/browser.cjs` proves external images fall back to local art and are never requested. Admin scripts use the pinned client and attach events programmatically. |
| A8 | PASS | `audit/browser.cjs` exercises dish add, quantity, reload, notes, retry and clearing the cart after a successful order. `loadCart`, `getCartSubtotal` and the storage try/catch helpers in `js/main.js` cover restored items, subtotal and storage errors. |
| A9 | PASS | The mock menu rendered and `loadMenu` has local fallback (`js/main.js:483–502`). The current static catalog check passed exact category names, including Soups, and the generator matched the 19-category SQL source. No targeted misspellings in current catalog data. |
| A10 | PASS | All 80 local JSON items carry `_sample`. The generated SQL is labeled SAMPLE DATA ONLY and `loadPublicSettings` and `renderMenuSampleBanner` use `menu_is_sample` with fallback. The original offline check observed the banner hidden when the live fixture flag was false. |
| A11 | PASS | Booking, careers and contact validate browser input in `js/main.js`. `audit/booking-timezone.cjs` checks India calendar rules. `audit/browser.cjs` submits all three fixture forms and rejects invalid and oversized CVs. The actual hosted writes are H.g. |
| A12 | PASS | `verifiedWhatsAppUrl` in `js/support.js` requires `whatsappVerified === true` and exactly 12 digits starting with 91. `audit/browser.cjs` covers unset, malformed, unverified and verified values. The link is optional contact in the footer. The code submits through the API and the eight unreferenced storefront modules were removed. |
| A13 | PASS | `showFormFailure` in `js/support.js` displays the configured café phone as a clickable link. `audit/browser.cjs` checks non-JSON failures for checkout, booking and contact, a network failure during CV upload, preserved cart/notes and a successful retry without client-supplied prices. |
| A14 | PASS | Config labels hours, address conflict, tax/fee and prices as unconfirmed or sample (`data/config.json:18,26–29,58–62`). SQL has unverified hours, a TODO address note and configurable rates (`002_admin_settings.sql:116–128`). The online settings note is less specific than the fallback conflict wording. |
| A15 | PASS | Historical audit mentions the disputed reports as checks or denials (`docs/BACKEND_STATE.md:144–145`). No current UI or tracked document was found asserting the four allegations as fact. |
| A16 | PASS | `apiRequest` and the checkout submit handler in `js/main.js` POST only order inputs. The public read handlers serve the menu and public settings. No active customer order lookup uses a removed GET endpoint. |

## B. Config and secrets

| No. | Status | Finding and evidence |
|---|---|---|
| B17 | PASS | A redacted structural check of `data/config.json` returned `publicConfig: true, onlyPublicFields: true`. No private key field or token shape was found. Nothing proves validity of the hosted key. |
| B18 | PASS | A tracked-file regex sweep for the specified build-variable prefix returned no hits. Static entry points use no build pipeline. |
| B19 | PASS | `docs/SETUP_SUPABASE.md:47–59` sets only the custom origin secret and explains injected runtime credentials. No current actionable setup instruction sets the reserved prefix. |
| B20 | PASS | `git ls-files -- '.env*' supabase/.temp '*node_modules*'` returned empty. `git check-ignore --no-index` matched .env, .env.production and a supabase/.temp path. |
| B21 | PASS | Searched all 23 revisions reachable at audit start, with match values suppressed. The exact match census and rotation assessment follow this table. |
| B22 | PASS | `requestHandler` in `supabase/functions/_shared/http.ts` reads the exact comma-separated `ALLOWED_ORIGINS` list. `audit/order-contract.cjs` tests allowed and disallowed preflights against all five handlers. |

### Historical redacted census at the read-only audit baseline

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
| C25 | PARTIAL | No listed legacy policy is created by 001 or 004. Clean and simulated upgrade replay passed. Actual equality with the user-edited live database is unproven until the SQL export is evaluated. |
| C26 | PASS | `006_cleanup_legacy.sql:124–139,232` declares stable SECURITY DEFINER SQL with empty search_path and qualified `public.admin_users` and `auth.uid()`, granting EXECUTE to anon and authenticated. Current rollback exercised helper access and membership checks. |
| C27 | PASS | `006_cleanup_legacy.sql:163–200` guards four BEFORE UPDATE triggers. Allowed fields are `status`, order `payment_status`, and `updated_at` where defined; NULL UID and owner bypass the guard. `behavior.sql:113–182` confirms permitted status/payment and forbidden protected changes, plus owner edits. |
| C28 | PASS | `002_admin_settings.sql:91–129` declares the 12-key view and matching seed; `006_cleanup_legacy.sql:63–76` backfills the same keys. Replay returned 12 rows in both settings and public_settings, and current docs did not assert 13. |
| C29 | PASS | `001_core_schema.sql:168–219` and 006 use three sequences, Asia/Kolkata date and untruncated suffixes. `behavior.sql:3–25,184–194` verified all three triggers as service role and 1,100 order references without collisions. |
| C30 | PASS | Per F6, migration 003 validates all three workflows and persists status history for orders only. `supabase/tests/behavior.sql` checks one `pending` to `confirmed` history row with the affected order ID and staff actor. |
| C31 | PASS | Repository setup adds both publication tables (`004_admin_rls_storage_realtime.sql:141–154`), allows public images, admin CV reads and removes ordinary CV upload policies (004:107–137 and 006:10–34). Runtime event delivery and hosted object access are H checks. |
| C32 | PASS | Generator check confirmed 80 sample-marked rows from JSON across 19 categories. A replay preserved an edited price. Deterministic SQL IDs map to catalog response IDs and order lookup; local slugs only serve the offline UI (`seed/menu_items.sql:1–10,91–96`, `js/support.js:140–149`, `orders/index.ts:125–136`). |
| C33 | PASS | `node audit/db-replay.cjs` ran the tracked `BEGIN/ROLLBACK` behavior test against clean and legacy-replay databases. It proved the order history trigger executes during a staff update after direct EXECUTE is revoked and that a payment-only update adds no history row. Sequence counters can advance despite row rollback. |
| C34 | PASS | `supabase/legacy/supabase-schema.sql` is outside migrations and `supabase/legacy/README.md` says not to run it. |

## D. Edge Functions

| No. | Status | Finding and evidence |
|---|---|---|
| D35 | PASS | All five function entrypoints exist and `supabase/config.toml` configures them. No Razorpay/WhatsApp webhook entrypoint remains. |
| D36 | PASS | `node audit/order-contract.cjs` rejects malformed UUIDs, duplicate or unavailable items, string and out-of-range quantities, invalid order types, names outside 2–80 characters after cleanup and notes over 500 characters. The authoritative catalog produces persisted snapshots and totals despite client price tampering. |
| D37 | PASS | `node audit/order-contract.cjs` rejects impossible dates, past and too-far dates at the India-day boundary, unlisted slots and invalid guest values before calling `reserve_booking`. Migration 004 retains its transactional slot lock. Hosted concurrency is unverified. |
| D38 | PASS | `applications/index.ts` validates filename, MIME and size, signs a private object path, and checks object existence before creating the application. Migration 006 sets matching bucket limits. The storefront test drives a mock signing, PUT and form submit. Hosted object validation is H.g. |
| D39 | PASS | `node audit/order-contract.cjs` runs the shared wrapper on all five routes with real Request/Response objects. It checks 405, CORS, 400 `invalid_json` (including arrays), 400 field messages, 413 for streamed oversize POSTs, and a generic 500 with request ID and no raw exception. Deno runtime checks remain unverified. |
| D40 | PASS | `requestHandler` allows POST/preflight for write routes and GET/preflight for menu. The local contract test checks method denial on each route. The public menu GET queries only catalog relations. |

## E. Admin panel

| No. | Status | Finding and evidence |
|---|---|---|
| E41 | PASS | `node audit/admin-browser.cjs` passed 27 captures and populated order, menu, application and settings workflows. It verifies persisted mock mutations, print visibility and private-field hiding, CSV contents and CV signing parameters. Hosted storage and writes remain H.g. |
| E42 | PASS | Current mocks cover owner/staff/guest and show “Not authorised” for a non-admin (`admin/js/app.js:59–84`). 002/004 and 006 restrict managed Menu, Settings and Staff operations to owners. Public menu read is expected for every visitor. Embedded staff/owner tests verified guard behavior with the latest payment-status and timestamp exceptions. |
| E43 | PASS | The populated admin test changes status and payment, checks next actions, opens and mutes the audio alert while emitting mock INSERT events, and confirms menu sample approval. Authenticated backend delivery and actual audio output need the hosted/manual check. |
| E44 | PASS | Exact jsDelivr pin 2.49.4 (`admin/js/app.js:91`) was released 29 March 2025. Admin is separate and noindex (`admin/index.html:6,10`). `admin/js/ui.js:1–8` uses DOM append string arguments as text nodes, equivalently safe to textContent for user display, with no user-HTML sink identified. [Supabase release v2.49.4](https://github.com/supabase/supabase-js/releases/tag/v2.49.4) |
| E45 | PASS | The previous schema identifier check found no mismatch. `india-date.mjs` serves storefront booking, Edge booking validation, and admin labels and filters. `node audit/booking-timezone.cjs` reproduced identical labels and validation with Los Angeles and Kolkata browser timezones across the India midnight boundary. |

## F. Git and delivery

| No. | Status | Finding and evidence |
|---|---|---|
| F46 | PARTIAL | F1–F11 are separate commits on `feat/admin-backend` with a normal push after each and per-commit staged signature scans. Local `main` already had `326abc8` ahead of `origin/main` at `ac0cc8d` and both refs were preserved. Repo evidence cannot certify older force-push history or how prior work was grouped. |
| F47 | PASS | Retired 46 generated browser captures from the tracked tree in F10. Current browser suites write fixture screenshots to temporary directories and intercept every request. Git tracks no dependencies, environment files or Supabase CLI temp metadata. Prior captures remain in history, with the evidence limitations below. |

## G. Documentation

| No. | Status | Finding and evidence |
|---|---|---|
| G48 | PASS | `PROJECT_REPORT.md` indexes 15 chapters. The frontend, workflows, database, Edge contracts, deployment and testing chapters now describe the current checks, history scope and unverified hosted work. |
| G49 | PASS | `node audit/check-report-coverage.cjs` checks every tracked path against the file guide. The guide includes this report and the production verification scripts. |
| G50 | PASS | `README.md` links this report, describes the handler and browser fixtures and identifies unverified hosted systems. |
| G51 | PASS | `docs/SETUP_SUPABASE.md` retains the numbered migration, seed, bucket, CLI, origin, sign-up, owner and smoke setup. The final step links the longer verification checklist. |
| G52 | PASS | `docs/VERIFY_SUPABASE.md` has read-only SQL for views and both roles' function grants, RLS, buckets and publication, plus PowerShell for exact origin preflights, public signup refusal, anonymous POST denial on all four tables, and staff status, total and settings updates. The hosted smoke section covers real alert delivery and points to the order and CV tests. All PowerShell blocks parsed locally. |
| G53 | PASS | Deployment, owner checklist, backend audit, changelog and assumptions documents are present. The current docs keep the 12-key, ten-table inventory and distinguish historical audits from current findings. Root `ASSUMPTIONS.md` records the implementation and scope decisions. |

## H. What only the operator can verify

Live HTTP and CLI checks ran on 20 November 2026. The production Auth settings endpoint responded HTTP 200 with `disable_signup: false`. The menu endpoint responded HTTP 200 with 18 active categories, including Soups, and zero available items. All five function slugs were deployed, the retired webhook was absent, all 15 CORS preflights matched the expected status and headers, and all 12 public settings keys were present. No fixture writes, signup attempts, deployments, or changes to Auth settings occurred.

| No. | Status | Operator check and exact pointer |
|---|---|---|
| H.a | FAIL (LIVE) | Public catalog returned 18 active categories and zero available items, with Soups present. Exact SQL counts, the underlying availability flags, and RLS inventory still need the SQL export. |
| H.b | PARTIAL (LIVE) | Anonymous GET returned HTTP 200 and an empty array on orders, bookings, applications and contact messages. Policy and INSERT grants need the SQL export. The direct REST POST denial probes require a disposable project. |
| H.c | UNVERIFIED (LIVE) | Run the Storage policy and bucket SQL at the top of `docs/VERIFY_SUPABASE.md`. Compare public flags, upload policies, MIME types and byte limits to the listed expected values. |
| H.d | UNVERIFIED (LIVE) | Run **Check staff guards and dashboard privileges** in `docs/VERIFY_SUPABASE.md`. Compare anon and authenticated EXECUTE and SELECT flags to the expected results for the trigger helpers, generators, stats views, dashboard RPC and role helpers. |
| H.e | FAIL (LIVE) | Public signup remains enabled according to Auth settings. CLI confirmed all five functions, no webhook, and the origin secret name. All allowed and disallowed preflight checks passed. |
| H.f | UNVERIFIED (LIVE) | Run the role/count query in `docs/VERIFY_SUPABASE.md`. The target must have at least one owner. |
| H.g | UNVERIFIED (LIVE) | Use the staff rollback script and the interactive owner smoke script in `docs/VERIFY_SUPABASE.md`. Order and booking fixtures require confirmed owner cleanup access. The production CV and contact writes cannot meet the current cleanup requirement. |

The live SQL evaluator passed all 95 baseline checks locally and detected injected permission and catalog drift. The staff rollback script passed 13 checks in embedded PostgreSQL and restored the owner role, fixture counts, and order sequence state.

## Remaining partial and unverified checks

- C25 remains partial until the operator compares the target schema and policies with the migrations. Local clean and upgrade replays passed.
- F46 remains partial for historical Git provenance. The pre-existing local main divergence is documented above.
- Disable public signup in the Supabase Dashboard. Run the metadata export and staff rollback test locally in the project SQL Editor. Compare production policies and catalog counts with the migration baseline. Use the owner smoke script in a terminal you control. Keep CV and contact write probes on a disposable project with matching settings. [Supabase verification guide](docs/VERIFY_SUPABASE.md)
