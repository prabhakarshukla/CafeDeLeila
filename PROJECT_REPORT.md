# Café De Leila project report

The storefront, owner tools and database source are in this branch. The report distinguishes what exists in code from what has been verified on a running service.

| Area | Status | Evidence |
|---|---|---|
| Static storefront and menu | Built | Six pages, filters, fallback and 80 sample dishes. |
| Admin panel | Built | Eight routes. Prior browser tests use mocked sessions. |
| Schema, cleanup and seed | Built | Clean and repeat applies passed in embedded PostgreSQL with Supabase schema stubs. |
| Customer requests and admin queues | Partly | Handlers and UI exist. Order pricing and database behavior have local proof. Hosted journeys are pending. |
| Live Auth, Storage, Realtime and Gateway | UNVERIFIED | Setup smoke tests remain for the operator. |
| Final café content | Partly | Sample catalog, hours, address, fees, tax and WhatsApp need owner approval. |
| Online payment and automated notifications | Not built | The admin panel records payment status manually. |

## How it works

Read the overview for the café workflow, then use the architecture chapter to follow a browser request. Use the reference chapters when changing code or checking the database.

## Where to look

1. [Overview](docs/report/01-overview.md)
2. [Architecture](docs/report/02-architecture.md)
3. [Tracked file and folder guide](docs/report/03-file-guide.md)
4. [Frontend code](docs/report/04-frontend.md)
5. [Customer and operator flows](docs/report/05-flows.md)
6. [Database reference](docs/report/06-database.md)
7. [Edge Function contracts](docs/report/07-edge-functions.md)
8. [Admin panel](docs/report/08-admin-panel.md)
9. [Security](docs/report/09-security.md)
10. [Configuration and settings](docs/report/10-config-and-settings.md)
11. [Setup and deployment](docs/report/11-setup-and-deploy.md)
12. [Testing](docs/report/12-testing.md)
13. [Troubleshooting](docs/report/13-troubleshooting.md)
14. [Owner demonstration](docs/report/14-owner-and-demo.md)
15. [Glossary and next work](docs/report/15-glossary-and-next.md)

[Current claim and setup audit](REPORT_AUDIT.md) · [Operator setup](docs/SETUP_SUPABASE.md) · [Read-only verification](docs/VERIFY_SUPABASE.md)

## Corrections made

1. The checkout now has a generated sample database catalog in addition to the 80-item JSON fallback. A hosted empty catalog remains an operator-reported starting state.
2. The SQL catalog uses 19 category slugs, including separate Main Course and Chinese entries. Existing Chinese IDs survive a rename where possible.
3. The expected settings count is 12. No undocumented thirteenth key was added.
4. The applied order is 001–004 then 006, and the sample seed is separate. There is no deployable 005.
5. Recorded distinct proof for embedded SQL, stubbed order-handler tests, historical mock browser runs and unverified hosted services.
6. Removed the obsolete UUID extension dependency from migration 003 so fresh SQL can apply.
7. Documented the cleanup of legacy public insert and upload policies and the current full policy inventory.
8. Corrected the image bucket limit and matching admin check to 5 MiB. CV and OG retain 2 MiB.
9. Confirmed the storefront submits UUIDs and quantities only and the server applies integer rupee prices and the owner ordering switch.
10. The featured home panel now handles database UUIDs, and saved-cart bounds match the order handler.
11. Order, booking and application references keep all digits after 999. Embedded SQL crossed the boundary for order numbers.
12. Confirmed that the browser config already contains a public-format URL and publishable key without exposing them. Local CLI metadata was removed from tracking and ignore rules fixed.
13. Updated links to the moved historical audits and owner checklist. The latest audit lives beside this report.
14. Separated operator-reported Vercel and database state from locally verified code and data.
