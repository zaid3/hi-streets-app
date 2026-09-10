import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
function configuredKey(jsonName: string, legacyName: string) {
  const legacy = Deno.env.get(legacyName) || "";
  if (legacy) return legacy;
  try {
    const values = JSON.parse(Deno.env.get(jsonName) || "{}");
    return String(values?.default || Object.values(values || {})[0] || "");
  } catch { return ""; }
}
const SERVICE_ROLE_KEY = configuredKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ALLOWED_ORIGINS = new Set([
  "https://app.histreets.uk",
  "https://histreets.uk",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
]);
const TEAM_ROLES = new Set(["manager", "editor", "viewer"]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://app.histreets.uk";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function clean(value: unknown, max = 160) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function callerCanManage(userId: string, businessId: string) {
  const profile = await admin.from("profiles").select("role,suspended_at").eq("id", userId).maybeSingle();
  if (profile.data?.suspended_at) return false;
  if (["admin", "super_admin"].includes(String(profile.data?.role || ""))) return true;
  const business = await admin.from("businesses").select("claimed_by").eq("id", businessId).maybeSingle();
  if (business.data?.claimed_by === userId) return true;
  const membership = await admin.from("business_memberships").select("role,status")
    .eq("business_id", businessId).eq("user_id", userId).eq("status", "active").maybeSingle();
  return ["owner", "manager"].includes(String(membership.data?.role || ""));
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);

  const authorization = req.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json({ error: "Sign in required." }, 401, origin);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Your session has expired." }, 401, origin);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400, origin); }
  const action = clean(body.action, 30);
  const businessId = clean(body.business_id, 64);
  if (!businessId) return json({ error: "Choose a business first." }, 400, origin);
  if (!(await callerCanManage(user.id, businessId))) return json({ error: "Business owner or manager access required." }, 403, origin);

  if (action === "invite") {
    const email = clean(body.email).toLowerCase();
    const role = clean(body.role, 20);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400, origin);
    if (!TEAM_ROLES.has(role)) return json({ error: "Choose manager, editor or viewer access." }, 400, origin);
    if (email === String(user.email || "").toLowerCase()) return json({ error: "You already have access to this business." }, 400, origin);

    const existing = await admin.from("business_invitations").select("id").eq("business_id", businessId)
      .eq("email", email).eq("status", "pending").maybeSingle();
    if (existing.data) return json({ error: "An invitation is already waiting for this email." }, 409, origin);

    const invitation = await admin.from("business_invitations").insert({
      business_id: businessId, email, role, invited_by: user.id,
    }).select("id,expires_at").single();
    if (invitation.error) return json({ error: "Could not create the invitation." }, 400, origin);

    const invited = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://app.histreets.uk/business",
      data: { invitation_business_id: businessId },
    });
    const alreadyRegistered = /already|registered|exists/i.test(invited.error?.message || "");
    if (invited.error && !alreadyRegistered) {
      await admin.from("business_invitations").delete().eq("id", invitation.data.id);
      return json({ error: "The invitation email could not be sent. Try again shortly." }, 503, origin);
    }
    return json({ ok: true, delivery: alreadyRegistered ? "in_app" : "email", expires_at: invitation.data.expires_at }, 200, origin);
  }

  if (action === "revoke_invitation") {
    const invitationId = clean(body.invitation_id, 64);
    const result = await admin.from("business_invitations").update({ status: "revoked" })
      .eq("id", invitationId).eq("business_id", businessId).eq("status", "pending");
    if (result.error) return json({ error: "Could not revoke the invitation." }, 400, origin);
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "Unknown action." }, 400, origin);
});
