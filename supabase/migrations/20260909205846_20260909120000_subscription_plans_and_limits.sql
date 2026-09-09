/*
# Align subscription plans and enforce tenant limits

1. Purpose
- Updates the three subscription plans to the requested Starter, Professional, and Business pricing.
- Makes every new organization start on a 14-day Professional trial.
- Adds database functions that expose the current organization's subscription state.
- Enforces user invitation and branch limits in trusted database code rather than relying on the browser.

2. Modified data
- `subscription_plans.price_monthly` is set to 29, 79, and 149 USD.
- `subscription_plans.max_users` is set to 3, 10, and unlimited for Starter, Professional, and Business.
- `subscription_plans.max_branches` is set to 1, 3, and unlimited for Starter, Professional, and Business.
- Existing organization data is preserved.

3. Security
- Subscription summary functions run with a fixed public search path and are callable only by authenticated users.
- Invitation limits are enforced inside `invite_user`.
- Branch creation is guarded by an authenticated, tenant-aware database function and an RLS insert policy.
- Expired trials and subscriptions cannot create new users or branches, while existing organization data remains stored.

4. Important notes
- No payment provider or fake payment confirmation is added.
- Trial and paid subscription dates remain the database source of truth.
- The migration is additive and safe to re-run.
*/

UPDATE subscription_plans
SET price_monthly = CASE plan_code
      WHEN 'starter' THEN 29
      WHEN 'professional' THEN 79
      WHEN 'business' THEN 149
    END,
    price_yearly = CASE plan_code
      WHEN 'starter' THEN 348
      WHEN 'professional' THEN 948
      WHEN 'business' THEN 1788
    END,
    max_users = CASE plan_code
      WHEN 'starter' THEN 3
      WHEN 'professional' THEN 10
      WHEN 'business' THEN 2147483647
    END,
    max_branches = CASE plan_code
      WHEN 'starter' THEN 1
      WHEN 'professional' THEN 3
      WHEN 'business' THEN 2147483647
    END,
    features = CASE plan_code
      WHEN 'starter' THEN jsonb_build_object('production', true, 'inventory', true, 'sales', true, 'customers', true, 'suppliers', true, 'basic_expenses', true, 'basic_reports', true, 'basic_audit', true)
      WHEN 'professional' THEN jsonb_build_object('production', true, 'inventory', true, 'sales', true, 'customers', true, 'suppliers', true, 'advanced_expenses', true, 'advanced_reports', true, 'ai_insights', true, 'advanced_audit', true, 'multiple_warehouses', true)
      WHEN 'business' THEN jsonb_build_object('production', true, 'inventory', true, 'sales', true, 'customers', true, 'suppliers', true, 'advanced_expenses', true, 'advanced_reports', true, 'ai_insights', true, 'ai_forecasting', true, 'advanced_audit', true, 'multiple_warehouses', true, 'api_access', true, 'priority_support', true)
      ELSE features
    END,
    updated_at = now()
WHERE plan_code IN ('starter', 'professional', 'business');

