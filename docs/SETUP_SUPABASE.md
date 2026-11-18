# Supabase Setup Guide — Café De Leila

**Project:** `cafe-de-leila`  
**Region:** Mumbai (ap-south-1)  
**URL:** `https://dqzmyahsedhvgbfqprks.supabase.co`  
**Anon Key:** `sb_publishable_3KNkfvVPXglN2hVTvBmq2g_2TXtkc8R`  
**Service Role Key:** ***** (set as function secret, never in frontend)

---

## 1. Prerequisites

- Supabase CLI installed: `npm i -g supabase` (or `brew install supabase/tap/supabase`)
- Docker Desktop running (for local development with `supabase start`)
- Node.js 18+ (for frontend build if needed)
- GitHub CLI: `gh auth login` (for pushing to repo)

---

## 2. Apply Migrations (Run in Order)

Open **Supabase Dashboard → SQL Editor** and run each migration file in order:

### 001_core_schema.sql
```bash
# Creates: menu_categories, menu_items, orders, bookings, job_applications, contact_messages
# Sequences: order_seq, booking_seq, application_seq
# Triggers: auto-number generation (Asia/Kolkata), updated_at
# RLS: Public SELECT on menu, NO public INSERT
# Indexes: 8 performance indexes
# Seed: 18 menu categories
```

### 002_admin_settings.sql
```bash
# Creates: admin_users table, is_admin()/is_owner() helpers
# Settings table + public_settings view (whitelisted keys)
# Seed default settings (hours, address, phone, ordering, delivery, tax, booking capacity, menu sample flag)
```

### 003_order_status_history.sql
```bash
# Creates: order_status_history table
# Validated status transitions for orders, bookings, applications
# Auto-insert history on status change
# Transition rules enforced via BEFORE UPDATE triggers
```

### 004_admin_rls_storage_realtime.sql
```bash
# Admin RLS policies: staff can update status, owners can CRUD + delete
# Storage policies: public read menu-images, admin manage, CV upload private + admin read
# Realtime on orders + bookings
# Admin stats views + get_admin_dashboard_stats() RPC
```

### 005_tests.sql
```bash
# Run manually to verify security:
# - Anon cannot INSERT/READ orders
# - Staff cannot edit settings
# - Invalid status transitions fail
# - Numbers unique under concurrent inserts
# - Admin RLS policies work
# - Storage policies correct
# - Views and RPC work
```

---

## 3. Deploy Edge Functions

```bash
# From project root
supabase functions deploy
```

This deploys 4 functions:
- `orders` — POST (create order with server-side pricing), GET (admin list)
- `bookings` — POST (race-safe slot booking), GET (admin list)
- `menu` — GET (filtered menu with categories)
- `applications` — POST (apply + CV upload URL), GET (admin list)

**Webhooks function removed** (payments/WhatsApp not set up yet).

---

## 4. Set Function Secrets

In **Supabase Dashboard → Edge Functions → Settings → Secrets**, add:

| Secret | Value | Required |
|--------|-------|----------|
| `SUPABASE_URL` | `https://dqzmyahsedhvgbfqprks.supabase.co` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | *your service role key* | ✅ |
| `ALLOWED_ORIGINS` | `https://cafedeleila.com,https://www.cafedeleila.com` | ✅ |
| `WHATSAPP_TOKEN` | *WhatsApp Business API token* | 🔜 Phase 2 |
| `WHATSAPP_PHONE_ID` | *WhatsApp Business phone ID* | 🔜 Phase 2 |
| `RAZORPAY_KEY_ID` | *Razorpay key ID* | 🔜 Phase 2 |
| `RAZORPAY_KEY_SECRET` | *Razorpay secret* | 🔜 Phase 2 |

> **Never commit secrets to git.** Use `supabase secrets set` or Dashboard.

---

## 5. Storage Bucket Configuration

In **Supabase Dashboard → Storage**, verify buckets exist and configure:

