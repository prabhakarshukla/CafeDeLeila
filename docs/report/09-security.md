# Security controls and limits

## How it works

| Risk | Control in source | Remaining evidence |
|---|---|---|
| Public access to customer records | RLS policies in 001–004 and legacy cleanup in 006; no GET on write functions | Embedded PostgreSQL checks pass for anon order read/write. Run hosted REST check. |
| Customer changes item prices | Orders maps DB UUIDs to current `price_inr` and ignores client cost fields | Mock order handler tests pass. Hosted order receipt pending. |
| Staff changes settings or grants access | Owner-only settings and admin_users policies plus owner route restrictions | Embedded SQL proves staff settings update is denied or affects no rows. Hosted session and REST verification pending. |
| Staff edits totals, line items, customer details or payment IDs | Migration 006 runs `guard_staff_columns` before other update triggers. Order status and payment status are allowed. | Embedded rollback tests cover allowed staff status and payment changes, blocked protected fields, and owner edits. Hosted REST remains unverified. |
| Unwanted public file writes | 006 drops legacy upload policies and limits MIME/size at bucket level; CV writes use a signed path | Actual Storage enforcement and file inspection remain unverified. MIME and extension checks alone cannot detect malicious document contents. |
| Browser from unapproved origin | Exact origin allowlist; server still validates data; machine clients can omit Origin | Origin filtering is not authentication or a general abuse controls system. |
| Burst submissions | Per-instance limit for orders/bookings/menu, database limits for applications/contact | Proxy IP selection and shared NAT behavior need hosted checks. |
| Booking capacity oversell | Transaction lock in `reserve_booking` | SQL compiles and replays locally. Concurrent arrival tests on Supabase remain open. |
| Admin UI injection | Admin `el` builds content with DOM text nodes; CSV escapes field separators and formula prefixes | Broader storefront and browser security review remains open. |
| Secret in source | Browser config uses only project URL and publishable key. CLI metadata and environment files are ignored | No current private config key identified. Do not copy credentials, sessions or signed URLs into tickets. |

### Known weak spots

There is no payment gateway, abuse challenge, message deduplication or automated file-retention job. A CV upload can be left behind if the follow-up request fails. Review permissions after adding policies on the hosted project because permissive policies can combine. The audit did not query the hosted project.

## Where to look

`supabase/migrations/004_admin_rls_storage_realtime.sql`, `006_cleanup_legacy.sql`, `supabase/functions/_shared/http.ts`, `orders/index.ts`, `applications/index.ts`, `admin/js/ui.js` and `admin/js/settings.js`. Verification details are in [the audit](../../REPORT_AUDIT.md).
