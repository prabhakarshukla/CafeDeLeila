# File and folder guide

## How it works

The folders separate browser code, database and function source, documentation and evidence. Historical browser screenshots and archived SQL document earlier revisions. The current HTML entry points and migration directory identify what runs.

## Where to look

### Folders

| File or folder | Purpose | Used by | Depends on |
|---|---|---|---|
| `admin/` | Private admin UI assets | Admin browser | Supabase Auth and API |
| `admin/js/` | Admin page modules | Admin entry point | Supabase browser client |
| `assets/` | Public visual files | HTML and CSS | Local SVG |
| `audit/` | Runnable checks and historical evidence | Reviewers | Node, optionally Chrome/Python/embedded Postgres |
| `css/` | Static presentation styles | Six customer pages | Design tokens |
| `data/` | Public fallback catalog and settings | Storefront, admin, generator | JSON |
| `docs/` | Deployment, operator and historical docs | Contributors and operator | Project files and tests |
| `docs/report/` | Full report chapters | Report index | Source and evidence |
| `js/` | Storefront JavaScript | Main storefront HTML | Browser and Supabase |
| `supabase/` | Database and endpoint source | Supabase CLI and operator | PostgreSQL and managed services |
| `supabase/functions/` | Five HTTP handlers and shared code | Storefront | Supabase runtime |
| `supabase/functions/_shared/` | Common HTTP utility | All function handlers | Deno and browser-standard APIs |
| `supabase/functions/applications/` | Public applications HTTP endpoint files | Supabase CLI | Shared HTTP and Supabase |
| `supabase/functions/bookings/` | Public bookings HTTP endpoint files | Supabase CLI | Shared HTTP and Supabase |
| `supabase/functions/contact/` | Public contact HTTP endpoint files | Supabase CLI | Shared HTTP and Supabase |
| `supabase/functions/menu/` | Public menu HTTP endpoint files | Supabase CLI | Shared HTTP and Supabase |
| `supabase/functions/orders/` | Public orders HTTP endpoint files | Supabase CLI | Shared HTTP and Supabase |
| `supabase/legacy/` | Historical SQL only | Reviewers | Earlier project history |
| `supabase/migrations/` | Ordered deployable SQL | Operator and tests | PostgreSQL plus Supabase schemas |
| `supabase/seed/` | Sample catalog SQL | Operator and tests | Current categories |
| `supabase/tests/` | Manual rollback SQL | Local tests and operator | Database role and trigger setup |

### Tracked files

