# Ten common problems at the café

## What this part does

When a ticket goes missing, check the window first, then the waiter, then the kitchen or guard. Keep private credentials and personal details out of screenshots.

## How it works, step by step

1. Open Developer Tools in your browser. The Network panel shows the address and status of each request. Find what failed without copying credentials.
2. Open the matching Edge Function in the Supabase Dashboard and check its logs. A log is a line of recorded activity. Match the time and the safe request ID from `http.ts` when available.
3. Use the notes below to pick the first specific check. On production, start with read-only checks.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `js/support.js` | Turns failed requests into messages a customer can act on. |
| `admin/js/app.js` | Shows sign-in and role errors. |
| `supabase/functions/_shared/http.ts` | Returns request status and, for unexpected errors, an ID. |
| `docs/VERIFY_SUPABASE.md` | Lists environments and safe verification steps. |

## What can go wrong and what to check

A working window and working waiters are separate checks. One can pass while another fails. Keep evidence of each.

## Try it yourself

Open the Network panel on a local or mock page and find one successful request.

## What to check by symptom

| Symptom | First check |
|---|---|
| 1. CORS error | Match the site address and port exactly against the allowed origins in `requestHandler`. |
| 2. Order returns 403 | The waiter checks ordering and delivery settings after origin checks. |
| 3. Office says Not authorised | `access` needs the right account and its matching `admin_users` row. |
| 4. Sign-in stops working | Sign out, retry, and check that the browser points to the intended project. |
| 5. Cart is visible but checkout is unavailable | `loadMenu` may be displaying the sample fallback because the catalog is unavailable. |
| 6. A dish vanished or changed price | Refresh the menu. The Orders waiter rechecks availability and price. |
| 7. Booking gets 409 | Pick a later listed slot. `reserve_booking` checks capacity under a lock. |
| 8. CV does not upload | Check PDF, DOC or DOCX, the size under 2 MiB, and whether the signed URL expired. |
| 9. Uploading a menu image fails | `editor` and the public menu bucket accept JPEG, PNG or WebP up to 5 MiB. |
| 10. Staff cannot edit settings or an order total | This is expected. The settings policy and `guard_staff_columns` block those changes. |
