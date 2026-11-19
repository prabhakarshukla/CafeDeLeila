# Glossary and priorities

## How it works

Use this list when a term appears in the report.

| Term | Meaning in this project |
|---|---|
| CORS | Browser policy for a request crossing site origins. Functions compare origins against an allowlist. |
| Edge Function | HTTP handler hosted by Supabase. It validates requests and performs reserved writes. |
| JWT | Signed session token carrying identity and lifetime. Auth supplies it for logged-in admin queries. |
| PostgREST | Service exposing PostgreSQL relations and callable routines over HTTP. Database privileges still apply. |
| RLS | PostgreSQL row-level security. Policies govern which rows callers may read or modify. |
| Realtime | Database change delivery to subscribers. Orders uses it to alert the admin page to inserts. |
| Sequence | A counter in PostgreSQL. Numbering hooks use it to avoid duplicate references. |
| Signed URL | Limited permission for an object operation. Storage uses it to allow a CV upload or download without making the bucket public. |
| Trigger | A hook that fires on a row event. It creates references, timestamps and history or enforces status transitions. |
| UUID | A database ID with 128 bits. Menu responses, cart lines and order lookups share the same ID. |
| RPC | A remotely callable database function. The dashboard uses one to fetch several metrics in one response. |

### In order

1. Apply the setup to a fresh disposable project and run the full acceptance checklist with real Auth, Storage and Realtime.
2. Confirm the owner's menu, prices, contact details, times, VAT or tax treatment, delivery terms and privacy handling. Seed only the sample catalog until approved.
3. Verify guarded operations under concurrency, add retention for discarded CV uploads, improve abuse monitoring and document rollback for release.
4. Consider payments and verified notifications after the order workflow and provider requirements are agreed.

## Where to look

[Architecture](02-architecture.md), [database](06-database.md), [Edge contracts](07-edge-functions.md), [security](09-security.md), and [testing](12-testing.md).
