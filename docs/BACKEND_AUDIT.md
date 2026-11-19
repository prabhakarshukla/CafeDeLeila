# Backend audit

PASS indicates the scope stated in the evidence column. Real Supabase integration remains unverified. No hosted database, function, Auth or Storage operation was run.

| Task | Verdict | Evidence |
|---|---|---|
| Step 0 | PASS | HANDOVER_STATE.md records starting branch, inventory and initial dispositions before edits. |
| T-A | PASS | PROJECT_REPORT.md corrections and README; checked catalog and SQL counts. |
| T-B | UNVERIFIED | Code and migration fixes below. Node syntax pass; clean database application and RLS tests pending. |
| T5 | PASS | Mocked Auth accepts owner and staff, rejects a non-admin, and dashboard renders mock RPC data. Actual Auth/RPC unverified. |
| T6 | UNVERIFIED | Search, tabs, dates, pagination, buttons, payment, print and alerts are implemented in admin/js/orders.js. Layout pass with mocked data; mutations and Realtime unverified. |
| T7 | UNVERIFIED | Owner catalog forms, visibility, sorting, sample switch and upload validation in admin/js/menu.js. Layout pass; database and upload unverified. |
| T8 | UNVERIFIED | Three queues, valid transitions and 60-second CV signing in admin/js/requests.js. Layout pass; live mutations and Storage unverified. |
| T9 | UNVERIFIED | Owner settings, export and role management in admin/js/settings.js; public settings in js/support.js. Staff direct hash guard passed with mock. Database permissions, CSV with live rows and storefront persistence unverified. |
| T10 | PASS | README, project report, numbered Supabase setup, deployment and owner checklist updated. Instructions require a new project. |
| T11 | PASS | This matrix, syntax checks, localhost checks and 27 screenshots. GitHub CLI missing; use compare URL. |

| Issue | Verdict | Evidence |
|---|---|---|
| 1 | PASS | Shared origin allowlist reads only the custom secret and rejects unlisted browser origins. |
| 2 | PASS | Static URL/key live in data/config.json. Current docs contain no build-time Supabase variable instructions. |
| 3 | PASS | Setup configures only the custom origin secret. Built-in credentials are injected. |
| 4 | UNVERIFIED | Old file archived. supabase/tests/behavior.sql uses role switching, assertions and rollback. Not executed. |
| 5 | PASS | Legacy schema moved to supabase/legacy with do-not-run note. |
| 6 | UNVERIFIED | public_settings overrides sample flag in js/support.js. Static fallback retains sample labels and prevents order submission. Live override unverified. |
| 7 | UNVERIFIED | 004 sets bucket privacy, PDF/DOC/DOCX and 2 MB at SQL level. Storage enforcement unverified. |
| 8 | UNVERIFIED | 004 implements shared applications/contact counters. Other routes use instance-level counters, documented in DEPLOY.md. Proxy behaviour and quotas unverified. |
| 9 | PASS | Stale function configuration removed; setup documents deletion on old projects. Deployed state unverified. |
| 10 | PASS | History check below. Scope is locally reachable commits. |
| 11 | PASS | Readiness claims replaced by test limits and implementation status. |
| 12 | PASS | 10 application tables, 3 sequences, 5 views, 25 policies (20 application, 5 Storage). |
| 13 | UNVERIFIED | Repeated history policy removed; practical replay guards added. Local database toolchain unavailable. |
| 14 | PASS | One commit per requested task on feat/admin-backend. See git log for commits. |

## Checks and remaining proof

- Playwright with installed Chrome, browser routing and mocked Supabase client. 27 screenshots across sign-in and eight admin pages at 360, 768 and 1280 px. No horizontal overflow or page errors. Covered owner, staff and guest route access. The first test runs caught an array passed directly to replaceChildren. Spreading its nodes fixed the navigation.
- Node syntax checks covered the browser JavaScript and Edge TypeScript syntax. JSON/catalog/static asset checks passed. Type checking and Deno tests were unavailable. Python served the storefront, admin and admin module with HTTP 200 on localhost.
- Docker and Deno unavailable. Supabase CLI invocation encountered a filesystem permission error writing telemetry. No clean database apply, rollback SQL test or hosted smoke test ran. No GitHub CLI on PATH.
- Removed obsolete public read branches from private write endpoints. They had used privileged database access. The deployed state is unknown. If any of those versions are already deployed, check access logs and replace those functions on the intended project.
- The reachable history at handover contains no tracked environment files or dependency directories. The .env.local history command returned no commits. Full-history text search for the five requested signatures found only two example payment-key prefixes in PROJECT_REPORT.md at 6372e1a. Without binary filtering the same signatures also matched three PNG screenshot blobs, repeated across commits. The tracked Supabase CLI metadata contained a pooler URL with no password. Public publishable keys appeared in configuration and historical docs/HTML. No actual private credential was identified in the audited history, so this evidence does not call for rotation. Unreachable or remote-only history was outside the check.
- Hosted RLS, concurrent slot booking, Auth/session behavior, pricing, CV signing, Realtime and admin writes must still pass the setup smoke test. Static HTTP and mock browser checks cannot verify them.
