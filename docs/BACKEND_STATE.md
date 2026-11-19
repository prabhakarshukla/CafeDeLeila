# BACKEND STATE AUDIT — Café De Leila

This snapshot describes the starting state. Migration 003 now records status history for orders only and validates transitions for bookings and applications. See the [current database reference](report/06-database.md).

**Audit Date:** 2026-11-18  
**Auditor:** Agent (T0)  
**Repo:** https://github.com/prabhakarshukla/CafeDeLeila  
**Local:** C:/cafe de lelia  
**Branch:** main (unpushed local commit ahead of origin)

---

## 1. REPOSITORY & ENVIRONMENT

| Item | Status | Evidence |
|------|--------|----------|
| Git repo initialized | ✅ PASS | `.git` exists, `git ls-files` shows 100+ tracked files |
| `.gitignore` covers secrets | ✅ PASS | Lines 13-16: `.env`, `.env.local`, `.env.*.local` ignored |
| `.env.local` tracked in git | ✅ PASS | `git log --all --full-history -- .env.local` returns empty; file listed in `git ls-files --others --ignored` |
| Secrets ever pushed | ✅ PASS (never pushed) | No history for `.env.local`; no service-role keys in tracked files |
| build-time variables in docs | ✅ PASS | No `build-time variables` in any `.md` file; only in `.env.local` (ignored) |
| build-time variables in HTML | ✅ PASS | Supabase client loaded via module script in HTML, not Vite |

**A1 Verdict:** ✅ PASS — No secrets tracked, .gitignore correct, no key rotation needed.

---

## 2. DATABASE SCHEMA (`supabase-schema.sql`)

| Table | Exists in SQL | RLS Enabled | Policies | Notes |
|-------|---------------|-------------|----------|-------|
| `menu_categories` | ❌ MISSING | — | — | Referenced in FKs but not created |
| `menu_items` | ❌ MISSING | — | — | Referenced in FKs but not created |
| `orders` | ❌ MISSING | — | — | Referenced in triggers/FKs but not created |
| `bookings` | ❌ MISSING | — | — | Referenced in triggers/FKs but not created |
| `job_applications` | ❌ MISSING | — | — | Referenced in triggers/FKs but not created |
| `contact_messages` | ✅ EXISTS | ✅ | ✅ (INSERT only) | Only table fully defined |

**Critical Gaps:**
- Core tables (`menu_categories`, `menu_items`, `orders`, `bookings`, `job_applications`) are **referenced but not created** in `supabase-schema.sql`
- `uuid-ossp` extension declared but tables using `uuid_generate_v4()` missing
- Triggers reference non-existent tables (`orders`, `bookings`, `job_applications`)

**RLS Policies (current):**
| Policy | Table | Type | Verdict |
|--------|-------|------|---------|
| Public read menu categories | menu_categories | SELECT | ⚠️ UNVERIFIED (table missing) |
| Public read menu items | menu_items | SELECT | ⚠️ UNVERIFIED (table missing) |
| Anyone can create orders | orders | INSERT | ❌ FAIL (A2) — Public INSERT on orders |
| Anyone can create bookings | bookings | INSERT | ❌ FAIL (A2) — Public INSERT on bookings |
| Anyone can create applications | job_applications | INSERT | ❌ FAIL (A2) — Public INSERT on applications |
| Anyone can create contact messages | contact_messages | INSERT | ❌ FAIL (A2) — Public INSERT on contact |

**Auto-number Triggers (current):**
| Trigger | Function | Issue |
|---------|----------|-------|
| `generate_order_number` | `NOW()` UTC date | ❌ FAIL (A7) — Uses UTC, not Asia/Kolkata |
| `generate_booking_number` | `NOW()` UTC date | ❌ FAIL (A7) — Uses UTC, not Asia/Kolkata |
| `generate_application_number` | `NOW()` UTC date | ❌ FAIL (A7) — Uses UTC, not Asia/Kolkata |
| Race condition | `COUNT(*) + 1` | ❌ FAIL (A7/A8) — Not safe under concurrency |

