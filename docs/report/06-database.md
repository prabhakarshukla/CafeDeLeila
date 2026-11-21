# The kitchen records, one sheet at a time

## What this part does

Think of the database as linked Excel sheets. Each table is one sheet, each row is a single entry, and each column is one detail about that entry. Supabase holds these sheets behind the café window.

## How it works, step by step

1. When the Orders waiter receives dish IDs and quantities, it reads the active menu rows and calculates the total again. If two dishes cost ₹120 each, the subtotal is ₹240 even if the phone submits a made-up total.
2. A sequence is a counter. A trigger is an automatic database action. The number triggers in 001 and 006 use counters to give orders `CDL-`, bookings `BK-`, and applications `APP-` references. Migration 007 keeps new numbers above ones already issued.
3. The order starts at `pending`. The office can confirm, prepare, make ready, then complete it. Only delivery orders can go `out_for_delivery`. The permitted next steps are in `js/workflow.mjs` and 007.
4. The security guard uses RLS, or Row Level Security. It reads `admin_users` to see who you are allowed to be. `guard_staff_columns` lets staff change permitted status values, and it rejects edits to totals and customer details. `order_status_history` records order status changes.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `supabase/migrations/001_core_schema.sql` | Creates the main café sheets. |
| `supabase/migrations/002_admin_settings.sql` | Stores who works in the office and which settings are public. |
| `supabase/migrations/003_order_status_history.sql` | Adds a log of changes to orders. |
| `supabase/migrations/004_admin_rls_storage_realtime.sql` | Sets the guard's access rules and configures file storage and booking limits. |
| `supabase/migrations/006_cleanup_legacy.sql` | Removes old permissions and limits what staff can change. |
| `supabase/migrations/007_align_legacy_schema.sql` | Sets the current status vocabulary and checks each update. |
| `js/workflow.mjs` | Lists status choices shown in the office. |

## What can go wrong and what to check

Staff and owners both may see an order. The guard still checks which columns a staff member changes. An operator can compare the detailed rules below with a read-only SQL export.

## Try it yourself

Sketch the `menu_items` and `orders` sheets. Add a dish ID and a sample quantity. Circle the place where the server looks up its price.

## Kitchen records reference

### Sequences, triggers and routines

| Routine or object | Logic |
|---|---|
| `order_seq`, `booking_seq`, `application_seq` | Independent monotonically advancing counters. Rollback does not restore consumed values. |
| `generate_order_number` / `trigger_generate_order_number` | Before orders INSERT, writes CDL-date-sequence into `order_number`. |
| `generate_booking_number` / `trigger_generate_booking_number` | Before bookings INSERT, writes BK-date-sequence into `booking_number`. |
| `generate_application_number` / `trigger_generate_application_number` | Before application INSERT, writes APP-date-sequence into `application_number`. |
| `update_updated_at_column` | Sets updated_at on UPDATE. Triggers are `update_menu_items_updated_at`, `update_orders_updated_at`, `update_bookings_updated_at`, `update_applications_updated_at`. |
| `is_admin`, `is_owner` | Stable SQL functions read membership as the function owner, with an empty search path and qualified references. Anonymous and authenticated callers can execute both. |
| `validate_order_status_transition` / `trigger_validate_order_status_transition` | Pending → confirmed. Confirmed → preparing/ready/cancelled. Preparing → ready/cancelled. Ready → completed/cancelled, or out for delivery for delivery orders. Out for delivery → completed. |
| `insert_order_status_history` / `trigger_insert_order_status_history` | After a changed order status, writes order_id, from_status, to_status and the authenticated actor. |
| `validate_booking_status_transition` / `trigger_validate_booking_status_transition` | Pending → confirmed/cancelled. Confirmed → completed/cancelled/no show. |
| `validate_application_status_transition` / `trigger_validate_application_status_transition` | Pending → reviewing/rejected. Reviewing → shortlisted/rejected. Shortlisted → hired/rejected. |
| `validate_contact_status_transition` / `trigger_validate_contact_status_transition` | New → read → replied → archived. Archived is terminal. |
| `guard_staff_columns` / `aa_guard_staff_columns` | Runs before the other update triggers on orders, bookings, applications, and messages. It protects all columns from staff edits except order status and payment status, status on the other tables, and `updated_at` where present. Owners and callers without an Auth UID bypass this guard. Migration 006 removes the older `protect_payment_update` trigger. |
| `reserve_booking(details)` | Rejects past India-time slots, acquires a transaction lock derived from the date/time, counts pending and confirmed bookings against capacity, then inserts and returns the booking. |
| `allow_submission(endpoint, visitor)` | Counts arrivals per hashed visitor and endpoint in minute buckets. Applications and contact have a limit of 10 each. Deletes buckets older than 10 minutes. |
| `get_admin_dashboard_stats` | Accepts authenticated calls, rejects non-admins with `42501`, and aggregates the four admin views into JSON. |

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
| orders | S empty, I denied | S empty | S/U status, payment status and timestamp | S/U/D |
| bookings / job_applications / contact_messages | S empty, I denied | S empty | S/U status and timestamp where present | S/U/D |
| order_status_history | — | — | S | S |
| admin_users | — | S own row if present | S own row | S/I/U/D |
| settings | — | — | — | S/I/U/D |
| public_settings | S whitelist | S whitelist | S whitelist | S whitelist |
| submission_limits | — | — | — | — |
| storage.objects / menu-images and og-images | S public | S public | S public | S/I/U/D |
| storage.objects / cv-uploads | — | — | S | S |

