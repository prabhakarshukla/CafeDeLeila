-- ============================================
-- CAFÉ DE LEILA — MIGRATION 002
-- Admin users, helpers, settings, public_settings view
-- Run in Supabase SQL Editor AFTER 001_core_schema.sql
-- ============================================

-- ============================================
-- ADMIN USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can read admin_users (for checking their own role)
DROP POLICY IF EXISTS "Admin users can read themselves" ON admin_users;
CREATE POLICY "Admin users can read themselves" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================

-- Check if current user is an admin (owner or staff)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = auth.uid();

  RETURN v_role IS NOT NULL;
END;
$$;

-- Check if current user is an owner
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = auth.uid();

  RETURN v_role = 'owner';
END;
$$;

-- ============================================
-- SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public can read whitelisted settings via public_settings view (see below)
-- Only owners can write settings
DROP POLICY IF EXISTS "Owners can manage settings" ON settings;
CREATE POLICY "Owners can manage settings" ON settings
  FOR ALL USING (is_owner());

-- ============================================
-- PUBLIC SETTINGS VIEW (whitelisted keys only)
-- ============================================

CREATE OR REPLACE VIEW public_settings AS
SELECT key, value
FROM settings
WHERE key IN (
  'opening_hours',
  'address',
  'phone',
  'email',
  'whatsapp_number',
  'ordering_enabled',
  'delivery_enabled',
  'delivery_fee',
  'min_order',
  'tax_percent',
  'booking_capacity_per_slot',
  'menu_is_sample'
);

-- Grant read access to anon and authenticated
GRANT SELECT ON public_settings TO anon, authenticated;

-- ============================================
-- SEED DEFAULT SETTINGS
-- ============================================

INSERT INTO settings (key, value, updated_by) VALUES
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

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- SELECT * FROM admin_users;
-- SELECT is_admin(), is_owner();
-- SELECT * FROM public_settings;
-- SELECT * FROM settings;