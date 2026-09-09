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
import { ShoppingCart, Plus, Trash2, DollarSign, TrendingUp, Receipt, FileText } from 'lucide-react';
import { Sale, Customer, Product, SaleItem } from '@/lib/types';
import { generateInvoiceNumber, formatDate, formatCurrency, formatNumber } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function SalesPage() {
  const { user, profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    invoice_number: generateInvoiceNumber(),
    customer_id: '',
    sale_type: 'cash' as 'cash' | 'credit' | 'wholesale' | 'retail' | 'distributor',
    sale_date: new Date().toISOString().split('T')[0],
    discount: 0,
    tax: 0,
    notes: '',
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_price: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [s, c, p] = await Promise.all([
      supabase.from('sales').select('*, customer:customers(*), items:sale_items(*)').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').eq('is_active', true),
      supabase.from('products').select('*').eq('is_active', true),
    ]);
    setSales((s.data as Sale[]) ?? []);
    setCustomers((c.data as Customer[]) ?? []);
    setProducts((p.data as Product[]) ?? []);
    setLoading(false);
  };

  const subtotal = items.reduce((s, i) => s + i.total_price, 0);
  const total = subtotal - Number(form.discount) + Number(form.tax);

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;
    const product = products.find((p) => p.id === newItem.product_id);
    if (!product) return;
    const unit_price = newItem.unit_price || product.unit_price;
    const total_price = unit_price * newItem.quantity;
    const item: SaleItem = {
      id: crypto.randomUUID(),
      sale_id: '',
      product_id: newItem.product_id,
      quantity: newItem.quantity,
      unit_price,
      total_price,
      organization_id: null,
      product,
    };
    setItems([...items, item]);
    setNewItem({ product_id: '', quantity: 1, unit_price: 0 });
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    setSubmitting(true);

    const amount_paid = form.sale_type === 'cash' ? total : 0;
    const balance = form.sale_type === 'cash' ? 0 : total;

    const { error } = await supabase.rpc('create_sale', {
      p_invoice_number: form.invoice_number,
      p_customer_id: form.customer_id || null,
      p_sale_type: form.sale_type,
      p_sale_date: form.sale_date,
      p_subtotal: subtotal,
      p_total_amount: total,
      p_items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price })),
      p_discount: Number(form.discount),
      p_tax: Number(form.tax),
      p_amount_paid: amount_paid,
      p_balance: balance,
      p_salesperson: profile?.full_name ?? user?.email ?? null,
      p_notes: form.notes || null,
    });

    if (error) {
      toast.error('Unable to record the sale. Please check stock and try again.');
      console.error('create sale failed', error);
      setSubmitting(false);
      return;
    }

    toast.success('Sale recorded successfully');
    setDialogOpen(false);
    setItems([]);
    setForm({
      ...form,
      invoice_number: generateInvoiceNumber(),
      discount: 0, tax: 0, notes: '', customer_id: '',
    });
    setSubmitting(false);
    fetchData();
  };

  const totalRevenue = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalCash = sales.filter((s) => s.sale_type === 'cash').reduce((s, sale) => s + sale.total_amount, 0);
  const totalCredit = sales.filter((s) => s.sale_type === 'credit').reduce((s, sale) => s + sale.balance, 0);
  const totalInvoices = sales.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Create invoices, record cash and credit sales, print receipts"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Sale</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Sale</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Date</Label>
                    <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sale Type</Label>
                    <Select value={form.sale_type} onValueChange={(v) => setForm({ ...form, sale_type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Sale</SelectItem>
                        <SelectItem value="credit">Credit Sale</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-3">
                  <Label>Items</Label>
                  <div className="flex gap-2">
                    <Select value={newItem.product_id} onValueChange={(v) => {
                      const p = products.find((p) => p.id === v);
                      setNewItem({ ...newItem, product_id: v, unit_price: p?.unit_price ?? 0 });
                    }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.unit_price)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="w-24"
                      value={newItem.quantity || ''}
                      onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      className="w-28"
                      value={newItem.unit_price || ''}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                    />
                    <Button type="button" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                  </div>

                  {items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.product?.name ?? 'Unknown'}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                              <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input type="number" value={form.discount || ''} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax</Label>
                    <Input type="number" value={form.tax || ''} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold">{formatCurrency(total)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Record Sale'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="success" />
        <StatCard title="Cash Sales" value={formatCurrency(totalCash)} icon={ShoppingCart} color="primary" />
        <StatCard title="Outstanding Credit" value={formatCurrency(totalCredit)} icon={TrendingUp} color="warning" />
        <StatCard title="Total Invoices" value={totalInvoices} icon={Receipt} color="chart-4" />
      </div>

      <Card>
        <CardHeader><CardTitle>Sales Records</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No sales recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                      <TableCell>{formatDate(sale.sale_date)}</TableCell>
                      <TableCell>{sale.customer?.name ?? 'Walk-in'}</TableCell>
                      <TableCell className="capitalize">{sale.sale_type}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(sale.amount_paid)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(sale.balance)}</TableCell>
                      <TableCell>
                        <Badge className={
                          sale.status === 'completed' ? 'bg-success/10 text-success' :
                          sale.status === 'pending' ? 'bg-warning/10 text-warning' :
                          sale.status === 'returned' ? 'bg-chart-4/10 text-chart-4' :
                          'bg-destructive/10 text-destructive'
                        }>{sale.status}</Badge>
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
