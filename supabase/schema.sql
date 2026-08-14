-- ============================================================
-- AquaFlow Water Manufacturing Management System
-- Complete Database Schema — Paste into Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_branches" ON branches;
CREATE POLICY "select_branches" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_branches" ON branches;
CREATE POLICY "insert_branches" ON branches FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_branches" ON branches;
CREATE POLICY "update_branches" ON branches FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_branches" ON branches;
CREATE POLICY "delete_branches" ON branches FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'sales_officer' CHECK (role IN ('super_admin','factory_manager','warehouse_officer','sales_officer','accountant')),
  branch_id uuid REFERENCES branches(id),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_profiles" ON profiles;
CREATE POLICY "delete_profiles" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size_ml integer NOT NULL,
  category text DEFAULT 'bottled_water',
  unit_price numeric(12,2) DEFAULT 0,
  cost_per_unit numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 4. INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  opening_stock numeric(14,2) DEFAULT 0,
  produced_stock numeric(14,2) DEFAULT 0,
  sold_stock numeric(14,2) DEFAULT 0,
  returned_stock numeric(14,2) DEFAULT 0,
  damaged_stock numeric(14,2) DEFAULT 0,
  current_stock numeric(14,2) DEFAULT 0,
  reserved_stock numeric(14,2) DEFAULT 0,
  minimum_stock numeric(14,2) DEFAULT 0,
  maximum_stock numeric(14,2) DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(product_id, branch_id)
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_inventory" ON inventory;
CREATE POLICY "select_inventory" ON inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory" ON inventory;
CREATE POLICY "insert_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_inventory" ON inventory;
CREATE POLICY "update_inventory" ON inventory FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_inventory" ON inventory;
CREATE POLICY "delete_inventory" ON inventory FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 5. RAW MATERIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('water','bottle_preforms','bottle_caps','labels','packaging_nylon','cartons','chemicals','diesel','electricity')),
  unit text DEFAULT 'units',
  quantity numeric(14,2) DEFAULT 0,
  reorder_level numeric(14,2) DEFAULT 0,
  unit_cost numeric(12,2) DEFAULT 0,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_raw_materials" ON raw_materials;
CREATE POLICY "select_raw_materials" ON raw_materials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_raw_materials" ON raw_materials;
CREATE POLICY "insert_raw_materials" ON raw_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_raw_materials" ON raw_materials;
CREATE POLICY "update_raw_materials" ON raw_materials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_raw_materials" ON raw_materials;
CREATE POLICY "delete_raw_materials" ON raw_materials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. BOTTLES
-- ============================================================
CREATE TABLE IF NOT EXISTS bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_type text NOT NULL,
  size_ml integer NOT NULL,
  quantity numeric(14,2) DEFAULT 0,
  supplier_id text,
  unit_cost numeric(12,2) DEFAULT 0,
  usage_count numeric(14,2) DEFAULT 0,
  balance numeric(14,2) DEFAULT 0,
  reorder_level numeric(14,2) DEFAULT 0,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bottles" ON bottles;
CREATE POLICY "select_bottles" ON bottles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_bottles" ON bottles;
CREATE POLICY "insert_bottles" ON bottles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_bottles" ON bottles;
CREATE POLICY "update_bottles" ON bottles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_bottles" ON bottles;
CREATE POLICY "delete_bottles" ON bottles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 7. MACHINES
-- ============================================================
CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'idle' CHECK (status IN ('running','idle','maintenance','downtime')),
  capacity_per_hour numeric(14,2) DEFAULT 0,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_machines" ON machines;
