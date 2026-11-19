BEGIN;

-- Insert without reference fields, as the public write handlers do.
SET LOCAL ROLE service_role;
DO $$
DECLARE
  order_code text;
  booking_code text;
  application_code text;
  local_day text := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
BEGIN
  INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
  VALUES ('Rollback fixture', '919876543210', '[]', 10, 0, 10)
  RETURNING order_number INTO order_code;
  INSERT INTO bookings (customer_name, customer_phone, booking_date, booking_time, guests)
  VALUES ('Rollback fixture', '919876543210', current_date + 10, '12:00', 2)
  RETURNING booking_number INTO booking_code;
  INSERT INTO job_applications (full_name, email, phone, role)
  VALUES ('Rollback fixture', 'rollback-applicant@example.invalid', '919876543210', 'Kitchen')
  RETURNING application_number INTO application_code;

  IF (order_code ~ ('^CDL-' || local_day || '-[0-9]{3,}$')) IS NOT TRUE
    OR (booking_code ~ ('^BK-' || local_day || '-[0-9]{3,}$')) IS NOT TRUE
    OR (application_code ~ ('^APP-' || local_day || '-[0-9]{3,}$')) IS NOT TRUE THEN
    RAISE EXCEPTION 'Service role insert did not receive all three reference numbers';
  END IF;
END $$;
RESET ROLE;

INSERT INTO contact_messages (name, email, message)
VALUES ('Rollback fixture', 'rollback-contact@example.invalid', 'Hello');
WITH category AS (
  INSERT INTO menu_categories (name, slug, is_active)
  VALUES ('Rollback menu category', 'rollback-public-menu-fixture', true)
  RETURNING id
)
INSERT INTO menu_items (category_id, name, price_inr, is_available)
SELECT id, 'Rollback available item', 10, true FROM category;

SET LOCAL ROLE anon;
DO $$
DECLARE
  view_name text;
  function_name text;
BEGIN
  IF public.is_admin() OR public.is_owner() THEN
    RAISE EXCEPTION 'Anonymous visitor has admin membership';
  END IF;
  IF NOT EXISTS (
    SELECT FROM public.menu_categories WHERE slug = 'rollback-public-menu-fixture' AND is_active
  ) OR NOT EXISTS (
    SELECT FROM public.menu_items i JOIN public.menu_categories c ON c.id = i.category_id
    WHERE c.slug = 'rollback-public-menu-fixture' AND i.name = 'Rollback available item' AND i.is_available
  ) THEN
    RAISE EXCEPTION 'Anonymous visitor could not read the active catalog fixture';
  END IF;
  IF EXISTS (SELECT FROM orders) THEN RAISE EXCEPTION 'Anonymous order read exposed rows'; END IF;
  BEGIN
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
    VALUES ('Rollback fixture', '919876543210', '[]', 10, 0, 10);
    RAISE EXCEPTION 'Anonymous order insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  FOREACH view_name IN ARRAY ARRAY['admin_today_stats', 'admin_today_bookings',
    'admin_recent_activity', 'admin_top_items_7d']
  LOOP
    BEGIN
      EXECUTE format('SELECT * FROM public.%I', view_name);
      RAISE EXCEPTION 'Anonymous SELECT succeeded on %', view_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  FOREACH function_name IN ARRAY ARRAY['generate_order_number', 'generate_booking_number',
    'generate_application_number', 'get_admin_dashboard_stats']
  LOOP
    IF has_function_privilege(format('public.%I()', function_name), 'EXECUTE') THEN
      RAISE EXCEPTION 'Anonymous EXECUTE granted on %', function_name;
    END IF;
    BEGIN
      EXECUTE format('SELECT public.%I()', function_name);
      RAISE EXCEPTION 'Anonymous call succeeded on %', function_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END $$;
RESET ROLE;

INSERT INTO auth.users (id, email) VALUES
  ('1e9d8640-54aa-4c96-a739-c8286f814482', 'rollback-staff@example.invalid'),
  ('1e9d8640-54aa-4c96-a739-c8286f814483', 'rollback-owner@example.invalid'),
  ('1e9d8640-54aa-4c96-a739-c8286f814484', 'rollback-outsider@example.invalid');
INSERT INTO admin_users (user_id, role) VALUES
  ('1e9d8640-54aa-4c96-a739-c8286f814482', 'staff'),
  ('1e9d8640-54aa-4c96-a739-c8286f814483', 'owner');

