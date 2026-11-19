# Café De Leila — Website & Backend

**Branch:** `feat/admin-backend` (development) → `main` (production)  
**Repo:** https://github.com/prabhakarshukla/CafeDeLeila  
**Supabase Project:** `dqzmyahsedhvgbfqprks` (Mumbai, ap-south-1)  
**Project Report:** See `PROJECT_REPORT.md` for complete documentation

---

## Quick Status

| Layer | Status | Details |
|-------|--------|---------|
| **Frontend** | ✅ Complete | 6 pages, mobile-first, WCAG AA, no build step |
| **Backend (Supabase)** | ✅ Complete | PostgreSQL, Auth, Storage, 4 Edge Functions, Realtime |
| **Database** | ✅ Complete | 6 tables, 5 migrations, RLS, sequences, triggers |
| **Admin Panel** | ❌ Not Built | Planned (T5+) — backend ready |

---

## Run Locally (Frontend Only)

```powershell
cd "C:\cafe de lelia"
python -m http.server 8080
```

Open http://localhost:8080/index.html. Use an HTTP server (not `file://`) so JSON loading works.

---

## Structure

```
C:/cafe de lelia/
├── index.html           # Home — hero, featured, how it works, about, hours, reviews
├── menu.html            # Menu — search, veg filter, 18 category chips, 77 dishes
├── book-table.html      # Booking — date/time/guest picker, validation
├── careers.html         # Careers — role select, drag-drop CV upload (PDF/DOC/DOCX, 2MB)
├── contact.html         # Contact — form, info card, lazy Google Maps
├── locations.html       # Locations — map, hours, directions, call/WhatsApp
├── js/
│   ├── main.js          # Active app (2678 lines) — cart, checkout, booking, careers, contact
│   └── support.js       # Shared helpers (India dates, WhatsApp/email handoff, a11y)
├── css/
│   ├── variables.css    # Design tokens (Obsidian Black #161616, Sand Brown #B28F6F)
│   ├── base.css         # Reset, fluid type, buttons, forms, focus, reduced motion
│   ├── components.css   # Header, footer, cart drawer, modals, toasts, badges
│   ├── pages.css        # Page-specific styles
│   └── refinements.css  # Layout/usability fixes
├── data/
│   ├── config.json      # Business details (hours, contact, ordering, booking, SEO)
│   └── menu.json        # 18 categories, 77 dishes (all _sample: true)
├── assets/
│   ├── favicon.svg      # Coffee cup icon
│   ├── logo_delelia.svg # Logo placeholder (owner to replace)
│   └── meal.svg         # Placeholder dish illustration
├── supabase/
│   ├── migrations/
│   │   ├── 001_core_schema.sql
│   │   ├── 002_admin_settings.sql
│   │   ├── 003_order_status_history.sql
│   │   ├── 004_admin_rls_storage_realtime.sql
│   │   └── 005_tests.sql
│   └── functions/
│       ├── orders/      # POST create (server pricing), GET admin list
│       ├── bookings/    # POST race-safe booking, GET admin list
│       ├── menu/        # GET filtered menu
│       └── applications/ # POST apply + CV signed upload URL
├── docs/
│   ├── SETUP_SUPABASE.md    # Complete Supabase setup guide
│   ├── DEPLOY.md            # Netlify/Vercel deploy, HTTPS, CI/CD
│   └── TODO_FOR_OWNER.md    # 30-item checklist (critical/high/medium)
├── PROJECT_REPORT.md        # Complete documentation (this links here)
├── BACKEND_STATE.md         # Audit with PASS/FAIL/UNVERIFIED verdicts
├── CHANGELOG.md             # History of changes
└── .gitignore               # Excludes .env.local, audit assets, large images
```

---

## Real vs SAMPLE

| Item | Status | Notes |
|------|--------|-------|
| **Menu prices** | ❌ Sample | All 77 items have `_sample: true` |
| **Food photos** | ❌ Sample | All use `assets/meal.svg` placeholder |
| **WhatsApp number** | ❌ Empty | Must be 12-digit starting with `91` |
| **Opening hours** | ❌ Unverified | `hours.verified: false`, `schedule: []` |
| **Address** | ⚠️ Discrepancy | "Vikas Khand" vs "Dr Akhilesh Das Gupta Marg, Vipul Khand 5/6" |
| **Delivery fee / min order / tax** | ❌ Sample | Set in `settings` table (owner-only) |
| **Social URLs** | ❌ Empty | Facebook, Instagram, YouTube |
| **Backend** | ✅ Built | Supabase + 4 Edge Functions (deployed) |
| **Admin panel** | ❌ Not built | Planned T5+ |

---

## Backend (Supabase) — Already Configured

**No local backend needed.** The frontend calls deployed Edge Functions directly.

| Component | Status |
|-----------|--------|
| PostgreSQL Database | ✅ 6 tables + migrations 001-005 |
| Auth (admin users) | ✅ Email/password |
| Storage | ✅ 3 buckets with policies |
| Edge Functions | ✅ 4 deployed (orders, bookings, menu, applications) |
| Realtime | ✅ Orders + Bookings |
| Function Secrets | ⚠️ Set in Dashboard |

### API Endpoints

| Function | Method | URL | Auth |
|----------|--------|-----|------|
| Orders | POST | `https://dqzmyahsedhvgbfqprks.supabase.co/functions/v1/orders` | Anon key |
| Orders | GET | `.../functions/v1/orders` | Anon key (RLS filters) |
| Bookings | POST | `.../functions/v1/bookings` | Anon key |
| Menu | GET | `.../functions/v1/menu?category=...&veg=true` | Anon key |
| Applications | POST | `.../functions/v1/applications` | Anon key |
| CV Upload URL | POST | `.../functions/v1/applications/get-upload-url` | Anon key |

