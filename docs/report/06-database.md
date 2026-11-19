# Database tables, rules and permissions

## How it works

1. Migration 001 creates the six core tables. A sequence is a database counter that hands out a new number on request. Separate counters serve orders, bookings and applications. A trigger is a database hook that runs when a row changes. Before inserts, the three numbering triggers take an Asia/Kolkata date and attach the full sequence value with a minimum width of three digits.
2. Migration 002 connects `admin_users.user_id` to `auth.users.id`. `is_admin` checks for staff or owner membership, and `is_owner` checks the owner role. `public_settings` exposes a whitelist of 12 settings rows as key/value pairs.
3. Migration 003 validates order, booking and application status changes. A separate order trigger records the old and new status and actor in `order_status_history` when the status changes.
4. Migration 004 grants narrowly scoped updates, creates Storage policies and buckets, and publishes order and booking changes. It adds the dashboard queries, a shared rate limiter and the booking reservation function.
5. Migration 006 removes known legacy policies, upserts bucket definitions and inserts missing settings or categories. A legacy Chinese category is renamed by slug when that preserves the existing ID. The seed uses category slugs to resolve foreign keys and deterministic IDs to avoid overwrites.

### Sequences, triggers and routines

| Routine or object | Logic |
|---|---|
| `order_seq`, `booking_seq`, `application_seq` | Independent monotonically advancing counters. Rollback does not restore consumed values. |
| `generate_order_number` / `trigger_generate_order_number` | Before orders INSERT, writes CDL-date-sequence into `order_number`. |
| `generate_booking_number` / `trigger_generate_booking_number` | Before bookings INSERT, writes BK-date-sequence into `booking_number`. |
| `generate_application_number` / `trigger_generate_application_number` | Before application INSERT, writes APP-date-sequence into `application_number`. |
| `update_updated_at_column` | Sets updated_at on UPDATE. Triggers are `update_menu_items_updated_at`, `update_orders_updated_at`, `update_bookings_updated_at`, `update_applications_updated_at`. |
| `is_admin`, `is_owner` | Read the Auth user membership as the function owner so policies can evaluate membership without recursion. |
| `validate_order_status_transition` / `trigger_validate_order_status_transition` | Pending → confirmed. Confirmed → preparing/ready/cancelled. Preparing → ready/cancelled. Ready → out for delivery/completed/cancelled. Out for delivery → completed. |
| `insert_order_status_history` / `trigger_insert_order_status_history` | After a changed order status, writes order_id, from_status, to_status and the authenticated actor. |
| `validate_booking_status_transition` / `trigger_validate_booking_status_transition` | Pending → confirmed/cancelled. Confirmed → completed/cancelled/no show. |
| `validate_application_status_transition` / `trigger_validate_application_status_transition` | Pending → reviewing/rejected. Reviewing → shortlisted/rejected. Shortlisted → hired/rejected. |
| `protect_payment_update` function and same-name trigger | Blocks authenticated non-owners from changing an order's payment status. |
| `reserve_booking(details)` | Rejects past India-time slots, acquires a transaction lock derived from the date/time, counts pending and confirmed bookings against capacity, then inserts and returns the booking. |
| `allow_submission(endpoint, visitor)` | Counts arrivals per hashed visitor and endpoint in minute buckets. Applications and contact have a limit of 10 each. Deletes buckets older than 10 minutes. |
| `get_admin_dashboard_stats` | Checks membership and aggregates the four admin views into JSON. |

### Views

| View | Reads |
|---|---|
| `public_settings` | The whitelisted settings keys, without update metadata |
| `admin_today_stats` | India-day order count, state counts and total submitted order value |
| `admin_today_bookings` | Bookings on today's India date and selected status counts |
| `admin_recent_activity` | Pending applications and new contact messages |
| `admin_top_items_7d` | Item quantities and value from accepted and completed order states over the past seven days |

### Effective browser access

S = SELECT, I = INSERT, U = UPDATE, D = DELETE. A dash means no access through the application policies. Browser roles all share the underlying authenticated SQL role after sign-in. Membership checks distinguish staff and owner.

