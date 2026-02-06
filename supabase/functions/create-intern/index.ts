// Supabase Edge Function: create-intern
// Creates an intern account (Auth user + profile + intern role).
//
// Deploy with:
//   supabase functions deploy create-intern
//
// The function requires environment variables (set by Supabase automatically):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY  (never expose this to the browser)
//
// Security:
// - Caller must be authenticated.
// - Caller must have 'admin' role in public.user_roles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type CreateInternBody = {
  email?: string;
  password?: string;
  fullName?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, error: "Missing server configuration" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { ok: false, error: "Missing Authorization header" });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Verify caller identity using the provided JWT
  const jwt = authHeader.replace("Bearer ", "");
  const { data: caller, error: callerError } = await supabaseAdmin.auth.getUser(jwt);
  if (callerError || !caller?.user) {
    return json(401, { ok: false, error: "Invalid token" });
  }

  // Check caller is admin
  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) return json(500, { ok: false, error: roleError.message });
  if (!roleRow) return json(403, { ok: false, error: "Admin access required" });

  let body: CreateInternBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const email = body.email?.trim();
  const password = body.password;
  const fullName = body.fullName?.trim();

  if (!email || !password || !fullName) {
    return json(400, { ok: false, error: "email, password, and fullName are required" });
  }

  // Create auth user
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) return json(400, { ok: false, error: createError.message });
  if (!created.user) return json(500, { ok: false, error: "Failed to create user" });

  // Create profile
  await supabaseAdmin.from("profiles").insert({
    user_id: created.user.id,
    email,
    full_name: fullName,
  });

  // Assign intern role
  await supabaseAdmin.from("user_roles").insert({
    user_id: created.user.id,
    role: "intern",
  });

  return json(200, { ok: true, userId: created.user.id });
});

