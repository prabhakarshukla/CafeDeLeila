BEGIN;

INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
VALUES ('Rollback fixture', '919876543210', '[]', 10, 0, 10);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT FROM orders) THEN RAISE EXCEPTION 'Anonymous order read exposed rows'; END IF;
  BEGIN
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
    VALUES ('Rollback fixture', '919876543210', '[]', 10, 0, 10);
    RAISE EXCEPTION 'Anonymous order insert succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

INSERT INTO auth.users (id, email) VALUES ('1e9d8640-54aa-4c96-a739-c8286f814482', 'rollback-staff@example.invalid');
INSERT INTO admin_users (user_id, role) VALUES ('1e9d8640-54aa-4c96-a739-c8286f814482', 'staff');
SELECT set_config('request.jwt.claim.sub', '1e9d8640-54aa-4c96-a739-c8286f814482', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT is_admin() OR is_owner() THEN RAISE EXCEPTION 'Staff fixture failed'; END IF;
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
  UPDATE orders SET status = 'confirmed' WHERE customer_name = 'Rollback fixture';
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff could not confirm fixture'; END IF;
END $$;
RESET ROLE;

DO $$
DECLARE numbers text[] := ARRAY[]::text[];
        code text;
BEGIN
  FOR i IN 1..100 LOOP
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr)
    VALUES ('Rollback loop', '919876543210', '[]', 10, 0, 10)
    RETURNING order_number INTO code;
    IF code IS NULL OR code = ANY(numbers) THEN RAISE EXCEPTION 'Duplicate or missing order number'; END IF;
    numbers := array_append(numbers, code);
  END LOOP;
END $$;

ROLLBACK;
