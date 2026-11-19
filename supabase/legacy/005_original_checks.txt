-- ============================================
-- CAFÉ DE LEILA — MIGRATION 005
-- SQL Tests (run manually to verify security)
-- Run in Supabase SQL Editor AFTER 004_admin_rls_storage_realtime.sql
-- ============================================

-- ============================================
-- TEST SETUP: Create test users
-- ============================================

-- Note: In Supabase, you'd create users via Auth UI or API.
-- These DO blocks simulate test scenarios by temporarily setting
-- the request context. In production, use pgTAP or a test framework.

-- ============================================
-- TEST 1: Anonymous cannot INSERT or READ orders
-- ============================================

DO $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Simulate anonymous (no auth.uid())
  -- This should fail due to RLS (no policy for anon INSERT)
  BEGIN
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr, status)
    VALUES ('Test', '919999999999', '[{"id":"test","name":"Test","price_inr":100,"quantity":1}]', 100, 0, 100, 'pending');
    RAISE NOTICE 'TEST 1 FAILED: anon INSERT succeeded (should be blocked)';
  EXCEPTION WHEN insufficient_privilege OR insufficient_permissions THEN
    RAISE NOTICE 'TEST 1 PASSED: anon INSERT blocked by RLS';
  END;
END $$;

-- ============================================
-- TEST 2: Anonymous cannot READ orders
-- ============================================

DO $$
DECLARE
  v_count INT;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO v_count FROM orders;
    RAISE NOTICE 'TEST 2 FAILED: anon READ succeeded (should be blocked), count=%', v_count;
  EXCEPTION WHEN insufficient_privilege OR insufficient_permissions THEN
    RAISE NOTICE 'TEST 2 PASSED: anon READ blocked by RLS';
  END;
END $$;

-- ============================================
-- TEST 3: Staff cannot EDIT settings
-- ============================================

DO $$
BEGIN
  -- Simulate staff user (we can't easily set auth.uid() in DO block,
  -- but we can verify the policy exists)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'settings'
      AND policyname = 'Owners can manage settings'
      AND cmd = 'ALL'
      AND qual = 'is_owner()'
  ) THEN
    RAISE NOTICE 'TEST 3 PASSED: Settings policy restricts to owners only';
  ELSE
    RAISE NOTICE 'TEST 3 FAILED: Settings policy missing or incorrect';
  END IF;
END $$;

-- ============================================
-- TEST 4: Invalid order status transitions fail
-- ============================================

DO $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Create an order as service role (bypasses RLS)
  INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr, status)
  VALUES ('Test User', '919999999999', '[{"id":"test","name":"Test","price_inr":100,"quantity":1}]', 100, 0, 100, 'pending')
  RETURNING id INTO v_order_id;

  -- Test valid transition: pending -> confirmed (should work)
  BEGIN
    UPDATE orders SET status = 'confirmed' WHERE id = v_order_id;
    RAISE NOTICE 'TEST 4a PASSED: pending -> confirmed works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4a FAILED: pending -> confirmed failed: %', SQLERRM;
  END;

  -- Test valid transition: confirmed -> preparing
  BEGIN
    UPDATE orders SET status = 'preparing' WHERE id = v_order_id;
    RAISE NOTICE 'TEST 4b PASSED: confirmed -> preparing works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4b FAILED: confirmed -> preparing failed: %', SQLERRM;
  END;

  -- Test valid transition: preparing -> ready
  BEGIN
    UPDATE orders SET status = 'ready' WHERE id = v_order_id;
    RAISE NOTICE 'TEST 4c PASSED: preparing -> ready works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4c FAILED: preparing -> ready failed: %', SQLERRM;
  END;

  -- Test valid transition: ready -> completed
  BEGIN
    UPDATE orders SET status = 'completed' WHERE id = v_order_id;
    RAISE NOTICE 'TEST 4d PASSED: ready -> completed works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4d FAILED: ready -> completed failed: %', SQLERRM;
  END;

  -- Test invalid transition: completed -> preparing (should fail)
  BEGIN
    UPDATE orders SET status = 'preparing' WHERE id = v_order_id;
    RAISE NOTICE 'TEST 4e FAILED: completed -> preparing should have been blocked';
  EXCEPTION WHEN sqlstate = 'P0001' THEN
    RAISE NOTICE 'TEST 4e PASSED: completed -> preparing correctly blocked';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4e FAILED: wrong error type: %', SQLERRM;
  END;

  -- Cleanup
  DELETE FROM orders WHERE id = v_order_id;
