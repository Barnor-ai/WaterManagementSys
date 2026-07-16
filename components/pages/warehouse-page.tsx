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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, Plus, ArrowDown, ArrowUp, RefreshCw, AlertTriangle, Package } from 'lucide-react';
import { StockMovement, Product, Inventory } from '@/lib/types';
import { formatNumber, formatDateTime } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function WarehousePage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    movement_type: 'stock_in' as 'stock_in' | 'stock_out' | 'transfer' | 'adjustment' | 'return' | 'damaged' | 'count',
    quantity: 0,
    notes: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [m, i, p] = await Promise.all([
      supabase.from('stock_movements').select('*, product:products(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('inventory').select('*, product:products(*)'),
      supabase.from('products').select('*').eq('is_active', true),
    ]);
    setMovements((m.data as StockMovement[]) ?? []);
    setInventory((i.data as Inventory[]) ?? []);
    setProducts((p.data as Product[]) ?? []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: movement, error } = await supabase.from('stock_movements').insert({
      product_id: form.product_id,
      movement_type: form.movement_type,
      quantity: Number(form.quantity),
      notes: form.notes,
      created_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); setSubmitting(false); return; }

    // Update inventory based on movement type
    const { data: inv } = await supabase.from('inventory').select('*').eq('product_id', form.product_id).maybeSingle();
    if (inv) {
      let newCurrent = Number(inv.current_stock);
      let newDamaged = Number(inv.damaged_stock);
      let newReturned = Number(inv.returned_stock);
      const qty = Number(form.quantity);

      switch (form.movement_type) {
        case 'stock_in': newCurrent += qty; break;
        case 'stock_out': newCurrent -= qty; break;
        case 'adjustment': newCurrent = qty; break; // set to exact count
        case 'return': newCurrent += qty; newReturned += qty; break;
        case 'damaged': newCurrent -= qty; newDamaged += qty; break;
        case 'count': newCurrent = qty; break;
      }

      await supabase.from('inventory').update({
        current_stock: newCurrent,
        damaged_stock: newDamaged,
        returned_stock: newReturned,
        last_updated: new Date().toISOString(),
      }).eq('id', inv.id);
    }

    toast.success('Stock movement recorded');
    setDialogOpen(false);
    setForm({ product_id: '', movement_type: 'stock_in', quantity: 0, notes: '' });
    setSubmitting(false);
    fetchData();
  };

  const stockInCount = movements.filter((m) => ['stock_in', 'production'].includes(m.movement_type)).length;
  const stockOutCount = movements.filter((m) => ['stock_out', 'sale'].includes(m.movement_type)).length;
  const adjustmentCount = movements.filter((m) => ['adjustment', 'count', 'damaged'].includes(m.movement_type)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse"
        description="Stock in/out, transfers, adjustments, returns, and stock counts"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Movement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <Select value={form.movement_type} onValueChange={(v) => setForm({ ...form, movement_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_in">Stock In</SelectItem><SelectItem value="stock_out">Stock Out</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="return">Return</SelectItem><SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="count">Stock Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required /></div>
                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Record'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Stock In Movements" value={stockInCount} icon={ArrowDown} color="success" />
        <StatCard title="Stock Out Movements" value={stockOutCount} icon={ArrowUp} color="destructive" />
        <StatCard title="Adjustments" value={adjustmentCount} icon={RefreshCw} color="warning" />
        <StatCard title="Total Movements" value={movements.length} icon={Package} color="primary" />
      </div>

      <Tabs defaultValue="movements">
        <TabsList><TabsTrigger value="movements">Stock Movements</TabsTrigger><TabsTrigger value="inventory">Current Inventory</TabsTrigger></TabsList>

        <TabsContent value="movements">
          <Card>
            <CardHeader><CardTitle>Recent Stock Movements</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : movements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No stock movements recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead><TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{formatDateTime(m.created_at)}</TableCell>
                          <TableCell className="font-medium">{m.product?.name ?? 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge className={
                              m.movement_type === 'stock_in' || m.movement_type === 'production' ? 'bg-success/10 text-success' :
                              m.movement_type === 'stock_out' || m.movement_type === 'sale' ? 'bg-destructive/10 text-destructive' :
                              m.movement_type === 'damaged' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-foreground'
                            }>{m.movement_type.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(m.quantity)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.notes ?? '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle>Current Inventory Status</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead><TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.product?.name ?? 'Unknown'}</TableCell>
                        <TableCell className="text-right font-bold">{formatNumber(i.current_stock)}</TableCell>
                        <TableCell className="text-right">{formatNumber(i.minimum_stock)}</TableCell>
                        <TableCell className="text-right">{formatNumber(i.maximum_stock)}</TableCell>
                        <TableCell>
                          {i.current_stock <= 0 ? <Badge variant="destructive">Out of Stock</Badge> :
                           i.current_stock <= i.minimum_stock ? <Badge className="bg-warning/10 text-warning">Low Stock</Badge> :
                           <Badge className="bg-success/10 text-success">In Stock</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
