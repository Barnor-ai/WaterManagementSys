'use client';

import { AppShell } from '@/components/layout/app-shell';
import { ProductionPage } from '@/components/pages/production-page';

export default function Page() {
  return (
    <AppShell>
      <ProductionPage />
    </AppShell>
  );
}
