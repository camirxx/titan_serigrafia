import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Crea la fila en public.usuarios (id=email=rol) si no existe.
 * Rol por defecto: 'vendedor' (ajústalo si prefieres otro).
 */
export async function POST() {
  const supabase = await supabaseServer();


  

  // 1) obtener sesión
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
    }
  const uid = session.user.id;
  const email = session.user.email ?? null;

  // 2) revisar si ya existe
  const { data: existing, error: checkErr } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (checkErr) {
    return NextResponse.json({ error: checkErr.message }, { status: 400 });
  }
  if (existing?.id) {
    return NextResponse.json({ ok: true, created: false });
  }

  // 3) insertar con rol por defecto
  const { error: insertErr } = await supabase
    .from("usuarios")
    .insert([{ id: uid, email, rol: "vendedor", activo: true }]);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, created: true });
}
