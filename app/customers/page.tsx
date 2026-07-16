'use client';

import { AppShell } from '@/components/layout/app-shell';
import { CustomersPage } from '@/components/pages/customers-page';

export default function Page() {
  return (
    <AppShell>
      <CustomersPage />
    </AppShell>
  );
}
