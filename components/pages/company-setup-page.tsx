'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, SUPABASE_URL } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { useCurrency } from '@/lib/currency-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplets, Upload, Building2, Loader2, Check, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CompanySetupPage() {
  const { user } = useAuth();
  const { company, refresh } = useCompany();
  const { currencies } = useCurrency();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(company?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: company?.name ?? '',
    address: company?.address ?? '',
    city: company?.city ?? '',
    state: company?.state ?? '',
    country: company?.country ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    website: company?.website ?? '',
    tax_id: company?.tax_id ?? '',
    registration_number: company?.registration_number ?? '',
    currency_code: company?.currency_code ?? 'USD',
  });

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo-${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      setLogoUrl(url);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!logoUrl) {
      toast.error('Company logo is required');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, logo_url: logoUrl, is_setup_complete: true, updated_at: new Date().toISOString() };

      if (company?.id) {
        const { error } = await supabase.from('company_settings').update(payload).eq('id', company.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_settings').insert(payload);
        if (error) throw error;
      }

      await refresh();
      toast.success('Company setup complete!');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Company Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your company profile and upload your logo to get started</p>
        </div>

        <Card className="shadow-xl border-none">
          <CardContent className="p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Logo upload */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Company Logo <span className="text-destructive">*</span></Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="relative flex flex-col items-center justify-center w-full h-44 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  {logoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={logoUrl} alt="Company logo" className="h-24 w-24 rounded-xl object-cover shadow-sm" />
                      <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Click to change</p>
                    </div>
                  ) : uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium">Click or drag to upload</p>
                      <p className="text-xs">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-2">
                <Label>Company Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AquaFlow Manufacturing Ltd"
                  required
                />
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>State / Province</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Nigeria" /></div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select value={form.currency_code} onValueChange={(v) => setForm({ ...form, currency_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.company.com" /></div>
                <div className="space-y-2"><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
                <div className="space-y-2"><Label>Registration Number</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={saving || uploading}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Complete Setup</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
