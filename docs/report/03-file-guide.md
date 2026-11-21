# Every file and folder

## What this part does

The café separates the window, the manager's office, the waiters, the records, and the practice tools. This page tells you which piece each tracked path belongs to.

## How it works, step by step

1. Use the folder table to find the part of the café you want to change.
2. Find the exact file in the next table and open it from the repository.
3. Run `node audit/check-report-coverage.cjs` after adding or renaming a file. The checker uses Git's tracked file list.

## Which files are involved


### Folders

| File or folder | What it does | Who uses it | If you remove it |
|---|---|---|---|
| `.github/` | GitHub project automation files. | GitHub | Branch checks would stop running. |
| `.github/workflows/` | Instructions for automatic branch tests. | GitHub Actions | Pushes would no longer run the database replay. |
| `admin/` | Private admin UI assets | Admin browser | The files for this part of the café would be missing. |
| `admin/icons/` | Logo pictures for the office shortcut. | Android and iPhone launchers | The launcher would lose its café icon. |
| `admin/js/` | Admin page modules | Admin entry point | The files for this part of the café would be missing. |
| `assets/` | Public visual files | HTML and CSS | The files for this part of the café would be missing. |
| `audit/` | Runnable checks and historical evidence | Reviewers | The files for this part of the café would be missing. |
| `css/` | Static presentation styles | Six customer pages | The files for this part of the café would be missing. |
| `data/` | Public fallback catalog and settings | Storefront, admin, generator | The files for this part of the café would be missing. |
| `docs/` | Deployment, operator and historical docs | Contributors and operator | The files for this part of the café would be missing. |
| `docs/report/` | Full report chapters | Report index | The files for this part of the café would be missing. |
| `js/` | Storefront JavaScript | Main storefront HTML | The files for this part of the café would be missing. |
| `scripts/` | Commands and SQL for checking a Supabase project. | Operator | The prepared live verification commands would be missing. |
| `supabase/` | Database and endpoint source | Supabase CLI and operator | The files for this part of the café would be missing. |
| `supabase/fixes/` | Ready-to-paste copies of database repairs. | Operator | The SQL Editor copy of a repair would be missing. |
| `supabase/functions/` | Five HTTP handlers and shared code | Storefront | The files for this part of the café would be missing. |
| `supabase/functions/_shared/` | Common HTTP utility | All function handlers | The files for this part of the café would be missing. |
| `supabase/functions/applications/` | Public applications HTTP endpoint files | Supabase CLI | The files for this part of the café would be missing. |
| `supabase/functions/bookings/` | Public bookings HTTP endpoint files | Supabase CLI | The files for this part of the café would be missing. |
| `supabase/functions/contact/` | Public contact HTTP endpoint files | Supabase CLI | The files for this part of the café would be missing. |
| `supabase/functions/menu/` | Public menu HTTP endpoint files | Supabase CLI | The files for this part of the café would be missing. |
| `supabase/functions/orders/` | Public orders HTTP endpoint files | Supabase CLI | The files for this part of the café would be missing. |
| `supabase/legacy/` | Historical SQL only | Reviewers | The files for this part of the café would be missing. |
| `supabase/migrations/` | Ordered deployable SQL | Operator and tests | The files for this part of the café would be missing. |
| `supabase/seed/` | Sample catalog SQL | Operator and tests | The files for this part of the café would be missing. |
| `supabase/tests/` | Manual rollback SQL | Local tests and operator | The files for this part of the café would be missing. |

### Files

