# How the security guard checks the list

## What this part does

The manager's office and café storeroom hold private records. The supabase roles and database rules check each action, even if someone tries to work around a hidden button.

## How it works, step by step

1. Sign-in gives the browser a session. A JWT is a signed message that can describe who signed in and when that proof expires. `admin/js/app.js` uses the sign-in library and checks the matching role.
2. RLS means Row Level Security. Migration 004 makes the guard check whether the caller can see or change each row. `guard_staff_columns` in 006 lets staff update permitted status fields and blocks changes to protected details.
3. The waiters validate their input. `requestHandler` checks method, content size and CORS. CORS controls which websites can read browser responses. It does not stop someone calling the API outside a browser.
4. The privileged backend keys live in Supabase. The browser has a publishable key, and policies still decide which records it can access.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `supabase/migrations/004_admin_rls_storage_realtime.sql` | Sets the rules for each role and for files. |
| `supabase/migrations/006_cleanup_legacy.sql` | Takes away old public permissions and protects staff-only edits. |
| `supabase/functions/_shared/http.ts` | Rejects oversized and unsuitable requests. |
| `supabase/functions/orders/index.ts` | Gets trusted prices from the database. |
| `admin/js/ui.js` | Uses element and text creation for dynamic values. |

## What can go wrong and what to check

Hosted abuse resistance, real browser data exposure, device security and long-term monitoring are UNVERIFIED. Rate limits reduce repeat traffic but can also affect customers sharing a connection. Signed links stay sensitive until they expire. Only payment status is recorded here.

## Try it yourself

In a mock order test, look at the made-up price sent by the browser. Then compare it with the saved subtotal.

## Ten things the café plans for

| Risk | Guard or waiter |
|---|---|
| A customer supplies a false price | Orders reads the price again from `menu_items`. |
| A customer orders a hidden dish | Orders checks active categories and available items. |
| A stranger reads an order | Migration 004 requires the admin role to read its row. |
| A stranger writes straight into an orders table | Migration 006 revokes browser INSERT access on the private queues. |
| Staff edit a price or customer details on an existing order | `guard_staff_columns` blocks the update. |
| A large request uses too much memory | `readJson` stops beyond 64 KiB. |
| Repeated contact spam | `allow_submission` counts requests to Contact and Applications. |
| A harmful or oversized CV is uploaded | Applications and the private bucket check allowed types and size. Malware scanning is UNVERIFIED. |
| Somebody shares a password, private key or link | Private credentials stay server-side. Signed links expire. Leaked credentials still require action by the owner. |
| A displayed name contains HTML | Admin `el` displays values as text. Storefront templates use `escapeHtml` where they display customer text. |
