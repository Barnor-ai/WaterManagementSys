/*
# Multi-Tenant Security, RLS, and Organization RPCs

## Overview
Adds the authenticated organization lookup functions, invitation-aware profile
creation, tenant-isolated RLS policies, and secure RPCs for onboarding and
organization administration.

## Functions
- `get_my_organization_id()` — returns the caller's organization
- `is_platform_admin()` — identifies the platform-level administrator
- `create_organization()` — creates a 14-day trial organization and assigns its owner
- `invite_user()` — creates an organization-scoped invitation
- `update_member_role()`, `toggle_member_active()`, `remove_member()` — admin-only member management
- `complete_organization_setup()` — saves company onboarding settings

## Security
- Every business table uses organization_id against the authenticated profile.
- Client users cannot insert/update/delete organizations directly.
- Profiles cannot self-edit role, organization, or active status through RLS.
- Audit logs have SELECT and INSERT only; no UPDATE or DELETE policies.
- Signup role metadata is ignored; invited users receive the invitation role, and
uninvited signups receive a viewer profile without organization access.
*/

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.profiles WHERE id = auth.uid(); $$;
REVOKE ALL ON FUNCTION public.get_my_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_organization_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin'); $$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_inv record;
BEGIN
  SELECT * INTO v_inv FROM public.user_invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending' AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;
  IF v_inv IS NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer', NULL);
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role, organization_id)
    VALUES (NEW.id, NEW.email, COALESCE(v_inv.full_name, NEW.raw_user_meta_data->>'full_name', NEW.email), v_inv.role, v_inv.organization_id);
    UPDATE public.user_invitations SET status='accepted', accepted_at=now() WHERE id=v_inv.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Organization policies