---

## Frontend Deployment (Netlify Recommended)

1. **Connect Repo:** Netlify → "Add new site" → GitHub → `prabhakarshukla/CafeDeLeila` → Branch: `feat/admin-backend`
2. **Build Settings:** Build command: *(empty)*, Publish directory: `.` (root)
3. **Environment Variables:**
   ```
   VITE_SUPABASE_URL=https://dqzmyahsedhvgbfqprks.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_3KNkfvVPXglN2hVTvBmq2g_2TXtkc8R
   ```
4. **Deploy** → Free HTTPS → Add custom domain `cafedeleila.com` → Netlify provisions SSL (Let's Encrypt)

**Alternative:** Vercel (`vercel --prod`), GitHub Pages (static only, no Edge Functions)

---

## Supabase Setup (One-Time, Owner Action)

See `docs/SETUP_SUPABASE.md` for full guide. Summary:

1. **Apply Migrations** (SQL Editor, in order): `001_core_schema.sql` → `002_admin_settings.sql` → `003_order_status_history.sql` → `004_admin_rls_storage_realtime.sql` → `005_tests.sql`
2. **Deploy Functions:** `supabase functions deploy`
3. **Set Secrets** (Dashboard → Edge Functions → Settings → Secrets):
   ```
   SUPABASE_URL=https://dqzmyahsedhvgbfqprks.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ALLOWED_ORIGINS=https://cafedeleila.com,https://www.cafedeleila.com
   ```
4. **Storage Buckets:** `menu-images` (public), `cv-uploads` (private, 2MB, PDF/DOC/DOCX), `og-images` (public)
5. **Create Admin User:** Auth → Add User → `INSERT INTO admin_users (user_id, role, display_name) VALUES ('<uuid>', 'owner', 'Name');`
6. **Configure Settings** (owner-only, via SQL or future admin panel): WhatsApp, hours, address, delivery, tax, booking capacity, `menu_is_sample: false`

---

## Owner Checklist (Critical Items)

See `TODO_FOR_OWNER.md` for full 30-item list.

| # | Task | Location |
|---|------|----------|
| 1 | Verified WhatsApp Business Number | `settings` → `whatsapp_number` |
| 2 | Opening Hours (Verified) | `settings` → `opening_hours` |
| 3 | Address Confirmation | `settings` → `address` |
| 4 | Delivery Fee | `settings` → `delivery_fee.amount` |
| 5 | Minimum Order for Delivery | `settings` → `min_order.amount` |
| 6 | Tax Percent (GST) | `settings` → `tax_percent.value` |
| 7 | Booking Capacity Per Slot | `settings` → `booking_capacity_per_slot.capacity` |
| 8 | Real Menu Prices (77 items) | `data/menu.json` + Supabase `menu_items` |
| 9 | Real Food Photos (77 images) | `assets/menu/` + `menu-images` bucket |
| 10 | Social Profile URLs | `data/config.json` → `social` |
| 11 | OG Image (1200×630) | `assets/og-image.jpg` |

---

## Documentation

| File | Purpose |
|------|---------|
| `PROJECT_REPORT.md` | **Complete documentation** — architecture, flows, schema, functions, setup, testing, known issues, demo script, glossary |
| `docs/SETUP_SUPABASE.md` | Step-by-step Supabase setup (migrations, functions, secrets, admin, deploy) |
| `docs/DEPLOY.md` | Frontend deployment (Netlify/Vercel), HTTPS, CI/CD, monitoring, rollback |
| `docs/TODO_FOR_OWNER.md` | 30-item checklist with config locations and timeline |
| `BACKEND_STATE.md` | Audit with PASS/FAIL/UNVERIFIED verdicts |
| `CHANGELOG.md` | History of changes |

---

## Tests

| Test | Command | Coverage |
|------|---------|----------|
| Static analysis | `node audit/static.cjs` | JSON/schema, JS syntax, HTML metadata, contrast |
| Browser (Playwright) | `node audit/browser.cjs` | 6 pages × 3 widths, cart, forms, a11y, negative cases |
| Server check | `node audit/server-check.cjs` | Real Python HTTP server |
| SQL tests | Run `005_tests.sql` in SQL Editor | RLS, transitions, unique numbers, admin policies, storage, views |
| JS syntax | `node --check js/main.js` | Syntax validation |

---

## Known Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Menu categories mismatch (18 in JSON vs seed) | Medium | `data/menu.json` vs `001_core_schema.sql` |
| `menu_items` table empty — need 77 items | Medium | Migration seeds only categories |
| Address discrepancy | High | `config.json` note |
| README stale text ("no backend") | High | This file — now fixed |
| Admin panel not built | Critical | T5+ |
| Payment gateway | High | Phase 2 |
| Rate limiting in-memory (per deploy) | ⚠️ UNVERIFIED | Edge Functions |

---

## What's Next (Priority)

1. **Admin Panel** — Login, Dashboard, Orders, Menu, Bookings, Applications, Settings, Staff
2. **Payment Gateway** — Razorpay/Stripe/PayU + webhooks
3. **WhatsApp Business API** — Auto-confirmations
4. **Email Notifications** — SendGrid/Twilio
5. **Real Data Import** — 77 photos + prices, remove `_sample`

---

## License

Proprietary — Café De Leila. All rights reserved.