| File or folder | What it does | Who uses it | If you remove it |
|---|---|---|---|
| `.github/workflows/database-replay.yml` | Runs the database and handler replays on branch updates | GitHub Actions | The project tool using this configuration or data would lose it. |
| `.gitignore` | Git exclusion rules for local metadata and artifacts | Git add/status | Local credentials, dependencies or audit output could be staged by mistake. |
| `ASSUMPTIONS.md` | Pointer to current assumptions | Contributors | The instructions or evidence described in this row would be lost. |
| `CHANGELOG.md` | Change history | Contributors | The instructions or evidence described in this row would be lost. |
| `PROJECT_REPORT.md` | Report index, status and corrections | Developers and café operator | The instructions or evidence described in this row would be lost. |
| `README.md` | Local entry point, setup and current evidence | Contributors | The instructions or evidence described in this row would be lost. |
| `REPORT_AUDIT.md` | Historical report baseline | Reviewers | The instructions or evidence described in this row would be lost. |
| `VERIFICATION_REPORT.md` | Current checklist results and hosted verification outstanding | Reviewers and operator | The instructions or evidence described in this row would be lost. |
| `admin/admin.css` | Admin layout, focus and print styles | admin/index.html | The affected pages would lose part of their layout or styling. |
| `admin/icons/admin-192.png` | Small launcher icon from the café logo | Android launcher | This picture would fail to load where it is used. |
| `admin/icons/admin-512.png` | Large launcher icon from the café logo | Android launcher | This picture would fail to load where it is used. |
| `admin/icons/admin-apple.png` | Home screen icon from the café logo | Safari | This picture would fail to load where it is used. |
| `admin/icons/admin-maskable.png` | Padded logo for cropped launcher shapes | Android launcher | This picture would fail to load where it is used. |
| `admin/index.html` | Admin page, login form and navigation host | Browser at /admin/ | The browser could no longer open this page from the current files. |
| `admin/js/app.js` | Session and route guard | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/dashboard.js` | Dashboard RPC and metrics | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/menu.js` | Menu and image editing | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/orders.js` | Order filters, realtime, actions and print | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/requests.js` | Booking, CV and contact queues | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/session-storage.mjs` | Chooses storage for admin sessions | Admin sign in | The relevant browser or audit action would stop working. |
| `admin/js/settings.js` | Settings, staff and export | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/js/ui.js` | Shared controls and conditional updates | Admin app or modules | The relevant browser or audit action would stop working. |
| `admin/manifest.webmanifest` | Admin home-screen app details | Browsers | Browsers would lose the admin shortcut name, icon list and start address. |
| `assets/favicon.svg` | Browser tab icon | Root HTML pages | This picture would fail to load where it is used. |
| `assets/logo_delelia.svg` | Brand art | Site header markup | This picture would fail to load where it is used. |
| `assets/meal.svg` | Fallback illustration for menu dishes | Menu/home renderers | This picture would fail to load where it is used. |
| `audit/admin-browser.cjs` | Checks admin layouts, roles and populated workflows | Playwright | You would lose this check, its setup or its evidence. |
| `audit/admin-session.cjs` | Checks session restoration and sign-out | Developers | You would lose this check, its setup or its evidence. |
| `audit/booking-timezone.cjs` | Compares booking behavior across browser timezones | Playwright | You would lose this check, its setup or its evidence. |
| `audit/browser-results.json` | Historical browser flow outcomes | Historical audit | You would lose this check, its setup or its evidence. |
| `audit/browser.cjs` | Storefront form, cart and layout tests | Playwright | You would lose this check, its setup or its evidence. |
| `audit/check-report-coverage.cjs` | Asserts one guide row per tracked file | Node and report review | You would lose this check, its setup or its evidence. |
| `audit/db-replay.cjs` | Runs clean, repeat and simulated legacy SQL | Node and database reviewers | You would lose this check, its setup or its evidence. |
| `audit/generate-menu-seed.cjs` | Produces/verifies sample insert SQL | Node and database maintainers | You would lose this check, its setup or its evidence. |
| `audit/layout-results.json` | Historical viewport measurements | Historical audit | You would lose this check, its setup or its evidence. |
| `audit/mobile.cjs` | Measures phone layouts and speed in Chrome | Developers | You would lose this check, its setup or its evidence. |
| `audit/order-contract.cjs` | Checks HTTP, booking and order contracts with the actual handlers | Node and checkout reviewers | You would lose this check, its setup or its evidence. |
| `audit/server-check.cjs` | Checks HTTP response from local Python server | Node and frontend reviewers | You would lose this check, its setup or its evidence. |
| `audit/server-results.json` | Historical localhost HTTP result | Historical audit | You would lose this check, its setup or its evidence. |
| `audit/static-results.json` | Historical static checks and contrast | Historical audit | You would lose this check, its setup or its evidence. |
| `audit/static.cjs` | Checks static markup, data and contrast | Node and frontend reviewers | You would lose this check, its setup or its evidence. |
| `audit/workflow-replay.cjs` | Tests actual Edge inserts and admin transitions against clean and legacy schemas | Node and database reviewers | You would lose this check, its setup or its evidence. |
| `book-table.html` | Date, time and reservation form | Browser navigation | The browser could no longer open this page from the current files. |
| `careers.html` | Application form and CV picker | Browser navigation | The browser could no longer open this page from the current files. |
| `contact.html` | Message form and business details | Browser navigation | The browser could no longer open this page from the current files. |
| `css/base.css` | Typography, reset and general form styles | Storefront HTML | The affected pages would lose part of their layout or styling. |
| `css/components.css` | Shared components and chrome | Storefront HTML | The affected pages would lose part of their layout or styling. |
| `css/pages.css` | Page layouts | Storefront HTML | The affected pages would lose part of their layout or styling. |
| `css/refinements.css` | Responsive and accessibility improvements | Storefront HTML | The affected pages would lose part of their layout or styling. |
| `css/variables.css` | Design tokens | Storefront HTML | The affected pages would lose part of their layout or styling. |
| `data/config.json` | Public fallback settings and Supabase browser config | loadConfig and admin start | The browser would lose its public project and café settings. |
| `data/menu.json` | 80 sample dishes in 19 categories | loadMenu and SQL seed generator | The phone could not show sample dishes when the online menu is unavailable. |
| `docs/ADMIN_ACCESS.md` | Phone install and login guide | Café owner and staff | The instructions or evidence described in this row would be lost. |
| `docs/ASSUMPTIONS.md` | Constraints and migration assumptions | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/AUDIT.md` | Prior storefront verification | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/BACKEND_AUDIT.md` | Prior admin and backend evidence | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/BACKEND_STATE.md` | Historical security/backend review | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/DEPLOY.md` | Static deployment and rate limit guidance | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/HANDOVER_STATE.md` | Earlier branch and inventory handover | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/MOBILE_AUDIT.md` | Records phone test evidence and manual checks | Owner and developers | The instructions or evidence described in this row would be lost. |
| `docs/PLAN.md` | Prior frontend work plan | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/PROJECT_REPORT.md` | Pointer to current report index | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/PROJECT_STATE.md` | Early frontend architecture and audit | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/SETUP_SUPABASE.md` | Numbered setup and smoke commands | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/START-HERE.md` | Reading paths for the owner, student and developer. | New readers | You would lose the suggested reading order. |
| `docs/TODO_FOR_OWNER.md` | Owner confirmation checklist | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/VERIFY_SUPABASE.md` | Hosted metadata queries, authorization probes and expected results | Contributors and operator | The instructions or evidence described in this row would be lost. |
| `docs/report/01-overview.md` | Reference chapter for overview | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/02-architecture.md` | Reference chapter for architecture | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/03-file-guide.md` | Reference chapter for file guide | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/04-frontend.md` | Reference chapter for frontend | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/05-flows.md` | Reference chapter for workflow | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/06-database.md` | Reference chapter for database | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/07-edge-functions.md` | Reference chapter for Edge Function contracts | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/08-admin-panel.md` | Reference chapter for admin | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/09-security.md` | Reference chapter for security | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/10-config-and-settings.md` | Reference chapter for configuration | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/11-setup-and-deploy.md` | Reference chapter for deployment | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/12-testing.md` | Reference chapter for testing | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/13-troubleshooting.md` | Reference chapter for troubleshooting | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/14-owner-and-demo.md` | Reference chapter for owner demonstration | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/15-glossary-and-next.md` | Reference chapter for glossary and priorities | PROJECT_REPORT.md | The instructions or evidence described in this row would be lost. |
| `docs/report/16-sample-and-real.md` | Explains which data is practice and which has been checked. | Students and owner | Readers could mistake sample prices for approved prices. |
| `docs/report/17-status.md` | Lists what has been built and what needs proof. | Owner and reviewers | Readers would lose the short status summary. |
| `docs/report/glossary.md` | Explains technical words with examples from the café. | Students | The beginner definitions would be missing. |
| `docs/report/quiz.md` | Provides twenty questions and answers. | Students and teachers | The self-check would be missing. |
| `index.html` | Home and featured dishes | Browser navigation | The browser could no longer open this page from the current files. |
| `js/main.js` | Active storefront orchestration and forms | Six storefront pages | The relevant browser or audit action would stop working. |
| `js/menu-image.mjs` | Validates menu image paths and project Storage URLs | Storefront and admin Menu | The relevant browser or audit action would stop working. |
| `js/support.js` | Public API, India dates, business fields and dialog helpers | js/main.js | The relevant browser or audit action would stop working. |
| `js/workflow.mjs` | Shared status and payment values and available transitions | Admin, smoke runner and audit | The relevant browser or audit action would stop working. |
| `locations.html` | Address and map | Browser navigation | The browser could no longer open this page from the current files. |
| `menu.html` | Search, category filters and menu | Browser navigation | The browser could no longer open this page from the current files. |
| `package-lock.json` | Records exact audit library versions | npm ci | npm ci would have no saved versions to install. |
| `package.json` | Adds laptop audit commands and the pinned browser test library | Developers | The npm mobile audit command and dependency pin would be missing. |
| `scripts/evaluate-live-sql.mjs` | Compares an exported SQL report with the migration baseline | Operators | You would lose this check, its setup or its evidence. |
| `scripts/expected-live-state.json` | Expected metadata from migration and seed replay | SQL evaluator | You would lose this check, its setup or its evidence. |
| `scripts/live-smoke.mjs` | Redacted production HTTP and optional owner fixture checks | Operators | You would lose this check, its setup or its evidence. |
| `scripts/live-sql-report.sql` | Single, read-only metadata and count export | Supabase SQL Editor | You would lose this check, its setup or its evidence. |
| `scripts/live-staff-rls-test.sql` | Rollback-only staff permission checks | Supabase SQL Editor | You would lose this check, its setup or its evidence. |
| `scripts/package.json` | Pins the optional Realtime dependency | npm | You would lose this check, its setup or its evidence. |
| `supabase/config.toml` | Local project and five function entries | Supabase CLI | The project tool using this configuration or data would lose it. |
| `supabase/fixes/007_align_legacy_schema.sql` | Full SQL Editor copy of migration 007 | Supabase operator | The project tool using this configuration or data would lose it. |
| `supabase/functions/_shared/booking-rules.mjs` | Sample slots, advance limits and shared validation | Booking page and handler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/_shared/http.ts` | Request wrapper, streamed JSON, response and rate limits | Public function handlers | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/_shared/india-date.mjs` | India date labels and calendar operations | Storefront, admin and bookings handler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/applications/.npmrc` | Per-function registry settings for applications | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/applications/deno.json` | Per-function Deno import configuration for applications | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/applications/index.ts` | HTTP handler for applications | Customer browser requests | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/bookings/.npmrc` | Per-function registry settings for bookings | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/bookings/deno.json` | Per-function Deno import configuration for bookings | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/bookings/index.ts` | HTTP handler for bookings | Customer browser requests | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/contact/index.ts` | HTTP handler for contact | Customer browser requests | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/menu/.npmrc` | Per-function registry settings for menu | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/menu/deno.json` | Per-function Deno import configuration for menu | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/menu/index.ts` | HTTP handler for menu | Customer browser requests | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/orders/.npmrc` | Per-function registry settings for orders | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/orders/deno.json` | Per-function Deno import configuration for orders | Supabase CLI bundler | The relevant waiter could not build or handle its requests as described. |
| `supabase/functions/orders/index.ts` | HTTP handler for orders | Customer browser requests | The relevant waiter could not build or handle its requests as described. |
| `supabase/legacy/005_original_checks.txt` | Archived earlier SQL checks, retained as text | Historical review | The reference for earlier database versions would be lost. |
| `supabase/legacy/README.md` | Labels legacy files as historical | Operators | The reference for earlier database versions would be lost. |
| `supabase/legacy/supabase-schema.sql` | Old schema retained for comparison | Historical review only | The reference for earlier database versions would be lost. |
| `supabase/migrations/001_core_schema.sql` | Core tables, menu defaults, RLS and numbers | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/migrations/002_admin_settings.sql` | Roles and 12 settings | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/migrations/003_order_status_history.sql` | Status transition and history triggers | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/migrations/004_admin_rls_storage_realtime.sql` | Access grants, buckets, dashboard, limiter and booking lock | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/migrations/006_cleanup_legacy.sql` | Legacy policy cleanup, bucket convergence and complete numbers | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/migrations/007_align_legacy_schema.sql` | Aligns legacy constraints, defaults, reference sequences and workflow triggers | SQL Editor and embedded replay | A new or older kitchen could miss the database changes from this step. |
| `supabase/seed/menu_items.sql` | Generated, repeatable sample catalog inserts | Operator SQL Editor and replay test | The project tool using this configuration or data would lose it. |
| `supabase/tests/behavior.sql` | Rollback role, transition and reference assertions | Embedded replay or disposable SQL Editor | You would lose this check, its setup or its evidence. |
| `vercel.json` | Sends /staff to the admin | Vercel | The short /staff address would lose its redirect. |

## What can go wrong and what to check

The archive shows old rules. Use the current migration and the verification report when they differ. Terms are explained in the [glossary](glossary.md).

## Try it yourself

Find the waiter for orders and the CSS file that sets the sand colour. Read what each file does before you open it.
