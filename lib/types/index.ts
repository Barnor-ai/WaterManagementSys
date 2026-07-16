export type UserRole = 'super_admin' | 'factory_manager' | 'warehouse_officer' | 'sales_officer' | 'accountant';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  size_ml: number;
  category: string;
  unit_price: number;
  cost_per_unit: number;
  is_active: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  branch_id: string | null;
  opening_stock: number;
  produced_stock: number;
  sold_stock: number;
  returned_stock: number;
  damaged_stock: number;
  current_stock: number;
  reserved_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  last_updated: string;
  product?: Product;
}

export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number;
  branch_id: string | null;
  created_at: string;
}

export interface Bottle {
  id: string;
  bottle_type: string;
  size_ml: number;
  quantity: number;
  supplier_id: string | null;
  unit_cost: number;
  usage_count: number;
  balance: number;
  reorder_level: number;
  branch_id: string | null;
  created_at: string;
}

export interface Machine {
  id: string;
  name: string;
  code: string | null;
  status: 'running' | 'idle' | 'maintenance' | 'downtime';
  capacity_per_hour: number;
  branch_id: string | null;
  created_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  production_date: string;
  shift: 'morning' | 'afternoon' | 'night';
  machine_id: string | null;
  operator: string;
  product_id: string | null;
  bottle_size_ml: number;
  quantity_produced: number;
  rejected_quantity: number;
  damaged_bottles: number;
  waste_percentage: number;
  production_cost: number;
  status: 'completed' | 'pending' | 'cancelled';
  branch_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  product?: Product;
  machine?: Machine;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'stock_in' | 'stock_out' | 'transfer' | 'adjustment' | 'return' | 'damaged' | 'count' | 'production' | 'sale';
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  from_branch_id: string | null;
  to_branch_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  product?: Product;
}

export interface Customer {
  id: string;
  name: string;
  type: 'business' | 'retail' | 'distributor';
  email: string | null;
  phone: string | null;
  address: string | null;
  credit_limit: number;
  outstanding_balance: number;
  tax_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: 'bottle' | 'cap' | 'label' | 'packaging' | 'chemical' | 'other';
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  outstanding_payable: number;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_date: string | null;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  raw_material_id: string | null;
  description: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grn_number: string;
  po_id: string | null;
  supplier_id: string;
  received_date: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  supplier?: Supplier;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  sale_type: 'cash' | 'credit' | 'wholesale' | 'retail' | 'distributor';
  sale_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: 'completed' | 'pending' | 'cancelled' | 'returned';
  salesperson: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  customer?: Customer;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface Payment {
  id: string;
  customer_id: string;
  sale_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'card';
  reference: string | null;
  created_at: string;
  created_by: string | null;
  customer?: Customer;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  po_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'card';
  reference: string | null;
  created_at: string;
  created_by: string | null;
  supplier?: Supplier;
}

export interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  branch_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  severity: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  user_id: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  factory_manager: 'Factory Manager',
  warehouse_officer: 'Warehouse Officer',
  sales_officer: 'Sales Officer',
  accountant: 'Accountant',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  factory_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  warehouse_officer: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  sales_officer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  accountant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};
