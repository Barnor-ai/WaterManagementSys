import { supabase } from '@/lib/supabase/client';

export type PlanCode = 'starter' | 'professional' | 'business';

export interface SubscriptionSummary {
  organization_id: string;
  plan_code: PlanCode;
  plan_name: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  price_monthly: number;
  currency_code: string;
  billing_cycle: 'monthly' | 'yearly';
  trial_start: string | null;
  trial_end: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  max_users: number;
  max_branches: number;
  user_count: number;
  branch_count: number;
  days_remaining: number | null;
  is_expired: boolean;
}

export interface SubscriptionPlan {
  id: string;
  plan_code: PlanCode;
  plan_name: string;
  max_users: number;
  max_branches: number;
  price_monthly: number;
  currency_code: string;
  features: Record<string, boolean>;
}

export async function fetchSubscription(): Promise<{ data: SubscriptionSummary | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_my_subscription');
  if (error) return { data: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as SubscriptionSummary | undefined) ?? null, error: null };
}

export async function fetchPlans(): Promise<{ data: SubscriptionPlan[]; error: string | null }> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, plan_code, plan_name, max_users, max_branches, price_monthly, currency_code, features')
    .eq('is_active', true)
    .order('price_monthly');
  if (error) return { data: [], error: error.message };
  return { data: (data as SubscriptionPlan[]) ?? [], error: null };
}

export const PLAN_ORDER: PlanCode[] = ['starter', 'professional', 'business'];

export const PLAN_DESCRIPTIONS: Record<PlanCode, string> = {
  starter: 'For small water manufacturing businesses.',
  professional: 'For growing water manufacturing businesses.',
  business: 'For larger water manufacturing businesses.',
};

export const PLAN_FEATURES: Record<PlanCode, string[]> = {
  starter: ['Production management', 'Inventory management', 'Sales management', 'Customer management', 'Supplier management', 'Basic expenses', 'Basic reports', 'Basic audit logs'],
  professional: ['Everything in Starter', 'Advanced expenses', 'Advanced reports', 'AI business insights', 'Advanced audit logs', 'Multiple warehouses'],
  business: ['Everything in Professional', 'AI forecasting', 'Multiple warehouses', 'API access', 'Priority support'],
};
