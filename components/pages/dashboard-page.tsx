'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader, StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Droplets, Factory, ShoppingCart, TrendingUp, Package, AlertTriangle, DollarSign, Activity, Wrench, Boxes } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface DashboardData {
  totalProduction: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  lowStockCount: number;
  pendingOrders: number;
  productionToday: number;
  salesToday: number;
  revenueToday: number;
  machineEfficiency: number;
  wasteRate: number;
  outstandingReceivables: number;
  inventoryValue: number;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalProduction: 0, totalSales: 0, totalRevenue: 0, totalExpenses: 0,
    lowStockCount: 0, pendingOrders: 0, productionToday: 0, salesToday: 0,
    revenueToday: 0, machineEfficiency: 0, wasteRate: 0,
    outstandingReceivables: 0, inventoryValue: 0,
  });
  const [productionTrend, setProductionTrend] = useState<{ date: string; produced: number; sold: number }[]>([]);
  const [revenueByProduct, setRevenueByProduct] = useState<{ name: string; value: number }[]>([]);
  const [salesByType, setSalesByType] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [revenueWeekly, setRevenueWeekly] = useState<{ day: string; revenue: number }[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

      const [batches, sales, expenses, inventory, products, machinesData, poData] = await Promise.all([
        supabase.from('production_batches').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('inventory').select('*, product:products(*)'),
        supabase.from('products').select('*'),
        supabase.from('machines').select('*'),
        supabase.from('purchase_orders').select('*').eq('status', 'pending'),
      ]);

      const completedBatches = batches.data ?? [];
      const allSales = sales.data ?? [];
      const allExpenses = expenses.data ?? [];
      const allInventory = inventory.data ?? [];
      const allMachines = (machinesData.data as any[]) ?? [];
      const pendingPOs = poData.data ?? [];

      const totalProduction = completedBatches.reduce((s, b) => s + (b.quantity_produced || 0), 0);
      const totalRevenue = allSales.reduce((s, s2) => s + (s2.total_amount || 0), 0);
      const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const productionToday = completedBatches
        .filter((b) => b.production_date === today && b.status === 'completed')
        .reduce((s, b) => s + (b.quantity_produced || 0), 0);
      const salesToday = allSales.filter((s) => s.sale_date === today).length;
      const revenueToday = allSales
        .filter((s) => s.sale_date === today)
        .reduce((s, s2) => s + (s2.total_amount || 0), 0);

      const lowStock = allInventory.filter((i) => i.current_stock <= i.minimum_stock);
      const outstandingReceivables = allSales.reduce((s, s2) => s + (s2.balance || 0), 0);
      const inventoryValue = allInventory.reduce((s, i) => {
        const cost = i.product?.cost_per_unit ?? 0;
        return s + i.current_stock * cost;
      }, 0);

      const totalRejected = completedBatches.reduce((s, b) => s + (b.rejected_quantity || 0) + (b.damaged_bottles || 0), 0);
      const wasteRate = totalProduction > 0 ? (totalRejected / totalProduction) * 100 : 0;
      const runningMachines = allMachines.filter((m) => m.status === 'running').length;
      const machineEfficiency = allMachines.length > 0 ? (runningMachines / allMachines.length) * 100 : 0;

      setData({
        totalProduction, totalSales: allSales.length, totalRevenue, totalExpenses,
        lowStockCount: lowStock.length, pendingOrders: pendingPOs.length,
        productionToday, salesToday, revenueToday, machineEfficiency,
        wasteRate, outstandingReceivables, inventoryValue,
      });

      // Production trend (last 7 days)
      const trend: { date: string; produced: number; sold: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const produced = completedBatches
          .filter((b) => b.production_date === d && b.status === 'completed')
          .reduce((s, b) => s + (b.quantity_produced || 0), 0);
        const sold = allSales.filter((s) => s.sale_date === d).reduce((s, s2) => s + (s2.quantity || 0), 0);
        const dayName = new Date(d).toLocaleDateString('en', { weekday: 'short' });
        trend.push({ date: dayName, produced, sold });
      }
      setProductionTrend(trend);

      // Revenue by product
      const productRevenue: Record<string, number> = {};
      const saleItemsData = await supabase.from('sale_items').select('*, product:products(*)');
      (saleItemsData.data ?? []).forEach((item: any) => {
        const name = item.product?.name ?? 'Unknown';
        productRevenue[name] = (productRevenue[name] ?? 0) + (item.total_price || 0);
      });
      setRevenueByProduct(Object.entries(productRevenue).map(([name, value]) => ({ name, value })));

      // Sales by type
      const typeColors: Record<string, string> = {
        cash: 'hsl(var(--chart-1))', credit: 'hsl(var(--chart-4))',
        wholesale: 'hsl(var(--chart-2))', retail: 'hsl(var(--chart-3))', distributor: 'hsl(var(--chart-5))',
      };
      const typeCounts: Record<string, number> = {};
      allSales.forEach((s) => {
        typeCounts[s.sale_type] = (typeCounts[s.sale_type] ?? 0) + 1;
      });
      setSalesByType(
        Object.entries(typeCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          fill: typeColors[name] ?? 'hsl(var(--chart-1))',
        }))
      );

      // Weekly revenue
      const weekly: { day: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const revenue = allSales.filter((s) => s.sale_date === d).reduce((s, s2) => s + (s2.total_amount || 0), 0);
        const dayName = new Date(d).toLocaleDateString('en', { weekday: 'short' });
        weekly.push({ day: dayName, revenue });
      }
      setRevenueWeekly(weekly);

      // Recent batches
      setRecentBatches(completedBatches.slice(0, 5));

      // Low stock items
      setLowStockItems(lowStock.slice(0, 5));

      // Machines
      setMachines(allMachines);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your water manufacturing operations"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Production"
          value={`${data.productionToday.toLocaleString()} units`}
          icon={Factory}
          color="primary"
          subtitle={`Total: ${data.totalProduction.toLocaleString()} units`}
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data.revenueToday)}
          icon={DollarSign}
          color="success"
          subtitle={`${data.salesToday} sales today`}
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(data.outstandingReceivables)}
          icon={TrendingUp}
          color="warning"
          subtitle="From credit sales"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          icon={Boxes}
          color="chart-4"
          subtitle={`${data.lowStockCount} items low on stock`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Machine Efficiency" value={`${data.machineEfficiency.toFixed(0)}%`} icon={Wrench} color="primary" />
        <StatCard title="Waste Rate" value={`${data.wasteRate.toFixed(1)}%`} icon={Activity} color="destructive" />
        <StatCard title="Pending POs" value={data.pendingOrders} icon={Package} color="warning" />
        <StatCard title="Total Expenses" value={formatCurrency(data.totalExpenses)} icon={TrendingUp} color="destructive" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Production vs Sales (7 days)</CardTitle>
            <CardDescription>Daily production output and sales volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productionTrend}>
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="produced" name="Produced" stroke="hsl(var(--chart-1))" fill="url(#colorProduced)" strokeWidth={2} />
                <Area type="monotone" dataKey="sold" name="Sold" stroke="hsl(var(--chart-2))" fill="url(#colorSold)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Type</CardTitle>
            <CardDescription>Distribution of sale channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {salesByType.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Revenue</CardTitle>
            <CardDescription>Revenue generated over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Product</CardTitle>
            <CardDescription>Top performing products</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByProduct.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                No sales data yet
              </div>
            ) : (
              <div className="space-y-3">
                {revenueByProduct
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6)
                  .map((item, i) => {
                    const max = Math.max(...revenueByProduct.map((p) => p.value));
                    const pct = max > 0 ? (item.value / max) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate pr-2">{item.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: recent batches + low stock + machines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Production Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No batches recorded yet</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{b.batch_number}</span>
                      <span className="block text-xs text-muted-foreground">
                        {b.operator} · {b.bottle_size_ml}ml
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{b.quantity_produced.toLocaleString()}</span>
                      <Badge
                        className={`ml-2 text-xs ${
                          b.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : b.status === 'pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">All stock levels are healthy</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.product?.name ?? 'Unknown'}</span>
                      <span className="block text-xs text-muted-foreground">
                        Current: {item.current_stock} · Min: {item.minimum_stock}
                      </span>
                    </div>
                    <Badge variant="destructive" className="text-xs">Low</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Machine Status</CardTitle>
          </CardHeader>
          <CardContent>
            {machines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No machines registered</p>
            ) : (
              <div className="space-y-3">
                {machines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          m.status === 'running' ? 'bg-success' :
                          m.status === 'idle' ? 'bg-warning' :
                          m.status === 'maintenance' ? 'bg-chart-4' : 'bg-destructive'
                        }`}
                      />
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
