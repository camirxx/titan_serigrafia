import { supabaseServer } from "@/lib/supabaseServer";

export async function getUserAndRole() {
  const supabase = await supabaseServer();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { user: null, role: null };

  // Lee el rol desde TU tabla `public.usuarios`
  const { data, error } = await supabase
    .from("usuarios")
    .select("rol, email, activo")
    .eq("id", session.user.id) // id = uuid FK a auth.users
    .single();

  return { user: session.user, role: data?.rol ?? null, error };
}