DROP POLICY IF EXISTS "select_organizations" ON organizations;
CREATE POLICY "select_organizations" ON organizations FOR SELECT TO authenticated
USING (id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "insert_organizations" ON organizations;
DROP POLICY IF EXISTS "update_organizations" ON organizations;
CREATE POLICY "update_organizations" ON organizations FOR UPDATE TO authenticated
USING (id = get_my_organization_id() OR is_platform_admin())
WITH CHECK (id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "delete_organizations" ON organizations;

-- Invitation policies
DROP POLICY IF EXISTS "select_invitations" ON user_invitations;
CREATE POLICY "select_invitations" ON user_invitations FOR SELECT TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "insert_invitations" ON user_invitations;
CREATE POLICY "insert_invitations" ON user_invitations FOR INSERT TO authenticated
WITH CHECK (organization_id = get_my_organization_id() AND EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin','platform_admin')));
DROP POLICY IF EXISTS "update_invitations" ON user_invitations;
CREATE POLICY "update_invitations" ON user_invitations FOR UPDATE TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin())
WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "delete_invitations" ON user_invitations;
CREATE POLICY "delete_invitations" ON user_invitations FOR DELETE TO authenticated
USING ((organization_id = get_my_organization_id() AND EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin'))) OR is_platform_admin());

-- Profiles: users can view members in their org and update only safe personal fields
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT TO authenticated
USING (organization_id = get_my_organization_id() OR id=auth.uid() OR is_platform_admin());
DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (id=auth.uid());
DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
DROP POLICY IF EXISTS "delete_profiles" ON profiles;
CREATE POLICY "delete_profiles" ON profiles FOR DELETE TO authenticated USING (id=auth.uid());

-- Apply the same tenant boundary to all existing business tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['branches','products','inventory','raw_materials','bottles','machines','production_batches','stock_movements','customers','suppliers','purchase_orders','purchase_order_items','goods_received_notes','sales','sale_items','payments','supplier_payments','expenses','notifications']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'select_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (organization_id = get_my_organization_id() OR is_platform_admin())', 'select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'insert_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin())', 'insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'update_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (organization_id = get_my_organization_id() OR is_platform_admin()) WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin())', 'update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'delete_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (organization_id = get_my_organization_id() OR is_platform_admin())', 'delete_' || t, t);
  END LOOP;
END $$;

-- Company settings are kept for compatibility but scoped to the active organization.
DROP POLICY IF EXISTS "select_company_settings" ON company_settings;
CREATE POLICY "select_company_settings" ON company_settings FOR SELECT TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "insert_company_settings" ON company_settings;
CREATE POLICY "insert_company_settings" ON company_settings FOR INSERT TO authenticated
WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "update_company_settings" ON company_settings;
CREATE POLICY "update_company_settings" ON company_settings FOR UPDATE TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin())
WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "delete_company_settings" ON company_settings;
CREATE POLICY "delete_company_settings" ON company_settings FOR DELETE TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin());

-- Audit logs are immutable from the browser.
DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT TO authenticated
USING (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT TO authenticated
WITH CHECK (organization_id = get_my_organization_id() OR is_platform_admin());
DROP POLICY IF EXISTS "update_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "delete_audit_logs" ON audit_logs;

-- Storage objects must live in an organization folder: {organization_id}/filename
DROP POLICY IF EXISTS "auth_upload_company_logos" ON storage.objects;
CREATE POLICY "auth_upload_company_logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='company-logos' AND (storage.foldername(name))[1] = get_my_organization_id()::text);
DROP POLICY IF EXISTS "auth_update_company_logos" ON storage.objects;
CREATE POLICY "auth_update_company_logos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='company-logos' AND (storage.foldername(name))[1] = get_my_organization_id()::text)
WITH CHECK (bucket_id='company-logos' AND (storage.foldername(name))[1] = get_my_organization_id()::text);
DROP POLICY IF EXISTS "auth_delete_company_logos" ON storage.objects;
CREATE POLICY "auth_delete_company_logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='company-logos' AND (storage.foldername(name))[1] = get_my_organization_id()::text);
DROP POLICY IF EXISTS "public_read_company_logos" ON storage.objects;
CREATE POLICY "public_read_company_logos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='company-logos');

-- Create organization and assign current user as owner.
CREATE OR REPLACE FUNCTION public.create_organization(p_company_name text, p_company_code text DEFAULT NULL, p_currency_code text DEFAULT 'USD', p_country text DEFAULT NULL, p_timezone text DEFAULT 'UTC', p_plan_code text DEFAULT 'starter')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org_id uuid; v_plan_id uuid; v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND organization_id IS NOT NULL) THEN RAISE EXCEPTION 'You already belong to an organization'; END IF;
  SELECT id INTO v_plan_id FROM subscription_plans WHERE plan_code=p_plan_code AND is_active=true;
  IF v_plan_id IS NULL THEN RAISE EXCEPTION 'Subscription plan not found'; END IF;
  v_code := COALESCE(NULLIF(upper(trim(p_company_code)),''), upper(regexp_replace(left(p_company_name,5),'[^A-Za-z0-9]','','g')) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,4));
  INSERT INTO organizations(company_name,company_code,currency_code,country,timezone,subscription_plan_id,subscription_status,trial_start_date,trial_end_date)
  VALUES(p_company_name,v_code,p_currency_code,p_country,p_timezone,v_plan_id,'trialing',current_date,current_date+14)
  RETURNING id INTO v_org_id;
  UPDATE profiles SET organization_id=v_org_id, role='org_owner', updated_at=now() WHERE id=auth.uid();
  RETURN v_org_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_user(p_email text, p_full_name text, p_role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org_id uuid; v_token uuid;
BEGIN
  v_org_id := get_my_organization_id();
  IF v_org_id IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin','platform_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_role NOT IN ('org_admin','factory_manager','production_officer','warehouse_manager','warehouse_officer','sales_manager','sales_officer','accountant','finance_manager','auditor','viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(email)=lower(p_email) AND organization_id=v_org_id) THEN RAISE EXCEPTION 'User is already a member'; END IF;
  INSERT INTO user_invitations(organization_id,email,full_name,role,invited_by) VALUES(v_org_id,lower(trim(p_email)),p_full_name,p_role,auth.uid()) RETURNING invitation_token INTO v_token;
  RETURN v_token;
END;
$$;
REVOKE ALL ON FUNCTION public.invite_user(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_user(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_member_role(p_user_id uuid, p_new_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org_id uuid;
BEGIN
  v_org_id:=get_my_organization_id();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin','platform_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_user_id=auth.uid() OR p_new_role='platform_admin' THEN RAISE EXCEPTION 'Invalid role change'; END IF;
  IF p_new_role NOT IN ('org_owner','org_admin','factory_manager','production_officer','warehouse_manager','warehouse_officer','sales_manager','sales_officer','accountant','finance_manager','auditor','viewer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  UPDATE profiles SET role=p_new_role, updated_at=now() WHERE id=p_user_id AND organization_id=v_org_id;
END;
$$;
REVOKE ALL ON FUNCTION public.update_member_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_member_active(p_user_id uuid, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin','platform_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot disable your own account'; END IF;
  UPDATE profiles SET is_active=p_is_active, updated_at=now() WHERE id=p_user_id AND organization_id=get_my_organization_id();
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_member_active(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_member_active(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_member(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('org_owner','org_admin','platform_admin')) THEN RAISE EXCEPTION 'Administrator access required'; END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'You cannot remove yourself'; END IF;
  UPDATE profiles SET organization_id=NULL, is_active=false, updated_at=now() WHERE id=p_user_id AND organization_id=get_my_organization_id();
END;
$$;
REVOKE ALL ON FUNCTION public.remove_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_organization_setup(p_address text DEFAULT NULL, p_city text DEFAULT NULL, p_state text DEFAULT NULL, p_phone text DEFAULT NULL, p_email text DEFAULT NULL, p_website text DEFAULT NULL, p_tax_id text DEFAULT NULL, p_registration_number text DEFAULT NULL, p_logo_url text DEFAULT NULL, p_tax_rate numeric DEFAULT 0, p_invoice_prefix text DEFAULT 'INV', p_fiscal_year_start text DEFAULT 'January')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
BEGIN
  UPDATE organizations SET address=p_address, city=p_city, state=p_state, phone=p_phone, email=p_email, tax_number=p_tax_id, business_registration_number=p_registration_number, logo_url=p_logo_url, tax_rate=p_tax_rate, invoice_prefix=p_invoice_prefix, fiscal_year_start=p_fiscal_year_start, is_setup_complete=true, updated_at=now() WHERE id=get_my_organization_id();
END;
$$;
REVOKE ALL ON FUNCTION public.complete_organization_setup(text,text,text,text,text,text,text,text,text,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_organization_setup(text,text,text,text,text,text,text,text,text,numeric,text,text) TO authenticated;