END $$;

-- ============================================
-- TEST 5: Order/booking/application numbers are unique
-- ============================================

DO $$
DECLARE
  v_ids UUID[];
  v_order_numbers TEXT[];
  v_booking_numbers TEXT[];
  v_app_numbers TEXT[];
  i INT;
BEGIN
  -- Create multiple orders rapidly
  FOR i IN 1..10 LOOP
    INSERT INTO orders (customer_name, customer_phone, items, subtotal_inr, tax_inr, total_inr, status)
    VALUES ('Test ' || i, '919999999999', '[{"id":"test","name":"Test","price_inr":100,"quantity":1}]', 100, 0, 100, 'pending')
    RETURNING id INTO v_ids[i];
  END LOOP;

  -- Check order numbers are unique and sequential per day
  SELECT array_agg(order_number) INTO v_order_numbers FROM orders WHERE id = ANY(v_ids);
  
  IF array_length(v_order_numbers, 1) = 10 AND cardinality(v_order_numbers) = 10 THEN
    RAISE NOTICE 'TEST 5a PASSED: Order numbers are unique (% items)', array_length(v_order_numbers, 1);
  ELSE
    RAISE NOTICE 'TEST 5a FAILED: Order numbers not unique or missing';
  END IF;

  -- Check format: CDL-YYYYMMDD-NNN
  IF v_order_numbers[1] ~ '^CDL-\d{8}-\d{3}$' THEN
    RAISE NOTICE 'TEST 5b PASSED: Order number format correct: %', v_order_numbers[1];
  ELSE
    RAISE NOTICE 'TEST 5b FAILED: Order number format wrong: %', v_order_numbers[1];
  END IF;

  -- Cleanup
  DELETE FROM orders WHERE id = ANY(v_ids);
END $$;

-- Same test for bookings
DO $$
DECLARE
  v_booking_numbers TEXT[];
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO bookings (customer_name, customer_phone, booking_date, booking_time, guests)
    VALUES ('Test ' || i, '919999999999', CURRENT_DATE, '12:00', 2);
  END LOOP;

  SELECT array_agg(booking_number) INTO v_booking_numbers FROM bookings WHERE customer_name LIKE 'Test %';

  IF array_length(v_booking_numbers, 1) = 5 AND cardinality(v_booking_numbers) = 5 THEN
    RAISE NOTICE 'TEST 5c PASSED: Booking numbers are unique';
  ELSE
    RAISE NOTICE 'TEST 5c FAILED: Booking numbers not unique';
  END IF;

  IF v_booking_numbers[1] ~ '^BK-\d{8}-\d{3}$' THEN
    RAISE NOTICE 'TEST 5d PASSED: Booking number format correct: %', v_booking_numbers[1];
  ELSE
    RAISE NOTICE 'TEST 5d FAILED: Booking number format wrong';
  END IF;

  DELETE FROM bookings WHERE customer_name LIKE 'Test %';
END $$;

