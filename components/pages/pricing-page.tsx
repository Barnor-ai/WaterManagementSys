'use client';

import Link from 'next/link';
import { Check, Droplets, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLAN_DESCRIPTIONS, PLAN_FEATURES, PLAN_ORDER, PlanCode } from '@/lib/subscriptions';

const planDetails: Record<PlanCode, { price: string; users: string; branches: string }> = {
  starter: { price: '$29', users: '3', branches: '1' },
  professional: { price: '$79', users: '10', branches: '3' },
  business: { price: '$149', users: 'Unlimited', branches: 'Unlimited' },
};

const comparisonRows = [
  ['Price', '$29/month', '$79/month', '$149/month'],
  ['Users', '3', '10', 'Unlimited'],
  ['Branches', '1', '3', 'Unlimited'],
  ['Production', 'yes', 'yes', 'yes'],
  ['Inventory', 'yes', 'yes', 'yes'],
  ['Sales', 'yes', 'yes', 'yes'],
  ['Customers', 'yes', 'yes', 'yes'],
  ['Suppliers', 'yes', 'yes', 'yes'],
  ['Expenses', 'Basic', 'Advanced', 'Advanced'],
  ['Reports', 'Basic', 'Advanced', 'Advanced'],
  ['AI Insights', 'no', 'yes', 'yes'],
  ['AI Forecasting', 'no', 'no', 'yes'],
  ['Audit Logs', 'Basic', 'Advanced', 'Advanced'],
  ['Multiple Warehouses', 'no', 'yes', 'yes'],
  ['API Access', 'no', 'no', 'yes'],
  ['Priority Support', 'no', 'no', 'yes'],
] as const;

export function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20"><Droplets className="h-5 w-5" /></span>
            <span className="font-semibold tracking-tight">AquaFlow ERP</span>
          </Link>
          <Button asChild variant="outline"><Link href="/">Sign in</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center lg:px-8">
        <Badge className="mb-5 bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300">Simple, transparent pricing</Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Choose the plan that fits your plant.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">Start with a 14-day Professional trial. Keep your data safe and upgrade when your operation is ready.</p>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 text-left lg:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const isPopular = plan === 'professional';
            return (
              <Card key={plan} className={`relative flex flex-col overflow-hidden border-slate-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 ${isPopular ? 'border-2 border-sky-500 shadow-sky-100 dark:shadow-sky-950/40' : ''}`}>
                {isPopular && <div className="bg-sky-600 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-white">Most Popular</div>}
                <CardHeader className="pb-5">
                  <CardTitle className="capitalize">{plan}</CardTitle>
                  <CardDescription>{PLAN_DESCRIPTIONS[plan]}</CardDescription>
                  <div className="pt-4"><span className="text-4xl font-bold">{planDetails[plan].price}</span><span className="text-sm text-slate-500"> / month</span></div>
                  <p className="text-sm text-slate-500">{planDetails[plan].users} users · {planDetails[plan].branches} {planDetails[plan].branches === '1' ? 'branch' : 'branches'}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="flex-1 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                    {PLAN_FEATURES[plan].map((feature) => <li key={feature} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}
                  </ul>
                  <Button asChild className={`mt-8 w-full ${isPopular ? 'bg-sky-600 hover:bg-sky-700' : ''}`} variant={isPopular ? 'default' : 'outline'}><Link href="/upgrade">Start Free Trial</Link></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-16 dark:border-slate-800 dark:bg-slate-900/40 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8"><h2 className="text-2xl font-bold tracking-tight">Compare plans</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Everything you need to choose with confidence.</p></div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-5 py-4 font-semibold">Feature</th><th className="px-5 py-4 font-semibold">Starter</th><th className="px-5 py-4 font-semibold text-sky-700 dark:text-sky-300">Professional</th><th className="px-5 py-4 font-semibold">Business</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{comparisonRows.map(([feature, starter, professional, business]) => <tr key={feature} className="bg-white dark:bg-slate-950"><td className="px-5 py-3 font-medium">{feature}</td>{[starter, professional, business].map((value, index) => <td key={`${feature}-${index}`} className="px-5 py-3 text-slate-600 dark:text-slate-300">{value === 'yes' ? <Check className="h-4 w-4 text-emerald-600" /> : value === 'no' ? <Minus className="h-4 w-4 text-slate-400" /> : value}</td>)}</tr>)}</tbody></table>
          </div>
        </div>
      </section>
      <footer className="mx-auto max-w-7xl px-6 py-10 text-center text-sm text-slate-500 lg:px-8">All plans include secure tenant isolation and a 14-day Professional trial for new organizations.</footer>
    </main>
  );
}
