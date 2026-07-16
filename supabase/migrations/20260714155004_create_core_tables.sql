/*
# Core Schema: Profiles, Branches, Products, Inventory, Raw Materials, Bottles, Machines

## Overview
Creates the foundational tables for the Water Manufacturing Management System.

## New Tables
1. `branches` - Factory branches for multi-branch support
2. `profiles` - User profiles extending auth.users with role and branch assignment
3. `products` - Product catalog (bottle sizes: 330ml, 500ml, 750ml, 1L, 1.5L, 5L, 19L)
4. `inventory` - Real-time inventory per product with opening/produced/sold/returned/damaged/current/reserved/min/max stock
5. `raw_materials` - Raw materials (water, preforms, caps, labels, packaging, chemicals, diesel, electricity)
6. `bottles` - Bottle tracking with type, quantity, supplier, cost, usage, balance, reorder level
7. `machines` - Production machines with status and capacity

## Security
- RLS enabled on all tables
- All authenticated users can read/write company data (ERP shared data model)
- Role-based access control enforced at the application layer
*/

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Profiles table (extends auth.users)
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

-- Products table (bottle sizes)
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

-- Inventory table (real-time stock per product)
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

-- Raw materials table
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

-- Bottles table (bottle tracking)
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

-- Machines table
CREATE TABLE IF NOT EXISTS machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'idle' CHECK (status IN ('running','idle','maintenance','downtime')),
  capacity_per_hour numeric(14,2) DEFAULT 0,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- RLS Policies: all authenticated users can read/write company ERP data
-- This is a shared-data ERP model where role-based access is enforced at the app layer

-- Branches
DROP POLICY IF EXISTS "auth_read_branches" ON branches;
CREATE POLICY "auth_read_branches" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_branches" ON branches;
CREATE POLICY "auth_insert_branches" ON branches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_branches" ON branches;
CREATE POLICY "auth_update_branches" ON branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_branches" ON branches;
CREATE POLICY "auth_delete_branches" ON branches FOR DELETE TO authenticated USING (true);

-- Profiles
DROP POLICY IF EXISTS "auth_read_profiles" ON profiles;
CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
CREATE POLICY "auth_insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
CREATE POLICY "auth_update_profiles" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_profiles" ON profiles;
CREATE POLICY "auth_delete_profiles" ON profiles FOR DELETE TO authenticated USING (true);

-- Products
DROP POLICY IF EXISTS "auth_read_products" ON products;
CREATE POLICY "auth_read_products" ON products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_products" ON products;
CREATE POLICY "auth_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_products" ON products;
CREATE POLICY "auth_update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_products" ON products;
CREATE POLICY "auth_delete_products" ON products FOR DELETE TO authenticated USING (true);

-- Inventory
DROP POLICY IF EXISTS "auth_read_inventory" ON inventory;
CREATE POLICY "auth_read_inventory" ON inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_inventory" ON inventory;
CREATE POLICY "auth_insert_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_inventory" ON inventory;
CREATE POLICY "auth_update_inventory" ON inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_inventory" ON inventory;
CREATE POLICY "auth_delete_inventory" ON inventory FOR DELETE TO authenticated USING (true);

-- Raw Materials
DROP POLICY IF EXISTS "auth_read_raw_materials" ON raw_materials;
CREATE POLICY "auth_read_raw_materials" ON raw_materials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_raw_materials" ON raw_materials;
CREATE POLICY "auth_insert_raw_materials" ON raw_materials FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_raw_materials" ON raw_materials;
CREATE POLICY "auth_update_raw_materials" ON raw_materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_raw_materials" ON raw_materials;
CREATE POLICY "auth_delete_raw_materials" ON raw_materials FOR DELETE TO authenticated USING (true);

-- Bottles
DROP POLICY IF EXISTS "auth_read_bottles" ON bottles;
CREATE POLICY "auth_read_bottles" ON bottles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_bottles" ON bottles;
CREATE POLICY "auth_insert_bottles" ON bottles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_bottles" ON bottles;
CREATE POLICY "auth_update_bottles" ON bottles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_bottles" ON bottles;
CREATE POLICY "auth_delete_bottles" ON bottles FOR DELETE TO authenticated USING (true);

-- Machines
DROP POLICY IF EXISTS "auth_read_machines" ON machines;
CREATE POLICY "auth_read_machines" ON machines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_machines" ON machines;
CREATE POLICY "auth_insert_machines" ON machines FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_machines" ON machines;
CREATE POLICY "auth_update_machines" ON machines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_machines" ON machines;
CREATE POLICY "auth_delete_machines" ON machines FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_products_size ON products(size_ml);

-- Trigger to auto-create profile on user signup
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
