import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
function configuredKey(jsonName: string, legacyName: string) {
  const legacy = Deno.env.get(legacyName) || "";
  if (legacy) return legacy;
  try { const values = JSON.parse(Deno.env.get(jsonName) || "{}"); return String(values?.default || Object.values(values || {})[0] || ""); }
  catch { return ""; }
}
const SERVICE_ROLE_KEY = configuredKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const publicAuth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const MUTABLE_PLATFORM_ROLES = new Set(["user", "admin"]);
const ALLOWED_ORIGINS = new Set(["https://app.histreets.uk", "https://histreets.uk", "http://localhost:3000", "http://localhost:4173", "http://localhost:5173"]);

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://app.histreets.uk";
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const clean = (value: unknown, max = 200) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

async function audit(actorId: string, action: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await admin.from("admin_audit_log").insert({ admin_id: actorId, action, target_type: "user", target_id: targetId, metadata });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401, origin);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session." }, 401, origin);
    const { data: actor } = await admin.from("profiles").select("role,suspended_at").eq("id", user.id).maybeSingle();
    if (actor?.role !== "super_admin" || actor?.suspended_at) return json({ error: "Founder access required." }, 403, origin);
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action, 30) || "list";

    if (action === "list") {
      const page = Math.max(1, Number(body?.page || 1));
      const perPage = Math.min(100, Math.max(1, Number(body?.per_page || 50)));
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ error: error.message }, 400, origin);
      const ids = data.users.map(u => u.id);
      const { data: profiles } = ids.length ? await admin.from("profiles").select("id,display_name,role,suspended_at,suspension_reason").in("id", ids) : { data: [] as any[] };
      const { data: memberships } = ids.length ? await admin.from("business_memberships").select("user_id,business_id").in("user_id", ids).eq("status", "active") : { data: [] as any[] };
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
      const businessCounts = new Map<string, number>();
      for (const membership of memberships || []) businessCounts.set(String(membership.user_id), (businessCounts.get(String(membership.user_id)) || 0) + 1);
      return json({ users: data.users.map(u => ({ id: u.id, email: u.email || "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null, email_confirmed_at: u.email_confirmed_at || null, display_name: byId.get(u.id)?.display_name || "", role: byId.get(u.id)?.role || "user", suspended_at: byId.get(u.id)?.suspended_at || null, suspension_reason: byId.get(u.id)?.suspension_reason || "", business_count: businessCounts.get(u.id) || 0 })), page, per_page: perPage, total: data.total }, 200, origin);
    }

    const targetId = clean(body?.user_id, 64);
    if (!targetId) return json({ error: "Choose a user first." }, 400, origin);
    const targetResult = await admin.auth.admin.getUserById(targetId);
    const target = targetResult.data.user;
    if (!target) return json({ error: "User not found." }, 404, origin);
    const { data: targetProfile } = await admin.from("profiles").select("display_name,role,suspended_at,suspension_reason").eq("id", targetId).maybeSingle();

    if (action === "detail") {
      const { data: memberships } = await admin.from("business_memberships").select("business_id,role,status,created_at,businesses(name)").eq("user_id", targetId).order("created_at", { ascending: false });
      return json({ user: { id: target.id, email: target.email || "", created_at: target.created_at, last_sign_in_at: target.last_sign_in_at || null, email_confirmed_at: target.email_confirmed_at || null, display_name: targetProfile?.display_name || "", role: targetProfile?.role || "user", suspended_at: targetProfile?.suspended_at || null, suspension_reason: targetProfile?.suspension_reason || "" }, memberships: memberships || [] }, 200, origin);
    }

    if (targetId === user.id) return json({ error: "Use the protected recovery process for your own Founder account." }, 400, origin);
    if (targetProfile?.role === "super_admin") return json({ error: "Founder access cannot be changed here." }, 400, origin);

    if (action === "set_role") {
      const nextRole = clean(body?.role, 20);
      if (!MUTABLE_PLATFORM_ROLES.has(nextRole)) return json({ error: "Choose User or Platform Admin." }, 400, origin);
      const { error } = await admin.from("profiles").upsert({ id: targetId, role: nextRole }, { onConflict: "id" });
      if (error) return json({ error: error.message }, 400, origin);
      await audit(user.id, "platform_role_updated", targetId, { role: nextRole });
      return json({ ok: true, role: nextRole }, 200, origin);
    }

    if (action === "send_password_reset") {
      const result = await publicAuth.auth.resetPasswordForEmail(target.email || "", { redirectTo: "https://app.histreets.uk/business?mode=recovery" });
      if (result.error) return json({ error: "Password reset email could not be sent." }, 503, origin);
      await audit(user.id, "password_reset_sent", targetId);
      return json({ ok: true }, 200, origin);
    }

    if (action === "suspend") {
      const reason = clean(body?.reason, 300);
      if (reason.length < 4) return json({ error: "Add a short suspension reason." }, 400, origin);
      const authUpdate = await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      if (authUpdate.error) return json({ error: "Could not suspend this account." }, 400, origin);
      const profileUpdate = await admin.from("profiles").upsert({ id: targetId, suspended_at: new Date().toISOString(), suspension_reason: reason }, { onConflict: "id" });
      if (profileUpdate.error) return json({ error: "Account was blocked, but the profile status needs attention." }, 500, origin);
      await audit(user.id, "user_suspended", targetId, { reason });
      return json({ ok: true }, 200, origin);
    }

    if (action === "reactivate") {
      const authUpdate = await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (authUpdate.error) return json({ error: "Could not reactivate this account." }, 400, origin);
      const profileUpdate = await admin.from("profiles").update({ suspended_at: null, suspension_reason: null }).eq("id", targetId);
      if (profileUpdate.error) return json({ error: "Account was unblocked, but the profile status needs attention." }, 500, origin);
      await audit(user.id, "user_reactivated", targetId);
      return json({ ok: true }, 200, origin);
    }

    if (action === "soft_delete") {
      const confirmation = clean(body?.confirmation).toLowerCase();
      if (!target.email || confirmation !== target.email.toLowerCase()) return json({ error: "Type the exact email address to confirm deletion." }, 400, origin);
      const ban = await admin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
      if (ban.error) return json({ error: "Could not secure the account before deletion." }, 400, origin);
      await audit(user.id, "user_soft_deleted", targetId, { email_domain: target.email.split("@")[1] || "" });
      const deleted = await admin.auth.admin.deleteUser(targetId, true);
      if (deleted.error) return json({ error: "Could not delete this account." }, 400, origin);
      return json({ ok: true }, 200, origin);
    }
    return json({ error: "Unknown action." }, 400, origin);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Founder service failed." }, 500, origin);
  }
});
