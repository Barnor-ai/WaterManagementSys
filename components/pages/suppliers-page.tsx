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
import { Truck, Plus, DollarSign, Package } from 'lucide-react';
import { Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'bottle' as 'bottle' | 'cap' | 'label' | 'packaging' | 'chemical' | 'other',
    email: '', phone: '', address: '', contact_person: '',
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers((data as Supplier[]) ?? []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('suppliers').insert(form);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Supplier added successfully');
      setDialogOpen(false);
      setForm({ name: '', category: 'bottle', email: '', phone: '', address: '', contact_person: '' });
      fetchSuppliers();
    }
    setSubmitting(false);
  };

  const totalPayable = suppliers.reduce((s, sup) => s + sup.outstanding_payable, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers for bottles, caps, labels, packaging, and chemicals"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottle">Bottle</SelectItem><SelectItem value="cap">Cap</SelectItem>
                      <SelectItem value="label">Label</SelectItem><SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="chemical">Chemical</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Supplier'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Suppliers" value={suppliers.length} icon={Truck} color="primary" />
        <StatCard title="Outstanding Payables" value={formatCurrency(totalPayable)} icon={DollarSign} color="warning" />
        <StatCard title="Categories" value={new Set(suppliers.map((s) => s.category)).size} icon={Package} color="success" />
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead><TableHead>Email</TableHead>
                    <TableHead className="text-right">Payable</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge className="capitalize bg-muted text-foreground">{s.category}</Badge></TableCell>
                      <TableCell>{s.contact_person ?? '-'}</TableCell>
                      <TableCell>{s.phone ?? '-'}</TableCell>
                      <TableCell className="text-sm">{s.email ?? '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.outstanding_payable)}</TableCell>
                      <TableCell>{s.is_active ? <Badge className="bg-success/10 text-success">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
