'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Factory, Plus, TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import { StatCard } from '@/components/shared/stat-card';
import { ProductionBatch, Product, Machine } from '@/lib/types';
import { generateBatchNumber, formatDate, formatNumber, formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

const BOTTLE_SIZES = [330, 500, 750, 1000, 1500, 5000, 19000];

export function ProductionPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    batch_number: generateBatchNumber(),
    production_date: new Date().toISOString().split('T')[0],
    shift: 'morning' as 'morning' | 'afternoon' | 'night',
    machine_id: '',
    operator: '',
    product_id: '',
    bottle_size_ml: 500,
    quantity_produced: 0,
    rejected_quantity: 0,
    damaged_bottles: 0,
    production_cost: 0,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [b, p, m] = await Promise.all([
      supabase.from('production_batches').select('*, product:products(*), machine:machines(*)').order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('machines').select('*'),
    ]);
    setBatches((b.data as ProductionBatch[]) ?? []);
    setProducts((p.data as Product[]) ?? []);
    setMachines((m.data as Machine[]) ?? []);
    setLoading(false);
  };

  const wastePct = form.quantity_produced > 0
    ? ((form.rejected_quantity + form.damaged_bottles) / form.quantity_produced) * 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.rpc('record_production', {
      p_batch_number: form.batch_number,
      p_production_date: form.production_date,
      p_shift: form.shift,
      p_operator: form.operator,
      p_product_id: form.product_id,
      p_bottle_size_ml: Number(form.bottle_size_ml),
      p_quantity_produced: Number(form.quantity_produced),
      p_machine_id: form.machine_id || null,
      p_rejected_quantity: Number(form.rejected_quantity),
      p_damaged_bottles: Number(form.damaged_bottles),
      p_waste_percentage: Number(wastePct.toFixed(2)),
      p_production_cost: Number(form.production_cost),
      p_notes: form.notes || null,
      p_branch_id: null,
    });

    if (error) {
      toast.error('Unable to record production. Please check the batch details and try again.');
      console.error('record production failed', error);
      setSubmitting(false);
      return;
    }

    toast.success('Production batch recorded successfully');
    setDialogOpen(false);
    setForm({
      ...form,
      batch_number: generateBatchNumber(),
      quantity_produced: 0, rejected_quantity: 0, damaged_bottles: 0, production_cost: 0, notes: '',
    });
    setSubmitting(false);
    fetchData();
  };

  const totalProduced = batches.reduce((s, b) => s + b.quantity_produced, 0);
  const totalRejected = batches.reduce((s, b) => s + b.rejected_quantity + b.damaged_bottles, 0);
  const totalCost = batches.reduce((s, b) => s + b.production_cost, 0);
  const avgWaste = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production"
        description="Track water production batches, machine output, and waste"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Batch</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Production Batch</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Production Date</Label>
                    <Input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Machine</Label>
                    <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                      <SelectContent>
                        {machines.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Input value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select value={form.product_id} onValueChange={(v) => {
                      const p = products.find((p) => p.id === v);
                      setForm({ ...form, product_id: v, bottle_size_ml: p?.size_ml ?? 500 });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bottle Size</Label>
                  <Select value={String(form.bottle_size_ml)} onValueChange={(v) => setForm({ ...form, bottle_size_ml: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOTTLE_SIZES.map((s) => (
                        <SelectItem key={s} value={String(s)}>{s >= 1000 ? `${s / 1000}L` : `${s}ml`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity Produced</Label>
                    <Input type="number" value={form.quantity_produced || ''} onChange={(e) => setForm({ ...form, quantity_produced: Number(e.target.value) })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Rejected Quantity</Label>
                    <Input type="number" value={form.rejected_quantity || ''} onChange={(e) => setForm({ ...form, rejected_quantity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Damaged Bottles</Label>
                    <Input type="number" value={form.damaged_bottles || ''} onChange={(e) => setForm({ ...form, damaged_bottles: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Production Cost</Label>
                    <Input type="number" value={form.production_cost || ''} onChange={(e) => setForm({ ...form, production_cost: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Waste %</Label>
                    <Input value={wastePct.toFixed(2) + '%'} disabled className="bg-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Record Batch'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Produced" value={formatNumber(totalProduced)} icon={Factory} color="primary" />
        <StatCard title="Total Rejected/Damaged" value={formatNumber(totalRejected)} icon={AlertTriangle} color="destructive" />
        <StatCard title="Average Waste" value={`${avgWaste.toFixed(1)}%`} icon={Percent} color="warning" />
        <StatCard title="Total Production Cost" value={formatCurrency(totalCost)} icon={TrendingUp} color="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No production batches recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Waste %</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.batch_number}</TableCell>
                      <TableCell>{formatDate(b.production_date)}</TableCell>
                      <TableCell className="capitalize">{b.shift}</TableCell>
                      <TableCell>{b.operator}</TableCell>
                      <TableCell>{b.product?.name ?? `${b.bottle_size_ml}ml`}</TableCell>
                      <TableCell className="text-right">{formatNumber(b.quantity_produced)}</TableCell>
                      <TableCell className="text-right">{formatNumber(b.rejected_quantity + b.damaged_bottles)}</TableCell>
                      <TableCell className="text-right">{b.waste_percentage.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(b.production_cost)}</TableCell>
                      <TableCell>
                        <Badge className={
                          b.status === 'completed' ? 'bg-success/10 text-success' :
                          b.status === 'pending' ? 'bg-warning/10 text-warning' :
                          'bg-destructive/10 text-destructive'
                        }>{b.status}</Badge>
                      </TableCell>
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
