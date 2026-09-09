/*
# Multi-Tenant Role Compatibility

## Overview
Normalizes the existing administrator profile to the new SaaS role name before
multi-tenant role constraints are installed.

## Changes
- Replaces the legacy `super_admin` role with `platform_admin`.
- Replaces the old role CHECK constraint with the complete SaaS role list.

## Security
This preserves the existing administrator's access while using the new role
vocabulary required for organization-aware authorization.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE profiles SET role = 'platform_admin' WHERE role = 'super_admin';
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('platform_admin','org_owner','org_admin','factory_manager','production_officer','warehouse_manager','warehouse_officer','sales_manager','sales_officer','accountant','finance_manager','auditor','viewer'));
