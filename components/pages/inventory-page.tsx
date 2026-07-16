'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertTriangle, TrendingDown, Boxes, Droplets, Wine } from 'lucide-react';
import { Inventory, RawMaterial, Bottle as BottleType } from '@/lib/types';
import { formatNumber, formatCurrency } from '@/lib/format';

export function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [bottles, setBottles] = useState<BottleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [inv, rm, bt] = await Promise.all([
      supabase.from('inventory').select('*, product:products(*)').order('product(name)'),
      supabase.from('raw_materials').select('*').order('category'),
      supabase.from('bottles').select('*').order('size_ml'),
    ]);
    setInventory((inv.data as Inventory[]) ?? []);
    setRawMaterials((rm.data as RawMaterial[]) ?? []);
    setBottles((bt.data as BottleType[]) ?? []);
    setLoading(false);
  };

  const totalStock = inventory.reduce((s, i) => s + i.current_stock, 0);
  const totalValue = inventory.reduce((s, i) => s + i.current_stock * (i.product?.cost_per_unit ?? 0), 0);
  const lowStock = inventory.filter((i) => i.current_stock <= i.minimum_stock);
  const outOfStock = inventory.filter((i) => i.current_stock <= 0);
  const lowBottles = bottles.filter((b) => b.balance <= b.reorder_level);
  const lowMaterials = rawMaterials.filter((r) => r.quantity <= r.reorder_level);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Real-time stock tracking for finished goods, raw materials, and bottles" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Stock Units" value={formatNumber(totalStock)} icon={Package} color="primary" />
        <StatCard title="Inventory Value" value={formatCurrency(totalValue)} icon={Boxes} color="success" />
        <StatCard title="Low Stock Items" value={lowStock.length} icon={AlertTriangle} color="warning" />
        <StatCard title="Out of Stock" value={outOfStock.length} icon={TrendingDown} color="destructive" />
      </div>

      <Tabs defaultValue="finished">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="finished">Finished Goods</TabsTrigger>
          <TabsTrigger value="raw">Raw Materials</TabsTrigger>
          <TabsTrigger value="bottles">Bottles</TabsTrigger>
        </TabsList>

        {/* Finished Goods */}
        <TabsContent value="finished">
          <Card>
            <CardHeader><CardTitle>Finished Goods Inventory</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Opening</TableHead>
                      <TableHead className="text-right">Produced</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Returned</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Min/Max</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => {
                      const isLow = item.current_stock <= item.minimum_stock;
                      const isOut = item.current_stock <= 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product?.name ?? 'Unknown'}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.opening_stock)}</TableCell>
                          <TableCell className="text-right text-success">{formatNumber(item.produced_stock)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatNumber(item.sold_stock)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.returned_stock)}</TableCell>
                          <TableCell className="text-right text-destructive">{formatNumber(item.damaged_stock)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNumber(item.current_stock)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatNumber(item.minimum_stock)} / {formatNumber(item.maximum_stock)}
                          </TableCell>
                          <TableCell>
                            {isOut ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge className="bg-warning/10 text-warning">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success">In Stock</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Materials */}
        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Raw Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawMaterials.map((rm) => {
                      const isLow = rm.quantity <= rm.reorder_level;
                      return (
                        <TableRow key={rm.id}>
                          <TableCell className="font-medium">{rm.name}</TableCell>
                          <TableCell className="capitalize">{rm.category.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-right">{formatNumber(rm.quantity)} {rm.unit}</TableCell>
                          <TableCell className="text-right">{formatNumber(rm.reorder_level)} {rm.unit}</TableCell>
                          <TableCell className="text-right">{formatCurrency(rm.unit_cost)}</TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge className="bg-warning/10 text-warning">Reorder</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottles */}
        <TabsContent value="bottles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wine className="h-5 w-5" /> Bottle Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bottle Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bottles.map((b) => {
                      const isLow = b.balance <= b.reorder_level;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.bottle_type}</TableCell>
                          <TableCell>{b.size_ml >= 1000 ? `${b.size_ml / 1000}L` : `${b.size_ml}ml`}</TableCell>
                          <TableCell className="text-right">{formatNumber(b.quantity)}</TableCell>
                          <TableCell className="text-right">{formatNumber(b.usage_count)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNumber(b.balance)}</TableCell>
                          <TableCell className="text-right">{formatNumber(b.reorder_level)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(b.unit_cost)}</TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge className="bg-warning/10 text-warning">Reorder</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Low stock alerts */}
      {(lowStock.length > 0 || lowBottles.length > 0 || lowMaterials.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Reorder Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div>
                    <span className="font-medium">{item.product?.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Current: {formatNumber(item.current_stock)} · Min: {formatNumber(item.minimum_stock)}
                    </span>
                  </div>
                  <Badge className="bg-warning/10 text-warning">Reorder needed</Badge>
                </div>
              ))}
              {lowBottles.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div>
                    <span className="font-medium">{b.bottle_type}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Balance: {formatNumber(b.balance)} · Reorder: {formatNumber(b.reorder_level)}
                    </span>
                  </div>
                  <Badge className="bg-warning/10 text-warning">Reorder needed</Badge>
                </div>
              ))}
              {lowMaterials.map((rm) => (
                <div key={rm.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div>
                    <span className="font-medium">{rm.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      Qty: {formatNumber(rm.quantity)} {rm.unit} · Reorder: {formatNumber(rm.reorder_level)} {rm.unit}
                    </span>
                  </div>
                  <Badge className="bg-warning/10 text-warning">Reorder needed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
