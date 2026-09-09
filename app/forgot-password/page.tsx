'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Droplets, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await resetPassword(email.trim());
    if (error) toast.error(error);
    else setSent(true);
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <button type="button" className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => router.push('/')}><ArrowLeft className="h-4 w-4" /> Back to sign in</button>
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Droplets className="h-5 w-5" /></div><span className="text-xl font-bold">AquaFlow ERP</span></div>
          <div><CardTitle>Reset your password</CardTitle><CardDescription className="mt-2">Enter your email and we’ll send a secure reset link.</CardDescription></div>
        </CardHeader>
        <CardContent>
          {sent ? <div className="space-y-4 text-sm"><div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><Mail className="h-5 w-5 shrink-0" /><p>Check your inbox for the password reset link.</p></div><Button className="w-full" onClick={() => router.push('/')}>Return to sign in</Button></div> : <form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="reset-email">Email address</Label><Input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></div><Button className="w-full" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}</Button></form>}
        </CardContent>
      </Card>
    </main>
  );
}
