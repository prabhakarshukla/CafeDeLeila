# Café De Leila

The branch contains six static customer pages, an eight-view admin panel, five Supabase Edge Functions, database migrations and a sample menu seed. The report separates implemented features from verification. [Read the project report](PROJECT_REPORT.md).

## Run locally

```powershell
python -m http.server 8080
```

Open http://localhost:8080/ for the storefront and http://localhost:8080/admin/ for admin. If the Windows Python alias opens the Microsoft Store, use a working Python executable. The browser reads the project URL and publishable key from data/config.json. The six customer pages load `js/support.js` and `js/main.js`. The previous unreferenced storefront modules were removed. The menu can fall back to the 80-dish local sample. Checkout requires an available database catalog.

## Set up the database

- Fresh project: apply 001, 002, 003, 004 and 006, then supabase/seed/menu_items.sql. Do not run the archive.
- Existing early project: verify the limiter and booking routine. If missing, reapply current 004 before 006. Run the seed while preparing a sample catalog.
- Configure the function origin allowlist, deploy the five functions, disable public sign-up and create an owner. Use the [numbered setup guide](docs/SETUP_SUPABASE.md) and [verification guide](docs/VERIFY_SUPABASE.md).
- Run the anonymous access, order, CV and admin/staff smoke tests on a disposable project.

Embedded PostgreSQL passed clean and repeat migration runs, simulated legacy cleanup, seed replay and rollback assertions. Tests with a stubbed database exercise all five handlers and verify server-side pricing. Mocked browser tests cover form failures and populated admin workflows. Hosted Auth, Storage, Realtime, end-to-end customer requests and the Vercel deployment remain **UNVERIFIED**. [Audit results](VERIFICATION_REPORT.md)

The 80 dishes and their prices are samples. Hours, address, WhatsApp, photos, tax and delivery terms need confirmation. Payments are tracked manually. WhatsApp appears only as an optional contact link when the configured Indian number is verified. Requests are submitted through the site. [Owner checklist](docs/TODO_FOR_OWNER.md)
