# TODO FOR OWNER — Café De Leila Launch Checklist

**Project:** Café De Leila (Lucknow)  
**Status:** Frontend + Backend complete | Awaiting real data  
**Last Updated:** 2026-11-18  

---

## 🔴 CRITICAL — Must Complete Before Launch

| # | Task | Config Location | Status | Notes |
|---|------|-----------------|--------|-------|
| 1 | **Verified WhatsApp Business Number** | `settings` table → `whatsapp_number` | ❌ Empty | Must be 12-digit starting with `91` (e.g., `919876543210`). Get from WhatsApp Business API. |
| 2 | **WhatsApp Verified Flag** | `settings` table → `whatsapp_number.verified` | ❌ false | Set to `true` after verifying number in WhatsApp Business Manager. |
| 3 | **Opening Hours (Verified)** | `settings` table → `opening_hours` | ❌ Empty/false | Old site: lunch 11am–5pm, dinner 5pm–9pm. Maps: noon–11pm. **Owner must confirm.** |
| 4 | **Address Confirmation** | `settings` table → `address` | ⚠️ Discrepancy | Old site: "5/34, Vikas Khand, Dayal Chauraha". Maps: "Dr Akhilesh Das Gupta Marg, Vipul Khand 5/6". **Owner must confirm.** |
| 5 | **Delivery Fee** | `settings` table → `delivery_fee.amount` | ❌ 0 (sample) | Set in INR (e.g., `40`). |
| 6 | **Minimum Order for Delivery** | `settings` table → `min_order.amount` | ❌ 0 (sample) | Set in INR (e.g., `200`). |
| 7 | **Tax Percent** | `settings` table → `tax_percent.value` | ❌ 0 (sample) | GST rate in % (e.g., `5` for 5%). |
| 8 | **Booking Capacity Per Slot** | `settings` table → `booking_capacity_per_slot.capacity` | ❌ Not set | Default 10. Adjust based on seating. |
| 9 | **Real Menu Prices** | `data/menu.json` + Supabase `menu_items` | ❌ All sample | All 77 items have `_sample: true`. Replace with real prices. |
| 10 | **Real Food Photos** | `assets/menu/` + Supabase `menu-images` bucket | ❌ Missing | Need 77 photos. Upload to bucket, update `image_url` in DB. |
| 11 | **Social Profile URLs** | `data/config.json` → `social` | ❌ Empty | Facebook, Instagram, YouTube URLs. |

---

## 🟡 HIGH — Complete Before Soft Launch

| # | Task | Location | Status | Notes |
|---|------|----------|--------|-------|
| 12 | **Real Menu Prices in Supabase** | Supabase `menu_items.price_inr` | ❌ Sample | Update via admin panel or SQL after owner provides prices. |
| 13 | **Food Photos in Storage** | Supabase `menu-images` bucket | ❌ Missing | Upload 77 photos, update `menu_items.image_url`. |
| 14 | **OG Image (1200×630)** | `assets/og-image.jpg` | ❌ Missing | Social share preview. Design with logo + tagline. |
| 15 | **Favicon** | `assets/favicon.svg` | ✅ Done | Coffee cup design — verify looks correct at 16×16. |
| 16 | **Logo** | `assets/logo_delelia.svg` | ✅ Done | Verify matches brand. |
| 17 | **Admin User Created** | Supabase Auth + `admin_users` table | ⚠️ Pending | Run `supabase auth admin create-user` then insert into `admin_users`. |
| 18 | **Test Order Flow** | Frontend → Supabase | ❌ Not tested | End-to-end: cart → checkout → order in DB. |
| 19 | **Test Booking Flow** | Frontend → Supabase | ❌ Not tested | End-to-end: date/time/guests → booking in DB. |
| 20 | **Test Careers Flow** | Frontend → Supabase | ❌ Not tested | End-to-end: form + CV upload → application in DB + CV in storage. |
| 21 | **Test Admin Panel** | `/admin` (once built) | ❌ Not built | Login, dashboard stats, orders, menu manager, settings. |
| 22 | **Realtime Alerts Test** | Admin dashboard | ❌ Not tested | Place order in new tab → live update in dashboard. |

---

## 🟢 MEDIUM — Post-Launch Improvements

