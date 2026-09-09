/*
# Validate atomic sales and finance writes

1. Purpose
- Prevents completed sales from recording inconsistent totals or cross-tenant customers.
- Keeps inventory, customer balances, payments, and audit records inside one atomic operation.

2. Modified function
- `create_sale` now validates customer membership, sale amounts, and the relationship between total, paid, and balance before writing.

3. Security
- Customer IDs must belong to the authenticated user's organization.
- All resulting rows continue to use the organization resolved from the authenticated profile, never a client-supplied organization ID.
- The SECURITY DEFINER function retains a fixed public search path.

4. Important notes
- Existing sales are unchanged.
- Payment processing remains a recorded cash payment only; no fake external payment confirmation is introduced.
*/

CREATE OR REPLACE FUNCTION public.create_sale(
  p_invoice_number text,
  p_customer_id uuid,
  p_sale_type text,
  p_sale_date date,
  p_subtotal numeric,
  p_total_amount numeric,
  p_items jsonb,
  p_discount numeric DEFAULT 0,
  p_tax numeric DEFAULT 0,
  p_amount_paid numeric DEFAULT 0,
  p_balance numeric DEFAULT 0,
  p_salesperson text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid := get_my_organization_id();
  v_sale_id uuid;
  v_item jsonb;
  v_inventory inventory%ROWTYPE;
  v_quantity numeric;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'At least one sale item is required'; END IF;
  IF p_subtotal < 0 OR p_discount < 0 OR p_tax < 0 OR p_total_amount < 0 OR p_amount_paid < 0 OR p_balance < 0 THEN RAISE EXCEPTION 'Sale amounts cannot be negative'; END IF;
  IF p_amount_paid > p_total_amount THEN RAISE EXCEPTION 'Amount paid cannot exceed the sale total'; END IF;
  IF abs(p_balance - greatest(p_total_amount - p_amount_paid, 0)) > 0.01 THEN RAISE EXCEPTION 'Sale balance does not match the total and amount paid'; END IF;
  IF p_customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Customer not found'; END IF;

  INSERT INTO sales(invoice_number, customer_id, sale_type, sale_date, subtotal, discount, tax, total_amount, amount_paid, balance, status, salesperson, notes, organization_id, created_by)
  VALUES(p_invoice_number, p_customer_id, p_sale_type, p_sale_date, p_subtotal, p_discount, p_tax, p_total_amount, p_amount_paid, p_balance, 'completed', p_salesperson, p_notes, v_org_id, auth.uid())
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::numeric;
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Sale quantities must be positive'; END IF;
    INSERT INTO sale_items(sale_id, product_id, quantity, unit_price, total_price, organization_id)
    VALUES(v_sale_id, (v_item->>'product_id')::uuid, v_quantity, (v_item->>'unit_price')::numeric, (v_item->>'total_price')::numeric, v_org_id);
    SELECT * INTO v_inventory FROM inventory WHERE product_id = (v_item->>'product_id')::uuid AND organization_id = v_org_id ORDER BY current_stock DESC FOR UPDATE;
    IF NOT FOUND OR v_inventory.current_stock < v_quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id'; END IF;
    UPDATE inventory SET current_stock = current_stock - v_quantity, sold_stock = sold_stock + v_quantity, last_updated = now() WHERE id = v_inventory.id;
    INSERT INTO stock_movements(product_id, movement_type, quantity, reference_type, reference_id, notes, to_branch_id, organization_id, created_by)
    VALUES((v_item->>'product_id')::uuid, 'sale', v_quantity, 'sale', v_sale_id, 'Sale ' || p_invoice_number, v_inventory.branch_id, v_org_id, auth.uid());
  END LOOP;

  IF p_customer_id IS NOT NULL AND p_balance > 0 THEN
    UPDATE customers SET outstanding_balance = outstanding_balance + p_balance WHERE id = p_customer_id AND organization_id = v_org_id;
  END IF;
  IF p_customer_id IS NOT NULL AND p_amount_paid > 0 THEN
    INSERT INTO payments(customer_id, sale_id, payment_date, amount, payment_method, reference, organization_id, created_by)
    VALUES(p_customer_id, v_sale_id, p_sale_date, p_amount_paid, 'cash', p_invoice_number, v_org_id, auth.uid());
  END IF;
  INSERT INTO audit_logs(user_id, organization_id, action, module, entity_type, entity_id, new_value)
  VALUES(auth.uid(), v_org_id, 'CREATE', 'sales', 'sale', v_sale_id, jsonb_build_object('invoice_number', p_invoice_number, 'total_amount', p_total_amount, 'amount_paid', p_amount_paid, 'balance', p_balance));
  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale(text, uuid, text, date, numeric, numeric, jsonb, numeric, numeric, numeric, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale(text, uuid, text, date, numeric, numeric, jsonb, numeric, numeric, numeric, numeric, text, text) TO authenticated;
