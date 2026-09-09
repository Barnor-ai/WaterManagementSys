import { UserRole } from '@/lib/types';

export type ModuleKey = 'dashboard' | 'production' | 'inventory' | 'warehouse' | 'sales' | 'customers' | 'suppliers' | 'purchases' | 'reports' | 'ai-assistant' | 'users' | 'settings';
export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage_users' | 'manage_settings' | 'view_financials';

const ALL_MODULES: ModuleKey[] = ['dashboard','production','inventory','warehouse','sales','customers','suppliers','purchases','reports','ai-assistant','users','settings'];
const OPERATIONS: ModuleKey[] = ['dashboard','production','inventory','warehouse','sales','customers','suppliers','purchases','reports','ai-assistant'];

export const ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  platform_admin: ALL_MODULES,
  org_owner: ALL_MODULES,
  org_admin: ALL_MODULES,
  factory_manager: ['dashboard','production','inventory','warehouse','reports','ai-assistant'],
  production_officer: ['dashboard','production','inventory','reports'],
  warehouse_manager: ['dashboard','inventory','warehouse','reports'],
  warehouse_officer: ['dashboard','inventory','warehouse'],
  sales_manager: ['dashboard','sales','customers','reports','ai-assistant'],
  sales_officer: ['dashboard','sales','customers'],
  accountant: ['dashboard','sales','customers','suppliers','purchases','reports','settings'],
  finance_manager: ['dashboard','sales','customers','suppliers','purchases','reports','settings'],
  auditor: ['dashboard','reports','ai-assistant'],
  viewer: ['dashboard','reports'],
};

export const ROLE_ACTIONS: Record<UserRole, Permission[]> = {
  platform_admin: ['view','create','edit','delete','approve','export','manage_users','manage_settings','view_financials'],
  org_owner: ['view','create','edit','delete','approve','export','manage_users','manage_settings','view_financials'],
  org_admin: ['view','create','edit','delete','approve','export','manage_users','manage_settings','view_financials'],
  factory_manager: ['view','create','edit','approve','export'], production_officer: ['view','create','edit'], warehouse_manager: ['view','create','edit','approve','export'], warehouse_officer: ['view','create','edit'],
  sales_manager: ['view','create','edit','approve','export','view_financials'], sales_officer: ['view','create','edit'], accountant: ['view','create','edit','approve','export','view_financials'], finance_manager: ['view','create','edit','approve','export','view_financials'], auditor: ['view','export','view_financials'], viewer: ['view'],
};

export function canAccess(role: UserRole, module: ModuleKey): boolean { return ROLE_PERMISSIONS[role]?.includes(module) ?? false; }
export function can(role: UserRole, permission: Permission): boolean { return ROLE_ACTIONS[role]?.includes(permission) ?? false; }
