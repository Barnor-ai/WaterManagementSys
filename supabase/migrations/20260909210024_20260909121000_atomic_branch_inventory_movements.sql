/*
# Correct atomic branch inventory movements

1. Purpose
- Makes stock movements safe for branch-based inventory.
- Corrects transfer behavior so stock is deducted from the source and added to the destination.
- Keeps production quantities in the selected branch inventory record.

2. Modified functions
- `record_stock_movement` validates tenant-owned branches, locks affected inventory rows, handles transfers atomically, and writes an audit record.
- `record_production` updates or creates inventory for the requested branch instead of an organization-wide row.

3. Security
- Every product, branch, inventory row, stock movement, and audit log is scoped to the authenticated user's organization.
- SECURITY DEFINER functions use a fixed public search path.
- Direct callers cannot use another organization's product or branch IDs.

4. Important notes
- Existing inventory and movement data is preserved.
- A regular adjustment sets the selected inventory balance to the requested quantity.
- A transfer requires both a source and destination branch.
*/

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_notes text DEFAULT NULL,
  p_from_branch_id uuid DEFAULT NULL,
  p_to_branch_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid := get_my_organization_id();
  v_id uuid;
  v_from inventory%ROWTYPE;
  v_to inventory%ROWTYPE;
  v_inventory inventory%ROWTYPE;
  v_new_stock numeric;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF p_movement_type NOT IN ('stock_in','stock_out','transfer','adjustment','return','damaged','count','production','sale') THEN RAISE EXCEPTION 'Invalid movement type'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_from_branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE id = p_from_branch_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Source branch not found'; END IF;
  IF p_to_branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE id = p_to_branch_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Destination branch not found'; END IF;
  IF p_movement_type = 'transfer' AND (p_from_branch_id IS NULL OR p_to_branch_id IS NULL OR p_from_branch_id = p_to_branch_id) THEN RAISE EXCEPTION 'A transfer requires two different branches'; END IF;
  IF p_movement_type = 'transfer' THEN
    SELECT * INTO v_from FROM inventory WHERE product_id = p_product_id AND organization_id = v_org_id AND branch_id = p_from_branch_id FOR UPDATE;
    IF NOT FOUND OR v_from.current_stock < p_quantity THEN RAISE EXCEPTION 'Insufficient stock in source branch'; END IF;
    UPDATE inventory SET current_stock = current_stock - p_quantity, last_updated = now() WHERE id = v_from.id;
    SELECT * INTO v_to FROM inventory WHERE product_id = p_product_id AND organization_id = v_org_id AND branch_id = p_to_branch_id FOR UPDATE;
    IF FOUND THEN
      UPDATE inventory SET current_stock = current_stock + p_quantity, last_updated = now() WHERE id = v_to.id;
    ELSE
      INSERT INTO inventory(product_id, branch_id, organization_id, current_stock, minimum_stock, maximum_stock) VALUES(p_product_id, p_to_branch_id, v_org_id, p_quantity, 0, 0);
    END IF;
  ELSE
    SELECT * INTO v_inventory FROM inventory WHERE product_id = p_product_id AND organization_id = v_org_id AND branch_id IS NOT DISTINCT FROM COALESCE(p_to_branch_id, p_from_branch_id) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Inventory record not found'; END IF;
    v_new_stock := CASE
      WHEN p_movement_type IN ('stock_in','return','production') THEN v_inventory.current_stock + p_quantity
      WHEN p_movement_type IN ('stock_out','sale','damaged') THEN v_inventory.current_stock - p_quantity
      WHEN p_movement_type IN ('adjustment','count') THEN p_quantity
      ELSE v_inventory.current_stock
    END;
    IF v_new_stock < 0 THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    UPDATE inventory SET current_stock = v_new_stock, damaged_stock = CASE WHEN p_movement_type = 'damaged' THEN damaged_stock + p_quantity ELSE damaged_stock END, last_updated = now() WHERE id = v_inventory.id;
  END IF;
  INSERT INTO stock_movements(product_id, movement_type, quantity, notes, from_branch_id, to_branch_id, organization_id, created_by)
  VALUES(p_product_id, p_movement_type, p_quantity, p_notes, p_from_branch_id, p_to_branch_id, v_org_id, auth.uid()) RETURNING id INTO v_id;
  INSERT INTO audit_logs(user_id, organization_id, action, module, entity_type, entity_id, new_value)
  VALUES(auth.uid(), v_org_id, 'CREATE', 'inventory', 'stock_movement', v_id, jsonb_build_object('movement_type', p_movement_type, 'quantity', p_quantity, 'from_branch_id', p_from_branch_id, 'to_branch_id', p_to_branch_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_production(
  p_batch_number text,
  p_production_date date,
  p_shift text,
  p_operator text,
  p_product_id uuid,
  p_bottle_size_ml integer,
  p_quantity_produced numeric,
  p_machine_id uuid DEFAULT NULL,
  p_rejected_quantity numeric DEFAULT 0,
  p_damaged_bottles numeric DEFAULT 0,
  p_waste_percentage numeric DEFAULT 0,
  p_production_cost numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid := get_my_organization_id();
  v_batch_id uuid;
  v_inventory inventory%ROWTYPE;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF p_quantity_produced <= 0 THEN RAISE EXCEPTION 'Production quantity must be positive'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE id = p_branch_id AND organization_id = v_org_id) THEN RAISE EXCEPTION 'Branch not found'; END IF;
  INSERT INTO production_batches(batch_number, production_date, shift, machine_id, operator, product_id, bottle_size_ml, quantity_produced, rejected_quantity, damaged_bottles, waste_percentage, production_cost, status, branch_id, notes, organization_id, created_by)
  VALUES(p_batch_number, p_production_date, p_shift, p_machine_id, p_operator, p_product_id, p_bottle_size_ml, p_quantity_produced, p_rejected_quantity, p_damaged_bottles, p_waste_percentage, p_production_cost, 'completed', p_branch_id, p_notes, v_org_id, auth.uid()) RETURNING id INTO v_batch_id;
  SELECT * INTO v_inventory FROM inventory WHERE product_id = p_product_id AND organization_id = v_org_id AND branch_id IS NOT DISTINCT FROM p_branch_id FOR UPDATE;
  IF FOUND THEN
    UPDATE inventory SET current_stock = current_stock + p_quantity_produced, produced_stock = produced_stock + p_quantity_produced, last_updated = now() WHERE id = v_inventory.id;
  ELSE
    INSERT INTO inventory(product_id, branch_id, organization_id, opening_stock, produced_stock, sold_stock, current_stock, minimum_stock, maximum_stock)
    VALUES(p_product_id, p_branch_id, v_org_id, 0, p_quantity_produced, 0, p_quantity_produced, 0, 0);
  END IF;
  INSERT INTO stock_movements(product_id, movement_type, quantity, reference_type, reference_id, notes, to_branch_id, organization_id, created_by)
  VALUES(p_product_id, 'production', p_quantity_produced, 'production_batch', v_batch_id, 'Production ' || p_batch_number, p_branch_id, v_org_id, auth.uid());
  INSERT INTO audit_logs(user_id, organization_id, action, module, entity_type, entity_id, new_value)
  VALUES(auth.uid(), v_org_id, 'CREATE', 'production', 'production_batch', v_batch_id, jsonb_build_object('batch_number', p_batch_number, 'quantity_produced', p_quantity_produced, 'branch_id', p_branch_id));
  RETURN v_batch_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_movement(uuid, text, numeric, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, text, numeric, text, uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_production(text, date, text, text, uuid, integer, numeric, uuid, numeric, numeric, numeric, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_production(text, date, text, text, uuid, integer, numeric, uuid, numeric, numeric, numeric, numeric, text, uuid) TO authenticated;
