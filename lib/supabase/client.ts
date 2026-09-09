import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ovlsiyysvdytrvgsfvdh.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92bHNpeXlzdmR5dHJ2Z3NmdmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Mzc2MjksImV4cCI6MjEwNDUxMzYyOX0.en3WCyx5fZknyShZFXVuFRWMA7FbXBBF4TrcIH8qSSY';

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
