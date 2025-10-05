import { supabaseServer } from "./supabaseServer";

export async function getSession() {
  const supabase = await supabaseServer(); // 👈
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
