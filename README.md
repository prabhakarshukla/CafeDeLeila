# Café De Leila

Six customer pages and a static Supabase admin panel. Backend and admin code are present. Run the database, Auth, Storage and Realtime smoke checks before using this with customer data.

Run from the root with `python -m http.server 8080`. Open http://localhost:8080/ for customers and http://localhost:8080/admin/ for admin. If the Windows Python alias points to the Microsoft Store, install Python on PATH or use an existing Python executable.

- data/config.json holds the URL and publishable key. Blank values leave the storefront in sample preview mode.
- data/menu.json has 19 categories and 80 sample dishes. Orders use the database catalog and database prices.
- admin/js contains standalone ES modules. Owner tools cover catalog, finance, settings, staff and CSV export. Staff can review operational records and update permitted statuses.
- supabase/migrations holds 001–004. Migration 004 creates the buckets. supabase/tests/behavior.sql is a manual rollback test. Skip supabase/legacy.
- docs/SETUP_SUPABASE.md gives the numbered setup and smoke checks. docs/DEPLOY.md explains preview hosting. BACKEND_AUDIT.md distinguishes source, mock and runtime evidence.

Real hours, address, catalogue, prices, delivery fee/minimum, tax, WhatsApp and other business details need owner input. See TODO_FOR_OWNER.md. Payment tracking is manual and there is no payment gateway.
