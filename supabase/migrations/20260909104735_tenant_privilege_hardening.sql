/*
# Tenant Privilege Hardening

## Overview
Closes column-level and anonymous-access gaps that row-level security alone does
not address.

## Changes
- Anonymous users lose table privileges across all tenant and configuration tables.
- Users may edit only their own profile name and phone through direct table access.
- Organization membership, role, activation state, and login metadata cannot be
changed from the browser.
- Organization subscription and billing fields cannot be changed from the browser.
- All SECURITY DEFINER RPCs are explicitly inaccessible to anon and PUBLIC.
- The timestamp trigger has a fixed search_path.

## Security
Tenant ownership and privilege-bearing fields can now change only through the
server-side RPCs that verify the authenticated caller.
*/

REVOKE ALL ON subscription_plans, organizations, user_invitations, profiles, branches, products, inventory, raw_materials, bottles, machines, production_batches, stock_movements, customers, suppliers, purchase_orders, purchase_order_items, goods_received_notes, sales, sale_items, payments, supplier_payments, expenses, notifications, audit_logs, company_settings FROM anon;

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON profiles TO authenticated;
REVOKE INSERT, DELETE ON profiles FROM authenticated;

REVOKE UPDATE ON organizations FROM authenticated;
GRANT UPDATE (company_name, company_code, business_registration_number, tax_number, phone, email, address, city, state, country, logo_url, currency_code, timezone, fiscal_year_start, tax_rate, invoice_prefix) ON organizations TO authenticated;
REVOKE INSERT, DELETE ON organizations FROM authenticated;

ALTER TABLE audit_logs ALTER COLUMN user_id SET DEFAULT auth.uid();
REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE ALL ON FUNCTION public.complete_organization_setup(text,text,text,text,text,text,text,text,text,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_organization_setup(text,text,text,text,text,text,text,text,text,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_organization(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text,text,text,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_sale(text,uuid,text,date,numeric,numeric,jsonb,numeric,numeric,numeric,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale(text,uuid,text,date,numeric,numeric,jsonb,numeric,numeric,numeric,numeric,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_organization_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_organization_id() TO authenticated;
REVOKE ALL ON FUNCTION public.invite_user(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_user(text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.record_production(text,date,text,text,uuid,integer,numeric,uuid,numeric,numeric,numeric,numeric,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_production(text,date,text,text,uuid,integer,numeric,uuid,numeric,numeric,numeric,numeric,text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.remove_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.toggle_member_active(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_member_active(uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.update_member_role(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid,text) TO authenticated;
