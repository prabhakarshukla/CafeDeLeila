# Diagnose setup and request failures

## How it works

Start with the lowest failing layer. First confirm the page loads, then inspect the browser request status, then inspect the matching function or SQL policy. Avoid printing auth tokens and signed upload URLs.

| Symptom | Likely cause | Check or fix |
|---|---|---|
| Browser reports CORS | Origin is absent from the exact allowlist | Match the address bar's scheme, host and port. Confirm the secret and try the OPTIONS request. |
| Function responds 403 | Unapproved origin, ordering disabled or delivery disabled | Check `cors` and the relevant setting. An admin REST 403 instead points to authorization. |
| REST reports code 42501 | Requested table or row exceeds role permissions | Negative smoke tests expect this. For an allowed write, verify the role, column grant and policy. |
| Admin receives 401 | Session expired or browser config points to a different project | Check the URL and public key pair without printing them, then sign in again. |
| Admin says Not authorised | Missing `admin_users` row for the Auth UUID | Confirm the correct project and UUID, then add the intended role through the owner setup. |
| Settings PATCH returns 200 and [] | RLS filters the row for staff | The smoke test treats an empty response as denied. Owners should see the updated row when requesting representation. |
| Menu shows samples and checkout is disabled | API failed, categories are inactive or available DB rows are missing | Apply 006 and seed, check the menu response and flags, and confirm browser origin. |
| Item suddenly unavailable | Availability or category changed after loading | Refresh the catalog and replace the unavailable item. Orders validate current DB state. |
| CV upload fails | File metadata, size, path or token rejected | Use a dummy supported file under 2 MiB. Request a new signed URL if it expired, check storage bucket rules and finish the follow-up application POST. |
| Menu image fails at 5 MiB limit | The client or installed bucket is stale | Compare the current Menu module and bucket MIME and size rows. |
| Bookings report 409 | Slot expired or capacity reached | Choose a later slot and inspect booking capacity and India time. |
| 429 or 503 | Too many requests or unavailable settings/limiter | Wait briefly, then check function and database availability and installed 004 routines. |

## Where to look

`js/support.js` and the browser Network tab for client errors, `admin/js/app.js` for login, `supabase/functions/_shared/http.ts` for origin response headers, and [verification SQL](../VERIFY_SUPABASE.md) for policies and buckets.
