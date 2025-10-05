import { supabaseServer } from "@/lib/supabaseServer";

export async function requireAuth() {
  const supabase = await supabaseServer(); // 👈
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false as const, reason: "unauthenticated" as const };
  return { ok: true as const, user: session.user };
}

export async function requireRole(required: "admin" | "vendedor" | "desarrollador") {
  const supabase = await supabaseServer(); // 👈
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false as const, reason: "unauthenticated" as const };

  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (error) return { ok: false as const, reason: "db_error" as const, error };
  if (!data?.rol) return { ok: false as const, reason: "no_role" as const };

  return data.rol === required
    ? { ok: true as const, user: session.user, role: data.rol }
    : { ok: false as const, reason: "forbidden" as const, role: data.rol };
}
