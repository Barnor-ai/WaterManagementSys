'use client';

import { AppShell } from '@/components/layout/app-shell';
import { PurchasesPage } from '@/components/pages/purchases-page';

export default function Page() {
  return (
    <AppShell>
      <PurchasesPage />
    </AppShell>
  );
}
