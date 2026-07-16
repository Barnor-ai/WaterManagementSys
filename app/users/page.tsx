'use client';

import { AppShell } from '@/components/layout/app-shell';
import { UsersPage } from '@/components/pages/users-page';

export default function Page() {
  return (
    <AppShell>
      <UsersPage />
    </AppShell>
  );
}
