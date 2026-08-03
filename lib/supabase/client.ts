import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ylkmcttajcwovhsruwke.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsa21jdHRhamN3b3Zoc3J1d2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMzUxMDQsImV4cCI6MjA5OTYxMTEwNH0.rXd_5Q65KlYioVxtjMfVZTOJd-7aXLLzTaN45hld1CM';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_KEY;

const clientUrl = supabaseUrl;
const clientKey = supabaseAnonKey;

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
