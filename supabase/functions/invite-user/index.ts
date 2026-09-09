import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const allowedRoles = new Set([
  "org_admin", "factory_manager", "production_officer", "warehouse_manager",
  "warehouse_officer", "sales_manager", "sales_officer", "accountant",
  "finance_manager", "auditor", "viewer",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const token = authorization.slice("Bearer ".length);
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(url, serviceKey);
    const { data: authData, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const role = typeof body.role === "string" ? body.role : "";
    if (!email || !fullName || !allowedRoles.has(role)) return new Response(JSON.stringify({ error: "Name, email, and a valid role are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: caller, error: callerError } = await adminClient.from("profiles").select("organization_id, role").eq("id", authData.user.id).maybeSingle();
    if (callerError || !caller?.organization_id || !["platform_admin", "org_owner", "org_admin"].includes(caller.role)) return new Response(JSON.stringify({ error: "Organization administrator access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: invitationToken, error: invitationError } = await callerClient.rpc("invite_user", {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
    });
    if (invitationError || !invitationToken) {
      return new Response(JSON.stringify({ error: invitationError?.message ?? "Unable to create the invitation" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (emailError) {
      await adminClient.from("user_invitations").update({ status: "revoked" }).eq("invitation_token", invitationToken);
      return new Response(JSON.stringify({ error: "Unable to send the invitation email" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Unable to process the invitation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
