-- Align legacy constraints and defaults with the current Edge and admin workflows.
BEGIN;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_check,
  DROP CONSTRAINT IF EXISTS orders_payment_status_check,
  DROP CONSTRAINT IF EXISTS orders_payment_method_check,
  DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS contact_messages_status_check;
ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Normalize terminal booking statuses and any legacy application starting status
-- without treating a spelling correction as a new workflow transition.
DROP TRIGGER IF EXISTS trigger_validate_booking_status_transition ON public.bookings;
DROP TRIGGER IF EXISTS trigger_validate_application_status_transition ON public.job_applications;
UPDATE public.orders SET order_type = 'dine_in' WHERE order_type = 'dine-in';
UPDATE public.orders SET payment_status = 'unpaid' WHERE payment_status = 'pending';
UPDATE public.bookings SET status = 'no_show' WHERE status = 'no-show';
UPDATE public.job_applications SET status = 'pending' WHERE status = 'new';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cash', 'upi', 'card', 'razorpay', 'stripe')),
  ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'));
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired'));
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'read', 'replied', 'archived'));
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('owner', 'staff'));

ALTER TABLE public.orders
  ALTER COLUMN order_type SET DEFAULT 'dine_in',
  ALTER COLUMN payment_status SET DEFAULT 'unpaid',
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.menu_categories ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.menu_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.job_applications ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.contact_messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.order_status_history ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Keep new references above numbers already issued by legacy generators.
-- ALTER SEQUENCE RESTART is transactional and only moves a sequence forward.
DO $$
DECLARE
  spec record;
  issued bigint;
  next_number bigint;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('orders', 'order_number', 'order_seq'),
    ('bookings', 'booking_number', 'booking_seq'),
    ('job_applications', 'application_number', 'application_seq')
  ) AS sequences(table_name, reference_column, sequence_name)
  LOOP
    EXECUTE format('SELECT max(substring(%I FROM ''-([0-9]{1,18})$'')::bigint) FROM public.%I',
      spec.reference_column, spec.table_name) INTO issued;
    EXECUTE format('SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END FROM public.%I',
      spec.sequence_name) INTO next_number;
    IF issued >= next_number THEN
      EXECUTE format('ALTER SEQUENCE public.%I RESTART WITH %s', spec.sequence_name, issued + 1);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (CASE OLD.status
    WHEN 'pending' THEN NEW.status = 'confirmed'
    WHEN 'confirmed' THEN NEW.status IN ('preparing', 'ready', 'cancelled')
    WHEN 'preparing' THEN NEW.status IN ('ready', 'cancelled')
    WHEN 'ready' THEN (NEW.status = 'out_for_delivery' AND NEW.order_type = 'delivery') OR NEW.status IN ('completed', 'cancelled')
    WHEN 'out_for_delivery' THEN NEW.status = 'completed'
    ELSE false
  END) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_order_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (CASE OLD.status
    WHEN 'pending' THEN NEW.status IN ('confirmed', 'cancelled')
    WHEN 'confirmed' THEN NEW.status IN ('completed', 'cancelled', 'no_show')
    ELSE false
  END) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid booking status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_booking_status_transition
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_status_transition();

CREATE OR REPLACE FUNCTION public.validate_application_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (CASE OLD.status
    WHEN 'pending' THEN NEW.status IN ('reviewing', 'rejected')
    WHEN 'reviewing' THEN NEW.status IN ('shortlisted', 'rejected')
    WHEN 'shortlisted' THEN NEW.status IN ('hired', 'rejected')
    ELSE false
  END) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid application status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_application_status_transition
  BEFORE UPDATE OF status ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_application_status_transition();

CREATE OR REPLACE FUNCTION public.validate_contact_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (CASE OLD.status
    WHEN 'new' THEN NEW.status = 'read'
    WHEN 'read' THEN NEW.status = 'replied'
    WHEN 'replied' THEN NEW.status = 'archived'
    ELSE false
  END) IS NOT TRUE THEN
    RAISE EXCEPTION 'Invalid contact status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trigger_validate_contact_status_transition
  BEFORE UPDATE OF status ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_contact_status_transition();

REVOKE EXECUTE ON FUNCTION public.validate_order_status_transition(),
  public.validate_booking_status_transition(), public.validate_application_status_transition(),
  public.validate_contact_status_transition()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
