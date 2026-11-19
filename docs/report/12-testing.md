# What was tested

## How it works

Run checks from the repository root. Keep all destructive or write tests pointed at disposable systems.

| Check | Command and coverage | Evidence status |
|---|---|---|
| Static storefront | `node audit/static.cjs` validates page tags, assets, labels, the JSON catalog and palette contrast | Run on a previous revision. Syntax and JSON rerun separately. Its assumptions about an unconfigured demo can become stale. |
| Historical browser suite | `node audit/browser.cjs` uses Playwright and Chrome to capture viewport layouts and exercise cart and form behavior via request routing | Historical screenshots and JSON. Checkout expectations predate the current backend. Do not run it against a configured hosted endpoint. |
| Local HTTP server | `node audit/server-check.cjs` starts Python and checks the storefront HTTP response | Historical result in server-results.json. The prior admin turn verified both storefront and admin routes separately. |
| Admin browser suite | `node audit/admin-browser.cjs` routes to a mocked Supabase client, signs in as owner/staff/guest and records three widths | Prior 27 screenshots prove routed screens and role navigation only. |
| Generator | `node audit/generate-menu-seed.cjs --check` compares the SQL seed with menu JSON | PASS. 80 items and 19 category mappings. |
| Order handler | `node audit/order-contract.cjs` loads the actual handler with database and network stubs | PASS unknown/unavailable UUID, duplicates, quantity, disabled ordering, and server subtotal/tax/total. Node 24 or compatible type-stripping support required. |
| Embedded Postgres | Install `@electric-sql/pglite@0.3.15` into a temp prefix and point `NODE_PATH` at that package directory, then `node audit/db-replay.cjs` | PASS clean apply, reapply, simulated legacy repair, repeated seed, edited-price preservation and rollback SQL. Stubbed Auth and Storage schemas, so uses real PostgreSQL semantics with no Supabase service processes. |
| SQL behavior | Run `supabase/tests/behavior.sql` on a disposable DB as the SQL Editor role | PASS inside embedded suite. Asserts anonymous read/write isolation, staff settings denial, invalid/valid status and unique order numbers across 1,100 writes. Sequence counters can advance despite rollback. |
| JS and TS syntax | `node --check` per module | PASS across source. Node syntax is not a Deno type or dependency check. |
| Report completeness | `node audit/check-report-coverage.cjs` | Compares all tracked paths against the guide rows. |

### Operator checklist

- Confirm the requested migrations and sample count, buckets and policies.
- Check anon GET returns an empty order list and a valid POST fails authorization.
- Order two items and tamper with the client price. Confirm the stored subtotal uses the DB price.
- Apply with a dummy PDF. Check invalid extensions and oversized data are rejected.
- Sign in as owner and staff. Check staff Settings and Staff routes and direct REST denial.
- Confirm booking, contact, status changes, print and new-order alert on the test project.

Actual Supabase gateway, Auth credentials, Storage, Realtime and Vercel deployments remain UNVERIFIED. Docker and Deno were unavailable. The embedded suite does not exercise concurrent HTTP arrivals.

## Where to look

[Current audit](../../REPORT_AUDIT.md), [prior backend audit](../BACKEND_AUDIT.md), `audit/`, `supabase/tests/behavior.sql` and [smoke-test commands](../SETUP_SUPABASE.md#9-run-the-smoke-tests).
