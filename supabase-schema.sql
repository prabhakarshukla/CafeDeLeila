-- ============================================
-- CONTACT MESSAGES TABLE
-- ============================================

CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Public read access for menu
CREATE POLICY "Public read menu categories" ON menu_categories 
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read menu items" ON menu_items 
  FOR SELECT USING (is_available = true);

-- Anyone can create orders/bookings/applications/contact (validated in Edge Functions)
CREATE POLICY "Anyone can create orders" ON orders 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create bookings" ON bookings 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create applications" ON job_applications 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create contact messages" ON contact_messages 
  FOR INSERT WITH CHECK (true);

-- Service role (Edge Functions) bypasses RLS automatically

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_created ON job_applications(created_at DESC);
CREATE INDEX idx_contact_status ON contact_messages(status);
CREATE INDEX idx_contact_created ON contact_messages(created_at DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'CDL-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
    LPAD((SELECT COUNT(*) + 1 FROM orders WHERE created_at::date = NOW()::date)::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Auto-generate booking numbers
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number := 'BK-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
    LPAD((SELECT COUNT(*) + 1 FROM bookings WHERE created_at::date = NOW()::date)::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- Auto-generate application numbers
CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.application_number := 'APP-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
    LPAD((SELECT COUNT(*) + 1 FROM job_applications WHERE created_at::date = NOW()::date)::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_application_number
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

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - run after tables created)
-- ============================================

-- Insert categories from your menu.json
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
  ('Soups', 'soups', 'Warming bowls of comfort', 18);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything created:
-- SELECT * FROM menu_categories ORDER BY display_order;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';