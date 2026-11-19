-- ============================================
-- CAFÉ DE LEILA — MIGRATION 004
-- Admin RLS policies, storage policies, realtime, stats view
-- Run in Supabase SQL Editor AFTER 003_order_status_history.sql
-- ============================================

-- ============================================
-- ADMIN RLS POLICIES
-- ============================================

-- ========== ORDERS ==========
-- Admins can read all orders
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
CREATE POLICY "Admins can read all orders" ON orders
  FOR SELECT USING (is_admin());

-- Staff can update order status and payment fields
DROP POLICY IF EXISTS "Staff can update order status" ON orders;
CREATE POLICY "Staff can update order status" ON orders
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Only owners can delete orders
DROP POLICY IF EXISTS "Owners can delete orders" ON orders;
CREATE POLICY "Owners can delete orders" ON orders
  FOR DELETE USING (is_owner());

-- ========== BOOKINGS ==========
-- Admins can read all bookings
DROP POLICY IF EXISTS "Admins can read all bookings" ON bookings;
CREATE POLICY "Admins can read all bookings" ON bookings
  FOR SELECT USING (is_admin());

-- Staff can update booking status
DROP POLICY IF EXISTS "Staff can update booking status" ON bookings;
CREATE POLICY "Staff can update booking status" ON bookings
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Only owners can delete bookings
DROP POLICY IF EXISTS "Owners can delete bookings" ON bookings;
CREATE POLICY "Owners can delete bookings" ON bookings
  FOR DELETE USING (is_owner());

-- ========== JOB APPLICATIONS ==========
-- Admins can read all applications
DROP POLICY IF EXISTS "Admins can read all applications" ON job_applications;
CREATE POLICY "Admins can read all applications" ON job_applications
  FOR SELECT USING (is_admin());

-- Staff can update application status
DROP POLICY IF EXISTS "Staff can update application status" ON job_applications;
CREATE POLICY "Staff can update application status" ON job_applications
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Only owners can delete applications
DROP POLICY IF EXISTS "Owners can delete applications" ON job_applications;
CREATE POLICY "Owners can delete applications" ON job_applications
  FOR DELETE USING (is_owner());

-- ========== CONTACT MESSAGES ==========
-- Admins can read all messages
DROP POLICY IF EXISTS "Admins can read all messages" ON contact_messages;
CREATE POLICY "Admins can read all messages" ON contact_messages
  FOR SELECT USING (is_admin());

-- Staff can update message status
DROP POLICY IF EXISTS "Staff can update message status" ON contact_messages;
CREATE POLICY "Staff can update message status" ON contact_messages
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

-- Only owners can delete messages
DROP POLICY IF EXISTS "Owners can delete messages" ON contact_messages;
CREATE POLICY "Owners can delete messages" ON contact_messages
  FOR DELETE USING (is_owner());

-- ========== MENU CATEGORIES ==========
-- Owners can manage categories (CRUD)
DROP POLICY IF EXISTS "Owners can manage menu categories" ON menu_categories;
CREATE POLICY "Owners can manage menu categories" ON menu_categories
  FOR ALL USING (is_owner());

-- ========== MENU ITEMS ==========
-- Owners can manage menu items (CRUD)
DROP POLICY IF EXISTS "Owners can manage menu items" ON menu_items;
CREATE POLICY "Owners can manage menu items" ON menu_items
  FOR ALL USING (is_owner());

-- ========== ORDER STATUS HISTORY ==========
-- Admins can read history
DROP POLICY IF EXISTS "Admins can read order status history" ON order_status_history;
CREATE POLICY "Admins can read order status history" ON order_status_history
  FOR SELECT USING (is_admin());

-- ========== ADMIN USERS ==========
-- Owners can manage admin users
DROP POLICY IF EXISTS "Owners can manage admin users" ON admin_users;
CREATE POLICY "Owners can manage admin users" ON admin_users
  FOR ALL USING (is_owner());

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- ========== MENU IMAGES (public read, admin write) ==========
-- Public can read menu images
DROP POLICY IF EXISTS "Public read menu images" ON storage.objects;
CREATE POLICY "Public read menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

-- Admins can upload/manage menu images
DROP POLICY IF EXISTS "Admins can manage menu images" ON storage.objects;
CREATE POLICY "Admins can manage menu images" ON storage.objects
  FOR ALL USING (bucket_id = 'menu-images' AND is_owner());

