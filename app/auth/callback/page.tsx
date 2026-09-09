'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const finishSignIn = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session?.user) {
        router.replace('/');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', sessionData.session.user.id)
        .maybeSingle();
      router.replace(profile?.organization_id ? '/dashboard' : '/company-setup');
    };
    finishSignIn();
    return () => { active = false; };
  }, [router]);

  return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex flex-col items-center gap-3"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Completing sign in...</p></div></div>;
}