| Bucket | Public | Settings |
|--------|--------|----------|
| `menu-images` | ✅ Yes | No additional config (policies handle access) |
| `cv-uploads` | ❌ No | **Allowed MIME types:** `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>**File size limit:** `2097152` (2 MB) |
| `og-images` | ✅ Yes | No additional config |

> Bucket policies are managed via SQL migrations (004). If buckets don't exist, create them first in Dashboard.

---

## 6. Create First Admin User

1. **Supabase Dashboard → Authentication → Users → Add User**
   - Email: your admin email
   - Password: secure password
   - Auto-confirm: ✅

2. **Insert into admin_users table** (run in SQL Editor):
```sql
INSERT INTO admin_users (user_id, role, display_name)
VALUES ('<auth-user-uuid-from-step-1>', 'owner', 'Your Name');
```

3. **Verify:**
```sql
SELECT is_admin(), is_owner(); -- Should return true/true when logged in as that user
```

---

## 7. Configure Settings (Owner Only)

After logging in as admin, use the admin panel (once built) or SQL Editor to update settings:

```sql
-- Example: Enable ordering
UPDATE settings SET value = '{"enabled": true}', updated_by = auth.uid() 
WHERE key = 'ordering_enabled';

-- Set delivery
UPDATE settings SET value = '{"enabled": true}', updated_by = auth.uid() 
WHERE key = 'delivery_enabled';

UPDATE settings SET value = '{"amount": 40}', updated_by = auth.uid() 
WHERE key = 'delivery_fee';

UPDATE settings SET value = '{"amount": 200}', updated_by = auth.uid() 
WHERE key = 'min_order';

-- Set tax
UPDATE settings SET value = '{"value": 5}', updated_by = auth.uid() 
WHERE key = 'tax_percent';

-- Set booking capacity
UPDATE settings SET value = '{"capacity": 10}', updated_by = auth.uid() 
WHERE key = 'booking_capacity_per_slot';

-- Mark menu as real (removes sample notice)
UPDATE settings SET value = '{"is_sample": false}', updated_by = auth.uid() 
WHERE key = 'menu_is_sample';

-- Set verified WhatsApp
UPDATE settings SET value = '{"value": "919876543210", "verified": true}', updated_by = auth.uid() 
WHERE key = 'whatsapp_number';

-- Set verified hours
UPDATE settings SET value = '{"verified": true, "schedule": [...]}', updated_by = auth.uid() 
WHERE key = 'opening_hours';
```

---

## 8. Frontend Deployment

### Netlify (Recommended)
1. Connect GitHub repo: `prabhakarshukla/CafeDeLeila` (branch: `feat/admin-backend`)
2. Build command: *(none — static site)*
3. Publish directory: `.` (root)
4. Environment variables:
   ```
   VITE_SUPABASE_URL=https://dqzmyahsedhvgbfqprks.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_3KNkfvVPXglN2hVTvBmq2g_2TXtkc8R
   ```
5. Deploy → Netlify provides free HTTPS at `https://<project>.netlify.app`
6. Add custom domain: `cafedeleila.com` → Netlify handles SSL

### Vercel (Alternative)
```bash
vercel --prod
```
Same env vars, auto HTTPS.

### GitHub Pages (Free, no serverless functions)
```bash
# Only for static frontend; Edge Functions won't work
# Use Netlify/Vercel for full functionality
```

---

## 9. Verify End-to-End

### Test Checklist

| Feature | Test | Expected |
|---------|------|----------|
| **Menu** | Load `/menu.html` | 18 categories, 77 items, filters work, sample notice shows |
| **Order** | Add to cart → Checkout → Submit | Order created in `orders` table, server-computed total, order_number = `CDL-YYYYMMDD-NNN` |
| **Booking** | Select date/time/guests → Submit | Booking in `bookings`, `BK-YYYYMMDD-NNN`, slot capacity enforced |
| **Careers** | Fill form + upload CV (PDF) | Application in `job_applications`, CV in `cv-uploads` bucket |
| **Contact** | Submit message | Row in `contact_messages` |
| **Admin** | Login → Dashboard | Stats load, orders list, realtime works |
| **Realtime** | Place order in another tab | Admin dashboard updates live |

