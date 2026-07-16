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
import { FileText, Plus, DollarSign, Package, CheckCircle } from 'lucide-react';
import { PurchaseOrder, Supplier, RawMaterial } from '@/lib/types';
import { generatePONumber, formatCurrency, formatDate } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function PurchasesPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    po_number: generatePONumber(),
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
  });
  const [items, setItems] = useState<{ raw_material_id: string; description: string; quantity: number; unit_cost: number }[]>([]);
  const [newItem, setNewItem] = useState({ raw_material_id: '', description: '', quantity: 1, unit_cost: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [po, sup, rm] = await Promise.all([
      supabase.from('purchase_orders').select('*, supplier:suppliers(*)').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').eq('is_active', true),
      supabase.from('raw_materials').select('*'),
    ]);
    setOrders((po.data as PurchaseOrder[]) ?? []);
    setSuppliers((sup.data as Supplier[]) ?? []);
    setRawMaterials((rm.data as RawMaterial[]) ?? []);
    setLoading(false);
  };

  const addItem = () => {
    if (!newItem.raw_material_id || newItem.quantity <= 0) return;
    const rm = rawMaterials.find((r) => r.id === newItem.raw_material_id);
    setItems([...items, {
      raw_material_id: newItem.raw_material_id,
      description: newItem.description || (rm?.name ?? ''),
      quantity: newItem.quantity,
      unit_cost: newItem.unit_cost || (rm?.unit_cost ?? 0),
    }]);
    setNewItem({ raw_material_id: '', description: '', quantity: 1, unit_cost: 0 });
  };

  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);

    const { data: po, error } = await supabase.from('purchase_orders').insert({
      ...form,
      supplier_id: form.supplier_id,
      total_amount: totalAmount,
      status: 'pending',
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    const itemData = items.map((i) => ({
      po_id: po.id,
      raw_material_id: i.raw_material_id,
      description: i.description,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      total_cost: i.quantity * i.unit_cost,
    }));
    await supabase.from('purchase_order_items').insert(itemData);

    toast.success('Purchase order created');
    setDialogOpen(false);
    setItems([]);
    setForm({ ...form, po_number: generatePONumber(), supplier_id: '', notes: '', expected_date: '' });
    setSubmitting(false);
    fetchData();
  };

  const handleReceive = async (po: PurchaseOrder) => {
    const { data: poItems } = await supabase.from('purchase_order_items').select('*').eq('po_id', po.id);
    // Update raw material quantities
    for (const item of poItems ?? []) {
      if (item.raw_material_id) {
        const { data: rm } = await supabase.from('raw_materials').select('*').eq('id', item.raw_material_id).maybeSingle();
        if (rm) {
          await supabase.from('raw_materials').update({ quantity: rm.quantity + item.quantity }).eq('id', rm.id);
        }
      }
    }
    // Update PO status
    await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', po.id);
    // Create GRN
    await supabase.from('goods_received_notes').insert({
      grn_number: `GRN-${Date.now()}`,
      po_id: po.id,
      supplier_id: po.supplier_id,
      received_date: new Date().toISOString().split('T')[0],
      total_amount: po.total_amount,
      created_by: user?.id,
    });
    toast.success('Goods received and inventory updated');
    fetchData();
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const receivedCount = orders.filter((o) => o.status === 'received').length;
  const totalValue = orders.reduce((s, o) => s + o.total_amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Manage purchase orders, goods received notes, and supplier payments"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Purchase Order</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>PO Number</Label><Input value={form.po_number} onChange={(e) => setForm({ ...form, po_number: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Order Date</Label><Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Expected Date</Label><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
                </div>

                <div className="space-y-3">
                  <Label>Items</Label>
                  <div className="flex gap-2">
                    <Select value={newItem.raw_material_id} onValueChange={(v) => {
                      const rm = rawMaterials.find((r) => r.id === v);
                      setNewItem({ ...newItem, raw_material_id: v, unit_cost: rm?.unit_cost ?? 0, description: rm?.name ?? '' });
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select material" /></SelectTrigger>
                      <SelectContent>{rawMaterials.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Qty" className="w-24" value={newItem.quantity || ''} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                    <Input type="number" placeholder="Cost" className="w-28" value={newItem.unit_cost || ''} onChange={(e) => setNewItem({ ...newItem, unit_cost: Number(e.target.value) })} />
                    <Button type="button" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unit_cost)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                </div>

                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Create PO'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={orders.length} icon={FileText} color="primary" />
        <StatCard title="Pending Orders" value={pendingCount} icon={Package} color="warning" />
        <StatCard title="Received Orders" value={receivedCount} icon={CheckCircle} color="success" />
        <StatCard title="Total Value" value={formatCurrency(totalValue)} icon={DollarSign} color="chart-4" />
      </div>

      <Card>
        <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No purchase orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Order Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.po_number}</TableCell>
                      <TableCell>{o.supplier?.name ?? '-'}</TableCell>
                      <TableCell>{formatDate(o.order_date)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(o.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={o.status === 'received' ? 'bg-success/10 text-success' : o.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}>{o.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {o.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleReceive(o)}>Receive Goods</Button>
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
    </div>
  );
}
