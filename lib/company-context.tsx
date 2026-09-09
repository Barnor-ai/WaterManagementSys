'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Organization } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

export interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  registration_number: string | null;
  currency_code: string | null;
  is_setup_complete: boolean;
}

interface CompanyContextType {
  company: CompanySettings | null;
  organization: Organization | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

function mapOrganization(organization: Organization): CompanySettings {
  return {
    id: organization.id,
    name: organization.company_name,
    logo_url: organization.logo_url,
    address: organization.address,
    city: organization.city,
    state: organization.state,
    country: organization.country,
    phone: organization.phone,
    email: organization.email,
    website: null,
    tax_id: organization.tax_number,
    registration_number: organization.business_registration_number,
    currency_code: organization.currency_code,
    is_setup_complete: organization.is_setup_complete,
  };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    if (authLoading) return;
    if (!profile?.organization_id) {
      setOrganization(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle();
    if (error) console.error('Error fetching organization:', error);
    setOrganization(data as Organization | null);
    setLoading(false);
  }, [authLoading, profile?.organization_id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return (
    <CompanyContext.Provider value={{ company: organization ? mapOrganization(organization) : null, organization, loading, refresh: fetchCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}
