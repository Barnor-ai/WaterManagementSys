'use client';

import { AppShell } from '@/components/layout/app-shell';
import { WarehousePage } from '@/components/pages/warehouse-page';

export default function Page() {
  return (
    <AppShell>
      <WarehousePage />
    </AppShell>
  );
}
