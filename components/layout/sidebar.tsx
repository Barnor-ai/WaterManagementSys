'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { canAccess, ModuleKey } from '@/lib/permissions';
import { Droplets, LayoutDashboard, Factory, Package, Warehouse, ShoppingCart, Users, Truck, FileText, Bot, UserCog, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'production', label: 'Production', icon: Factory, href: '/production' },
  { key: 'inventory', label: 'Inventory', icon: Package, href: '/inventory' },
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse, href: '/warehouse' },
  { key: 'sales', label: 'Sales', icon: ShoppingCart, href: '/sales' },
  { key: 'customers', label: 'Customers', icon: Users, href: '/customers' },
  { key: 'suppliers', label: 'Suppliers', icon: Truck, href: '/suppliers' },
  { key: 'purchases', label: 'Purchases', icon: FileText, href: '/purchases' },
  { key: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  { key: 'ai-assistant', label: 'AI Assistant', icon: Bot, href: '/ai-assistant' },
  { key: 'users', label: 'User Management', icon: UserCog, href: '/users' },
  { key: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { company } = useCompany();
  const role = profile?.role ?? 'sales_officer';

  const visibleItems = NAV_ITEMS.filter((item) => canAccess(role, item.key));

  const companyName = company?.name || 'AquaFlow';
  const companyLogo = company?.logo_url;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] border-r border-border transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Droplets className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="text-base font-bold leading-none truncate max-w-[140px]">{companyName}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">ERP System</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-3 overflow-y-auto scrollbar-thin h-[calc(100%-4rem)]">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
