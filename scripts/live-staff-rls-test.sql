-- Run the full script in one SQL Editor execution. With two or more owners,
-- replace NULL below with your owner UUID, e.g. 'uuid-here'::uuid.
BEGIN;
CREATE TEMP TABLE smoke_staff_context (owner_id uuid, marker text, order_id uuid) ON COMMIT DROP;
CREATE TEMP TABLE smoke_staff_results (result_order integer GENERATED ALWAYS AS IDENTITY, check_name text, passed boolean, outcome text) ON COMMIT DROP;
GRANT SELECT ON pg_temp.smoke_staff_context TO authenticated;
GRANT INSERT ON pg_temp.smoke_staff_results TO authenticated;

-- The current reference generators resolve these before the public sequences.
-- Temporary numbers are consumed only inside this SQL session.
CREATE TEMP SEQUENCE order_seq START 800000000000001;
CREATE TEMP SEQUENCE booking_seq START 800000000000001;
CREATE TEMP SEQUENCE application_seq START 800000000000001;
SET LOCAL search_path = pg_temp, public, extensions;

DO $$
DECLARE
  selected_owner uuid := NULL;
  matching_owners uuid[];
  marker text := 'SMOKE_TEST_' || replace(gen_random_uuid()::text, '-', '');
  fixture_id uuid := gen_random_uuid();
BEGIN
  SELECT array_agg(user_id) INTO matching_owners FROM public.admin_users
  WHERE role = 'owner' AND (selected_owner IS NULL OR user_id = selected_owner);
  IF cardinality(matching_owners) IS DISTINCT FROM 1 THEN
    RAISE NOTICE 'Select exactly one existing owner UUID in this script.';
    INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
    VALUES ('setup', false, 'Expected exactly one matching owner');
    RETURN;
  END IF;
  selected_owner := matching_owners[1];
  INSERT INTO public.orders(id, customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
  VALUES (fixture_id, marker, '919000000001', '[{"name":"Smoke item","quantity":1}]', 100, 0, 100);
  INSERT INTO public.bookings(customer_name, customer_phone, booking_date, booking_time, guests)
  VALUES (marker, '919000000001', current_date + 2, '12:00', 2);
  INSERT INTO public.job_applications(full_name, email, phone, role)
  VALUES (marker, 'smoke@example.invalid', '919000000001', 'Kitchen');
  INSERT INTO public.contact_messages(name, email, message)
  VALUES (marker, 'smoke@example.invalid', 'Temporary rollback fixture');
  IF NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'menu_is_sample') THEN
    INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
    VALUES ('setup', false, 'menu_is_sample setting is missing');
    RETURN;
  END IF;
  UPDATE public.admin_users SET role = 'staff' WHERE user_id = selected_owner AND role = 'owner';
  INSERT INTO pg_temp.smoke_staff_context VALUES (selected_owner, marker, fixture_id);
  PERFORM set_config('request.jwt.claim.sub', selected_owner::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', selected_owner, 'role', 'authenticated')::text, true);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
  VALUES ('setup', false, 'SQLSTATE ' || SQLSTATE);
END $$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  ctx record;
  probe record;
  affected integer;
  denied boolean;
BEGIN
  SELECT * INTO ctx FROM pg_temp.smoke_staff_context;
  IF NOT FOUND THEN RETURN; END IF;
  IF public.is_admin() IS DISTINCT FROM true OR public.is_owner() IS DISTINCT FROM false OR auth.uid() IS DISTINCT FROM ctx.owner_id THEN
    INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
    VALUES ('role', false, 'Expected authenticated staff identity');
    RETURN;
  END IF;
  INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome) VALUES ('role', true, 'Authenticated staff');

  FOR probe IN SELECT * FROM (VALUES
    ('orders status allowed', format('UPDATE public.orders SET status = ''confirmed'' WHERE id = %L', ctx.order_id), 'allow'),
    ('bookings status allowed', format('UPDATE public.bookings SET status = ''confirmed'' WHERE customer_name = %L', ctx.marker), 'allow'),
    ('applications status allowed', format('UPDATE public.job_applications SET status = ''reviewing'' WHERE full_name = %L', ctx.marker), 'allow'),
    ('messages status allowed', format('UPDATE public.contact_messages SET status = ''read'' WHERE name = %L', ctx.marker), 'allow'),
    ('order total refused', format('UPDATE public.orders SET total_inr = 101 WHERE id = %L', ctx.order_id), 'guard'),
    ('order items refused', format('UPDATE public.orders SET items = ''[]'' WHERE id = %L', ctx.order_id), 'guard'),
    ('order customer fields refused', format('UPDATE public.orders SET customer_name = %L, customer_phone = ''919000000002'' WHERE id = %L', ctx.marker || '_EDIT', ctx.order_id), 'guard'),
    ('settings change refused', 'UPDATE public.settings SET value = jsonb_build_object(''is_sample'', NOT coalesce((value->>''is_sample'')::boolean, false)) WHERE key = ''menu_is_sample''', 'deny'),
    ('orders delete refused', format('DELETE FROM public.orders WHERE id = %L', ctx.order_id), 'deny'),
    ('bookings delete refused', format('DELETE FROM public.bookings WHERE customer_name = %L', ctx.marker), 'deny'),
    ('applications delete refused', format('DELETE FROM public.job_applications WHERE full_name = %L', ctx.marker), 'deny'),
    ('messages delete refused', format('DELETE FROM public.contact_messages WHERE name = %L', ctx.marker), 'deny')
  ) AS tests(label, statement, expectation)
  LOOP
    BEGIN
      EXECUTE probe.statement;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF probe.expectation <> 'allow' AND affected > 0 THEN
        -- Undo any unexpectedly permitted write before testing the next assertion.
        RAISE SQLSTATE 'ZX001';
      END IF;
      INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
      VALUES (probe.label,
        CASE probe.expectation WHEN 'allow' THEN affected = 1 WHEN 'deny' THEN affected = 0 ELSE false END,
        'Rows affected: ' || affected);
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN
      INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
      VALUES (probe.label, false, 'Unexpected write was rolled back');
    WHEN insufficient_privilege THEN
      denied := probe.expectation = 'deny' OR
        (probe.expectation = 'guard' AND SQLERRM LIKE 'Staff cannot change protected columns on %');
      INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
      VALUES (probe.label, denied, 'SQLSTATE 42501');
    WHEN OTHERS THEN
      INSERT INTO pg_temp.smoke_staff_results(check_name, passed, outcome)
      VALUES (probe.label, false, 'SQLSTATE ' || SQLSTATE);
    END;
  END LOOP;
END $$;
RESET ROLE;
SELECT check_name, passed, outcome FROM pg_temp.smoke_staff_results ORDER BY result_order;
ROLLBACK;