CREATE POLICY "select_machines" ON machines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_machines" ON machines;
CREATE POLICY "insert_machines" ON machines FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_machines" ON machines;
CREATE POLICY "update_machines" ON machines FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_machines" ON machines;
CREATE POLICY "delete_machines" ON machines FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 8. PRODUCTION BATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  production_date date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('morning','afternoon','night')),
  machine_id uuid REFERENCES machines(id),
  operator text NOT NULL,
  product_id uuid REFERENCES products(id),
  bottle_size_ml integer NOT NULL,
  quantity_produced numeric(14,2) NOT NULL DEFAULT 0,
  rejected_quantity numeric(14,2) DEFAULT 0,
  damaged_bottles numeric(14,2) DEFAULT 0,
  waste_percentage numeric(5,2) DEFAULT 0,
  production_cost numeric(14,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('completed','pending','cancelled')),
  branch_id uuid REFERENCES branches(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_production_batches" ON production_batches;
CREATE POLICY "select_production_batches" ON production_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_production_batches" ON production_batches;
CREATE POLICY "insert_production_batches" ON production_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_production_batches" ON production_batches;
CREATE POLICY "update_production_batches" ON production_batches FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_production_batches" ON production_batches;
CREATE POLICY "delete_production_batches" ON production_batches FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 9. STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('stock_in','stock_out','transfer','adjustment','return','damaged','count','production','sale')),
  quantity numeric(14,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  from_branch_id uuid REFERENCES branches(id),
  to_branch_id uuid REFERENCES branches(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_stock_movements" ON stock_movements;
CREATE POLICY "select_stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_stock_movements" ON stock_movements;
CREATE POLICY "insert_stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_stock_movements" ON stock_movements;
CREATE POLICY "update_stock_movements" ON stock_movements FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_stock_movements" ON stock_movements;
CREATE POLICY "delete_stock_movements" ON stock_movements FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 10. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('business','retail','distributor')),
  email text,
  phone text,
  address text,
  credit_limit numeric(14,2) DEFAULT 0,
  outstanding_balance numeric(14,2) DEFAULT 0,
  tax_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 11. SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('bottle','cap','label','packaging','chemical','other')),
  email text,
  phone text,
  address text,
  contact_person text,
  outstanding_payable numeric(14,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 12. PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  order_date date NOT NULL,
  expected_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','received','cancelled')),
  total_amount numeric(14,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchase_orders" ON purchase_orders;
CREATE POLICY "select_purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_purchase_orders" ON purchase_orders;
CREATE POLICY "update_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 13. PURCHASE ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES raw_materials(id),
  description text,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(14,2) DEFAULT 0
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchase_order_items" ON purchase_order_items;
CREATE POLICY "select_purchase_order_items" ON purchase_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_purchase_order_items" ON purchase_order_items;
CREATE POLICY "insert_purchase_order_items" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_purchase_order_items" ON purchase_order_items;
CREATE POLICY "update_purchase_order_items" ON purchase_order_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_purchase_order_items" ON purchase_order_items;
CREATE POLICY "delete_purchase_order_items" ON purchase_order_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 14. GOODS RECEIVED NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text NOT NULL UNIQUE,
  po_id uuid REFERENCES purchase_orders(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  received_date date NOT NULL,
  total_amount numeric(14,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_goods_received_notes" ON goods_received_notes;
CREATE POLICY "select_goods_received_notes" ON goods_received_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_goods_received_notes" ON goods_received_notes;
CREATE POLICY "insert_goods_received_notes" ON goods_received_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_goods_received_notes" ON goods_received_notes;
CREATE POLICY "update_goods_received_notes" ON goods_received_notes FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_goods_received_notes" ON goods_received_notes;
CREATE POLICY "delete_goods_received_notes" ON goods_received_notes FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 15. SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id),
  sale_type text NOT NULL CHECK (sale_type IN ('cash','credit','wholesale','retail','distributor')),
  sale_date date NOT NULL,
  subtotal numeric(14,2) DEFAULT 0,
  discount numeric(14,2) DEFAULT 0,
  tax numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  amount_paid numeric(14,2) DEFAULT 0,
  balance numeric(14,2) DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled','returned')),
  salesperson text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sales" ON sales;
CREATE POLICY "select_sales" ON sales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_sales" ON sales;
CREATE POLICY "insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_sales" ON sales;
CREATE POLICY "update_sales" ON sales FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_sales" ON sales;
CREATE POLICY "delete_sales" ON sales FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 16. SALE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(14,2) DEFAULT 0
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sale_items" ON sale_items;
CREATE POLICY "select_sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_sale_items" ON sale_items;
CREATE POLICY "insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_sale_items" ON sale_items;
CREATE POLICY "update_sale_items" ON sale_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_sale_items" ON sale_items;
CREATE POLICY "delete_sale_items" ON sale_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 17. PAYMENTS (customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  sale_id uuid REFERENCES sales(id),
  payment_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','card')),
  reference text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_payments" ON payments;
CREATE POLICY "insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_payments" ON payments;
CREATE POLICY "update_payments" ON payments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_payments" ON payments;
CREATE POLICY "delete_payments" ON payments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 18. SUPPLIER PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  po_id uuid REFERENCES purchase_orders(id),
  payment_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','card')),
  reference text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_supplier_payments" ON supplier_payments;
CREATE POLICY "select_supplier_payments" ON supplier_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_supplier_payments" ON supplier_payments;
CREATE POLICY "insert_supplier_payments" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_supplier_payments" ON supplier_payments;
CREATE POLICY "update_supplier_payments" ON supplier_payments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_supplier_payments" ON supplier_payments;
CREATE POLICY "delete_supplier_payments" ON supplier_payments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 19. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_expenses" ON expenses;
CREATE POLICY "select_expenses" ON expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_expenses" ON expenses;
CREATE POLICY "insert_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "update_expenses" ON expenses;
CREATE POLICY "update_expenses" ON expenses FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "delete_expenses" ON expenses;
CREATE POLICY "delete_expenses" ON expenses FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- 20. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  severity text DEFAULT 'info' CHECK (severity IN ('info','warning','error','success')),
  is_read boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 21. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_audit_logs" ON audit_logs;
CREATE POLICY "update_audit_logs" ON audit_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_audit_logs" ON audit_logs;
CREATE POLICY "delete_audit_logs" ON audit_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 22. COMPANY SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'AquaFlow',
  logo_url text,
  address text,
  city text,
  state text,
  country text,
  phone text,
  email text,
  website text,
  tax_id text,
  registration_number text,
  currency_code text DEFAULT 'USD',
  is_setup_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_company_settings" ON company_settings;
CREATE POLICY "select_company_settings" ON company_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_company_settings" ON company_settings;
CREATE POLICY "insert_company_settings" ON company_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "update_company_settings" ON company_settings;
CREATE POLICY "update_company_settings" ON company_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "delete_company_settings" ON company_settings;
CREATE POLICY "delete_company_settings" ON company_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STORAGE BUCKET FOR COMPANY LOGOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_company_logos" ON storage.objects;
CREATE POLICY "auth_upload_company_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_update_company_logos" ON storage.objects;
CREATE POLICY "auth_update_company_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_delete_company_logos" ON storage.objects;
CREATE POLICY "auth_delete_company_logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_products_size ON products(size_ml);
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), COALESCE(NEW.raw_user_meta_data->>'role', 'sales_officer'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
