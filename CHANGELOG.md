# Changelog

## 18 November 2026

Created PROJECT_STATE.md before application changes, then PLAN.md and ASSUMPTIONS.md. Previous report/audit claims did not match the code or include browser evidence.

### Round 1: source and functional repairs

- Retained six pages and active main.js. Renamed colliding page functions, removed duplicate add handlers and premature global aliases.
- Fixed checkout visibility, conditional address, form property access, order message formatting and page-specific titles. Added cart notes and resilient storage handling.
- Restored booking date/time/guest interaction, India-time dates and submission-time checks. Fixed CV input lookup and invalid replacement files.
- Restored sample flags, repaired duplicate IDs, split Chinese/Main Course and added three items for 80 total. Corrected egg/anchovy dietary contradictions.
- Replaced broken photo paths with a local illustration; retained logo/favicon. Removed guessed hours, unsupported founding year/branch/benefits, unverified socials and random WhatsApp number. Added safe email fallback.
- Removed missing legal links and populated contact/location details from config. Demo success text no longer implies actual submission.
- Browser transport failed twice; changed to serving local files through Playwright routing. A premature utility alias ReferenceError found by the first browser run was repaired.

### Round 2: responsive checks

- Retained original stylesheets and added refinements.css. Fixed sticky wrapper, mobile branding, hero, card grids, contact layout, typography and touch controls.
- Centralized CSS palette with four derived opaque shades and alpha variants. Fixed missing semicolons.
- All 18 viewport checks passed. A diet test exposed a secondary Healthy badge using the veg class; changed its class. Screenshot capture caught hero animation mid-frame; now captures settled animations.
- Core cart, checkout, booking, CV and contact tests passed.

### Round 3: failure cases and final proof

- Replaced stale focus lists with a dynamic dialog controller. Added error associations and focus restoration. Repaired white-space affected by an overly broad color substitution; added visible input borders.
- Fixed optional booking email validation and prevented non-delivery orders retaining a hidden address.
- Tested invalid/oversized CVs, all allowed extensions, invalid details, past dates, malformed/unavailable storage, keyboard controls, reduced motion and a dry-run verified WhatsApp URL.
- Re-ran all six pages, including unchanged locations, at all widths. No application console errors. Static checks and real Python HTTP check passed.
- Rewrote README, AUDIT and PROJECT_REPORT because their architecture/completion claims were stale. No application file required a full rewrite. Removed ignores for audit/changelog documents.

External maps/fonts, real message delivery and owner-provided content remain unverified. No production deployment, message or payment occurred. Three rounds used, below the six-round limit.

---

## 19 November 2026

### T3: Part B Migrations (Migrations 002-005)

- **002_admin_settings.sql**: `admin_users` table, `is_admin()`/`is_owner()` SECURITY DEFINER helpers, `settings` table + `public_settings` view (whitelisted keys), seed default settings (hours, address, phone, ordering, delivery, tax, booking capacity, menu sample flag)
- **003_order_status_history.sql**: `order_status_history` table, validated status transitions for orders/bookings/applications with BEFORE UPDATE triggers, auto-insert history on status change
- **004_admin_rls_storage_realtime.sql**: Admin RLS policies (staff update status, owners CRUD), storage policies (public read menu-images, admin manage, CV private + admin read), realtime on orders+bookings, admin stats views + `get_admin_dashboard_stats()` RPC
- **005_tests.sql**: SQL test suite — anon cannot insert/read orders, staff cannot edit settings, invalid status transitions fail, numbers unique under concurrent inserts, admin RLS works, storage policies correct, views/RPC work

### T1-T2: Part A Fixes (Previous Commits)

- T1: Part A Security & Logic Fixes (A2-A8) — Removed public INSERT RLS policies, rewrote orders/bookings/menu/applications functions with server-side pricing, strict validation, CORS origin restriction, rate limiting, body size limits; removed webhooks; fixed CV upload validation; sequences + Asia/Kolkata timezone for number generation; race-safe booking slots
- T2: Part A Honesty Fixes (A9, A10) — Replaced "WhatsApp shortly" with "We'll confirm shortly", added sample menu notice banner, removed hardcoded taxRate, added menu.is_sample config, updated confirmations
T-A corrected setup and readiness claims and recorded the branch handover.
T-B repaired migration ordering, origin allowlisting, private write endpoints, public settings, storage limits and customer API contracts.
feat(admin): T5 add guarded admin and dashboard
feat(admin): T6 manage orders and alerts
feat(admin): T7 manage catalog and sample pricing
feat(admin): T8 manage bookings applications and messages
feat(admin): T9 add owner settings staff and export
docs: T10 document fresh Supabase setup
audit: T11 verify admin layouts and document limits
