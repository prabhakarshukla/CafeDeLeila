# What was tested

## How it works

Run checks from the repository root. Keep all destructive or write tests pointed at disposable systems.

| Check | Command and coverage | Evidence status |
|---|---|---|
| Static storefront | `node audit/static.cjs` validates page tags, assets, labels, the JSON catalog and palette contrast | PASS. Prints results without writing the tracked historical snapshot. |
| Storefront browser suite | `node audit/browser.cjs` captures six pages at three widths and checks cart persistence, all four form successes and failures, verified WhatsApp contact, safe image fallback and 44 px contact controls | PASS with all requests intercepted. Screenshots go to a temporary directory. |
| Local HTTP server | `node audit/server-check.cjs` starts Python and checks the storefront HTTP response | Historical result in server-results.json. The prior admin turn verified both storefront and admin routes separately. |
| Admin browser suite | `node audit/admin-browser.cjs` runs 27 captures, owner/staff/guest navigation, order status/payment, print visibility, Realtime callback/audio toggle, menu create/edit and sample status, CSV contents, and the CV signing call | PASS with populated mocks. Hosted authentication, writes, Storage signing and Realtime delivery still need a disposable Supabase run. The OS print dialog and real audio output are outside the browser fixture. |
| Generator | `node audit/generate-menu-seed.cjs --check` compares the SQL seed with menu JSON | PASS. 80 items and 19 category mappings. |
| Edge handlers | `node audit/order-contract.cjs` loads all five actual handlers with database stubs | PASS method and origin checks, invalid JSON, oversized bodies, field validation, generic error shape, India date boundaries and server pricing. Node 24 or compatible TypeScript transformation support required. |
| Browser calendar | `node audit/booking-timezone.cjs` compares date labels and validity in Los Angeles and Kolkata | PASS under a fixed instant spanning two different local calendar days. |
| Embedded Postgres | Install `@electric-sql/pglite@0.3.15` into a temp prefix and point `NODE_PATH` at that package directory, then `node audit/db-replay.cjs` | PASS clean apply, reapply, simulated legacy repair, repeated seed, edited-price preservation and rollback SQL. Stubbed Auth and Storage schemas, so uses real PostgreSQL semantics with no Supabase service processes. |
| SQL behavior | Run `supabase/tests/behavior.sql` on a disposable DB as the SQL Editor role | PASS inside embedded suite. Asserts anonymous read/write isolation, staff settings denial, invalid/valid status, order-history writes after trigger EXECUTE revocation, and unique order numbers across 1,100 writes. Sequence counters can advance despite rollback. |
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

[Current audit](../../VERIFICATION_REPORT.md), [prior backend audit](../BACKEND_AUDIT.md), `audit/`, `supabase/tests/behavior.sql` and [smoke-test commands](../SETUP_SUPABASE.md#9-run-the-smoke-tests).
