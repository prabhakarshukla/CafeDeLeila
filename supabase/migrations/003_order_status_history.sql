-- ============================================
-- CAFÉ DE LEILA — MIGRATION 003
-- Persist status history for orders only. Validate transitions for orders,
-- bookings and applications. Bookings and applications retain current status.
-- Run in Supabase SQL Editor AFTER 002_admin_settings.sql
-- ============================================

-- ============================================
-- ORDER STATUS HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Migration 004 adds the admin SELECT policy for order history.


-- ============================================
-- ORDER STATUS TRANSITION VALIDATION
-- ============================================

-- Valid status transitions:
-- pending -> confirmed -> preparing -> ready -> (out_for_delivery) -> completed
-- cancelled allowed from: pending, confirmed, preparing
-- no transitions from: completed, cancelled

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_status TEXT;
  v_allowed BOOLEAN := false;
BEGIN
  -- Skip validation for new orders (no from_status)
  IF NEW.status = 'pending' AND OLD IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current status
  v_from_status := OLD.status;

  -- Define valid transitions
  v_allowed := CASE
    -- pending -> confirmed
    WHEN v_from_status = 'pending' AND NEW.status = 'confirmed' THEN true
    -- confirmed -> preparing, ready, cancelled
    WHEN v_from_status = 'confirmed' AND NEW.status IN ('preparing', 'ready', 'cancelled') THEN true
    -- preparing -> ready, cancelled
    WHEN v_from_status = 'preparing' AND NEW.status IN ('ready', 'cancelled') THEN true
    -- ready -> out_for_delivery, completed, cancelled
    WHEN v_from_status = 'ready' AND NEW.status IN ('out_for_delivery', 'completed', 'cancelled') THEN true
    -- out_for_delivery -> completed
    WHEN v_from_status = 'out_for_delivery' AND NEW.status = 'completed' THEN true
    -- completed and cancelled are terminal (no outgoing transitions)
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_from_status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to validate status transitions
CREATE OR REPLACE TRIGGER trigger_validate_order_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_status_transition();

-- ============================================
-- TRIGGER TO AUTO-INSERT STATUS HISTORY
-- ============================================

CREATE OR REPLACE FUNCTION insert_order_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert history if status actually changed
  IF OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_insert_order_status_history
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION insert_order_status_history();

-- ============================================
-- BOOKING STATUS TRANSITION VALIDATION
-- ============================================

-- Valid transitions:
-- pending -> confirmed, cancelled
-- confirmed -> completed, cancelled, no_show
-- completed, cancelled, no_show are terminal

CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_status TEXT;
  v_allowed BOOLEAN := false;
BEGIN
  IF NEW.status = 'pending' AND OLD IS NULL THEN
    RETURN NEW;
  END IF;

  v_from_status := OLD.status;

  v_allowed := CASE
    WHEN v_from_status = 'pending' AND NEW.status IN ('confirmed', 'cancelled') THEN true
    WHEN v_from_status = 'confirmed' AND NEW.status IN ('completed', 'cancelled', 'no_show') THEN true
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid booking status transition: % -> %', v_from_status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_booking_status_transition
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION validate_booking_status_transition();

-- ============================================
-- APPLICATION STATUS TRANSITION VALIDATION
-- ============================================

-- Valid transitions:
-- pending -> reviewing, rejected
-- reviewing -> shortlisted, rejected
-- shortlisted -> hired, rejected
-- rejected, hired are terminal

CREATE OR REPLACE FUNCTION validate_application_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_status TEXT;
  v_allowed BOOLEAN := false;
BEGIN
  IF NEW.status = 'pending' AND OLD IS NULL THEN
    RETURN NEW;
  END IF;

  v_from_status := OLD.status;

  v_allowed := CASE
    WHEN v_from_status = 'pending' AND NEW.status IN ('reviewing', 'rejected') THEN true
    WHEN v_from_status = 'reviewing' AND NEW.status IN ('shortlisted', 'rejected') THEN true
    WHEN v_from_status = 'shortlisted' AND NEW.status IN ('hired', 'rejected') THEN true
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid application status transition: % -> %', v_from_status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_application_status_transition
  BEFORE UPDATE OF status ON job_applications
  FOR EACH ROW EXECUTE FUNCTION validate_application_status_transition();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test order status transitions (should work):
-- INSERT INTO orders (...) VALUES (...) RETURNING id;
-- UPDATE orders SET status = 'confirmed' WHERE id = <id>;  -- OK
-- UPDATE orders SET status = 'preparing' WHERE id = <id>; -- OK
-- UPDATE orders SET status = 'ready' WHERE id = <id>;     -- OK
-- UPDATE orders SET status = 'completed' WHERE id = <id>; -- OK
-- UPDATE orders SET status = 'cancelled' WHERE id = <id>; -- FAIL from completed

-- Test invalid transition (should fail):
-- UPDATE orders SET status = 'preparing' WHERE id = <id>; -- FAIL from pending

-- Check history:
-- SELECT * FROM order_status_history WHERE order_id = <id> ORDER BY created_at;