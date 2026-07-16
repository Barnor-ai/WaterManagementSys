'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PageHeader } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';

export function SearchPage() {
  const params = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{ type: string; items: any[] }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) performSearch(initialQuery);
  }, [initialQuery]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    const term = `%${q}%`;

    const [customers, sales, batches, suppliers, products, payments] = await Promise.all([
      supabase.from('customers').select('*').ilike('name', term),
      supabase.from('sales').select('*, customer:customers(name)').or(`invoice_number.ilike.${term},salesperson.ilike.${term}`),
      supabase.from('production_batches').select('*').or(`batch_number.ilike.${term},operator.ilike.${term}`),
      supabase.from('suppliers').select('*').ilike('name', term),
      supabase.from('products').select('*').ilike('name', term),
      supabase.from('payments').select('*, customer:customers(name)').ilike('reference', term),
    ]);

    setResults([
      { type: 'Customers', items: customers.data ?? [] },
      { type: 'Invoices', items: sales.data ?? [] },
      { type: 'Production Batches', items: batches.data ?? [] },
      { type: 'Suppliers', items: suppliers.data ?? [] },
      { type: 'Products', items: products.data ?? [] },
      { type: 'Payments', items: payments.data ?? [] },
    ].filter((r) => r.items.length > 0));
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Global Search" description="Search across customers, invoices, batches, suppliers, products, and payments" />

      <form onSubmit={handleSearch} className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </form>

      {loading ? (
        <div className="h-48 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : results.length === 0 && initialQuery ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No results found for "{initialQuery}"</p>
      ) : (
        <div className="space-y-4">
          {results.map((group) => (
            <Card key={group.type}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {group.type} <Badge variant="secondary">{group.items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                      <div>
                        <span className="font-medium">{item.name ?? item.invoice_number ?? item.batch_number ?? item.reference ?? 'Unknown'}</span>
                        {item.email && <span className="text-sm text-muted-foreground ml-2">{item.email}</span>}
                        {item.customer?.name && <span className="text-sm text-muted-foreground ml-2">— {item.customer.name}</span>}
                        {item.operator && <span className="text-sm text-muted-foreground ml-2">— {item.operator}</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.total_amount ? formatCurrency(item.total_amount) : item.sale_date ? formatDate(item.sale_date) : item.production_date ? formatDate(item.production_date) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
