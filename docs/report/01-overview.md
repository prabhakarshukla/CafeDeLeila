# What Café De Leila does

## How it works

The storefront has six pages. Home introduces the café and featured dishes. Menu filters the catalog and opens a cart. Book a Table collects a reservation request. Careers accepts an application and CV. Contact submits a message. Locations shows address and map details.

A customer can browse without an account. Staff sign in to handle orders, bookings, applications and messages. The owner also controls prices, availability, business settings, staff access, payment status and CSV exports.

The site uses HTML, CSS and JavaScript so a static host can serve it without a build. Supabase supplies a PostgreSQL database for structured records, authentication for admin login, and object storage for images and CVs. An Edge Function is a small program that runs on Supabase when a browser sends a request. It checks input and performs approved server-side work such as calculating an order total.

The JSON catalog and database seed describe 80 sample dishes. Prices, illustrative images, hours, delivery terms, tax, WhatsApp and conflicting address details need owner confirmation. The source implements operational requests, but payment is recorded manually and there is no payment processor.

## Where to look

- Storefront entry points: `index.html`, `menu.html`, `book-table.html`, `careers.html`, `contact.html`, `locations.html`.
- Operator UI: `admin/index.html` and the route table in `admin/js/app.js`.
- Editable data: `data/config.json`, `data/menu.json`, `supabase/seed/menu_items.sql`.
