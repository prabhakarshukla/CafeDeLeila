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

COMMIT;
