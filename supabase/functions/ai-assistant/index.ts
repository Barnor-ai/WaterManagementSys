import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authorization.slice("Bearer ".length);
    const caller = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await caller.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id").eq("id", authData.user.id).maybeSingle();
    if (profileError || !profile?.organization_id) {
      return new Response(JSON.stringify({ error: "Organization membership required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const organizationId = profile.organization_id;

    // Gather business data for the authenticated organization only
    const [
      batches, sales, saleItems, inventory, customers, suppliers,
      expenses, payments, machines, products, rawMaterials, bottles
    ] = await Promise.all([
      supabase.from("production_batches").select("*, product:products(name), machine:machines(name)").eq("organization_id", organizationId),
      supabase.from("sales").select("*, customer:customers(name)").eq("organization_id", organizationId),
      supabase.from("sale_items").select("*, product:products(name)").eq("organization_id", organizationId),
      supabase.from("inventory").select("*, product:products(name, cost_per_unit, unit_price)").eq("organization_id", organizationId),
      supabase.from("customers").select("*").eq("organization_id", organizationId),
      supabase.from("suppliers").select("*").eq("organization_id", organizationId),
      supabase.from("expenses").select("*").eq("organization_id", organizationId),
      supabase.from("payments").select("*, customer:customers(name)").eq("organization_id", organizationId),
      supabase.from("machines").select("*").eq("organization_id", organizationId),
      supabase.from("products").select("*").eq("organization_id", organizationId),
      supabase.from("raw_materials").select("*").eq("organization_id", organizationId),
      supabase.from("bottles").select("*").eq("organization_id", organizationId),
    ]);

    // Build a comprehensive business context
    const context = {
      production: {
        totalBatches: batches.data?.length ?? 0,
        totalProduced: batches.data?.reduce((s: number, b: any) => s + b.quantity_produced, 0) ?? 0,
        totalRejected: batches.data?.reduce((s: number, b: any) => s + b.rejected_quantity + b.damaged_bottles, 0) ?? 0,
        totalCost: batches.data?.reduce((s: number, b: any) => s + b.production_cost, 0) ?? 0,
        recentBatches: batches.data?.slice(0, 10).map((b: any) => ({
          batch: b.batch_number, date: b.production_date, product: b.product?.name,
          produced: b.quantity_produced, rejected: b.rejected_quantity, status: b.status,
          waste: b.waste_percentage, operator: b.operator, machine: b.machine?.name,
        })),
        byProduct: aggregateByProduct(batches.data ?? [], "quantity_produced"),
      },
      sales: {
        totalSales: sales.data?.length ?? 0,
        totalRevenue: sales.data?.reduce((s: number, r: any) => s + r.total_amount, 0) ?? 0,
        totalOutstanding: sales.data?.reduce((s: number, r: any) => s + r.balance, 0) ?? 0,
        byType: aggregateBy(sales.data ?? [], "sale_type", "total_amount"),
        recentSales: sales.data?.slice(0, 10).map((s: any) => ({
          invoice: s.invoice_number, date: s.sale_date, customer: s.customer?.name,
          type: s.sale_type, total: s.total_amount, balance: s.balance,
        })),
        topProducts: aggregateTopProducts(saleItems.data ?? []),
      },
      inventory: {
        items: inventory.data?.map((i: any) => ({
          product: i.product?.name, current: i.current_stock, min: i.minimum_stock,
          max: i.maximum_stock, value: i.current_stock * (i.product?.cost_per_unit ?? 0),
        })),
        lowStock: inventory.data?.filter((i: any) => i.current_stock <= i.minimum_stock)
          .map((i: any) => ({ product: i.product?.name, current: i.current_stock, min: i.minimum_stock })),
        totalValue: inventory.data?.reduce((s: number, i: any) => s + i.current_stock * (i.product?.cost_per_unit ?? 0), 0) ?? 0,
      },
      customers: {
        total: customers.data?.length ?? 0,
        withOutstanding: customers.data?.filter((c: any) => c.outstanding_balance > 0)
          .map((c: any) => ({ name: c.name, balance: c.outstanding_balance, type: c.type })),
        totalOutstanding: customers.data?.reduce((s: number, c: any) => s + c.outstanding_balance, 0) ?? 0,
      },
      suppliers: {
        total: suppliers.data?.length ?? 0,
        totalPayable: suppliers.data?.reduce((s: number, c: any) => s + c.outstanding_payable, 0) ?? 0,
      },
      expenses: {
        total: expenses.data?.reduce((s: number, e: any) => s + e.amount, 0) ?? 0,
        byCategory: aggregateBy(expenses.data ?? [], "category", "amount"),
      },
      machines: machines.data?.map((m: any) => ({ name: m.name, status: m.status, capacity: m.capacity_per_hour })),
      rawMaterials: rawMaterials.data?.map((r: any) => ({ name: r.name, quantity: r.quantity, reorder: r.reorder_level })),
      bottles: bottles.data?.map((b: any) => ({ type: b.bottle_type, balance: b.balance, reorder: b.reorder_level })),
    };

    // If no OpenAI key, return a rule-based answer
    if (!openaiApiKey) {
      const answer = generateRuleBasedAnswer(question, context);
      return new Response(
        JSON.stringify({ answer, source: "rule-based" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for AquaFlow, a water manufacturing ERP system. Answer questions about production, sales, inventory, customers, and finances based on the provided business data. Be concise and specific. Use the data to give accurate answers with numbers. If data is insufficient, say so.

Business Data Context:
${JSON.stringify(context, null, 2)}`,
          },
          { role: "user", content: question },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      const fallback = generateRuleBasedAnswer(question, context);
      return new Response(
        JSON.stringify({ answer: fallback, source: "rule-based-fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const answer = openaiData.choices?.[0]?.message?.content ?? "I could not generate an answer.";

    return new Response(
      JSON.stringify({ answer, source: "openai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function aggregateBy(rows: any[], field: string, valueField: string) {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const key = r[field];
    map[key] = (map[key] ?? 0) + (r[valueField] || 0);
  });
  return Object.entries(map).map(([key, value]) => ({ key, value }));
}

function aggregateByProduct(rows: any[], valueField: string) {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const name = r.product?.name ?? "Unknown";
    map[name] = (map[name] ?? 0) + (r[valueField] || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function aggregateTopProducts(saleItems: any[]) {
  const map: Record<string, { quantity: number; revenue: number }> = {};
  saleItems.forEach((item) => {
    const name = item.product?.name ?? "Unknown";
    if (!map[name]) map[name] = { quantity: 0, revenue: 0 };
    map[name].quantity += item.quantity;
    map[name].revenue += item.total_price;
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function generateRuleBasedAnswer(question: string, ctx: any): string {
  const q = question.toLowerCase();

  if (q.includes("produce") && (q.includes("month") || q.includes("this month"))) {
    return `This month, ${ctx.production.totalProduced.toLocaleString()} bottles were produced across ${ctx.production.totalBatches} batches. The total production cost was ${ctx.production.totalCost.toLocaleString()}.`;
  }

  if (q.includes("best-selling") || q.includes("best selling") || q.includes("top product")) {
    const top = ctx.sales.topProducts[0];
    if (top) {
      return `Your best-selling product is ${top.name} with ${top.quantity.toLocaleString()} units sold, generating ${top.revenue.toLocaleString()} in revenue.`;
    }
    return "No sales data available to determine the best-selling product yet.";
  }

  if (q.includes("production loss") || q.includes("caused") || q.includes("waste")) {
    return `Production losses: ${ctx.production.totalRejected.toLocaleString()} units rejected/damaged out of ${ctx.production.totalProduced.toLocaleString()} produced (${ctx.production.totalProduced > 0 ? ((ctx.production.totalRejected / ctx.production.totalProduced) * 100).toFixed(1) : 0}% waste rate). Check recent batches for details on which machines or operators had the highest rejection rates.`;
  }

  if (q.includes("owe") || q.includes("outstanding") || q.includes("receivable")) {
    const list = ctx.customers.withOutstanding;
    if (list.length > 0) {
      return `Customers with outstanding balances:\n${list.map((c: any) => `• ${c.name}: ${c.outstanding_balance.toLocaleString()} (${c.type})`).join("\n")}\n\nTotal outstanding: ${ctx.customers.totalOutstanding.toLocaleString()}`;
    }
    return "No customers currently have outstanding balances.";
  }

  if (q.includes("revenue") || q.includes("monthly revenue") || q.includes("sales")) {
    return `Total revenue from ${ctx.sales.totalSales} sales: ${ctx.sales.totalRevenue.toLocaleString()}. Outstanding (unpaid): ${ctx.sales.totalOutstanding.toLocaleString()}.`;
  }

  if (q.includes("reorder") || q.includes("below") || q.includes("low stock")) {
    const low = ctx.inventory.lowStock;
    if (low.length > 0) {
      return `Products below reorder level:\n${low.map((i: any) => `• ${i.product}: ${i.current} units (min: ${i.min})`).join("\n")}`;
    }
    return "All products are above their reorder levels.";
  }

  if (q.includes("inventory") || q.includes("stock value")) {
    return `Current inventory value: ${ctx.inventory.totalValue.toLocaleString()}. ${ctx.inventory.lowStock.length} items are below reorder level.`;
  }

  if (q.includes("expense")) {
    return `Total expenses: ${ctx.expenses.total.toLocaleString()}. Categories: ${ctx.expenses.byCategory.map((e: any) => `${e.key}: ${e.value.toLocaleString()}`).join(", ")}.`;
  }

  if (q.includes("machine")) {
    return `Machine status:\n${ctx.machines.map((m: any) => `• ${m.name}: ${m.status} (capacity: ${m.capacity}/hr)`).join("\n")}`;
  }

  if (q.includes("supplier") || q.includes("payable")) {
    return `Total suppliers: ${ctx.suppliers.total}. Total outstanding payables: ${ctx.suppliers.totalPayable.toLocaleString()}.`;
  }

  if (q.includes("predict") || q.includes("demand") || q.includes("next month")) {
    const avgPerBatch = ctx.production.totalBatches > 0 ? ctx.production.totalProduced / ctx.production.totalBatches : 0;
    return `Based on current data, average production per batch is ${Math.round(avgPerBatch).toLocaleString()} units. With ${ctx.production.totalBatches} batches recorded, projected next month demand is approximately ${Math.round(avgPerBatch * 20).toLocaleString()} units (assuming 20 batches/month). Adjust based on seasonal trends and sales velocity.`;
  }

  if (q.includes("compare") || q.includes("last year") || q.includes("previous year")) {
    return `Current period data: ${ctx.sales.totalRevenue.toLocaleString()} revenue from ${ctx.sales.totalSales} sales. Historical comparison requires data from previous periods which may not be available yet.`;
  }

  return `I can help with questions about production (${ctx.production.totalProduced.toLocaleString()} units produced), sales (${ctx.sales.totalRevenue.toLocaleString()} revenue), inventory (${ctx.inventory.totalValue.toLocaleString()} value), customers (${ctx.customers.total} customers, ${ctx.customers.totalOutstanding.toLocaleString()} outstanding), and more. Try asking about specific metrics like "How many bottles did we produce?" or "Which customers owe us money?"`;
}
