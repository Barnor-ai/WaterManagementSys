/*
# Fix RLS Policies - Replace Unrestricted True Clauses

## Overview
Replaces all INSERT/UPDATE/DELETE policies that used `true` (unrestricted) with proper ownership checks:
- Tables with `created_by` column: auth.uid() = created_by
- Tables with `user_id` column: auth.uid() = user_id
- `profiles` table: auth.uid() = id
- Shared reference data (no ownership column): auth.uid() IS NOT NULL

Also fixes:
- Storage bucket `company-logos`: removes broad SELECT listing policies
- `handle_new_user()` function: revokes EXECUTE from anon and authenticated
*/

-- ============================================================
-- TABLES WITH created_by COLUMN (ownership-based policies)
-- ============================================================

-- expenses
DROP POLICY IF EXISTS "auth_insert_expenses" ON expenses;
DROP POLICY IF EXISTS "auth_update_expenses" ON expenses;
DROP POLICY IF EXISTS "auth_delete_expenses" ON expenses;
CREATE POLICY "auth_insert_expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_expenses" ON expenses FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_expenses" ON expenses FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- goods_received_notes
DROP POLICY IF EXISTS "auth_insert_goods_received_notes" ON goods_received_notes;
DROP POLICY IF EXISTS "auth_update_goods_received_notes" ON goods_received_notes;
DROP POLICY IF EXISTS "auth_delete_goods_received_notes" ON goods_received_notes;
CREATE POLICY "auth_insert_goods_received_notes" ON goods_received_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_goods_received_notes" ON goods_received_notes FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_goods_received_notes" ON goods_received_notes FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- payments
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
DROP POLICY IF EXISTS "auth_update_payments" ON payments;
DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- production_batches
DROP POLICY IF EXISTS "auth_insert_production_batches" ON production_batches;
DROP POLICY IF EXISTS "auth_update_production_batches" ON production_batches;
DROP POLICY IF EXISTS "auth_delete_production_batches" ON production_batches;
CREATE POLICY "auth_insert_production_batches" ON production_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_production_batches" ON production_batches FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_production_batches" ON production_batches FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- purchase_orders
DROP POLICY IF EXISTS "auth_insert_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "auth_update_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "auth_delete_purchase_orders" ON purchase_orders;
CREATE POLICY "auth_insert_purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- sales
DROP POLICY IF EXISTS "auth_insert_sales" ON sales;
DROP POLICY IF EXISTS "auth_update_sales" ON sales;
DROP POLICY IF EXISTS "auth_delete_sales" ON sales;
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_sales" ON sales FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- stock_movements
DROP POLICY IF EXISTS "auth_insert_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "auth_update_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "auth_delete_stock_movements" ON stock_movements;
CREATE POLICY "auth_insert_stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_stock_movements" ON stock_movements FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_stock_movements" ON stock_movements FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- supplier_payments
DROP POLICY IF EXISTS "auth_insert_supplier_payments" ON supplier_payments;
DROP POLICY IF EXISTS "auth_update_supplier_payments" ON supplier_payments;
DROP POLICY IF EXISTS "auth_delete_supplier_payments" ON supplier_payments;
CREATE POLICY "auth_insert_supplier_payments" ON supplier_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_update_supplier_payments" ON supplier_payments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_delete_supplier_payments" ON supplier_payments FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ============================================================
-- TABLES WITH user_id COLUMN (ownership-based policies)
-- ============================================================

-- audit_logs
DROP POLICY IF EXISTS "auth_insert_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "auth_update_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "auth_delete_audit_logs" ON audit_logs;
CREATE POLICY "auth_insert_audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_audit_logs" ON audit_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_audit_logs" ON audit_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PROFILES TABLE (id = auth.uid())
-- ============================================================

DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_delete_profiles" ON profiles;
CREATE POLICY "auth_insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "auth_update_profiles" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "auth_delete_profiles" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- SHARED REFERENCE DATA (no ownership column)
-- These are company-wide shared tables; all authenticated users
-- need read access and can create/update/delete records.
-- ============================================================

-- branches
DROP POLICY IF EXISTS "auth_insert_branches" ON branches;
DROP POLICY IF EXISTS "auth_update_branches" ON branches;
DROP POLICY IF EXISTS "auth_delete_branches" ON branches;
CREATE POLICY "auth_insert_branches" ON branches FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_branches" ON branches FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_branches" ON branches FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- bottles
DROP POLICY IF EXISTS "auth_insert_bottles" ON bottles;
DROP POLICY IF EXISTS "auth_update_bottles" ON bottles;
DROP POLICY IF EXISTS "auth_delete_bottles" ON bottles;
CREATE POLICY "auth_insert_bottles" ON bottles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_bottles" ON bottles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_bottles" ON bottles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- company_settings
DROP POLICY IF EXISTS "auth_insert_company_settings" ON company_settings;
DROP POLICY IF EXISTS "auth_update_company_settings" ON company_settings;
DROP POLICY IF EXISTS "auth_delete_company_settings" ON company_settings;
CREATE POLICY "auth_insert_company_settings" ON company_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_company_settings" ON company_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_company_settings" ON company_settings FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- customers
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
DROP POLICY IF EXISTS "auth_update_customers" ON customers;
DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- inventory
DROP POLICY IF EXISTS "auth_insert_inventory" ON inventory;
DROP POLICY IF EXISTS "auth_update_inventory" ON inventory;
DROP POLICY IF EXISTS "auth_delete_inventory" ON inventory;
CREATE POLICY "auth_insert_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_inventory" ON inventory FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_inventory" ON inventory FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- machines
DROP POLICY IF EXISTS "auth_insert_machines" ON machines;
DROP POLICY IF EXISTS "auth_update_machines" ON machines;
DROP POLICY IF EXISTS "auth_delete_machines" ON machines;
CREATE POLICY "auth_insert_machines" ON machines FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_machines" ON machines FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_machines" ON machines FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- products
DROP POLICY IF EXISTS "auth_insert_products" ON products;
DROP POLICY IF EXISTS "auth_update_products" ON products;
DROP POLICY IF EXISTS "auth_delete_products" ON products;
CREATE POLICY "auth_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_products" ON products FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_products" ON products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- raw_materials
DROP POLICY IF EXISTS "auth_insert_raw_materials" ON raw_materials;
DROP POLICY IF EXISTS "auth_update_raw_materials" ON raw_materials;
DROP POLICY IF EXISTS "auth_delete_raw_materials" ON raw_materials;
CREATE POLICY "auth_insert_raw_materials" ON raw_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_raw_materials" ON raw_materials FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_raw_materials" ON raw_materials FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- suppliers
DROP POLICY IF EXISTS "auth_insert_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_delete_suppliers" ON suppliers;
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- sale_items (child of sales, no ownership column of its own)
DROP POLICY IF EXISTS "auth_insert_sale_items" ON sale_items;
DROP POLICY IF EXISTS "auth_update_sale_items" ON sale_items;
DROP POLICY IF EXISTS "auth_delete_sale_items" ON sale_items;
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_sale_items" ON sale_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_sale_items" ON sale_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ============================================================
-- STORAGE: Remove broad SELECT listing policies on company-logos
-- Public bucket objects are accessible via URL without SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "anon_read_company_logos" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_company_logos" ON storage.objects;

-- ============================================================
-- FUNCTION: Revoke EXECUTE on handle_new_user from anon and authenticated
-- The function is invoked by a trigger, not via RPC
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
