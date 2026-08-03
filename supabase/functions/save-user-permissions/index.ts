import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rolePermissions: Record<string, string[]> = {
  admin: [
    "dashboard", "customers", "products", "quotations", "invoices",
    "delivery-notes", "cash-receipts", "boqs", "payments", "audit-logs",
    "reports-overview", "reports-sales", "reports-inventory", "reports-statements",
    "settings-company", "settings-users", "manage-permissions",
  ],
  accountant: [
    "dashboard", "customers", "invoices", "cash-receipts", "payments",
    "reports-overview", "reports-sales", "reports-statements",
  ],
  stock_manager: [
    "dashboard", "customers", "products", "delivery-notes", "reports-overview", "reports-inventory",
  ],
  user: ["dashboard", "customers", "quotations", "boqs"],
  sales: [
    "dashboard", "customers", "products", "quotations", "invoices", "delivery-notes",
    "cash-receipts", "boqs", "reports-overview", "reports-sales", "reports-inventory", "reports-statements",
  ],
};

const validPermissions = new Set(Object.values(rolePermissions).flat());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { userId, overrides } = await req.json();
    if (typeof userId !== "string" || !overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
      return new Response(JSON.stringify({ error: "Invalid permission update" }), { status: 400, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile || !rolePermissions[targetProfile.role]) {
      return new Response(JSON.stringify({ error: "Target user not found" }), { status: 404, headers: corsHeaders });
    }

    const entries = Object.entries(overrides);
    if (entries.some(([permissionName, granted]) => !validPermissions.has(permissionName) || typeof granted !== "boolean")) {
      return new Response(JSON.stringify({ error: "Invalid permission update" }), { status: 400, headers: corsHeaders });
    }

    const defaults = new Set(rolePermissions[targetProfile.role]);
    const effectiveOverrides = entries
      .filter(([permissionName, granted]) => granted !== defaults.has(permissionName))
      .map(([permission_name, granted]) => ({ permission_name, granted }));

    const { data, error } = await supabaseAdmin.rpc("replace_user_permission_overrides", {
      p_target_user_id: userId,
      p_requester_id: authData.user.id,
      p_overrides: effectiveOverrides,
    });

    if (error) {
      const status = error.message.includes("Cannot modify") || error.message.includes("Only admins") ? 403 : 400;
      return new Response(JSON.stringify({ error: error.message }), { status, headers: corsHeaders });
    }

    const result = data?.[0] || { rows_deleted: 0, rows_inserted: 0 };
    return new Response(JSON.stringify({ success: true, rowsDeleted: result.rows_deleted, rowsInserted: result.rows_inserted }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Permission save error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