Public function routes use built-in privileged credentials for allowed writes. Those credentials bypass RLS, so handlers must validate input. A specific signed upload authorizes writing a named CV object. Bucket settings enforce private CVs at 2 MiB with PDF/DOC/DOCX, public menu images at 5 MiB with JPEG/PNG/WebP, and public OG images at 2 MiB with the same image formats.

The four admin stats views use `security_invoker` and grant browser access only to the authenticated role. The underlying row policies still apply. Anonymous and authenticated roles cannot execute the number generators directly. Inserts with the service role still get references through the existing triggers.

## Where to look

Canonical SQL lives in `supabase/migrations/001_core_schema.sql`, `002_admin_settings.sql`, `003_order_status_history.sql`, `004_admin_rls_storage_realtime.sql`, `006_cleanup_legacy.sql` and `007_align_legacy_schema.sql`. The tables and policy names below are transcribed from those declarations. Use the verification guide to compare hosted metadata.


### Table reference

Columns without NOT NULL are nullable unless a primary key makes them required. Table and column constraints appear as written.

Orders use `dine_in`, `takeaway`, and `delivery`. Only delivery orders can enter `out_for_delivery`. Bookings use `no_show`. Applications start at `pending`, and contact messages start at `new`. The stored values also appear in CSV exports. Admin labels display **Dine In** and **No Show**.

#### menu_categories

Catalog groups and route slugs. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `name` | The name displayed or entered on this record. | `TEXT NOT NULL` |
| `slug` | Short unique label used in addresses and searches. | `TEXT UNIQUE NOT NULL` |
| `description` | Short text that describes the item or category. | `TEXT` |
| `display_order` | Number used to decide which entry comes first. | `INT DEFAULT 0` |
| `is_active` | Whether the category can appear in the public menu. | `BOOLEAN DEFAULT true` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |

#### menu_items

Available dishes and whole-rupee prices. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `category_id` | ID that joins this dish to its category. | `UUID REFERENCES menu_categories(id) ON DELETE CASCADE` |
| `name` | The name displayed or entered on this record. | `TEXT NOT NULL` |
| `description` | Short text that describes the item or category. | `TEXT` |
| `price_inr` | Price of one dish, in whole Indian rupees. | `INT NOT NULL` |
| `veg` | Whether the dish is marked vegetarian. | `BOOLEAN DEFAULT true` |
| `image_url` | Allowed image address or local file path. | `TEXT` |
| `tags` | Short labels, such as spicy or popular. | `TEXT[] DEFAULT '{}'` |
| `is_available` | Whether the café offers this dish now. | `BOOLEAN DEFAULT true` |
| `display_order` | Number used to decide which entry comes first. | `INT DEFAULT 0` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### orders

Order snapshots, totals, fulfillment and payment state. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `order_number` | Customer-facing order reference beginning CDL-. | `TEXT UNIQUE NOT NULL` |
| `customer_name` | Name supplied by the person making the request. | `TEXT NOT NULL` |
| `customer_phone` | Contact number supplied by the customer. | `TEXT NOT NULL` |
| `customer_email` | Optional customer email. | `TEXT` |
| `order_type` | Whether the meal is dine-in, takeaway, or delivery. Stored names use underscores. | `TEXT CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')) DEFAULT 'dine_in'` |
| `delivery_address` | Address details for a delivery. | `JSONB` |
| `items` | List of dish IDs, names, trusted prices, and quantities saved with the order. | `JSONB NOT NULL` |
| `subtotal_inr` | Total for dishes before tax and delivery. | `INT NOT NULL` |
| `delivery_fee_inr` | Additional delivery cost in rupees. | `INT DEFAULT 0` |
| `tax_inr` | Tax calculated by the waiter in whole rupees. | `INT NOT NULL` |
| `total_inr` | Final amount for the order. | `INT NOT NULL` |
| `status` | Current step of this order, booking, application, or message. | `TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')) DEFAULT 'pending'` |
| `payment_status` | Payment state recorded in the office. It starts as unpaid. | `TEXT CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')) DEFAULT 'unpaid'` |
| `payment_method` | How the customer paid, when recorded. | `TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'razorpay', 'stripe'))` |
| `payment_id` | Optional reference for an external payment. | `TEXT` |
| `notes` | Extra instructions or notes from the customer. | `TEXT` |
| `whatsapp_sent` | Stored flag for whether a WhatsApp notice was sent. Automatic sending is not built. | `BOOLEAN DEFAULT false` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### bookings

