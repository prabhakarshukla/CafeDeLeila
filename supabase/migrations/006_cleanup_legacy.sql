-- Converge an existing installation without deleting orders, menu rows or settings.
BEGIN;

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;
REVOKE INSERT ON public.orders, public.bookings, public.job_applications, public.contact_messages FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Authenticated upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage og images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can manage menu images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can manage og images" ON storage.objects;
CREATE POLICY "Owners can manage menu images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'menu-images' AND public.is_owner())
  WITH CHECK (bucket_id = 'menu-images' AND public.is_owner());
CREATE POLICY "Owners can manage og images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'og-images' AND public.is_owner())
  WITH CHECK (bucket_id = 'og-images' AND public.is_owner());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
 ('cv-uploads', 'cv-uploads', false, 2097152, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
 ('menu-images', 'menu-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
 ('og-images', 'og-images', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Preserve the original Chinese category UUID and foreign keys when possible.
UPDATE public.menu_categories SET slug = 'chinese',
  name = CASE WHEN name = 'Main Course Chinese' THEN 'Chinese' ELSE name END
WHERE slug = 'main-course-chinese'
  AND NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE slug = 'chinese');


INSERT INTO public.menu_categories (name, slug, description, display_order) VALUES
  ('Desserts', 'desserts', 'Sweet endings to your perfect meal', 1),
  ('Main Course Continental', 'main-course-continental', 'European-inspired mains crafted with local ingredients', 2),
  ('Continental Appetizers', 'continental-appetizers', 'Light starters to begin your dining journey', 3),
  ('Pasta', 'pasta', 'Hand-tossed pasta with authentic Italian sauces', 4),
  ('Pizza', 'pizza', 'Stone-baked thin crust pizzas with premium toppings', 5),
  ('Sandwiches & Burgers', 'sandwiches-burgers', 'Gourmet sandwiches and juicy burgers served with fries', 6),
  ('Rice & Noodles', 'rice-noodles', 'Asian-inspired rice and noodle bowls', 7),
  ('Main Course', 'main-course', 'Sample vegetarian mains', 8),
  ('Chinese', 'chinese', 'Authentic Chinese mains with bold flavors', 9),
  ('Raita', 'raita', 'Cooling yogurt accompaniments', 10),
  ('Special Breads', 'special-breads', 'Freshly baked Indian breads from the tandoor', 11),
  ('Varieties of Rice', 'varieties-rice', 'Aromatic rice preparations', 12),
  ('Varieties of Biryani', 'varieties-biryani', 'Slow-cooked layered rice dishes with aromatic spices', 13),
  ('Indian Main Course (Chicken and Mutton)', 'indian-main-course-chicken-mutton', 'Rich and flavorful North Indian curries', 14),
  ('South Indian', 'south-indian', 'Authentic flavors from the south', 15),
  ('Indian Kebabs', 'indian-kebabs', 'Tandoor-grilled delicacies marinated in aromatic spices', 16),
  ('Tandoori Appetizers', 'tandoori-appetizers', 'Charcoal-grilled starters from the clay oven', 17),
  ('Salads', 'salads', 'Fresh, crisp, and nutritious', 18),
  ('Soups', 'soups', 'Warming bowls of comfort', 19)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.settings (key, value, updated_by) VALUES
  ('opening_hours', '{"verified": false, "schedule": []}', NULL),
  ('address', '{"full": "5/34, Vikas Khand, Dayal Chauraha, Gomti Nagar, Lucknow - 226010", "note": "TODO: Confirm"}', NULL),
  ('phone', '{"formatted": "+91 522 458 4372", "raw": "915224584372"}', NULL),
  ('email', '{"value": "deleilacafe@gmail.com"}', NULL),
  ('whatsapp_number', '{"value": "", "verified": false}', NULL),
  ('ordering_enabled', '{"enabled": true}', NULL),
  ('delivery_enabled', '{"enabled": false}', NULL),
  ('delivery_fee', '{"amount": 0}', NULL),
  ('min_order', '{"amount": 200}', NULL),
  ('tax_percent', '{"value": 0}', NULL),
  ('booking_capacity_per_slot', '{"capacity": 10}', NULL),
  ('menu_is_sample', '{"is_sample": true}', NULL)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Public read menu items" ON public.menu_items;
CREATE POLICY "Public read menu items" ON public.menu_items FOR SELECT
  USING (is_available AND EXISTS (SELECT 1 FROM public.menu_categories c WHERE c.id = category_id AND c.is_active));

-- Keep the complete sequence after it exceeds three digits. Existing references stay intact.
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num BIGINT;
BEGIN
  -- Use Asia/Kolkata timezone for date
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('order_seq');
  NEW.order_number := 'CDL-' || today_str || '-' || LPAD(seq_num::text, GREATEST(3, length(seq_num::text)), '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num BIGINT;
BEGIN
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('booking_seq');
  NEW.booking_number := 'BK-' || today_str || '-' || LPAD(seq_num::text, GREATEST(3, length(seq_num::text)), '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num BIGINT;
BEGIN
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('application_seq');
  NEW.application_number := 'APP-' || today_str || '-' || LPAD(seq_num::text, GREATEST(3, length(seq_num::text)), '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Membership helpers use only schema-qualified names and reject absent membership.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'owner'
  );
$$;

-- Scope private policies to signed-in callers.
ALTER POLICY "Admin users can read themselves" ON public.admin_users TO authenticated;
ALTER POLICY "Owners can manage admin users" ON public.admin_users TO authenticated;
ALTER POLICY "Owners can manage settings" ON public.settings TO authenticated;
ALTER POLICY "Owners can manage menu categories" ON public.menu_categories TO authenticated;
ALTER POLICY "Owners can manage menu items" ON public.menu_items TO authenticated;
ALTER POLICY "Admins can read all orders" ON public.orders TO authenticated;
ALTER POLICY "Staff can update order status" ON public.orders TO authenticated;
ALTER POLICY "Owners can delete orders" ON public.orders TO authenticated;
ALTER POLICY "Admins can read all bookings" ON public.bookings TO authenticated;
ALTER POLICY "Staff can update booking status" ON public.bookings TO authenticated;
ALTER POLICY "Owners can delete bookings" ON public.bookings TO authenticated;
ALTER POLICY "Admins can read all applications" ON public.job_applications TO authenticated;
ALTER POLICY "Staff can update application status" ON public.job_applications TO authenticated;
ALTER POLICY "Owners can delete applications" ON public.job_applications TO authenticated;
ALTER POLICY "Admins can read all messages" ON public.contact_messages TO authenticated;
ALTER POLICY "Staff can update message status" ON public.contact_messages TO authenticated;
ALTER POLICY "Owners can delete messages" ON public.contact_messages TO authenticated;
ALTER POLICY "Admins can read order status history" ON public.order_status_history TO authenticated;
ALTER POLICY "Admins can read CVs" ON storage.objects TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_staff_columns()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  allowed_columns text[];
BEGIN
  IF auth.uid() IS NULL OR public.is_owner() THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'orders' THEN allowed_columns := ARRAY['status', 'payment_status', 'updated_at'];
    WHEN 'bookings', 'job_applications' THEN allowed_columns := ARRAY['status', 'updated_at'];
    WHEN 'contact_messages' THEN allowed_columns := ARRAY['status'];
  END CASE;

  IF (to_jsonb(NEW) - allowed_columns) IS DISTINCT FROM (to_jsonb(OLD) - allowed_columns) THEN
    RAISE EXCEPTION 'Staff cannot change protected columns on %', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER aa_guard_staff_columns BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_staff_columns();
CREATE OR REPLACE TRIGGER aa_guard_staff_columns BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_staff_columns();
CREATE OR REPLACE TRIGGER aa_guard_staff_columns BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_staff_columns();
CREATE OR REPLACE TRIGGER aa_guard_staff_columns BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_staff_columns();

-- Authenticated owners and staff share a SQL role. RLS and the row guard now
-- distinguish full owner edits from staff status and payment-status updates.
DROP TRIGGER IF EXISTS protect_payment_update ON public.orders;
GRANT UPDATE ON public.orders, public.bookings, public.job_applications, public.contact_messages TO authenticated;

ALTER VIEW public.admin_today_stats SET (security_invoker = true);
ALTER VIEW public.admin_today_bookings SET (security_invoker = true);
ALTER VIEW public.admin_recent_activity SET (security_invoker = true);
ALTER VIEW public.admin_top_items_7d SET (security_invoker = true);
REVOKE ALL ON public.admin_today_stats, public.admin_today_bookings,
  public.admin_recent_activity, public.admin_top_items_7d FROM PUBLIC, anon;
GRANT SELECT ON public.admin_today_stats, public.admin_today_bookings,
  public.admin_recent_activity, public.admin_top_items_7d TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'today', jsonb_build_object(
      'orders', (SELECT row_to_json(t) FROM public.admin_today_stats t),
      'bookings', (SELECT row_to_json(t) FROM public.admin_today_bookings t),
      'pending_applications', (SELECT pending_applications FROM public.admin_recent_activity),
      'new_messages', (SELECT new_messages FROM public.admin_recent_activity)
    ),
    'top_items_7d', (SELECT jsonb_agg(t) FROM public.admin_top_items_7d t)
  );
END;
$$;

-- RLS policies can use these membership checks in anonymous requests.
GRANT EXECUTE ON FUNCTION public.is_admin(), public.is_owner() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;

-- Existing BEFORE INSERT triggers still run under the inserting role.
REVOKE EXECUTE ON FUNCTION public.generate_order_number(), public.generate_booking_number(),
  public.generate_application_number(), public.update_updated_at_column(),
  public.validate_order_status_transition(), public.insert_order_status_history(),
  public.validate_booking_status_transition(), public.validate_application_status_transition(),
  public.protect_payment_update(), public.guard_staff_columns()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.allow_submission(text, text), public.reserve_booking(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_submission(text, text), public.reserve_booking(jsonb)
  TO service_role;

COMMIT;