| Relation | Anonymous | Signed in without membership | Staff | Owner |
|---|---|---|---|---|
| menu_categories / menu_items | S active / available in active category | Same | Same | S/I/U/D |
| orders | S empty, I denied | S empty | S/U status | S/U status and payment status/D |
| bookings / job_applications / contact_messages | S empty, I denied | S empty | S/U status | S/U status/D |
| order_status_history | — | — | S | S |
| admin_users | — | S own row if present | S own row | S/I/U/D |
| settings | — | — | — | S/I/U/D |
| public_settings | S whitelist | S whitelist | S whitelist | S whitelist |
| submission_limits | — | — | — | — |
| storage.objects / menu-images and og-images | S public | S public | S public | S/I/U/D |
| storage.objects / cv-uploads | — | — | S | S |

Public function routes use built-in privileged credentials for allowed writes. Those credentials bypass RLS, so handlers must validate input. A specific signed upload authorizes writing a named CV object. Bucket settings enforce private CVs at 2 MiB with PDF/DOC/DOCX, public menu images at 5 MiB with JPEG/PNG/WebP, and public OG images at 2 MiB with the same image formats.

## Where to look

Canonical SQL lives in `supabase/migrations/001_core_schema.sql`, `002_admin_settings.sql`, `003_order_status_history.sql`, `004_admin_rls_storage_realtime.sql` and `006_cleanup_legacy.sql`. The tables and policy names below are transcribed from those declarations. Use the verification guide to compare hosted metadata.


### Table reference

Columns without NOT NULL are nullable unless a primary key makes them required. Table and column constraints appear as written.

#### menu_categories

Catalog groups and route slugs. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `name` | `TEXT NOT NULL` |
| `slug` | `TEXT UNIQUE NOT NULL` |
| `description` | `TEXT` |
| `display_order` | `INT DEFAULT 0` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### menu_items

Available dishes and whole-rupee prices. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `category_id` | `UUID REFERENCES menu_categories(id) ON DELETE CASCADE` |
| `name` | `TEXT NOT NULL` |
| `description` | `TEXT` |
| `price_inr` | `INT NOT NULL` |
| `veg` | `BOOLEAN DEFAULT true` |
| `image_url` | `TEXT` |
| `tags` | `TEXT[] DEFAULT '{}'` |
| `is_available` | `BOOLEAN DEFAULT true` |
| `display_order` | `INT DEFAULT 0` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### orders

Order snapshots, totals, fulfillment and payment state. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `order_number` | `TEXT UNIQUE NOT NULL` |
| `customer_name` | `TEXT NOT NULL` |
| `customer_phone` | `TEXT NOT NULL` |
| `customer_email` | `TEXT` |
| `order_type` | `TEXT CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')) DEFAULT 'dine_in'` |
| `delivery_address` | `JSONB` |
| `items` | `JSONB NOT NULL` |
| `subtotal_inr` | `INT NOT NULL` |
| `delivery_fee_inr` | `INT DEFAULT 0` |
| `tax_inr` | `INT NOT NULL` |
| `total_inr` | `INT NOT NULL` |
| `status` | `TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')) DEFAULT 'pending'` |
| `payment_status` | `TEXT CHECK (payment_status IN ('unpaid', 'paid', 'refunded')) DEFAULT 'unpaid'` |
| `payment_method` | `TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'razorpay', 'stripe'))` |
| `payment_id` | `TEXT` |
| `notes` | `TEXT` |
| `whatsapp_sent` | `BOOLEAN DEFAULT false` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### bookings

Table requests and requested slots. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_number` | `TEXT UNIQUE NOT NULL` |
| `customer_name` | `TEXT NOT NULL` |
| `customer_phone` | `TEXT NOT NULL` |
| `customer_email` | `TEXT` |
| `booking_date` | `DATE NOT NULL` |
| `booking_time` | `TIME NOT NULL` |
| `guests` | `INT CHECK (guests > 0 AND guests <= 20) NOT NULL` |
| `special_requests` | `TEXT` |
| `status` | `TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending'` |
| `whatsapp_sent` | `BOOLEAN DEFAULT false` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### job_applications

Applicant, review state and private CV path. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `application_number` | `TEXT UNIQUE NOT NULL` |
| `full_name` | `TEXT NOT NULL` |
| `email` | `TEXT NOT NULL` |
| `phone` | `TEXT NOT NULL` |
| `role` | `TEXT NOT NULL` |
| `cv_url` | `TEXT` |
| `address` | `TEXT` |
| `status` | `TEXT CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')) DEFAULT 'pending'` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### contact_messages

