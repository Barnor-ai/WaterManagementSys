'use client';

import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/components/pages/dashboard-page';

export default function Page() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}
