/*
# Atomic Business Transactions

## Overview
Adds server-side transaction functions for the highest-risk inventory operations.
Each function validates organization membership, locks affected inventory rows,
updates business records, creates stock movements, and writes an audit entry in
one database transaction.

## Functions
- `create_sale`: sale, sale items, inventory deduction, stock movements, customer balance, payment, audit
- `record_production`: production batch, inventory increase, stock movement, audit
- `record_stock_movement`: validated stock adjustment with row locking

## Security
All functions are SECURITY DEFINER but derive organization_id from the caller's
profile and never accept it from the browser. Execution is limited to authenticated users.
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
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  v_org_id uuid := get_my_organization_id();
  v_sale_id uuid;
  v_item jsonb;
  v_inventory inventory%ROWTYPE;
  v_quantity numeric;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'At least one sale item is required'; END IF;
  IF p_total_amount < 0 OR p_amount_paid < 0 OR p_balance < 0 THEN RAISE EXCEPTION 'Sale amounts cannot be negative'; END IF;

  INSERT INTO sales(invoice_number, customer_id, sale_type, sale_date, subtotal, discount, tax, total_amount, amount_paid, balance, status, salesperson, notes, organization_id, created_by)
  VALUES(p_invoice_number, p_customer_id, p_sale_type, p_sale_date, p_subtotal, p_discount, p_tax, p_total_amount, p_amount_paid, p_balance, 'completed', p_salesperson, p_notes, v_org_id, auth.uid())
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::numeric;
    IF v_quantity <= 0 THEN RAISE EXCEPTION 'Sale quantities must be positive'; END IF;
    INSERT INTO sale_items(sale_id, product_id, quantity, unit_price, total_price, organization_id)
    VALUES(v_sale_id, (v_item->>'product_id')::uuid, v_quantity, (v_item->>'unit_price')::numeric, (v_item->>'total_price')::numeric, v_org_id);
    SELECT * INTO v_inventory FROM inventory WHERE product_id=(v_item->>'product_id')::uuid AND organization_id=v_org_id FOR UPDATE;
    IF NOT FOUND OR v_inventory.current_stock < v_quantity THEN RAISE EXCEPTION 'Insufficient stock for product %', v_item->>'product_id'; END IF;
    UPDATE inventory SET current_stock=current_stock-v_quantity, sold_stock=sold_stock+v_quantity, last_updated=now() WHERE id=v_inventory.id;
    INSERT INTO stock_movements(product_id, movement_type, quantity, reference_type, reference_id, notes, organization_id, created_by)
    VALUES((v_item->>'product_id')::uuid, 'sale', v_quantity, 'sale', v_sale_id, 'Sale ' || p_invoice_number, v_org_id, auth.uid());
  END LOOP;

  IF p_customer_id IS NOT NULL AND p_balance > 0 THEN
    UPDATE customers SET outstanding_balance=outstanding_balance+p_balance WHERE id=p_customer_id AND organization_id=v_org_id;
  END IF;
  IF p_customer_id IS NOT NULL AND p_amount_paid > 0 THEN
    INSERT INTO payments(customer_id, sale_id, payment_date, amount, payment_method, reference, organization_id, created_by)
    VALUES(p_customer_id, v_sale_id, p_sale_date, p_amount_paid, 'cash', p_invoice_number, v_org_id, auth.uid());
  END IF;
  INSERT INTO audit_logs(user_id, organization_id, action, module, entity_type, entity_id, new_value)
  VALUES(auth.uid(), v_org_id, 'CREATE', 'sales', 'sale', v_sale_id, jsonb_build_object('invoice_number',p_invoice_number,'total_amount',p_total_amount));
  RETURN v_sale_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_sale(text,uuid,text,date,numeric,numeric,jsonb,numeric,numeric,numeric,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale(text,uuid,text,date,numeric,numeric,jsonb,numeric,numeric,numeric,numeric,text,text) TO authenticated;

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
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org_id uuid:=get_my_organization_id(); v_batch_id uuid; v_inventory inventory%ROWTYPE;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF p_quantity_produced <= 0 THEN RAISE EXCEPTION 'Production quantity must be positive'; END IF;
  INSERT INTO production_batches(batch_number,production_date,shift,machine_id,operator,product_id,bottle_size_ml,quantity_produced,rejected_quantity,damaged_bottles,waste_percentage,production_cost,status,branch_id,notes,organization_id,created_by)
  VALUES(p_batch_number,p_production_date,p_shift,p_machine_id,p_operator,p_product_id,p_bottle_size_ml,p_quantity_produced,p_rejected_quantity,p_damaged_bottles,p_waste_percentage,p_production_cost,'completed',p_branch_id,p_notes,v_org_id,auth.uid())
  RETURNING id INTO v_batch_id;
  SELECT * INTO v_inventory FROM inventory WHERE product_id=p_product_id AND organization_id=v_org_id FOR UPDATE;
  IF FOUND THEN UPDATE inventory SET current_stock=current_stock+p_quantity_produced, produced_stock=produced_stock+p_quantity_produced, last_updated=now() WHERE id=v_inventory.id;
  ELSE INSERT INTO inventory(product_id,organization_id,opening_stock,produced_stock,sold_stock,current_stock,minimum_stock,maximum_stock) VALUES(p_product_id,v_org_id,0,p_quantity_produced,0,p_quantity_produced,0,0); END IF;
  INSERT INTO stock_movements(product_id,movement_type,quantity,reference_type,reference_id,notes,organization_id,created_by) VALUES(p_product_id,'production',p_quantity_produced,'production_batch',v_batch_id,'Production '||p_batch_number,v_org_id,auth.uid());
  INSERT INTO audit_logs(user_id,organization_id,action,module,entity_type,entity_id,new_value) VALUES(auth.uid(),v_org_id,'CREATE','production','production_batch',v_batch_id,jsonb_build_object('batch_number',p_batch_number,'quantity_produced',p_quantity_produced));
  RETURN v_batch_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_production(text,date,text,text,uuid,integer,numeric,uuid,numeric,numeric,numeric,numeric,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_production(text,date,text,text,uuid,integer,numeric,uuid,numeric,numeric,numeric,numeric,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_notes text DEFAULT NULL,
  p_from_branch_id uuid DEFAULT NULL,
  p_to_branch_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_org_id uuid:=get_my_organization_id(); v_id uuid; v_inventory inventory%ROWTYPE; v_new_stock numeric;
BEGIN
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Organization membership required'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  SELECT * INTO v_inventory FROM inventory WHERE product_id=p_product_id AND organization_id=v_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory record not found'; END IF;
  v_new_stock := CASE WHEN p_movement_type IN ('stock_in','return','production') THEN v_inventory.current_stock+p_quantity WHEN p_movement_type IN ('stock_out','sale','damaged') THEN v_inventory.current_stock-p_quantity ELSE p_quantity END;
  IF v_new_stock < 0 THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  UPDATE inventory SET current_stock=v_new_stock, last_updated=now(), damaged_stock=CASE WHEN p_movement_type='damaged' THEN damaged_stock+p_quantity ELSE damaged_stock END WHERE id=v_inventory.id;
  INSERT INTO stock_movements(product_id,movement_type,quantity,notes,from_branch_id,to_branch_id,organization_id,created_by) VALUES(p_product_id,p_movement_type,p_quantity,p_notes,p_from_branch_id,p_to_branch_id,v_org_id,auth.uid()) RETURNING id INTO v_id;
  INSERT INTO audit_logs(user_id,organization_id,action,module,entity_type,entity_id,new_value) VALUES(auth.uid(),v_org_id,'CREATE','inventory','stock_movement',v_id,jsonb_build_object('movement_type',p_movement_type,'quantity',p_quantity));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid,text,numeric,text,uuid,uuid) TO authenticated;