**A2 Verdict:** ❌ FAIL — Public INSERT policies exist on orders, bookings, job_applications, contact_messages. Must be removed; inserts only via Edge Functions with service role.

**A7 Verdict:** ❌ FAIL — Number generation uses UTC `NOW()` and unsafe `COUNT(*)+1` pattern.

**A8 Verdict:** ❌ FAIL — Booking slot check is racy (read-then-insert, no unique constraint/transaction).

---

## 3. EDGE FUNCTIONS

### `supabase/functions/orders/index.ts`
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Compute prices server-side from `menu_items` | ❌ FAIL (A3) | Line 34: `total_inr: body.subtotal_inr + ...` — trusts client prices |
| Reject unavailable items | ❌ FAIL (A3) | No validation against `menu_items.is_available` |
| Reject unknown item IDs | ❌ FAIL (A3) | No FK/item existence check |
| Quantity bounds (1-50) | ❌ FAIL (A3) | No quantity validation |
| Ordering disabled check | ❌ FAIL (A3) | No `ordering_enabled` settings check |
| Price/name snapshot per line | ❌ FAIL (A3) | Stores client payload directly |
| Input validation (strict schemas) | ❌ FAIL (A4) | Only checks required fields, no lengths/phone/date validation |
| CORS limited to site origins | ❌ FAIL (A4) | Line 5: `"Access-Control-Allow-Origin": "*"` |
| Body size limit | ❌ FAIL (A4) | Not implemented |
| Per-IP rate limiting | ❌ FAIL (A4) | Not implemented |

### `supabase/functions/bookings/index.ts`
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Race-safe slot capacity | ❌ FAIL (A8) | Lines 27-37: Read-then-insert, no transaction/unique constraint |
| Input validation (phone, dates, guests 1-20) | ❌ FAIL (A4) | Only required field check |
| CORS / rate limiting / body limit | ❌ FAIL (A4) | Same as orders |

### `supabase/functions/menu/index.ts`
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Input validation | ⚠️ PARTIAL | Only filters, no body (GET only) |
| CORS | ❌ FAIL (A4) | `"*"` |

### `supabase/functions/applications/index.ts`
| Requirement | Status | Evidence |
|-------------|--------|----------|
| File type/size validation before signed URL | ❌ FAIL (A6) | Lines 19-23: No MIME/size check before `createSignedUploadUrl` |
| Randomized stored filename | ✅ PASS | Line 20: `crypto.randomUUID()` |
| Input validation | ❌ FAIL (A4) | Only required fields |
| CORS / rate limiting | ❌ FAIL (A4) | `"*"` |

### `supabase/functions/webhooks/index.ts`
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Razorpay signature verification | ❌ FAIL (A5) | Lines 21-23: Commented out, no verification |
| WhatsApp verify token | ❌ FAIL (A5) | Line 46: Returns OK without verification |
| Remove webhooks (preferred) | ❌ NOT DONE | Webhooks still deployed |

**A3 Verdict:** ❌ FAIL — Orders function trusts client prices, no server-side validation.

**A4 Verdict:** ❌ FAIL — No strict schemas, CORS `"*"`, no body limits, no rate limiting.

**A5 Verdict:** ❌ FAIL — Webhooks lack signature verification; should be removed or verified.

**A6 Verdict:** ❌ FAIL — `get-upload-url` doesn't validate MIME type (PDF/DOC/DOCX) or size (2 MB) before issuing signed URL; bucket config missing `allowed_mime_types` and `file_size_limit`.

**A7 Verdict:** ❌ FAIL — Edge Functions also use `Date.now().toString(36)` for numbers (UTC, collision-prone).

**A8 Verdict:** ❌ FAIL — Booking slot check is racy.

---

## 4. FRONTEND (`js/main.js`, `js/support.js`, HTML)