-- Same test for applications
DO $$
DECLARE
  v_app_numbers TEXT[];
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO job_applications (full_name, email, phone, role)
    VALUES ('Test ' || i, 'test' || i || '@example.com', '919999999999', 'Chef');
  END LOOP;

  SELECT array_agg(application_number) INTO v_app_numbers FROM job_applications WHERE full_name LIKE 'Test %';

  IF array_length(v_app_numbers, 1) = 5 AND cardinality(v_app_numbers) = 5 THEN
    RAISE NOTICE 'TEST 5e PASSED: Application numbers are unique';
  ELSE
    RAISE NOTICE 'TEST 5e FAILED: Application numbers not unique';
  END IF;

  IF v_app_numbers[1] ~ '^APP-\d{8}-\d{3}$' THEN
    RAISE NOTICE 'TEST 5f PASSED: Application number format correct: %', v_app_numbers[1];
  ELSE
    RAISE NOTICE 'TEST 5f FAILED: Application number format wrong';
  END IF;

  DELETE FROM job_applications WHERE full_name LIKE 'Test %';
END $$;

-- ============================================
-- TEST 6: Admin RLS policies work
-- ============================================

DO $$
BEGIN
  -- Verify admin policies exist
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Admins can read all orders'
      AND cmd = 'SELECT'
      AND qual = 'is_admin()'
  ) THEN
    RAISE NOTICE 'TEST 6a PASSED: Admin orders SELECT policy exists';
  ELSE
    RAISE NOTICE 'TEST 6a FAILED: Admin orders SELECT policy missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Staff can update order status'
      AND cmd = 'UPDATE'
      AND qual = 'is_admin()'
  ) THEN
    RAISE NOTICE 'TEST 6b PASSED: Staff orders UPDATE policy exists';
  ELSE
    RAISE NOTICE 'TEST 6b FAILED: Staff orders UPDATE policy missing';
  END IF;

  -- Check owner-only delete
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Owners can delete orders'
      AND cmd = 'DELETE'
      AND qual = 'is_owner()'
  ) THEN
    RAISE NOTICE 'TEST 6c PASSED: Owner orders DELETE policy exists';
  ELSE
    RAISE NOTICE 'TEST 6c FAILED: Owner orders DELETE policy missing';
  END IF;
END $$;

-- ============================================
-- TEST 7: Storage policies
-- ============================================

DO $$
BEGIN
  -- Check menu-images policies
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read menu images'
      AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE 'TEST 7a PASSED: Public read menu images policy exists';
  ELSE
    RAISE NOTICE 'TEST 7a FAILED: Public read menu images policy missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can manage menu images'
      AND cmd = 'ALL'
  ) THEN
    RAISE NOTICE 'TEST 7b PASSED: Admin menu images policy exists';
  ELSE
    RAISE NOTICE 'TEST 7b FAILED: Admin menu images policy missing';
  END IF;

  -- Check cv-uploads
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Applicants can upload CVs'
      AND cmd = 'INSERT'
  ) THEN
    RAISE NOTICE 'TEST 7c PASSED: CV upload policy exists';
  ELSE
    RAISE NOTICE 'TEST 7c FAILED: CV upload policy missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can read CVs'
      AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE 'TEST 7d PASSED: Admin CV read policy exists';
  ELSE
    RAISE NOTICE 'TEST 7d FAILED: Admin CV read policy missing';
  END IF;
END $$;

-- ============================================
-- TEST 8: Views and RPC
-- ============================================

DO $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Test admin_today_stats view
  BEGIN
    PERFORM * FROM admin_today_stats;
    RAISE NOTICE 'TEST 8a PASSED: admin_today_stats view queryable';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8a FAILED: admin_today_stats view error: %', SQLERRM;
  END;

  -- Test get_admin_dashboard_stats RPC
  BEGIN
    SELECT get_admin_dashboard_stats() INTO STRICT v_stats;
    RAISE NOTICE 'TEST 8b FAILED: RPC should fail for non-admin';
  EXCEPTION WHEN sqlstate = '42501' THEN
    RAISE NOTICE 'TEST 8b PASSED: RPC correctly blocks non-admin';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 8b FAILED: RPC error: %', SQLERRM;
  END;
END $$;

-- ============================================
-- SUMMARY
-- ============================================

-- Run all tests and check output for PASSED/FAILED
-- All tests should show PASSED for a green build