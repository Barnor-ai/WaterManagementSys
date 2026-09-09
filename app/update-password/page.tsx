'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Droplets, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) return toast.error('Use at least 8 characters for your password.');
    if (password !== confirmation) return toast.error('The passwords do not match.');
    setSubmitting(true);
    const { error } = await updatePassword(password);
    if (error) toast.error(error);
    else setComplete(true);
    setSubmitting(false);
  };

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-6 dark:from-slate-950 dark:to-slate-900"><Card className="w-full max-w-md shadow-xl"><CardHeader><div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></div><span className="text-xl font-bold">AquaFlow ERP</span></div><CardTitle>Update password</CardTitle><CardDescription>Choose a strong password for your account.</CardDescription></CardHeader><CardContent>{complete ? <div className="space-y-4"><div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" /><span>Password updated successfully.</span></div><Button className="w-full" onClick={() => router.push('/')}>Continue to sign in</Button></div> : !ready ? <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p> : <form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div><Button className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}</Button></form>}</CardContent></Card></main>;
}
