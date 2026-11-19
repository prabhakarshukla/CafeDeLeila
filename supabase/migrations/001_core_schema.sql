-- ============================================
-- CAFÉ DE LEILA — COMPLETE DATABASE SCHEMA
-- Migration 001: Core tables, sequences, RLS, triggers
-- Run in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
-- gen_random_uuid() is built into supported PostgreSQL versions.

-- ============================================
-- SEQUENCES FOR SAFE NUMBER GENERATION
-- ============================================

CREATE SEQUENCE IF NOT EXISTS order_seq;
CREATE SEQUENCE IF NOT EXISTS booking_seq;
CREATE SEQUENCE IF NOT EXISTS application_seq;

-- ============================================
-- CORE TABLES
-- ============================================

-- Menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_inr INT NOT NULL,
  veg BOOLEAN DEFAULT true,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  order_type TEXT CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')) DEFAULT 'dine_in',
  delivery_address JSONB,
  items JSONB NOT NULL,
  subtotal_inr INT NOT NULL,
  delivery_fee_inr INT DEFAULT 0,
  tax_inr INT NOT NULL,
  total_inr INT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid', 'refunded')) DEFAULT 'unpaid',
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'razorpay', 'stripe')),
  payment_id TEXT,
  notes TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  guests INT CHECK (guests > 0 AND guests <= 20) NOT NULL,
  special_requests TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending',
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Applications
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  cv_url TEXT,
  address TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'read', 'replied', 'archived')) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public read access for menu (active items only)
DROP POLICY IF EXISTS "Public read menu categories" ON menu_categories;
CREATE POLICY "Public read menu categories" ON menu_categories 
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read menu items" ON menu_items;
CREATE POLICY "Public read menu items" ON menu_items 
  FOR SELECT USING (is_available = true);

-- No public INSERT policies - inserts happen only via Edge Functions with service role

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);

-- ============================================
-- SEQUENCES FOR SAFE NUMBER GENERATION
-- ============================================

CREATE SEQUENCE IF NOT EXISTS order_seq;
CREATE SEQUENCE IF NOT EXISTS booking_seq;
CREATE SEQUENCE IF NOT EXISTS application_seq;

-- ============================================
-- AUTO-NUMBER TRIGGERS (using sequences + Asia/Kolkata date)
-- ============================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INT;
BEGIN
  -- Use Asia/Kolkata timezone for date
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('order_seq');
  NEW.order_number := 'CDL-' || today_str || '-' || LPAD(seq_num::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INT;
BEGIN
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('booking_seq');
  NEW.booking_number := 'BK-' || today_str || '-' || LPAD(seq_num::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INT;
BEGIN
  today_str := to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');
  seq_num := nextval('application_seq');
  NEW.application_number := 'APP-' || today_str || '-' || LPAD(seq_num::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_generate_application_number
  BEFORE INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION generate_application_number();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED CATEGORIES (18 categories)
-- ============================================

INSERT INTO menu_categories (name, slug, description, display_order) VALUES
  ('Desserts', 'desserts', 'Sweet endings to your perfect meal', 1),
  ('Main Course Continental', 'main-course-continental', 'European-inspired mains crafted with local ingredients', 2),
  ('Continental Appetizers', 'continental-appetizers', 'Light starters to begin your dining journey', 3),
  ('Pasta', 'pasta', 'Hand-tossed pasta with authentic Italian sauces', 4),
  ('Pizza', 'pizza', 'Stone-baked thin crust pizzas with premium toppings', 5),
  ('Sandwiches & Burgers', 'sandwiches-burgers', 'Gourmet sandwiches and juicy burgers served with fries', 6),
  ('Rice & Noodles', 'rice-noodles', 'Asian-inspired rice and noodle bowls', 7),
  ('Main Course Chinese', 'main-course-chinese', 'Authentic Chinese mains with bold flavors', 8),
  ('Raita', 'raita', 'Cooling yogurt accompaniments', 9),
  ('Special Breads', 'special-breads', 'Freshly baked Indian breads from the tandoor', 10),
  ('Varieties of Rice', 'varieties-rice', 'Aromatic rice preparations', 11),
  ('Varieties of Biryani', 'varieties-biryani', 'Slow-cooked layered rice dishes with aromatic spices', 12),
  ('Indian Main Course (Chicken and Mutton)', 'indian-main-course-chicken-mutton', 'Rich and flavorful North Indian curries', 13),
  ('South Indian', 'south-indian', 'Authentic flavors from the south', 14),
  ('Indian Kebabs', 'indian-kebabs', 'Tandoor-grilled delicacies marinated in aromatic spices', 15),
  ('Tandoori Appetizers', 'tandoori-appetizers', 'Charcoal-grilled starters from the clay oven', 16),
  ('Salads', 'salads', 'Fresh, crisp, and nutritious', 17),
  ('Soups', 'soups', 'Warming bowls of comfort', 18)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything created:
-- SELECT * FROM menu_categories ORDER BY display_order;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';