/*
# Tenant-Safe Insert Defaults

## Overview
Makes all existing business forms automatically assign new records to the
current authenticated organization without trusting a browser-supplied tenant ID.

## Changes
Adds `public.get_my_organization_id()` as the default for organization_id on
all tenant tables. Existing rows are not changed.

## Security
RLS policies still verify the final organization_id. A caller cannot use this
default to write into another organization because the policy compares it to the
organization from the authenticated profile.
*/

ALTER TABLE branches ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE products ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE inventory ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE raw_materials ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE bottles ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE machines ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE production_batches ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE stock_movements ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE customers ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE suppliers ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE purchase_orders ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE purchase_order_items ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE goods_received_notes ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE sales ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE sale_items ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE payments ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE supplier_payments ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE expenses ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE notifications ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE audit_logs ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
ALTER TABLE company_settings ALTER COLUMN organization_id SET DEFAULT public.get_my_organization_id();
