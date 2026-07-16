/*
# Transactional Schema: Production, Customers, Suppliers, Sales, Purchases, Warehouse, Financials

## Overview
Creates all transactional tables for the Water Manufacturing Management System.

## New Tables
1. `production_batches` - Production batch records with batch number, shift, machine, operator, bottle size, quantities, waste, cost, status
2. `stock_movements` - All stock movements (in/out/transfer/adjustment/return/damaged/count)
3. `customers` - Business, retail, distributor customers with credit limits and balances
4. `suppliers` - Suppliers by category (bottle, cap, label, packaging, chemical)
5. `purchase_orders` - Purchase orders with supplier, status, totals
6. `purchase_order_items` - Line items for purchase orders
7. `goods_received_notes` - GRN records linked to purchase orders
8. `sales` - Sales records (cash/credit, wholesale/retail/distributor)
9. `sale_items` - Line items for sales
10. `payments` - Customer payments
11. `supplier_payments` - Supplier payments
12. `expenses` - Operating expenses
13. `notifications` - System notifications
14. `audit_logs` - Activity audit logs

## Security
- RLS enabled on all tables
- All authenticated users can read/write company ERP data
- Role-based access enforced at application layer
*/

-- Production Batches
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
  created_by uuid REFERENCES auth.users(id)
);

-- Stock Movements
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
  created_by uuid REFERENCES auth.users(id)
);

-- Customers
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

-- Suppliers
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

-- Purchase Orders
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
  created_by uuid REFERENCES auth.users(id)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES raw_materials(id),
  description text,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(14,2) DEFAULT 0
);

-- Goods Received Notes
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_number text NOT NULL UNIQUE,
  po_id uuid REFERENCES purchase_orders(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  received_date date NOT NULL,
  total_amount numeric(14,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Sales
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
  created_by uuid REFERENCES auth.users(id)
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(14,2) DEFAULT 0
);

-- Customer Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  sale_id uuid REFERENCES sales(id),
  payment_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','card')),
  reference text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  po_id uuid REFERENCES purchase_orders(id),
  payment_date date NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','cheque','mobile_money','card')),
  reference text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL,
  branch_id uuid REFERENCES branches(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Notifications
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

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: create CRUD policies for a table
-- We'll write them out explicitly for each table

-- Production Batches
DROP POLICY IF EXISTS "auth_read_production_batches" ON production_batches;
CREATE POLICY "auth_read_production_batches" ON production_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_production_batches" ON production_batches;
CREATE POLICY "auth_insert_production_batches" ON production_batches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_production_batches" ON production_batches;
CREATE POLICY "auth_update_production_batches" ON production_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_production_batches" ON production_batches;
CREATE POLICY "auth_delete_production_batches" ON production_batches FOR DELETE TO authenticated USING (true);

-- Stock Movements
DROP POLICY IF EXISTS "auth_read_stock_movements" ON stock_movements;
CREATE POLICY "auth_read_stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_stock_movements" ON stock_movements;
CREATE POLICY "auth_insert_stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_stock_movements" ON stock_movements;
CREATE POLICY "auth_update_stock_movements" ON stock_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_stock_movements" ON stock_movements;
CREATE POLICY "auth_delete_stock_movements" ON stock_movements FOR DELETE TO authenticated USING (true);

-- Customers
DROP POLICY IF EXISTS "auth_read_customers" ON customers;
CREATE POLICY "auth_read_customers" ON customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE TO authenticated USING (true);

-- Suppliers
DROP POLICY IF EXISTS "auth_read_suppliers" ON suppliers;
CREATE POLICY "auth_read_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_suppliers" ON suppliers;
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_suppliers" ON suppliers;
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_suppliers" ON suppliers;
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- Purchase Orders
DROP POLICY IF EXISTS "auth_read_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_read_purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_insert_purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_update_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_delete_purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (true);

-- Purchase Order Items
DROP POLICY IF EXISTS "auth_read_purchase_order_items" ON purchase_order_items;
CREATE POLICY "auth_read_purchase_order_items" ON purchase_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_purchase_order_items" ON purchase_order_items;
CREATE POLICY "auth_insert_purchase_order_items" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_purchase_order_items" ON purchase_order_items;
CREATE POLICY "auth_update_purchase_order_items" ON purchase_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_purchase_order_items" ON purchase_order_items;
CREATE POLICY "auth_delete_purchase_order_items" ON purchase_order_items FOR DELETE TO authenticated USING (true);

-- Goods Received Notes
DROP POLICY IF EXISTS "auth_read_goods_received_notes" ON goods_received_notes;
CREATE POLICY "auth_read_goods_received_notes" ON goods_received_notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_goods_received_notes" ON goods_received_notes;
CREATE POLICY "auth_insert_goods_received_notes" ON goods_received_notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_goods_received_notes" ON goods_received_notes;
CREATE POLICY "auth_update_goods_received_notes" ON goods_received_notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_goods_received_notes" ON goods_received_notes;
CREATE POLICY "auth_delete_goods_received_notes" ON goods_received_notes FOR DELETE TO authenticated USING (true);

-- Sales
DROP POLICY IF EXISTS "auth_read_sales" ON sales;
CREATE POLICY "auth_read_sales" ON sales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_sales" ON sales;
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_sales" ON sales;
CREATE POLICY "auth_update_sales" ON sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_sales" ON sales;
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE TO authenticated USING (true);

-- Sale Items
DROP POLICY IF EXISTS "auth_read_sale_items" ON sale_items;
CREATE POLICY "auth_read_sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_sale_items" ON sale_items;
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_sale_items" ON sale_items;
CREATE POLICY "auth_update_sale_items" ON sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_sale_items" ON sale_items;
CREATE POLICY "auth_delete_sale_items" ON sale_items FOR DELETE TO authenticated USING (true);

-- Payments
DROP POLICY IF EXISTS "auth_read_payments" ON payments;
CREATE POLICY "auth_read_payments" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE TO authenticated USING (true);

-- Supplier Payments
DROP POLICY IF EXISTS "auth_read_supplier_payments" ON supplier_payments;
CREATE POLICY "auth_read_supplier_payments" ON supplier_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_supplier_payments" ON supplier_payments;
CREATE POLICY "auth_insert_supplier_payments" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_supplier_payments" ON supplier_payments;
CREATE POLICY "auth_update_supplier_payments" ON supplier_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_supplier_payments" ON supplier_payments;
CREATE POLICY "auth_delete_supplier_payments" ON supplier_payments FOR DELETE TO authenticated USING (true);

-- Expenses
DROP POLICY IF EXISTS "auth_read_expenses" ON expenses;
CREATE POLICY "auth_read_expenses" ON expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_expenses" ON expenses;
CREATE POLICY "auth_insert_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_expenses" ON expenses;
CREATE POLICY "auth_update_expenses" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_expenses" ON expenses;
CREATE POLICY "auth_delete_expenses" ON expenses FOR DELETE TO authenticated USING (true);

-- Notifications
DROP POLICY IF EXISTS "auth_read_notifications" ON notifications;
CREATE POLICY "auth_read_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);

-- Audit Logs
DROP POLICY IF EXISTS "auth_read_audit_logs" ON audit_logs;
CREATE POLICY "auth_read_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_audit_logs" ON audit_logs;
CREATE POLICY "auth_update_audit_logs" ON audit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_audit_logs" ON audit_logs;
CREATE POLICY "auth_delete_audit_logs" ON audit_logs FOR DELETE TO authenticated USING (true);

-- Indexes
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
