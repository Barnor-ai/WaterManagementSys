'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { SearchPage } from '@/components/pages/search-page';

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
        <SearchPage />
      </Suspense>
    </AppShell>
  );
}
