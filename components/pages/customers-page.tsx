'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, DollarSign, TrendingUp, Building2, User } from 'lucide-react';
import { Customer, Sale, Payment } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'retail' as 'business' | 'retail' | 'distributor',
    email: '', phone: '', address: '', credit_limit: 0, tax_id: '',
  });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_method: 'cash', reference: '' });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('customers').insert({
      ...form,
      credit_limit: Number(form.credit_limit),
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Customer added successfully');
      setDialogOpen(false);
      setForm({ name: '', type: 'retail', email: '', phone: '', address: '', credit_limit: 0, tax_id: '' });
      fetchCustomers();
    }
    setSubmitting(false);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDialog) return;
    setSubmitting(true);
    const { error } = await supabase.from('payments').insert({
      customer_id: paymentDialog.id,
      payment_date: new Date().toISOString().split('T')[0],
      amount: Number(paymentForm.amount),
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      // Update customer balance
      await supabase
        .from('customers')
        .update({ outstanding_balance: paymentDialog.outstanding_balance - Number(paymentForm.amount) })
        .eq('id', paymentDialog.id);
      toast.success('Payment recorded successfully');
      setPaymentDialog(null);
      setPaymentForm({ amount: 0, payment_method: 'cash', reference: '' });
      fetchCustomers();
    }
    setSubmitting(false);
  };

  const totalOutstanding = customers.reduce((s, c) => s + c.outstanding_balance, 0);
  const businessCount = customers.filter((c) => c.type === 'business').length;
  const distributorCount = customers.filter((c) => c.type === 'distributor').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage business, retail, and distributor customers"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Credit Limit</Label><Input type="number" value={form.credit_limit || ''} onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tax ID</Label><Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Customer'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={customers.length} icon={Users} color="primary" />
        <StatCard title="Outstanding Balances" value={formatCurrency(totalOutstanding)} icon={DollarSign} color="warning" />
        <StatCard title="Business Customers" value={businessCount} icon={Building2} color="success" />
        <StatCard title="Distributors" value={distributorCount} icon={TrendingUp} color="chart-4" />
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead>
                    <TableHead className="text-right">Credit Limit</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge className={c.type === 'business' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          c.type === 'distributor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}>{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.phone ?? c.email ?? '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.credit_limit)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.outstanding_balance)}</TableCell>
                      <TableCell>{c.is_active ? <Badge className="bg-success/10 text-success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
                      <TableCell>
                        {c.outstanding_balance > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setPaymentDialog(c)}>Record Payment</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(v) => !v && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {paymentDialog?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted text-sm">
              Outstanding Balance: <span className="font-bold">{formatCurrency(paymentDialog?.outstanding_balance ?? 0)}</span>
            </div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={paymentForm.amount || ''} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} required /></div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem><SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Record Payment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
