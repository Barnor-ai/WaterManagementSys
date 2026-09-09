/*
# Multi-Tenant SaaS Tables and Tenant Columns

## Overview
Adds the core organization and subscription model, invitation tracking, and
organization_id columns to all existing business tables.

## New Tables
- `subscription_plans`: configurable Starter, Professional, and Business plans
- `organizations`: one independent water manufacturing company per tenant
- `user_invitations`: secure organization-scoped invitation records

## Modified Tables
- `profiles`: organization_id and last_login_at
- All business tables: nullable organization_id during safe migration
- `audit_logs`: module, previous_value, new_value, ip_address, updated_at
- `company_settings`: organization_id

## Security
- RLS enabled on new tables
- Tenant columns indexed
- Existing data is preserved without destructive operations
*/

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_code text NOT NULL UNIQUE,
  plan_name text NOT NULL, max_users integer NOT NULL DEFAULT 3,
  max_branches integer NOT NULL DEFAULT 1, max_products integer,
  price_monthly numeric(12,2) NOT NULL DEFAULT 0, price_yearly numeric(12,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD', features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_subscription_plans" ON subscription_plans;
CREATE POLICY "select_subscription_plans" ON subscription_plans FOR SELECT TO authenticated USING (true);
INSERT INTO subscription_plans (plan_code, plan_name, max_users, max_branches, max_products, price_monthly, price_yearly, features)
VALUES ('starter','Starter',3,1,100,29,290,'{"production":true,"inventory":true,"sales":true,"customers":true,"basic_reports":true}'::jsonb),
('professional','Professional',10,3,NULL,99,990,'{"production":true,"inventory":true,"sales":true,"customers":true,"purchases":true,"expenses":true,"advanced_reports":true,"ai_insights":true}'::jsonb),
('business','Business',999999,999999,NULL,299,2990,'{"production":true,"inventory":true,"sales":true,"customers":true,"purchases":true,"expenses":true,"advanced_reports":true,"ai_insights":true,"api_access":true,"advanced_audit":true}'::jsonb)
ON CONFLICT (plan_code) DO UPDATE SET plan_name=EXCLUDED.plan_name, max_users=EXCLUDED.max_users, max_branches=EXCLUDED.max_branches, max_products=EXCLUDED.max_products, price_monthly=EXCLUDED.price_monthly, price_yearly=EXCLUDED.price_yearly, features=EXCLUDED.features, updated_at=now();

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_name text NOT NULL, company_code text UNIQUE,
  business_registration_number text, tax_number text, phone text, email text, address text, city text, state text, country text,
  logo_url text, currency_code text NOT NULL DEFAULT 'USD', timezone text NOT NULL DEFAULT 'UTC',
  fiscal_year_start text NOT NULL DEFAULT 'January', tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  invoice_prefix text NOT NULL DEFAULT 'INV', subscription_plan_id uuid REFERENCES subscription_plans(id),
  subscription_status text NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('trialing','active','past_due','canceled','expired')),
  trial_start_date date, trial_end_date date, subscription_start_date date, subscription_end_date date,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  payment_reference text, is_setup_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(company_code);

CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL, full_name text, role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('org_admin','factory_manager','production_officer','warehouse_manager','warehouse_officer','sales_manager','sales_officer','accountant','finance_manager','auditor','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  invitation_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invitations_org ON user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(invitation_token);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organization_id') THEN ALTER TABLE profiles ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_login_at') THEN ALTER TABLE profiles ADD COLUMN last_login_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branches' AND column_name='organization_id') THEN ALTER TABLE branches ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='organization_id') THEN ALTER TABLE products ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='organization_id') THEN ALTER TABLE inventory ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='raw_materials' AND column_name='organization_id') THEN ALTER TABLE raw_materials ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bottles' AND column_name='organization_id') THEN ALTER TABLE bottles ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='organization_id') THEN ALTER TABLE machines ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_batches' AND column_name='organization_id') THEN ALTER TABLE production_batches ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='organization_id') THEN ALTER TABLE stock_movements ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='organization_id') THEN ALTER TABLE customers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='organization_id') THEN ALTER TABLE suppliers ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='organization_id') THEN ALTER TABLE purchase_orders ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_order_items' AND column_name='organization_id') THEN ALTER TABLE purchase_order_items ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='goods_received_notes' AND column_name='organization_id') THEN ALTER TABLE goods_received_notes ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='organization_id') THEN ALTER TABLE sales ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sale_items' AND column_name='organization_id') THEN ALTER TABLE sale_items ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='organization_id') THEN ALTER TABLE payments ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='supplier_payments' AND column_name='organization_id') THEN ALTER TABLE supplier_payments ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='organization_id') THEN ALTER TABLE expenses ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='organization_id') THEN ALTER TABLE notifications ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='organization_id') THEN ALTER TABLE audit_logs ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='organization_id') THEN ALTER TABLE company_settings ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='module') THEN ALTER TABLE audit_logs ADD COLUMN module text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='previous_value') THEN ALTER TABLE audit_logs ADD COLUMN previous_value jsonb; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='new_value') THEN ALTER TABLE audit_logs ADD COLUMN new_value jsonb; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address') THEN ALTER TABLE audit_logs ADD COLUMN ip_address text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='updated_at') THEN ALTER TABLE audit_logs ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(); END IF; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_org ON raw_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_bottles_org ON bottles(organization_id);
CREATE INDEX IF NOT EXISTS idx_machines_org ON machines(organization_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_org ON production_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_org ON purchase_order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_org ON goods_received_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_org ON sale_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_org ON supplier_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_org ON company_settings(organization_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