### API Endpoints (for testing)

| Function | Method | URL | Auth |
|----------|--------|-----|------|
| Orders | POST | `https://dqzmyahsedhvgbfqprks.supabase.co/functions/v1/orders` | Anon key |
| Orders | GET | `.../functions/v1/orders` | Anon key (RLS filters) |
| Bookings | POST | `.../functions/v1/bookings` | Anon key |
| Menu | GET | `.../functions/v1/menu?category=desserts&veg=true` | Anon key |
| Applications | POST | `.../functions/v1/applications` | Anon key |
| Applications | POST | `.../functions/v1/applications/get-upload-url` | Anon key |

---

## 10. Owner TODO List (Before Launch)

| Item | Status | Notes |
|------|--------|-------|
| Real menu prices | ❌ | Edit `data/menu.json` + remove `_sample: true` |
| Food photos | ❌ | Add 77 images to `assets/menu/`, update `image` paths |
| Verified WhatsApp Business number | ❌ | Required for order/booking confirmations |
| Opening hours (verified) | ❌ | Update `opening_hours` in settings |
| Address confirmation | ❌ | Resolve Vikas Khand vs Dr Akhilesh Das Gupta Marg |
| Delivery fee / min order / tax % | ❌ | Update in settings table |
| Social profile URLs | ❌ | Facebook, Instagram, YouTube |
| Real OG image (1200×630) | ❌ | Replace `assets/og-image.jpg` |
| SSL certificate | ✅ | Netlify/Vercel provides free HTTPS |

---

## 11. Local Development (Optional)

```bash
# Start Supabase locally (requires Docker)
supabase start

# Apply migrations to local DB
supabase db reset

# Serve frontend locally
python -m http.server 8080
# Open http://localhost:8080
```

---

## 12. Useful Commands

```bash
# View function logs
supabase functions logs orders

# Deploy single function
supabase functions deploy orders

# Set secret
supabase secrets set WHATSAPP_TOKEN=<token>

# List secrets
supabase secrets list

# Generate migration file
supabase migration new <name>

# Push migration to remote (careful!)
supabase db push

# Create new admin user
supabase auth admin create-user --email admin@cafedeleila.com --password <password>
```

---

## 13. Troubleshooting

| Issue | Solution |
|-------|----------|
| `supabase functions deploy` fails | Check Docker is running; verify `deno.json` exists in each function |
| RLS blocking legitimate requests | Check `is_admin()`/`is_owner()` return true for your user |
| CORS errors | Verify `Access-Control-Allow-Origin` matches your domain exactly |
| Realtime not working | Check `ALTER PUBLICATION supabase_realtime ADD TABLE ...` ran |
| CV upload fails | Check `cv-uploads` bucket exists, MIME type allowed, size < 2MB |
| Order numbers not sequential | Check `order_seq` sequence exists and trigger fires |

---

## 13. Security Checklist (Pre-Launch)

- [ ] Service role key only in Supabase secrets, never in frontend
- [ ] Anon key only has public read access (RLS enforces)
- [ ] No public INSERT policies on orders/bookings/applications/messages
- [ ] Webhooks removed (or signature verification added)
- [ ] Rate limiting active on all functions
- [ ] Body size limits enforced
- [ ] CORS restricted to `cafedeleila.com`
- [ ] CV upload validates MIME + size before signed URL
- [ ] Realtime only on orders/bookings (not all tables)
- [ ] Admin panel on separate `/admin` path with noindex

---

**Last Updated:** 2026-11-18  
**Next Review:** After owner provides real data and WhatsApp number