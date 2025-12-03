// src/app/(privado)/(admin)/trabajadores/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabaseServer";
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
  tiendas: { nombre: string | null } | { nombre: string | null }[] | null;
};

// ---- Server Actions ----
async function updateRole(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const rol = String(formData.get("rol") || "") as Rol;

  if (!id || !rol) return { success: false, message: "Datos incompletos" };

  // Proteger: el admin no puede cambiar su propio rol
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user && user.id === id) {
    return { success: false, message: "No puedes cambiar tu propio rol" };
  }

  const adminClient = supabaseAdmin();
  const { error } = await adminClient
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

  const adminClient = supabaseAdmin();
  const { error } = await adminClient
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

  const adminClient = supabaseAdmin();
  const { error } = await adminClient
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

async function createUser(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const email = String(formData.get("email") || "").trim();
  const nombre = String(formData.get("nombre") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const rol = String(formData.get("rol") || "") as Rol;
  const tienda_id = formData.get("tienda_id");

  if (!email || !password || !nombre || !rol) {
    return { success: false, message: "❌ Error: Todos los campos son obligatorios (email, nombre, contraseña y rol)" };
  }

  if (password.length < 6) {
    return { success: false, message: "❌ Error: La contraseña debe tener al menos 6 caracteres" };
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, message: "❌ Error: El formato del email no es válido" };
  }

  const supabase = await supabaseServer();
  const adminClient = supabaseAdmin(); // Cliente con permisos de administrador

  // Verificar si el email ya existe
  const { data: existingUser } = await supabase
    .from("usuarios")
    .select("email")
    .eq("email", email)
    .single();

  if (existingUser) {
    return { success: false, message: `❌ Error: El email ${email} ya está registrado en el sistema` };
  }

  // Crear usuario en Supabase Auth usando el cliente admin
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirmar email
  });

  if (authError) {
    console.error("createUser auth error:", authError.message);
    
    // Mensajes de error más específicos
    if (authError.message.includes("already registered")) {
      return { success: false, message: `❌ Error: El email ${email} ya está registrado` };
    }
    if (authError.message.includes("password")) {
      return { success: false, message: "❌ Error: La contraseña no cumple con los requisitos de seguridad" };
    }
    
    return { success: false, message: `❌ Error al crear usuario: ${authError.message}` };
  }

  if (!authData.user) {
    return { success: false, message: "❌ Error: No se pudo crear el usuario. Intenta nuevamente" };
  }

  // Usar upsert para insertar o actualizar datos en la tabla usuarios
  const { error: upsertError } = await adminClient
    .from("usuarios")
    .upsert({
      id: authData.user.id,
      email: email,
      nombre,
      rol,
      tienda_id: tienda_id ? Number(tienda_id) : null,
      activo: true,
    }, {
      onConflict: 'id'
    });

  if (upsertError) {
    console.error("createUser upsert error:", upsertError.message);
    return { success: false, message: `❌ Error al guardar los datos del usuario: ${upsertError.message}` };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: `✅ Usuario ${nombre} creado exitosamente. Ya puede iniciar sesión con ${email}` };
}

async function deleteUser(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");

  if (!id) return { success: false, message: "ID requerido" };

  // Proteger: el admin no puede eliminarse a sí mismo
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user && user.id === id) {
    return { success: false, message: "❌ No puedes eliminar tu propia cuenta" };
  }

  const adminClient = supabaseAdmin();

  // Eliminar usuario de Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(id);

  if (authError) {
    console.error("deleteUser error:", authError.message);
    return { success: false, message: `❌ Error al eliminar usuario: ${authError.message}` };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: "✅ Usuario eliminado correctamente" };
}

async function updateUser(formData: FormData) {
  "use server";

  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const rol = String(formData.get("rol") || "") as Rol;
  const tienda_id = formData.get("tienda_id");

  if (!id) return { success: false, message: "ID requerido" };

  const adminClient = supabaseAdmin();
  
  // Build update object dynamically
  const updateData: {
    nombre?: string;
    email?: string;
    rol?: Rol;
    tienda_id?: number | null;
  } = {};
  if (nombre) updateData.nombre = nombre;
  if (email) updateData.email = email;
  if (rol) updateData.rol = rol;
  if (tienda_id !== undefined) updateData.tienda_id = tienda_id ? Number(tienda_id) : null;

  const { error } = await adminClient
    .from("usuarios")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("updateUser error:", error.message);
    return { success: false, message: error.message };
  }

  revalidatePath("/trabajadores");
  return { success: true, message: "Usuario actualizado correctamente" };
}

// ---- Página (Server Component) ----
export default async function TrabajadoresPage() {
  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const supabase = await supabaseServer();
  
  // Obtener el ID del usuario actual (admin)
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;
  
  // Obtener TODOS los usuarios (sin filtros de rol) usando cliente admin
  const adminClient = supabaseAdmin();
  const { data, error } = await adminClient
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
  
  if (error) {
    console.error("❌ ERROR fetch usuarios:", error);
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
      currentUserId={currentUserId}
      updateRole={updateRole}
      toggleActivo={toggleActivo}
      updateTienda={updateTienda}
      createUser={createUser}
      deleteUser={deleteUser}
      updateUser={updateUser}
    />
  );
}