### A9: Frontend Honesty Fixes
| Requirement | Status | Evidence |
|-------------|--------|----------|
| Remove "You'll receive WhatsApp shortly" | ❌ FAIL | Lines 1535, 1885: Text still present |
| Replace with "We have received your order. We'll confirm shortly." | ❌ FAIL | Not done |
| Show clear error + phone on API failure, keep cart | ⚠️ PARTIAL | Toast shows error but cart clearing logic unclear |
| Blank fake WhatsApp number | ✅ PASS | `config.json` line 20: `"whatsapp": ""` |
| Hide WhatsApp buttons when number empty | ⚠️ UNVERIFIED | `support.js` line 8 checks `whatsappVerified` but buttons may still render |
| Restore `_sample: true` on all menu items | ✅ PASS | `menu.json` has `_sample: true` on all 77 items + meta |
| Show "Sample menu for preview" notice driven by `menu_is_sample` | ❌ FAIL | No `menu_is_sample` in config; "sample" label hardcoded in JS lines 961, 1190 |
| Replace build-time variables mentions in docs | ✅ PASS | No build-time variables in docs |
| Tax: no hardcoded rates, read from settings | ❌ FAIL | `config.json` line 58: `"taxRate": 0` with `_sample: true`; no settings table |

### A10: Unverified Claims
| Requirement | Status | Evidence |
|-------------|--------|----------|
| No "Cheesecake Factory" references | ✅ PASS | Grep returns 0 matches |
| No masked phone `5****4372` | ✅ PASS | Grep returns 0 matches |

**A9 Verdict:** ❌ FAIL — Multiple honesty issues remain (WhatsApp text, missing `menu_is_sample`, hardcoded tax).

**A10 Verdict:** ✅ PASS — No false claims in codebase.

---

## 5. MIGRATIONS (Part B) — NOT STARTED

| Migration | Status |
|-----------|--------|
| `admin_users` table | ❌ NOT STARTED |
| `is_admin()` / `is_owner()` SECURITY DEFINER functions | ❌ NOT STARTED |
| `order_status_history` + trigger with validated transitions | ❌ NOT STARTED |
| `orders` additions: `payment_status`, `payment_method`, `order_type` | ❌ NOT STARTED |
| `settings` table + `public_settings` view | ❌ NOT STARTED |
| Admin RLS policies (all tables) | ❌ NOT STARTED |
| Storage policies (admin read cv-uploads, manage menu-images) | ❌ NOT STARTED |
| Realtime on orders/bookings | ❌ NOT STARTED |
| Stats view/RPC for dashboard | ❌ NOT STARTED |
| SQL tests (`/supabase/tests`) | ❌ NOT STARTED |
| `/docs/SETUP_SUPABASE.md` | ❌ NOT STARTED |

---

## 6. ADMIN PANEL (Part C) — NOT STARTED

| Page/Feature | Status |
|--------------|--------|
| Login + auth guard + admin check | ❌ NOT STARTED |
| Dashboard with stats | ❌ NOT STARTED |
| Orders list + realtime + status flow + print | ❌ NOT STARTED |
| Menu manager CRUD + image upload + `menu_is_sample` toggle | ❌ NOT STARTED |
| Bookings filter/confirm/cancel | ❌ NOT STARTED |
| Applications list + status + signed CV URL | ❌ NOT STARTED |
| Messages list + mark read | ❌ NOT STARTED |
| Settings (owner only) + CSV export | ❌ NOT STARTED |
| Staff management (owner only) | ❌ NOT STARTED |
| Public site reads `public_settings` with fallback | ❌ NOT STARTED |
| Admin JS as ES modules under `/admin/js` | ❌ NOT STARTED |

---

## 7. DOCS — NOT STARTED

| Doc | Status |
|-----|--------|
| README update | ❌ NOT STARTED |
| `/docs/SETUP_SUPABASE.md` | ❌ NOT STARTED |
| `DEPLOY.md` (Netlify/Vercel/GitHub Pages) | ❌ NOT STARTED |
| TODO FOR OWNER list | ❌ NOT STARTED |

---

## 8. GIT & BRANCHING

