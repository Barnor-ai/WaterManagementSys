/*
# Company Settings Table

## Overview
Creates a single-row table for company setup details (name, logo, address, contact, tax info).
The logo is stored as a URL pointing to the Supabase storage bucket `company-logos`.

## New Tables
- `company_settings` — company profile with logo URL, name, address, phone, email, tax ID, registration number, currency

## Storage
- Creates a public storage bucket `company-logos` for logo image uploads

## Security
- RLS enabled on `company_settings`
- All authenticated users can read (shared company data)
- Only authenticated users can insert/update (app layer enforces super_admin)
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'AquaFlow',
  logo_url text,
  address text,
  city text,
  state text,
  country text,
  phone text,
  email text,
  website text,
  tax_id text,
  registration_number text,
  currency_code text DEFAULT 'USD',
  is_setup_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_company_settings" ON company_settings;
CREATE POLICY "auth_read_company_settings" ON company_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_company_settings" ON company_settings;
CREATE POLICY "auth_insert_company_settings" ON company_settings FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_company_settings" ON company_settings;
CREATE POLICY "auth_update_company_settings" ON company_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_company_settings" ON company_settings;
CREATE POLICY "auth_delete_company_settings" ON company_settings FOR DELETE TO authenticated USING (true);

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT DO NOTHING;

-- Storage policies: authenticated users can upload/read logos
DROP POLICY IF EXISTS "auth_read_company_logos" ON storage.objects;
CREATE POLICY "auth_read_company_logos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_upload_company_logos" ON storage.objects;
CREATE POLICY "auth_upload_company_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_update_company_logos" ON storage.objects;
CREATE POLICY "auth_update_company_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "auth_delete_company_logos" ON storage.objects;
CREATE POLICY "auth_delete_company_logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos');

-- Also allow anon to read logos (public bucket)
DROP POLICY IF EXISTS "anon_read_company_logos" ON storage.objects;
CREATE POLICY "anon_read_company_logos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'company-logos');
