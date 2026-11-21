# The waiters that handle requests

## What this part does

An Edge Function is a small program the browser calls over the internet. These waiters check what the phone sends before the kitchen keeps a record.

## How it works, step by step

1. `requestHandler` in `supabase/functions/_shared/http.ts` checks the request method, origin and size. CORS is a browser rule about which websites may read responses. The allowed website addresses are listed in `ALLOWED_ORIGINS`.
2. The Menu waiter returns available items from active categories. It accepts a category, vegetarian choice or search term.
3. The Orders waiter accepts item IDs and quantities. It reads price, tax and delivery rules from the kitchen records before saving a pending, unpaid order.
4. The Bookings waiter checks the India date, guest count and listed times. `reserve_booking` in migration 004 checks the space left for that slot inside the database.
5. The Applications waiter checks file type and size and returns a signed URL. This is a temporary link that gives permission to upload or open one file. It checks uploaded files exist before saving the application.
6. The Contact waiter checks the sender and message. Applications and contact use `allow_submission` from migration 004, which counts recent requests and rejects too many.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `supabase/functions/_shared/http.ts` | Reads each request safely and formats errors. |
| `supabase/functions/menu/index.ts` | Returns the dishes and categories. |
| `supabase/functions/orders/index.ts` | Recalculates prices and writes an order. |
| `supabase/functions/bookings/index.ts` | Checks names, dates and guests before reserving a slot. |
| `supabase/functions/applications/index.ts` | Checks files and records a job application. |
| `supabase/functions/contact/index.ts` | Checks and saves contact messages. |

## What can go wrong and what to check

HTTP status is the short number that describes a response. A 400 means the request needs a correction. A 403 can mean the site address or requested option is disabled. A 409 can mean the slot is full. A 429 means slow down. A 500 can include a request ID you can match in the function logs. A body over 64 KiB receives 413; a CV can be up to 2 MiB and uploads separately.

## Try it yourself

Read the status checks in `requestHandler`. Run `node audit/order-contract.cjs` on Node 24 to watch the local practice version check invalid requests.

## Limits for the waiters

The Orders waiter accepts 1–50 distinct dishes and 1–50 of each. It accepts optional notes up to 500 characters. The Bookings waiter accepts 1–20 guests and listed time slots within 60 days of the India date, with at least 30 minutes of notice.

Orders and Bookings allow 30 requests per minute per running function instance. Menu allows 60. Contact and Applications use the shared database limit of 10 per minute per endpoint and visitor. Requesting an upload link and completing the application count as separate calls. This behavior comes from `rateLimiter` in `http.ts` and `allow_submission` in migration 004.

| Example request | What comes back after success |
|---|---|
| Ask Menu for vegetarian dishes | `{items, categories}` with prices and item IDs. |
| Ask Orders for two portions of one known dish | A `CDL-` reference, saved lines and a server-calculated total. |
| Ask Bookings for two seats at a listed time | A `BK-` reference and pending status. |
| Ask Applications to upload a dummy PDF | A temporary link and a file path. Finishing the application returns an `APP-` reference. |
| Send a short message to Contact | `{received: true}`. |
