// src/app/(privado)/(admin)/trabajadores/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireRole } from "@/lib/guards";
import TrabajadoresUI from "./TrabajadoresUI";

// ---- Tipos ----
type Rol = "admin" | "vendedor" | "desarrollador";
type Tienda = {
  id: number;
  nombre: string;
};
type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: Rol | null;
  activo: boolean | null;
  tienda_id: number | null;
  tienda_nombre: string | null;
  created_at: string | null;
};

type UsuarioRow = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: Rol | null;
  activo: boolean | null;
  tienda_id: number | null;
  created_at: string | null;
  tiendas: { nombre: string } | { nombre: string }[] | null;
};

// ---- Server Actions ----
async function updateRole(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const rol = String(formData.get("rol") || "") as Rol;

  if (!id || !rol) return { success: false, message: "Datos incompletos" };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("usuarios")
    .update({ rol })
    .eq("id", id);

  if (error) {
    console.error("updateRole error:", error.message);
    return { success: false, message: error.message };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: "Rol actualizado correctamente" };
}

async function toggleActivo(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const activo = String(formData.get("activo") || "") === "true";

  if (!id) return { success: false, message: "ID requerido" };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("usuarios")
    .update({ activo })
    .eq("id", id);

  if (error) {
    console.error("toggleActivo error:", error.message);
    return { success: false, message: error.message };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: `Usuario ${activo ? "activado" : "desactivado"} correctamente` };
}

async function updateTienda(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const tienda_id = formData.get("tienda_id");

  if (!id) return { success: false, message: "ID requerido" };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("usuarios")
    .update({ tienda_id: tienda_id ? Number(tienda_id) : null })
    .eq("id", id);

  if (error) {
    console.error("updateTienda error:", error.message);
    return { success: false, message: error.message };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: "Tienda actualizada correctamente" };
}

// ---- Página (Server Component) ----
export default async function TrabajadoresPage() {
  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const supabase = await supabaseServer();
  
  // Obtener TODOS los usuarios (sin filtros)
  const { data, error } = await supabase
    .from("usuarios")
    .select(`
      id, 
      email, 
      nombre, 
      rol, 
      activo, 
      tienda_id,
      created_at,
      tiendas:tienda_id (nombre)
    `)
    .order("created_at", { ascending: false });
  
  console.log('Usuarios encontrados:', data?.length || 0); // Debug

  if (error) {
    console.error("fetch usuarios error:", error.message);
  }

  // Obtener lista de tiendas para el selector
  const { data: tiendasData } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const tiendas = (tiendasData ?? []) as Tienda[];

  // Mapear usuarios con nombre de tienda
  const usuarios: Usuario[] = ((data ?? []) as UsuarioRow[]).map((row) => {
    const tiendaNombre = Array.isArray(row.tiendas)
      ? row.tiendas[0]?.nombre ?? null
      : row.tiendas?.nombre ?? null;

    return {
      id: row.id,
      email: row.email,
      nombre: row.nombre,
      rol: row.rol,
      activo: row.activo,
      tienda_id: row.tienda_id,
      created_at: row.created_at,
      tienda_nombre: tiendaNombre
    };
  });

  return (
    <TrabajadoresUI 
      usuarios={usuarios}
      tiendas={tiendas}
      updateRole={updateRole}
      toggleActivo={toggleActivo}
      updateTienda={updateTienda}
    />
  );
}
