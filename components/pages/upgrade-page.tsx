'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { fetchPlans, fetchSubscription, PLAN_DESCRIPTIONS, PLAN_FEATURES, PLAN_ORDER, PlanCode, SubscriptionPlan, SubscriptionSummary } from '@/lib/subscriptions';

export function UpgradePage() {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchSubscription(), fetchPlans()]).then(([subscriptionResult, plansResult]) => {
      if (subscriptionResult.error) setError(subscriptionResult.error);
      setSubscription(subscriptionResult.data);
      if (plansResult.error && !subscriptionResult.error) setError(plansResult.error);
      setPlans(plansResult.data);
      setLoading(false);
    });
  }, []);

  return <AppShell><div className="space-y-8">
    <PageHeader title="Upgrade plan" description="Choose the right tools for your growing operation" />
    <div className="flex flex-wrap items-center gap-3"><Button asChild variant="ghost" className="-ml-3"><Link href="/settings"><ArrowLeft className="mr-2 h-4 w-4" />Back to settings</Link></Button><Badge variant="outline" className="gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" />Secure, tenant-specific billing</Badge></div>
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : error ? <Card><CardContent className="p-6 text-sm text-destructive">{error}</CardContent></Card> : <>
      {subscription && <Card className={subscription.is_expired ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3"><span>Current plan: <span className="capitalize">{subscription.plan_name}</span></span><Badge variant={subscription.is_expired ? 'destructive' : 'secondary'}>{subscription.status}</Badge></CardTitle><CardDescription>{subscription.is_expired ? 'Your trial or subscription has ended. Your data is safe, but new users and branches are restricted.' : subscription.status === 'trialing' ? `${subscription.days_remaining ?? 0} days remaining in your Professional trial.` : 'Your subscription is active.'}</CardDescription></CardHeader><CardContent className="grid gap-6 md:grid-cols-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly price</p><p className="mt-1 text-2xl font-bold">${subscription.price_monthly}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team usage</p><p className="mt-1 text-2xl font-bold">{subscription.user_count} <span className="text-sm font-normal text-muted-foreground">/ {subscription.max_users >= 2147483647 ? 'Unlimited' : subscription.max_users} users</span></p><Progress value={subscription.max_users >= 2147483647 ? 0 : Math.min(100, (subscription.user_count / subscription.max_users) * 100)} className="mt-2" /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Branch usage</p><p className="mt-1 text-2xl font-bold">{subscription.branch_count} <span className="text-sm font-normal text-muted-foreground">/ {subscription.max_branches >= 2147483647 ? 'Unlimited' : subscription.max_branches}</span></p><Progress value={subscription.max_branches >= 2147483647 ? 0 : Math.min(100, (subscription.branch_count / subscription.max_branches) * 100)} className="mt-2" /></div></CardContent></Card>}
      <div className="grid gap-6 lg:grid-cols-3">{PLAN_ORDER.map((plan) => { const dbPlan = plans.find((item) => item.plan_code === plan); const isCurrent = subscription?.plan_code === plan; const isProfessional = plan === 'professional'; return <Card key={plan} className={isProfessional ? 'border-sky-500 shadow-lg shadow-sky-100 dark:shadow-sky-950/30' : ''}><CardHeader><div className="flex items-center justify-between"><CardTitle className="capitalize">{dbPlan?.plan_name ?? plan}</CardTitle>{isProfessional && <Badge className="bg-sky-600">Recommended</Badge>}</div><CardDescription>{PLAN_DESCRIPTIONS[plan]}</CardDescription><p className="pt-3 text-3xl font-bold">${dbPlan?.price_monthly ?? (plan === 'starter' ? 29 : plan === 'professional' ? 79 : 149)}<span className="text-sm font-normal text-muted-foreground"> / month</span></p></CardHeader><CardContent><ul className="space-y-3">{PLAN_FEATURES[plan].map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul><Button className="mt-6 w-full" variant={isCurrent ? 'secondary' : isProfessional ? 'default' : 'outline'} disabled={isCurrent} onClick={() => window.alert('Payment integration is not enabled yet. Your plan is unchanged.')}>{isCurrent ? 'Current plan' : <><CreditCard className="mr-2 h-4 w-4" />Choose {plan}</>}</Button></CardContent></Card>; })}</div>
      <p className="text-center text-sm text-muted-foreground">Payments are not connected yet. Choosing a plan will never create a fake payment or change your subscription.</p>
    </>}
  </div></AppShell>;
}
