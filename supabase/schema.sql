-- AquaFlow ERP — Multi-Tenant SaaS Schema
-- This file documents the complete database schema as deployed via migrations.
-- All migrations have been applied to the Supabase project.
-- Do NOT run this file directly — use the migration files in supabase/migrations/.

-- ============================================================
-- TABLES (25 total, all with RLS enabled)
-- ============================================================

-- 1. subscription_plans (global, no org_id)
--    Starter, Professional, Business tiers with configurable limits

-- 2. organizations (the tenant entity)
--    company_name, company_code, subscription_plan_id, trial dates, billing

-- 3. user_invitations (org-scoped)
--    email, role, status, invitation_token, expires_at

-- 4. profiles (auth-linked, org-scoped)
--    id = auth.users.id, organization_id, role (13 SaaS roles), is_active

-- 5-25. Business tables (all org-scoped with get_my_organization_id() default):
--   branches, products, inventory, raw_materials, bottles, machines,
--   production_batches, stock_movements, customers, suppliers,
--   purchase_orders, purchase_order_items, goods_received_notes,
--   sales, sale_items, payments, supplier_payments, expenses,
--   notifications, audit_logs, company_settings

-- ============================================================
-- SECURITY FUNCTIONS (13 SECURITY DEFINER, all anon-revoked)
-- ============================================================

-- get_my_organization_id()  — returns caller's org from profiles
-- is_platform_admin()       — checks platform_admin role
-- handle_new_user()         — trigger: auto-creates profile on signup
-- create_organization()     — creates org + assigns caller as org_owner
-- invite_user()             — creates org-scoped invitation
-- update_member_role()      — admin-only role change
-- toggle_member_active()    — admin-only activate/deactivate
-- remove_member()           — admin-only removal (preserves audit trail)
-- complete_organization_setup() — saves onboarding data
-- create_sale()             — atomic: sale + items + inventory + audit
-- record_production()       — atomic: batch + inventory + audit
-- record_stock_movement()   — atomic: validated stock change + audit
-- update_updated_at_column() — trigger helper (no API access)

-- ============================================================
-- RLS POLICIES (all org-scoped via get_my_organization_id())
-- ============================================================

-- SELECT:  USING (organization_id = get_my_organization_id() OR is_platform_admin())
-- INSERT:  WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin())
-- UPDATE:  USING + WITH CHECK (same)
-- DELETE:  USING (same)
--
-- Exceptions:
--   organizations: SELECT/UPDATE only (no direct INSERT/DELETE from browser)
--   subscription_plans: SELECT only (public to all authenticated)
--   audit_logs: SELECT + INSERT only (immutable — no UPDATE/DELETE)
--   profiles: column-level UPDATE restricted to full_name, phone only

-- ============================================================
-- STORAGE
-- ============================================================

-- Bucket: company-logos (public read, org-scoped write)
-- Path format: {organization_id}/logo-{timestamp}.{ext}

-- ============================================================
-- EDGE FUNCTIONS (2 deployed, JWT-verified)
-- ============================================================

-- 1. ai-assistant  — org-scoped AI insights (verifies JWT, filters by org)
-- 2. invite-user   — sends invitation email via Supabase Admin API
