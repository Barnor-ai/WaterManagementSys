'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Download, FileText, TrendingUp, Package, Factory, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { toast } from 'sonner';

type ReportType = 'production' | 'sales' | 'revenue' | 'inventory' | 'profit_loss' | 'customer_statement' | 'batch' | 'machine';

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('production');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => { generateReport(); }, [reportType]);

  const generateReport = async () => {
    setLoading(true);
    try {
      let result: any[] = [];
      let chart: any[] = [];

      if (reportType === 'production') {
        const { data: batches } = await supabase
          .from('production_batches')
          .select('*, product:products(*)')
          .gte('production_date', startDate)
          .lte('production_date', endDate)
          .order('production_date', { ascending: false });
        result = batches ?? [];
        chart = aggregateByDate(result, 'production_date', 'quantity_produced');
      } else if (reportType === 'sales') {
        const { data: sales } = await supabase
          .from('sales')
          .select('*, customer:customers(*)')
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .order('sale_date', { ascending: false });
        result = sales ?? [];
        chart = aggregateByDate(result, 'sale_date', 'total_amount');
      } else if (reportType === 'revenue') {
        const { data: sales } = await supabase
          .from('sales')
          .select('*, items:sale_items(*)')
          .gte('sale_date', startDate)
          .lte('sale_date', endDate);
        result = sales ?? [];
        chart = aggregateByDate(result, 'sale_date', 'total_amount');
      } else if (reportType === 'inventory') {
        const { data: inv } = await supabase.from('inventory').select('*, product:products(*)');
        result = inv ?? [];
      } else if (reportType === 'profit_loss') {
        const [sales, expenses, batches] = await Promise.all([
          supabase.from('sales').select('*').gte('sale_date', startDate).lte('sale_date', endDate),
          supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate),
          supabase.from('production_batches').select('*').gte('production_date', startDate).lte('production_date', endDate),
        ]);
        const totalRevenue = (sales.data ?? []).reduce((s: number, r: any) => s + r.total_amount, 0);
        const totalExpenses = (expenses.data ?? []).reduce((s: number, r: any) => s + r.amount, 0);
        const totalProdCost = (batches.data ?? []).reduce((s: number, r: any) => s + r.production_cost, 0);
        const grossProfit = totalRevenue - totalProdCost;
        const netProfit = grossProfit - totalExpenses;
        result = [
          { label: 'Total Revenue', value: totalRevenue, type: 'revenue' },
          { label: 'Production Cost', value: totalProdCost, type: 'cost' },
          { label: 'Gross Profit', value: grossProfit, type: 'profit' },
          { label: 'Operating Expenses', value: totalExpenses, type: 'cost' },
          { label: 'Net Profit', value: netProfit, type: 'profit' },
        ];
      } else if (reportType === 'batch') {
        const { data: batches } = await supabase
          .from('production_batches')
          .select('*, product:products(*), machine:machines(*)')
          .gte('production_date', startDate)
          .lte('production_date', endDate)
          .order('production_date', { ascending: false });
        result = batches ?? [];
      } else if (reportType === 'machine') {
        const { data: machines } = await supabase.from('machines').select('*');
        const { data: batches } = await supabase
          .from('production_batches')
          .select('*, machine:machines(*)')
          .gte('production_date', startDate)
          .lte('production_date', endDate);
        const machineStats: Record<string, { name: string; produced: number; rejected: number; batches: number }> = {};
        (batches ?? []).forEach((b: any) => {
          const mId = b.machine_id ?? 'unknown';
          const mName = b.machine?.name ?? 'Unassigned';
          if (!machineStats[mId]) machineStats[mId] = { name: mName, produced: 0, rejected: 0, batches: 0 };
          machineStats[mId].produced += b.quantity_produced;
          machineStats[mId].rejected += b.rejected_quantity + b.damaged_bottles;
          machineStats[mId].batches += 1;
        });
        result = Object.values(machineStats);
        chart = result.map((r: any) => ({ name: r.name, produced: r.produced, rejected: r.rejected }));
      } else if (reportType === 'customer_statement') {
        const { data: sales } = await supabase
          .from('sales')
          .select('*, customer:customers(*)')
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .order('sale_date', { ascending: false });
        result = sales ?? [];
      }

      setData(result);
      setChartData(chart);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const aggregateByDate = (rows: any[], dateField: string, valueField: string) => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const d = r[dateField];
      map[d] = (map[d] ?? 0) + (r[valueField] || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date: formatDate(date), value }));
  };

  const exportCSV = () => {
    if (data.length === 0) { toast.error('No data to export'); return; }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const exportPrint = () => {
    window.print();
  };

  const reportTypes: { value: ReportType; label: string; icon: any }[] = [
    { value: 'production', label: 'Production Report', icon: Factory },
    { value: 'sales', label: 'Sales Report', icon: FileText },
    { value: 'revenue', label: 'Revenue Report', icon: DollarSign },
    { value: 'inventory', label: 'Inventory Report', icon: Package },
    { value: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp },
    { value: 'batch', label: 'Batch Report', icon: Factory },
    { value: 'machine', label: 'Machine Report', icon: Factory },
    { value: 'customer_statement', label: 'Customer Statement', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export comprehensive business reports"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> CSV</Button>
            <Button variant="outline" onClick={exportPrint}><FileText className="h-4 w-4 mr-2" /> Print</Button>
          </div>
        }
      />

      {/* Report filters */}
      <Card>
        <CardHeader><CardTitle>Report Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <Button className="mt-4" onClick={generateReport} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && reportType !== 'profit_loss' && (
        <Card>
          <CardHeader><CardTitle>Trend Chart</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {reportType === 'machine' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="produced" name="Produced" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Report data table */}
      <Card>
        <CardHeader><CardTitle>Report Data</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data for the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(data[0]).filter((k) => typeof data[0][k] !== 'object').map((key) => (
                      <TableHead key={key} className="capitalize">{key.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      {Object.keys(row).filter((k) => typeof row[k] !== 'object').map((key) => (
                        <TableCell key={key} className="text-sm">
                          {typeof row[key] === 'number' && (key.includes('amount') || key.includes('cost') || key.includes('price') || key.includes('value'))
                            ? formatCurrency(row[key])
                            : String(row[key] ?? '-')}
                        </TableCell>
                      ))}
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