-- ========== CV UPLOADS (private, admin read via signed URL) ==========
-- Authenticated users (applicants) can upload to their own folder
DROP POLICY IF EXISTS "Applicants can upload CVs" ON storage.objects;

-- Admins can read CVs (via signed URLs in admin panel)
DROP POLICY IF EXISTS "Admins can read CVs" ON storage.objects;
CREATE POLICY "Admins can read CVs" ON storage.objects
  FOR SELECT USING (bucket_id = 'cv-uploads' AND is_admin());

-- ========== OG IMAGES (public read, admin write) ==========
DROP POLICY IF EXISTS "Public read og images" ON storage.objects;
CREATE POLICY "Public read og images" ON storage.objects
  FOR SELECT USING (bucket_id = 'og-images');

DROP POLICY IF EXISTS "Admins can manage og images" ON storage.objects;
CREATE POLICY "Admins can manage og images" ON storage.objects
  FOR ALL USING (bucket_id = 'og-images' AND is_owner());

-- ============================================
-- REALTIME PUBLICATIONS
-- ============================================

-- Enable realtime on orders for admin dashboard live alerts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- ============================================
-- STATS VIEW / RPC FOR DASHBOARD (ADMIN ONLY)
-- ============================================

-- View: Today's orders and revenue (Asia/Kolkata day boundary)
CREATE OR REPLACE VIEW admin_today_stats AS
WITH today AS (
  SELECT timezone('Asia/Kolkata', now())::date AS day_start
),
today_orders AS (
  SELECT
    COUNT(*) AS order_count,
    COALESCE(SUM(total_inr), 0) AS revenue_inr,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'preparing') AS preparing_count,
    COUNT(*) FILTER (WHERE status = 'ready') AS ready_count,
    COUNT(*) FILTER (WHERE status = 'out_for_delivery') AS out_for_delivery_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count
  FROM orders, today
  WHERE created_at >= (today.day_start::timestamp AT TIME ZONE 'Asia/Kolkata')
    AND created_at < ((today.day_start + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
)
SELECT * FROM today_orders;

-- View: Today's bookings
CREATE OR REPLACE VIEW admin_today_bookings AS
WITH today AS (
  SELECT timezone('Asia/Kolkata', now())::date AS day_start
)
SELECT
  COUNT(*) AS booking_count,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
  COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_count
FROM bookings, today
WHERE booking_date = today.day_start;

-- View: Recent applications and messages
CREATE OR REPLACE VIEW admin_recent_activity AS
SELECT
  (SELECT COUNT(*) FROM job_applications WHERE status = 'pending') AS pending_applications,
  (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') AS new_messages;

-- View: Top items last 7 days
CREATE OR REPLACE VIEW admin_top_items_7d AS
WITH week_ago AS (
  SELECT now() - interval '7 days' AS start_date
),
order_items AS (
  SELECT
    jsonb_array_elements(o.items) AS item,
    o.created_at
  FROM orders o, week_ago
  WHERE o.created_at >= week_ago.start_date
    AND o.status IN ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed')
)
SELECT
  item->>'id' AS item_id,
  item->>'name' AS item_name,
  SUM((item->>'quantity')::int) AS total_quantity,
  SUM((item->>'price_inr')::int * (item->>'quantity')::int) AS total_revenue
FROM order_items
GROUP BY item->>'id', item->>'name'
ORDER BY total_quantity DESC
LIMIT 10;

-- Grant read access to admin roles
GRANT SELECT ON admin_today_stats TO authenticated;
GRANT SELECT ON admin_today_bookings TO authenticated;
GRANT SELECT ON admin_recent_activity TO authenticated;
GRANT SELECT ON admin_top_items_7d TO authenticated;

-- RLS on views (only admins can read)
ALTER VIEW admin_today_stats SET (security_invoker = true);
ALTER VIEW admin_today_bookings SET (security_invoker = true);
ALTER VIEW admin_recent_activity SET (security_invoker = true);
ALTER VIEW admin_top_items_7d SET (security_invoker = true);

-- ============================================
-- RPC FUNCTION: GET DASHBOARD STATS (single call)
-- ============================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'today', jsonb_build_object(
      'orders', (SELECT row_to_json(t) FROM admin_today_stats t),
      'bookings', (SELECT row_to_json(t) FROM admin_today_bookings t),
      'pending_applications', (SELECT pending_applications FROM admin_recent_activity),
      'new_messages', (SELECT new_messages FROM admin_recent_activity)
    ),
    'top_items_7d', (SELECT jsonb_agg(t) FROM admin_top_items_7d t)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test RLS policies (run as different users):
-- SET ROLE authenticated; -- as anon
-- SELECT * FROM orders; -- should fail for anon
-- SET ROLE authenticated; -- as staff (after adding to admin_users with role='staff')
-- SELECT * FROM orders; -- should work
-- UPDATE orders SET status = 'confirmed' WHERE id = <id>; -- should work for staff

-- Test realtime:
-- supabase.realtime.subscribe('orders', (payload) => console.log(payload))

-- Test RPC:
-- SELECT get_admin_dashboard_stats();

-- Test stats views:
-- SELECT * FROM admin_today_stats;
-- SELECT * FROM admin_today_bookings;
-- SELECT * FROM admin_recent_activity;
-- SELECT * FROM admin_top_items_7d;
-- Storage enforces the same limits as the clients.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
 ('cv-uploads', 'cv-uploads', false, 2097152, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
 ('menu-images', 'menu-images', true, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
 ('og-images', 'og-images', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- RLS decides which rows may be updated. Column grants narrow what staff can change.
REVOKE UPDATE ON orders, bookings, job_applications, contact_messages FROM anon, authenticated, PUBLIC;
GRANT UPDATE (status, payment_status) ON orders TO authenticated;
GRANT UPDATE (status) ON bookings, job_applications, contact_messages TO authenticated;
REVOKE ALL ON FUNCTION get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;

CREATE TABLE IF NOT EXISTS submission_limits (
  endpoint text NOT NULL,
  visitor text NOT NULL,
  minute timestamptz NOT NULL,
  hits integer NOT NULL,
  PRIMARY KEY (endpoint, visitor, minute)
);
ALTER TABLE submission_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION allow_submission(endpoint text, visitor text)
RETURNS boolean LANGUAGE plpgsql SET search_path = public AS $$
DECLARE current_minute timestamptz := date_trunc('minute', now());
        total integer;
BEGIN
  IF $1 NOT IN ('applications', 'contact') OR $2 !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  DELETE FROM submission_limits s WHERE s.minute < current_minute - interval '10 minutes';
  INSERT INTO submission_limits VALUES ($1, $2, current_minute, 1)
  ON CONFLICT ON CONSTRAINT submission_limits_pkey DO UPDATE SET hits = submission_limits.hits + 1
  RETURNING hits INTO total;
  RETURN total <= 10;
END $$;
REVOKE ALL ON FUNCTION allow_submission(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION allow_submission(text,text) TO service_role;

CREATE OR REPLACE FUNCTION reserve_booking(details jsonb)
RETURNS bookings LANGUAGE plpgsql SET search_path = public AS $$
DECLARE slot_date date := (details->>'booking_date')::date;
        slot_time time := (details->>'booking_time')::time;
        capacity integer;
        result bookings;
BEGIN
  IF (slot_date + slot_time) AT TIME ZONE 'Asia/Kolkata' <= now() THEN
    RAISE EXCEPTION 'Choose a future time';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(slot_date::text || 'T' || slot_time::text, 0));
  SELECT (value->>'capacity')::integer INTO capacity FROM settings WHERE key = 'booking_capacity_per_slot';
  IF (SELECT count(*) FROM bookings WHERE booking_date = slot_date AND booking_time = slot_time AND status IN ('pending','confirmed')) >= coalesce(capacity, 10) THEN
    RAISE EXCEPTION 'Slot fully booked';
  END IF;
  INSERT INTO bookings(customer_name, customer_phone, customer_email, booking_date, booking_time, guests, special_requests)
  VALUES (details->>'customer_name', details->>'customer_phone', details->>'customer_email', slot_date, slot_time,
    (details->>'guests')::integer, details->>'special_requests') RETURNING * INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION reserve_booking(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_booking(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION protect_payment_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT coalesce(is_owner(), false) THEN
    RAISE EXCEPTION 'Only owners can change payment status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER protect_payment_update BEFORE UPDATE OF payment_status ON orders
FOR EACH ROW WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION protect_payment_update();
