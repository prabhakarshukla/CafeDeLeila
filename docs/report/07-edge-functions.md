# Edge Function contracts

## How it works

| Route and source | Request | Success response |
|---|---|---|
| GET menu, `menu/index.ts` | Optional `category` slug, `veg=true/false`, `search` text | 200 JSON `{items,categories}`. Items contain `id`, `category_id`, `price_inr` and catalog fields including joined category information. |
| POST orders, `orders/index.ts` | `customer_name`, `customer_phone`, optional `customer_email`, `order_type`, `items:[{id,quantity}]`, optional `notes`, `delivery_address:{full}` for delivery | 200 order row with `order_number`, persisted item snapshots, `subtotal_inr`, `delivery_fee_inr`, `tax_inr` and `total_inr`. |
| POST bookings, `bookings/index.ts` | `customer_name`, `customer_phone`, optional `customer_email`, `booking_date`, `booking_time`, `guests`, optional `special_requests` | 200 booking row with `booking_number` and status. |
| POST applications/get-upload-url, `applications/index.ts` | `fileName`, `contentType`, `fileSize` bytes | 200 `{signedUrl,path}` for a private CV object. |
| POST applications, same handler | `full_name`, `email`, `phone`, `role`, optional `address`, `cv_path` | 200 `job_applications` row with `application_number` and `cv_url` path. |
| POST contact, `contact/index.ts` | `name`, `email`, `subject`, `message`, optional `phone` | 201 `{received:true}`. |

1. Menu filters active categories and available items through a category join, applies optional search and orders by display order.
2. Orders checks 1–50 distinct UUID lines, quantities 1–50, a sanitized name of 2–80 characters, phone, optional email, order type and delivery address. Optional notes are capped at 500 characters. It rejects unknown IDs, unavailable items and inactive categories. It reads integer rupee prices and the ordering/delivery settings, then applies the delivery minimum and rounds tax to whole rupees. The server inserts status pending and payment unpaid. PostgreSQL generates the reference.
3. Bookings checks contact fields, real calendar dates within 60 days in India, a configured slot at least 30 minutes ahead, and an integer guest count from 1 to 20. `reserve_booking` applies the Asia/Kolkata time guard and serializes same-slot inserts before writing.
4. Applications checks file name extension, MIME and declared size up to 2 MiB. It signs a generated path. On submit it checks text fields, email, phone and the uploaded object's existence. Storage also checks allowed type and actual upload size.
5. Contact bounds the name to 100 characters, email to 254, subject to 120 and message to 2,000. Phone if given must be a 10-digit Indian mobile.

The shared `requestHandler` reads `ALLOWED_ORIGINS`. Unknown origins receive 403. Allowed browser preflights receive 204. Unsupported methods receive 405. A POST body over 64 KiB receives 413. Malformed JSON or a non-object body receives 400 with `invalid_json`. Field validation returns 400 with `invalid_fields` and a field-to-message map. Full booking slots return 409 and rate limits return 429. Unexpected errors return a generic 500 and a request ID. A disabled ordering or delivery setting returns 403. Order, booking and application phone payloads carry country code 91.

Orders and bookings use 30 requests/minute per instance and the menu uses 60. Their counters reset with the instance. Applications and contact share a database counter keyed by endpoint and visitor hash. Each endpoint has 10 requests per minute. CV signing and final submission both consume quota. Verify the hosted proxy's visitor header behavior before relying on these limits.

## Where to look

All paths above begin at `supabase/functions/`. Shared parsing, CORS and visitor hashing live in `_shared/http.ts`. Runtime connection credentials are injected by Supabase and read inside the functions. The browser credentials live in `data/config.json`. The only manually configured function secret in this application is the origin allowlist.
