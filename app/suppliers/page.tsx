'use client';

import { AppShell } from '@/components/layout/app-shell';
import { SuppliersPage } from '@/components/pages/suppliers-page';

export default function Page() {
  return (
    <AppShell>
      <SuppliersPage />
    </AppShell>
  );
}