Table requests and requested slots. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_number` | Customer-facing booking reference beginning BK-. | `TEXT UNIQUE NOT NULL` |
| `customer_name` | Name supplied by the person making the request. | `TEXT NOT NULL` |
| `customer_phone` | Contact number supplied by the customer. | `TEXT NOT NULL` |
| `customer_email` | Optional customer email. | `TEXT` |
| `booking_date` | Day requested for the table reservation. | `DATE NOT NULL` |
| `booking_time` | Local time requested for that booking. | `TIME NOT NULL` |
| `guests` | Number of people expected at the table. | `INT CHECK (guests > 0 AND guests <= 20) NOT NULL` |
| `special_requests` | Optional access, seating or other booking requests. | `TEXT` |
| `status` | Current step of this order, booking, application, or message. | `TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending'` |
| `whatsapp_sent` | Stored flag for whether a WhatsApp notice was sent. Automatic sending is not built. | `BOOLEAN DEFAULT false` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### job_applications

Applicant, review state and private CV path. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `application_number` | Customer-facing application reference beginning APP-. | `TEXT UNIQUE NOT NULL` |
| `full_name` | Name supplied by the applicant. | `TEXT NOT NULL` |
| `email` | Email supplied on the form. | `TEXT NOT NULL` |
| `phone` | Phone number supplied on the form. | `TEXT NOT NULL` |
| `role` | Job chosen by an applicant, or an owner or staff role in the admin list. | `TEXT NOT NULL` |
| `cv_url` | Stored path to the private CV file. The office requests a temporary link separately. | `TEXT` |
| `address` | Address supplied by the applicant. | `TEXT` |
| `status` | Current step of this order, booking, application, or message. | `TEXT CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')) DEFAULT 'pending'` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### contact_messages

Incoming contact requests. Defined in `001_core_schema.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `name` | The name displayed or entered on this record. | `TEXT NOT NULL` |
| `email` | Email supplied on the form. | `TEXT NOT NULL` |
| `phone` | Phone number supplied on the form. | `TEXT` |
| `subject` | Short subject chosen for the message. | `TEXT` |
| `message` | Words the customer sends to the café. | `TEXT NOT NULL` |
| `status` | Current step of this order, booking, application, or message. | `TEXT CHECK (status IN ('new', 'read', 'replied', 'archived')) DEFAULT 'new'` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |

#### admin_users

Auth membership and owner/staff roles. Defined in `002_admin_settings.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `user_id` | ID of the signed-in account on the admin list. | `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` |
| `role` | Job chosen by an applicant, or an owner or staff role in the admin list. | `TEXT NOT NULL CHECK (role IN ('owner', 'staff'))` |
| `display_name` | Optional name to show for a staff or owner account. | `TEXT` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### settings

Owner-managed key/value settings. Defined in `002_admin_settings.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `key` | Name used to look up a particular setting. | `TEXT PRIMARY KEY` |
| `value` | Stored contents of that setting. | `JSONB NOT NULL` |
| `updated_by` | ID of the account that changed a setting. | `UUID REFERENCES auth.users(id)` |
| `updated_at` | Date and time the row was last changed. | `TIMESTAMPTZ DEFAULT NOW()` |

#### order_status_history

Order status audit trail. Defined in `003_order_status_history.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `id` | Unique ID used by programs to find this row. Different entries get different IDs. | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `order_id` | ID of the order that the history entry belongs to. | `UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE` |
| `from_status` | Previous order state. | `TEXT` |
| `to_status` | New order state. | `TEXT NOT NULL` |
| `changed_by` | Account that moved the order to a new state, if available. | `UUID REFERENCES auth.users(id)` |
| `note` | Optional extra detail about the status change. | `TEXT` |
| `created_at` | Date and time this row was made. | `TIMESTAMPTZ DEFAULT NOW()` |

#### submission_limits

Shared minute counters for public submissions. Defined in `004_admin_rls_storage_realtime.sql`.

| Column | What it means | Exact SQL type or rule |
|---|---|---|
| `endpoint` | Name of the waiter that received the submission. | `text NOT NULL` |
| `visitor` | Hashed visitor clue used to count repeat requests. | `text NOT NULL` |
| `minute` | Time window for this counter. | `timestamptz NOT NULL` |
| `hits` | How many requests this visitor made during the minute. | `integer NOT NULL` |
| `PRIMARY` | Together these three details identify one counter. | `KEY (endpoint, visitor, minute)` |

### Final policy reference

The table shows each policy after applying all migrations. Table grants and the staff column guard further restrict writes.

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