| # | Task | Priority | Notes |
|---|------|----------|-------|
| 23 | **Payment Gateway Integration** | Phase 2 | Razorpay/Stripe/PayU for online payments. |
| 24 | **WhatsApp Business API** | Phase 2 | Auto-send confirmations via WhatsApp Business API. |
| 25 | **Email Notifications** | Phase 2 | SendGrid/Twilio for order/booking emails. |
| 26 | **Kitchen Display System (KDS)** | Phase 2 | Real-time order display for kitchen staff. |
| 27 | **Loyalty Program** | Phase 3 | Points, rewards, repeat customer tracking. |
| 28 | **Multi-location Support** | Phase 3 | If expanding beyond Gomti Nagar. |
| 29 | **Inventory Management** | Phase 3 | Stock tracking, low-stock alerts. |
| 30 | **Analytics Dashboard** | Phase 2 | Revenue trends, popular items, peak hours. |

---

## ✅ DONE — No Action Needed

| Item | Status | Notes |
|------|--------|-------|
| Frontend (6 pages) | ✅ Complete | Home, Menu, Booking, Careers, Contact, Locations |
| Backend (Supabase) | ✅ Complete | DB, Auth, Storage, Edge Functions, Realtime |
| Theme (Obsidian Black + Sand Brown) | ✅ Complete | CSS variables, responsive |
| Accessibility (WCAG AA) | ✅ Complete | Skip links, ARIA, focus, reduced motion |
| Git repo | ✅ Complete | `feat/admin-backend` branch |
| Migrations (001-005) | ✅ Complete | Core, admin, status history, RLS, tests |
| Edge Functions (4) | ✅ Deployed | Orders, Bookings, Menu, Applications |
| Webhooks | ✅ Removed | Payments/WhatsApp not set up |
| HTTPS | ✅ Automatic | Netlify/Vercel provides free SSL |
| GitHub repo | ✅ Complete | `prabhakarshukla/CafeDeLeila` |

---

## 📋 Quick Reference: How to Update Key Settings

### Update Settings via SQL Editor (Supabase Dashboard)
```sql
-- Enable ordering
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

-- Set WhatsApp
UPDATE settings SET value = '{"value": "919876543210", "verified": true}', updated_by = auth.uid() 
WHERE key = 'whatsapp_number';

-- Set hours (example)
UPDATE settings SET value = '{"verified": true, "schedule": [
  {"day":"Monday","open":"11:00","close":"21:00","closed":false},
  {"day":"Tuesday","open":"11:00","close":"21:00","closed":false},
  {"day":"Wednesday","open":"11:00","close":"21:00","closed":false},
  {"day":"Thursday","open":"11:00","close":"21:00","closed":false},
  {"day":"Friday","open":"11:00","close":"22:00","closed":false},
  {"day":"Saturday","open":"11:00","close":"22:00","closed":false},
  {"day":"Sunday","open":"11:00","close":"21:00","closed":false}
]}', updated_by = auth.uid() 
WHERE key = 'opening_hours';

-- Mark menu as real (removes sample notice)
UPDATE settings SET value = '{"is_sample": false}', updated_by = auth.uid() 
WHERE key = 'menu_is_sample';
```

### Update Menu Prices (Bulk via SQL)
```sql
-- Example: Update one item
UPDATE menu_items 
SET price_inr = 320, _sample = false
WHERE id = 'dessert-1';

-- Or bulk update via admin panel (once built)
```

### Upload Food Photos
1. Supabase Dashboard → Storage → `menu-images` bucket
2. Upload 77 images (recommended: 800×600px, WebP, <200KB each)
3. Copy public URLs → Update `menu_items.image_url` in SQL Editor

---

## 📞 Support Contacts

| Issue | Contact |
|-------|---------|
| Supabase (DB, Auth, Functions, Storage) | https://supabase.com/support |
| Netlify (Frontend hosting, HTTPS) | https://www.netlify.com/support |
| Domain/DNS | Your registrar support |
| WhatsApp Business API | https://developers.facebook.com/docs/whatsapp |

---

## 📅 Recommended Timeline

| Week | Focus |
|------|-------|
| **Week 1** | Owner provides: WhatsApp number, hours, address, delivery fee, tax %, booking capacity |
| **Week 2** | Owner provides: Real menu prices (all 77 items), food photos (77 images) |
| **Week 3** | Upload photos + prices to Supabase, test all flows, create admin user |
| **Week 4** | Soft launch to friends/family, gather feedback, fix bugs |
| **Week 5** | Public launch, monitor, iterate |

---

**Owner Sign-off:** ________________________ **Date:** _______________

**Developer Sign-off:** ________________________ **Date:** _______________