| Rule | Status |
|------|--------|
| Branch `feat/admin-backend` from current HEAD | ❌ NOT CREATED (still on `main`) |
| No direct push to main | ✅ PASS (local only) |
| No force-push | ✅ PASS |
| Pre-commit secret scan | ❌ NOT IMPLEMENTED |
| One commit per task | ❌ NOT STARTED |
| Push to `feat/admin-backend` | ❌ BLOCKED (branch missing) |

---

## SUMMARY VERDICTS

| Section | Verdict | Blockers |
|---------|---------|----------|
| **A1: Secrets/Git** | ✅ PASS | — |
| **A2: Public INSERT RLS** | ❌ FAIL | 4 policies must be removed |
| **A3: Orders server-side pricing** | ❌ FAIL | Function trusts client |
| **A4: Input validation/CORS/rate limit** | ❌ FAIL | All functions lack these |
| **A5: Webhooks** | ❌ FAIL | No verification; should remove |
| **A6: Storage CV upload validation** | ❌ FAIL | No MIME/size check; bucket config missing |
| **A7: Number generation** | ❌ FAIL | UTC date, race-prone counter |
| **A8: Booking race condition** | ❌ FAIL | Read-then-insert |
| **A9: Frontend honesty** | ❌ FAIL | WhatsApp text, missing `menu_is_sample`, hardcoded tax |
| **A10: Unverified claims** | ✅ PASS | Clean |
| **Part B Migrations** | ❌ NOT STARTED | 10+ migrations needed |
| **Part C Admin Panel** | ❌ NOT STARTED | 10+ pages/components |
| **Docs** | ❌ NOT STARTED | 3 docs needed |
| **Git/Branching** | ❌ NOT STARTED | Branch missing |

---

## IMMEDIATE ACTIONS REQUIRED (Before Any Deploy)

1. **Create `feat/admin-backend` branch** and switch to it
2. **Fix `supabase-schema.sql`**: Add missing 5 core tables, fix triggers to use `timezone('Asia/Kolkata', now())` and Postgres sequences
3. **Remove public INSERT policies** on orders, bookings, job_applications, contact_messages
4. **Rewrite orders function** to validate items against `menu_items`, compute totals server-side, reject unavailable/unknown items, enforce quantity bounds
5. **Add strict input validation** to all functions (Zod or manual schemas)
6. **Set CORS to specific origins** (from env), add body size limits, implement rate limiting
7. **Remove webhook functions** (or add HMAC/verify token verification)
8. **Fix storage**: Add `allowed_mime_types` and `file_size_limit` to `cv-uploads` bucket; validate in `get-upload-url`
9. **Frontend**: Remove WhatsApp confirmation text, add `menu_is_sample` to config and use it, show "We have received..." message
10. **Create `supabase/migrations`** folder with numbered migration files for Part B

---

## OWNER VALUES STILL NEEDED (DO NOT GUESS)

| Value | Config Key | Status |
|-------|------------|--------|
| Verified WhatsApp Business number (12-digit, starts with 91) | `contact.whatsapp` | ❌ Empty |
| `whatsappVerified` flag | `contact.whatsappVerified` | ❌ false |
| Opening hours (verified) | `hours.schedule` + `hours.verified` | ❌ Empty + false |
| Address confirmation | `contact.address` | ⚠️ Note: listing discrepancy |
| Delivery fee (INR) | `ordering.deliveryFee` | ❌ 0 (sample) |
| Minimum order for delivery | `ordering.minOrderDelivery` | ❌ 0 (sample) |
| Tax percent | `tax_percent` (in settings table) | ❌ 0 (sample) |
| Booking capacity per slot | `booking_capacity_per_slot` (in settings) | ❌ Not in config |
| Real menu prices + photos | `data/menu.json` items + `assets/menu/` | ❌ All `_sample: true` |
| Social profile URLs | `social.*` | ❌ Empty |

---

## NEXT STEP

**T1: Part A Security & Logic Fixes (A1-A8)**  
Create `feat/admin-backend` branch, then implement fixes for A2-A8 in small commits.