Incoming contact requests. Defined in `001_core_schema.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `name` | `TEXT NOT NULL` |
| `email` | `TEXT NOT NULL` |
| `phone` | `TEXT` |
| `subject` | `TEXT` |
| `message` | `TEXT NOT NULL` |
| `status` | `TEXT CHECK (status IN ('new', 'read', 'replied', 'archived')) DEFAULT 'new'` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### admin_users

Auth membership and owner/staff roles. Defined in `002_admin_settings.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `user_id` | `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` |
| `role` | `TEXT NOT NULL CHECK (role IN ('owner', 'staff'))` |
| `display_name` | `TEXT` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### settings

Owner-managed key/value settings. Defined in `002_admin_settings.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `key` | `TEXT PRIMARY KEY` |
| `value` | `JSONB NOT NULL` |
| `updated_by` | `UUID REFERENCES auth.users(id)` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### order_status_history

Order status audit trail. Defined in `003_order_status_history.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `order_id` | `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE` |
| `from_status` | `TEXT` |
| `to_status` | `TEXT NOT NULL` |
| `changed_by` | `UUID REFERENCES auth.users(id)` |
| `note` | `TEXT` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### submission_limits

Shared minute counters for public submissions. Defined in `004_admin_rls_storage_realtime.sql`.

| Column or table rule | Type, default and constraints |
|---|---|
| `endpoint` | `text NOT NULL` |
| `visitor` | `text NOT NULL` |
| `minute` | `timestamptz NOT NULL` |
| `hits` | `integer NOT NULL` |
| `PRIMARY` | `KEY (endpoint, visitor, minute)` |

### Final policy reference

The table shows each policy after applying all migrations. Table grants and the payment trigger further restrict writes.

| Relation | Policy | Rule | Last declared in |
|---|---|---|---|
| `admin_users` | `Admin users can read themselves` | `FOR SELECT USING (auth.uid() = user_id)` | `002_admin_settings.sql` |
| `admin_users` | `Owners can manage admin users` | `FOR ALL USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `bookings` | `Admins can read all bookings` | `FOR SELECT USING (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `bookings` | `Owners can delete bookings` | `FOR DELETE USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `bookings` | `Staff can update booking status` | `FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `contact_messages` | `Admins can read all messages` | `FOR SELECT USING (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `contact_messages` | `Owners can delete messages` | `FOR DELETE USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `contact_messages` | `Staff can update message status` | `FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `job_applications` | `Admins can read all applications` | `FOR SELECT USING (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `job_applications` | `Owners can delete applications` | `FOR DELETE USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `job_applications` | `Staff can update application status` | `FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `menu_categories` | `Owners can manage menu categories` | `FOR ALL USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `menu_categories` | `Public read menu categories` | `FOR SELECT USING (is_active = true)` | `001_core_schema.sql` |
| `menu_items` | `Owners can manage menu items` | `FOR ALL USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `menu_items` | `Public read menu items` | `FOR SELECT USING (is_available AND EXISTS (SELECT 1 FROM public.menu_categories c WHERE c.id = category_id AND c.is_active))` | `006_cleanup_legacy.sql` |
| `order_status_history` | `Admins can read order status history` | `FOR SELECT USING (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `orders` | `Admins can read all orders` | `FOR SELECT USING (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `orders` | `Owners can delete orders` | `FOR DELETE USING (is_owner())` | `004_admin_rls_storage_realtime.sql` |
| `orders` | `Staff can update order status` | `FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `settings` | `Owners can manage settings` | `FOR ALL USING (is_owner())` | `002_admin_settings.sql` |
| `storage.objects` | `Admins can read CVs` | `FOR SELECT USING (bucket_id = 'cv-uploads' AND is_admin())` | `004_admin_rls_storage_realtime.sql` |
| `storage.objects` | `Owners can manage menu images` | `FOR ALL TO authenticated USING (bucket_id = 'menu-images' AND public.is_owner()) WITH CHECK (bucket_id = 'menu-images' AND public.is_owner())` | `006_cleanup_legacy.sql` |
| `storage.objects` | `Owners can manage og images` | `FOR ALL TO authenticated USING (bucket_id = 'og-images' AND public.is_owner()) WITH CHECK (bucket_id = 'og-images' AND public.is_owner())` | `006_cleanup_legacy.sql` |
| `storage.objects` | `Public read menu images` | `FOR SELECT USING (bucket_id = 'menu-images')` | `004_admin_rls_storage_realtime.sql` |
| `storage.objects` | `Public read og images` | `FOR SELECT USING (bucket_id = 'og-images')` | `004_admin_rls_storage_realtime.sql` |