CREATE OR REPLACE FUNCTION public.get_my_subscription()
RETURNS TABLE (
  organization_id uuid,
  plan_code text,
  plan_name text,
  status text,
  price_monthly numeric,
  currency_code text,
  billing_cycle text,
  trial_start date,
  trial_end date,
  subscription_start date,
  subscription_end date,
  max_users integer,
  max_branches integer,
  user_count bigint,
  branch_count bigint,
  days_remaining integer,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    p.plan_code,
    p.plan_name,
    CASE
      WHEN o.subscription_status = 'trialing' AND o.trial_end_date < current_date THEN 'expired'
      WHEN o.subscription_status IN ('active', 'trialing') AND o.subscription_end_date IS NOT NULL AND o.subscription_end_date < current_date THEN 'expired'
      ELSE o.subscription_status
    END,
    p.price_monthly,
    o.currency_code,
    o.billing_cycle,
    o.trial_start_date,
    o.trial_end_date,
    o.subscription_start_date,
    o.subscription_end_date,
    p.max_users,
    p.max_branches,
    (SELECT count(*) FROM profiles m WHERE m.organization_id = o.id AND m.is_active = true),
    (SELECT count(*) FROM branches b WHERE b.organization_id = o.id AND b.is_active = true),
    CASE
      WHEN o.subscription_status = 'trialing' THEN GREATEST(0, o.trial_end_date - current_date)
      WHEN o.subscription_end_date IS NOT NULL THEN GREATEST(0, o.subscription_end_date - current_date)
      ELSE NULL
    END,
    (o.subscription_status = 'trialing' AND o.trial_end_date < current_date)
      OR (o.subscription_end_date IS NOT NULL AND o.subscription_end_date < current_date)
  FROM organizations o
  JOIN subscription_plans p ON p.id = o.subscription_plan_id
  WHERE o.id = get_my_organization_id();
$$;

CREATE OR REPLACE FUNCTION public.organization_subscription_allows(p_organization_id uuid, p_resource text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_count bigint;
BEGIN
  IF p_organization_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_org FROM organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_org.subscription_status = 'trialing' AND v_org.trial_end_date < current_date THEN RETURN false; END IF;
  IF v_org.subscription_end_date IS NOT NULL AND v_org.subscription_end_date < current_date THEN RETURN false; END IF;
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_org.subscription_plan_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_resource = 'users' THEN
    SELECT count(*) INTO v_count FROM profiles WHERE organization_id = p_organization_id AND is_active = true;
    RETURN v_count < v_plan.max_users;
  END IF;
  IF p_resource = 'branches' THEN
    SELECT count(*) INTO v_count FROM branches WHERE organization_id = p_organization_id AND is_active = true;
    RETURN v_count < v_plan.max_branches;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization(
  p_company_name text,
  p_company_code text DEFAULT NULL,
  p_currency_code text DEFAULT 'USD',
  p_country text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC',
  p_plan_code text DEFAULT 'professional'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org_id uuid; v_plan_id uuid; v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL) THEN RAISE EXCEPTION 'You already belong to an organization'; END IF;
  SELECT id INTO v_plan_id FROM subscription_plans WHERE plan_code = p_plan_code AND is_active = true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Subscription plan not found'; END IF;
  v_code := COALESCE(NULLIF(upper(trim(p_company_code)), ''), upper(regexp_replace(left(p_company_name, 5), '[^A-Za-z0-9]', '', 'g')) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  INSERT INTO organizations(company_name, company_code, currency_code, country, timezone, subscription_plan_id, subscription_status, trial_start_date, trial_end_date)
  VALUES(p_company_name, v_code, p_currency_code, p_country, p_timezone, v_plan_id, 'trialing', current_date, current_date + 14)
  RETURNING id INTO v_org_id;
  UPDATE profiles SET organization_id = v_org_id, role = 'org_owner', updated_at = now() WHERE id = auth.uid();
  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_user(p_email text, p_full_name text, p_role text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org_id uuid; v_token uuid;
BEGIN
  v_org_id := get_my_organization_id();
  IF v_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('org_owner','org_admin','platform_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF NOT organization_subscription_allows(v_org_id, 'users') THEN RAISE EXCEPTION 'Your plan has reached its user limit or is expired. Upgrade your plan to add another user.'; END IF;
  IF p_role NOT IN ('org_admin','factory_manager','production_officer','warehouse_manager','warehouse_officer','sales_manager','sales_officer','accountant','finance_manager','auditor','viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower(p_email) AND organization_id = v_org_id) THEN RAISE EXCEPTION 'User is already a member'; END IF;
  INSERT INTO user_invitations(organization_id, email, full_name, role, invited_by) VALUES(v_org_id, lower(trim(p_email)), p_full_name, p_role, auth.uid()) RETURNING invitation_token INTO v_token;
  RETURN v_token;
END;
$$;

DROP POLICY IF EXISTS "insert_branches" ON branches;
CREATE POLICY "insert_branches" ON branches FOR INSERT TO authenticated
WITH CHECK ((organization_id = get_my_organization_id() AND organization_subscription_allows(get_my_organization_id(), 'branches')) OR is_platform_admin());

REVOKE ALL ON FUNCTION public.get_my_subscription() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_subscription() TO authenticated;
REVOKE ALL ON FUNCTION public.organization_subscription_allows(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_subscription_allows(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_organization(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.invite_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_user(text, text, text) TO authenticated;