| File or folder | Purpose | Used by | Depends on |
|---|---|---|---|
| `.github/workflows/database-replay.yml` | Runs the database and handler replays on branch updates | GitHub Actions | Node 24 and PGlite |
| `.gitignore` | Git exclusion rules for local metadata and artifacts | Git add/status | Repository layout |
| `ASSUMPTIONS.md` | Pointer to current assumptions | Contributors | docs/ASSUMPTIONS.md |
| `CHANGELOG.md` | Change history | Contributors | Commit history |
| `PROJECT_REPORT.md` | Report index, status and corrections | Developers and café operator | docs/report/ and REPORT_AUDIT.md |
| `README.md` | Local entry point, setup and current evidence | Contributors | PROJECT_REPORT.md, docs/ |
| `REPORT_AUDIT.md` | Historical report baseline | Reviewers | Earlier source and test runs |
| `VERIFICATION_REPORT.md` | Current checklist results and hosted verification outstanding | Reviewers and operator | Source, local checks and verification guide |
| `admin/admin.css` | Admin layout, focus and print styles | admin/index.html | css/variables.css |
| `admin/icons/admin-192.png` | Small launcher icon from the café logo | Android launcher | Admin manifest |
| `admin/icons/admin-512.png` | Large launcher icon from the café logo | Android launcher | Admin manifest |
| `admin/icons/admin-apple.png` | Home screen icon from the café logo | Safari | Admin HTML |
| `admin/icons/admin-maskable.png` | Padded logo for cropped launcher shapes | Android launcher | Admin manifest |
| `admin/manifest.webmanifest` | Admin home-screen app details | Browsers | App icons |
| `admin/index.html` | Admin page, login form and navigation host | Browser at /admin/ | admin.css and admin/js/app.js |
| `admin/js/session-storage.mjs` | Chooses storage for admin sessions | Admin sign in | Browser storage |
| `admin/js/app.js` | Session and route guard | Admin app or modules | Supabase and admin UI modules |
| `admin/js/dashboard.js` | Dashboard RPC and metrics | Admin app or modules | Supabase and admin UI modules |
| `admin/js/menu.js` | Menu and image editing | Admin app or modules | Supabase and admin UI modules |
| `admin/js/orders.js` | Order filters, realtime, actions and print | Admin app or modules | Supabase and admin UI modules |
| `admin/js/requests.js` | Booking, CV and contact queues | Admin app or modules | Supabase and admin UI modules |
| `admin/js/settings.js` | Settings, staff and export | Admin app or modules | Supabase and admin UI modules |
| `admin/js/ui.js` | Shared controls and conditional updates | Admin app or modules | Supabase and admin UI modules |
| `assets/favicon.svg` | Browser tab icon | Root HTML pages | SVG |
| `assets/logo_delelia.svg` | Brand art | Site header markup | SVG |
| `assets/meal.svg` | Fallback illustration for menu dishes | Menu/home renderers | SVG |
| `audit/admin-session.cjs` | Checks session restoration and sign-out | Developers | Playwright and mock login |
| `audit/admin-browser.cjs` | Checks admin layouts, roles and populated workflows | Playwright | Chrome, mocked client, admin page |
| `audit/booking-timezone.cjs` | Compares booking behavior across browser timezones | Playwright | Chrome and the booking page |
| `audit/browser-results.json` | Historical browser flow outcomes | Historical audit | Corresponding command in audit/ |
| `audit/browser.cjs` | Storefront form, cart and layout tests | Playwright | Chrome, static files and intercepted requests |
| `audit/check-report-coverage.cjs` | Asserts one guide row per tracked file | Node and report review | Git index and this file |
| `audit/workflow-replay.cjs` | Tests actual Edge inserts and admin transitions against clean and legacy schemas | Node and database reviewers | PGlite, archived SQL and the shared workflow |
| `audit/db-replay.cjs` | Runs clean, repeat and simulated legacy SQL | Node and database reviewers | PGlite and Supabase SQL with platform stubs |
| `audit/generate-menu-seed.cjs` | Produces/verifies sample insert SQL | Node and database maintainers | data/menu.json |
| `audit/layout-results.json` | Historical viewport measurements | Historical audit | Corresponding command in audit/ |
| `audit/order-contract.cjs` | Checks HTTP, booking and order contracts with the actual handlers | Node and checkout reviewers | Node TS stripper and database stubs |
| `audit/server-check.cjs` | Checks HTTP response from local Python server | Node and frontend reviewers | Python, index.html and loopback |
| `audit/server-results.json` | Historical localhost HTTP result | Historical audit | Corresponding command in audit/ |
| `audit/static-results.json` | Historical static checks and contrast | Historical audit | Corresponding command in audit/ |
| `audit/static.cjs` | Checks static markup, data and contrast | Node and frontend reviewers | HTML, data, CSS and local links |
| `book-table.html` | Date, time and reservation form | Browser navigation | css/, js/main.js and js/support.js |
| `careers.html` | Application form and CV picker | Browser navigation | css/, js/main.js and js/support.js |
| `contact.html` | Message form and business details | Browser navigation | css/, js/main.js and js/support.js |
| `css/base.css` | Typography, reset and general form styles | Storefront HTML | Cascade and CSS design tokens |
| `css/components.css` | Shared components and chrome | Storefront HTML | Cascade and CSS design tokens |
| `css/pages.css` | Page layouts | Storefront HTML | Cascade and CSS design tokens |
| `css/refinements.css` | Responsive and accessibility improvements | Storefront HTML | Cascade and CSS design tokens |
| `css/variables.css` | Design tokens | Storefront HTML | Cascade and CSS design tokens |
| `data/config.json` | Public fallback settings and Supabase browser config | loadConfig and admin start | Site and Supabase project settings |
| `data/menu.json` | 80 sample dishes in 19 categories | loadMenu and SQL seed generator | assets/meal.svg and sample catalog |
| `docs/ADMIN_ACCESS.md` | Phone install and login guide | Café owner and staff | Admin site |
| `docs/ASSUMPTIONS.md` | Constraints and migration assumptions | Contributors and operator | Project source and audit history |
| `docs/AUDIT.md` | Prior storefront verification | Contributors and operator | Project source and audit history |
| `docs/BACKEND_AUDIT.md` | Prior admin and backend evidence | Contributors and operator | Project source and audit history |
| `docs/BACKEND_STATE.md` | Historical security/backend review | Contributors and operator | Project source and audit history |
| `docs/DEPLOY.md` | Static deployment and rate limit guidance | Contributors and operator | Project source and audit history |
| `docs/HANDOVER_STATE.md` | Earlier branch and inventory handover | Contributors and operator | Project source and audit history |
| `docs/PLAN.md` | Prior frontend work plan | Contributors and operator | Project source and audit history |
| `docs/PROJECT_REPORT.md` | Pointer to current report index | Contributors and operator | Project source and audit history |
| `docs/PROJECT_STATE.md` | Early frontend architecture and audit | Contributors and operator | Project source and audit history |
| `docs/SETUP_SUPABASE.md` | Numbered setup and smoke commands | Contributors and operator | Project source and audit history |
| `docs/TODO_FOR_OWNER.md` | Owner confirmation checklist | Contributors and operator | Project source and audit history |
| `docs/VERIFY_SUPABASE.md` | Hosted metadata queries, authorization probes and expected results | Contributors and operator | Project source and audit history |
| `docs/report/01-overview.md` | Reference chapter for overview | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/02-architecture.md` | Reference chapter for architecture | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/03-file-guide.md` | Reference chapter for file guide | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/04-frontend.md` | Reference chapter for frontend | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/05-flows.md` | Reference chapter for workflow | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/06-database.md` | Reference chapter for database | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/07-edge-functions.md` | Reference chapter for Edge Function contracts | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/08-admin-panel.md` | Reference chapter for admin | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/09-security.md` | Reference chapter for security | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/10-config-and-settings.md` | Reference chapter for configuration | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/11-setup-and-deploy.md` | Reference chapter for deployment | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/12-testing.md` | Reference chapter for testing | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/13-troubleshooting.md` | Reference chapter for troubleshooting | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/14-owner-and-demo.md` | Reference chapter for owner demonstration | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `docs/report/15-glossary-and-next.md` | Reference chapter for glossary and priorities | PROJECT_REPORT.md | Current implementation, SQL and tests |
| `index.html` | Home and featured dishes | Browser navigation | css/, js/main.js and js/support.js |
| `js/menu-image.mjs` | Validates menu image paths and project Storage URLs | Storefront and admin Menu | Browser URL parser |
| `js/workflow.mjs` | Shared status and payment values and available transitions | Admin, smoke runner and audit | Migration 007 |
| `js/main.js` | Active storefront orchestration and forms | Six storefront pages | js/support.js, data files and Edge routes |
| `js/support.js` | Public API, India dates, business fields and dialog helpers | js/main.js | Browser APIs, config and public settings view |
| `locations.html` | Address and map | Browser navigation | css/, js/main.js and js/support.js |
| `menu.html` | Search, category filters and menu | Browser navigation | css/, js/main.js and js/support.js |
| `scripts/evaluate-live-sql.mjs` | Compares an exported SQL report with the migration baseline | Operators | Node and expected-live-state.json |
| `scripts/expected-live-state.json` | Expected metadata from migration and seed replay | SQL evaluator | Current migrations and sample seed |
| `scripts/live-smoke.mjs` | Redacted production HTTP and optional owner fixture checks | Operators | Node 18+, project configuration, optional Realtime client |
| `scripts/live-sql-report.sql` | Single, read-only metadata and count export | Supabase SQL Editor | PostgreSQL catalogs |
| `scripts/live-staff-rls-test.sql` | Rollback-only staff permission checks | Supabase SQL Editor | Existing owner and application schema |
| `scripts/package.json` | Pins the optional Realtime dependency | npm | Node 18+ |
| `supabase/fixes/007_align_legacy_schema.sql` | Full SQL Editor copy of migration 007 | Supabase operator | 001–006 already applied |
| `supabase/config.toml` | Local project and five function entries | Supabase CLI | Function source directories |
| `supabase/functions/_shared/booking-rules.mjs` | Sample slots, advance limits and shared validation | Booking page and handler | Shared India calendar |
| `supabase/functions/_shared/http.ts` | Request wrapper, streamed JSON, response and rate limits | Public function handlers | Deno environment, request body and Web Crypto |
| `supabase/functions/_shared/india-date.mjs` | India date labels and calendar operations | Storefront, admin and bookings handler | Intl.DateTimeFormat |
| `supabase/functions/applications/.npmrc` | Per-function registry settings for applications | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/applications/deno.json` | Per-function Deno import configuration for applications | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/applications/index.ts` | HTTP handler for applications | Customer browser requests | Shared HTTP helper, Supabase database or Storage |
| `supabase/functions/bookings/.npmrc` | Per-function registry settings for bookings | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/bookings/deno.json` | Per-function Deno import configuration for bookings | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/bookings/index.ts` | HTTP handler for bookings | Customer browser requests | Shared HTTP helper, Supabase database or Storage |
| `supabase/functions/contact/index.ts` | HTTP handler for contact | Customer browser requests | Shared HTTP helper, Supabase database or Storage |
| `supabase/functions/menu/.npmrc` | Per-function registry settings for menu | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/menu/deno.json` | Per-function Deno import configuration for menu | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/menu/index.ts` | HTTP handler for menu | Customer browser requests | Shared HTTP helper, Supabase database or Storage |
| `supabase/functions/orders/.npmrc` | Per-function registry settings for orders | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/orders/deno.json` | Per-function Deno import configuration for orders | Supabase CLI bundler | Registered function configuration |
| `supabase/functions/orders/index.ts` | HTTP handler for orders | Customer browser requests | Shared HTTP helper, Supabase database or Storage |
| `supabase/legacy/005_original_checks.txt` | Archived earlier SQL checks, retained as text | Historical review | Earlier schema |
| `supabase/legacy/README.md` | Labels legacy files as historical | Operators | Active setup docs |
| `supabase/legacy/supabase-schema.sql` | Old schema retained for comparison | Historical review only | Early Supabase shape |
| `supabase/migrations/001_core_schema.sql` | Core tables, menu defaults, RLS and numbers | SQL Editor and embedded replay | Earlier migrations and platform schemas |
| `supabase/migrations/002_admin_settings.sql` | Roles and 12 settings | SQL Editor and embedded replay | Earlier migrations and platform schemas |
| `supabase/migrations/003_order_status_history.sql` | Status transition and history triggers | SQL Editor and embedded replay | Earlier migrations and platform schemas |
| `supabase/migrations/004_admin_rls_storage_realtime.sql` | Access grants, buckets, dashboard, limiter and booking lock | SQL Editor and embedded replay | Earlier migrations and platform schemas |
| `supabase/migrations/006_cleanup_legacy.sql` | Legacy policy cleanup, bucket convergence and complete numbers | SQL Editor and embedded replay | Earlier migrations and platform schemas |
| `supabase/migrations/007_align_legacy_schema.sql` | Aligns legacy constraints, defaults, reference sequences and workflow triggers | SQL Editor and embedded replay | Earlier migrations |
| `supabase/seed/menu_items.sql` | Generated, repeatable sample catalog inserts | Operator SQL Editor and replay test | 006 category slugs and data/menu.json |
| `vercel.json` | Sends /staff to the admin | Vercel | Admin route |
| `supabase/tests/behavior.sql` | Rollback role, transition and reference assertions | Embedded replay or disposable SQL Editor | Migrations, auth.users stub or service |
