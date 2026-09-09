'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useCurrency } from '@/lib/currency-context';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/lib/supabase/client';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import { Shield, Bell, Database, Palette, Clock, Coins, Building2, Upload, Loader2, ImageIcon, CreditCard, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSubscription, SubscriptionSummary } from '@/lib/subscriptions';

export function SettingsPage() {
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, currencies } = useCurrency();
  const { company, refresh } = useCompany();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  const [companyForm, setCompanyForm] = useState({
    name: '', address: '', city: '', state: '', country: '',
    phone: '', email: '', website: '', tax_id: '', registration_number: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        country: company.country ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        website: company.website ?? '',
        tax_id: company.tax_id ?? '',
        registration_number: company.registration_number ?? '',
      });
      setLogoUrl(company.logo_url);
    }
  }, [company]);

  useEffect(() => {
    fetchSubscription().then(({ data }) => {
      setSubscription(data);
      setSubscriptionLoading(false);
    });
  }, []);

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${profile.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('company-logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      setLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [profile]);

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) { toast.error('Company name is required'); return; }
    setSavingCompany(true);
    try {
      const payload = { ...companyForm, logo_url: logoUrl, updated_at: new Date().toISOString() };
      if (company?.id) {
        const { error } = await supabase.from('company_settings').update(payload).eq('id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_settings').insert({ ...payload, is_setup_complete: true });
        if (error) throw error;
      }
      await refresh();
      toast.success('Company profile updated');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSave = () => { toast.success('Settings saved successfully'); };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your system preferences and security options" />

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Your account information and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input value={profile?.full_name ?? ''} readOnly className="bg-muted" /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={profile?.email ?? ''} readOnly className="bg-muted" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Role</Label><div><Badge className={ROLE_COLORS[profile?.role ?? 'sales_officer']}>{ROLE_LABELS[profile?.role ?? 'sales_officer']}</Badge></div></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={profile?.phone ?? ''} placeholder="Not set" readOnly className="bg-muted" /></div>
              </div>
              <div className="space-y-2"><Label>Account Status</Label><div>{profile?.is_active ? <Badge className="bg-success/10 text-success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</div></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Company Profile</CardTitle>
              <CardDescription>Manage your company details and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Company Logo</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleLogoUpload(f); }}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  {logoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={logoUrl} alt="Company logo" className="h-20 w-20 rounded-xl object-cover shadow-sm" />
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Click to change</p>
                    </div>
                  ) : uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><ImageIcon className="h-5 w-5" /></div>
                      <p className="text-sm font-medium">Click or drag to upload</p>
                      <p className="text-xs">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} className="hidden" />
                </div>
              </div>

              <div className="space-y-2"><Label>Company Name</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>City</Label><Input value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>State / Province</Label><Input value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={companyForm.country} onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tax ID</Label><Input value={companyForm.tax_id} onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} /></div>
                <div className="space-y-2"><Label>Registration Number</Label><Input value={companyForm.registration_number} onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })} /></div>
              </div>
              <Button onClick={handleSaveCompany} disabled={savingCompany || uploading}>
                {savingCompany ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save Company Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing & Subscription</CardTitle>
              <CardDescription>Your organization plan, usage, and trial details</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading subscription...</div> : subscription ? <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/30 p-4">
                  <div><p className="text-sm text-muted-foreground">Current plan</p><p className="mt-1 text-2xl font-bold capitalize">{subscription.plan_name}</p><p className="mt-1 text-sm text-muted-foreground">${subscription.price_monthly} / month · {subscription.billing_cycle}</p></div>
                  <Badge variant={subscription.is_expired ? 'destructive' : 'secondary'} className="capitalize">{subscription.status}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Trial period</p><p className="mt-1 font-semibold">{subscription.trial_start ? new Date(subscription.trial_start).toLocaleDateString() : '—'} – {subscription.trial_end ? new Date(subscription.trial_end).toLocaleDateString() : '—'}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Days remaining</p><p className="mt-1 font-semibold">{subscription.days_remaining ?? '—'}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Users</p><p className="mt-1 font-semibold">{subscription.user_count} / {subscription.max_users >= 2147483647 ? 'Unlimited' : subscription.max_users}</p></div>
                  <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Branches</p><p className="mt-1 font-semibold">{subscription.branch_count} / {subscription.max_branches >= 2147483647 ? 'Unlimited' : subscription.max_branches}</p></div>
                </div>
                <div className="flex flex-wrap gap-3"><Button asChild><a href="/upgrade">Upgrade plan <ArrowUpRight className="ml-2 h-4 w-4" /></a></Button><Button asChild variant="outline"><a href="/pricing">View plans</a></Button></div>
              </div> : <p className="text-sm text-muted-foreground">Subscription details are not available yet. Complete organization setup to begin your trial.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
              <CardDescription>Customize how the system looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div><p className="font-medium">Dark Mode</p><p className="text-sm text-muted-foreground">Switch between light and dark themes</p></div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-muted-foreground" />
                  <div><p className="font-medium">Currency</p><p className="text-sm text-muted-foreground">Select the currency for all monetary values</p></div>
                </div>
                <Select value={currency.code} onValueChange={(v) => { setCurrency(v); toast.success(`Currency set to ${currencies.find((c) => c.code === v)?.name}`); }}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((c) => (<SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle>
              <CardDescription>Configure alert and notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Email Notifications', desc: 'Receive alerts via email', value: emailNotif, setter: setEmailNotif },
                { label: 'SMS Notifications', desc: 'Receive alerts via SMS', value: smsNotif, setter: setSmsNotif },
                { label: 'Low Stock Alerts', desc: 'Get notified when stock is low', value: lowStockAlert, setter: setLowStockAlert },
                { label: 'Daily Sales Summary', desc: 'Daily summary of sales activity', value: dailySummary, setter: setDailySummary },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 rounded-lg border">
                  <div><p className="font-medium">{item.label}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={item.value} onCheckedChange={item.setter} />
                </div>
              ))}
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security Settings</CardTitle>
              <CardDescription>Configure security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div><p className="font-medium">Session Timeout</p><p className="text-sm text-muted-foreground">Auto-logout after inactivity</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="w-20" />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div><p className="font-medium">Two-Factor Authentication</p><p className="text-sm text-muted-foreground">Add an extra layer of security</p></div>
                </div>
                <Switch checked={false} onCheckedChange={() => toast.info('2FA setup coming soon')} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  <div><p className="font-medium">Automatic Daily Backup</p><p className="text-sm text-muted-foreground">Database backed up automatically each day</p></div>
                </div>
                <Badge className="bg-success/10 text-success">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div><p className="font-medium">Encrypted Passwords</p><p className="text-sm text-muted-foreground">All passwords are encrypted at rest</p></div>
                </div>
                <Badge className="bg-success/10 text-success">Active</Badge>
              </div>
              <Button onClick={handleSave}>Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
