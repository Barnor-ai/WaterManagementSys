import { UserRole } from '@/lib/types';

export type ModuleKey =
  | 'dashboard'
  | 'production'
  | 'inventory'
  | 'warehouse'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'reports'
  | 'ai-assistant'
  | 'users'
  | 'settings';

export const ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  super_admin: [
    'dashboard', 'production', 'inventory', 'warehouse', 'sales', 'customers',
    'suppliers', 'purchases', 'reports', 'ai-assistant', 'users', 'settings',
  ],
  factory_manager: [
    'dashboard', 'production', 'inventory', 'warehouse', 'reports', 'ai-assistant',
  ],
  warehouse_officer: [
    'dashboard', 'inventory', 'warehouse', 'reports', 'ai-assistant',
  ],
  sales_officer: [
    'dashboard', 'sales', 'customers', 'reports', 'ai-assistant',
  ],
  accountant: [
    'dashboard', 'reports', 'ai-assistant',
  ],
};

export function canAccess(role: UserRole, module: ModuleKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
}