SELECT set_config('request.jwt.claim.sub', '1e9d8640-54aa-4c96-a739-c8286f814484', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.get_admin_dashboard_stats();
    RAISE EXCEPTION 'A signed-in non-admin could call the dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '1e9d8640-54aa-4c96-a739-c8286f814482', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE attempt text;
BEGIN
  IF NOT is_admin() OR is_owner() THEN RAISE EXCEPTION 'Staff fixture failed'; END IF;
  IF has_function_privilege('public.generate_order_number()', 'EXECUTE')
    OR has_function_privilege('public.generate_booking_number()', 'EXECUTE')
    OR has_function_privilege('public.generate_application_number()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated EXECUTE granted on a number generator';
  END IF;
  PERFORM FROM public.admin_today_stats;
  PERFORM FROM public.admin_today_bookings;
  PERFORM FROM public.admin_recent_activity;
  PERFORM FROM public.admin_top_items_7d;
  IF get_admin_dashboard_stats()->'today' IS NULL THEN RAISE EXCEPTION 'Staff dashboard returned no stats'; END IF;
  BEGIN
    UPDATE settings SET value = '{"is_sample":false}' WHERE key = 'menu_is_sample';
    IF FOUND THEN RAISE EXCEPTION 'Staff changed owner settings'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE orders SET status = 'completed' WHERE customer_name = 'Rollback fixture';
    RAISE EXCEPTION 'Illegal transition succeeded';
  EXCEPTION WHEN check_violation OR raise_exception THEN
    IF SQLERRM = 'Illegal transition succeeded' THEN RAISE; END IF;
  END;
  IF has_function_privilege('public.insert_order_status_history()', 'EXECUTE')
    OR has_function_privilege('public.validate_order_status_transition()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated can execute the order history or transition function directly';
  END IF;
  UPDATE orders SET status = 'confirmed' WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not confirm fixture'; END IF;
  UPDATE orders SET payment_status = 'paid' WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not update payment status'; END IF;
  IF (SELECT count(*) FROM public.order_status_history h
      JOIN public.orders o ON o.id = h.order_id
      WHERE o.customer_name = 'Rollback fixture') <> 1
    OR NOT EXISTS (
      SELECT 1 FROM public.order_status_history h JOIN public.orders o ON o.id = h.order_id
      WHERE o.customer_name = 'Rollback fixture' AND h.from_status = 'pending'
        AND h.to_status = 'confirmed' AND h.changed_by = auth.uid()
    ) THEN
    RAISE EXCEPTION 'Order history did not record exactly one staff status transition';
  END IF;
  UPDATE bookings SET status = 'confirmed' WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not confirm booking fixture'; END IF;
  UPDATE job_applications SET status = 'reviewing' WHERE full_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not review application fixture'; END IF;
  UPDATE contact_messages SET status = 'read' WHERE name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not read message fixture'; END IF;

  FOREACH attempt IN ARRAY ARRAY[
    'UPDATE orders SET total_inr = 42 WHERE customer_name = ''Rollback fixture''',
    'UPDATE orders SET items = ''[1]'' WHERE customer_name = ''Rollback fixture''',
    'UPDATE orders SET customer_phone = ''919876543211'' WHERE customer_name = ''Rollback fixture''',
    'UPDATE orders SET payment_id = ''protected-fixture'' WHERE customer_name = ''Rollback fixture''',
    'UPDATE bookings SET customer_phone = ''919876543211'' WHERE customer_name = ''Rollback fixture''',
    'UPDATE job_applications SET email = ''edited@example.invalid'' WHERE full_name = ''Rollback fixture''',
    'UPDATE contact_messages SET email = ''edited@example.invalid'' WHERE name = ''Rollback fixture'''
  ] LOOP
    BEGIN
      EXECUTE attempt;
      RAISE EXCEPTION 'Staff protected update succeeded: %', attempt;
    EXCEPTION WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE 'Staff cannot change protected columns on %' THEN RAISE; END IF;
    END;
  END LOOP;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '1e9d8640-54aa-4c96-a739-c8286f814483', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT is_owner() THEN RAISE EXCEPTION 'Owner fixture failed'; END IF;
  UPDATE orders SET total_inr = 42, items = '[1]', customer_phone = '919876543211'
  WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner could not edit the order'; END IF;
  UPDATE bookings SET customer_phone = '919876543211' WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner could not edit the booking'; END IF;
  UPDATE job_applications SET email = 'edited@example.invalid' WHERE full_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner could not edit the application'; END IF;
  UPDATE contact_messages SET email = 'edited@example.invalid' WHERE name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner could not edit the message'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);

DO $$
DECLARE numbers text[] := ARRAY[]::text[];
        code text;
BEGIN
  FOR i IN 1..1100 LOOP
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
    VALUES ('Rollback loop', '919876543210', '[]', 10, 0, 10)
    RETURNING order_number INTO code;
    IF code IS NULL OR code = ANY(numbers) THEN RAISE EXCEPTION 'Duplicate or missing order number'; END IF;
    numbers := array_append(numbers, code);
  END LOOP;
END $$;

ROLLBACK;
