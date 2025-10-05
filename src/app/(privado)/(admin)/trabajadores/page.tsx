// src/app/trabajadores/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireRole } from "@/lib/guards";

// ---- Tipos ----
type Rol = "admin" | "vendedor" | "desarrollador";
type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: Rol | null;
  activo: boolean | null;
  tienda_id: number | null;
  created_at: string | null;
};

// ---- Server Actions ----
export async function updateRole(formData: FormData) {
  "use server";

  // Gate de seguridad: solo admin puede ejecutar
  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const rol = String(formData.get("rol") || "") as Rol;

  if (!id || !rol) return;

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("usuarios")
    .update({ rol })
    .eq("id", id);

  if (error) {
    console.error("updateRole error:", error.message);
  }

  revalidatePath("/trabajadores");
}

export async function toggleActivo(formData: FormData) {
  "use server";

  // Gate de seguridad: solo admin puede ejecutar
  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const id = String(formData.get("id") || "");
  const activo = String(formData.get("activo") || "") === "true";

  if (!id) return;

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("usuarios")
    .update({ activo })
    .eq("id", id);

  if (error) {
    console.error("toggleActivo error:", error.message);
  }

  revalidatePath("/trabajadores");
}

// ---- Página (Server Component) ----
export default async function TrabajadoresPage() {
  // Gate de acceso a la página completa: solo admin
  const gate = await requireRole("admin");
  if (!gate.ok) redirect("/");

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, email, nombre, rol, activo, tienda_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetch usuarios error:", error.message);
  }

  const usuarios = (data ?? []) as Usuario[];
  const roles: Rol[] = ["admin", "vendedor", "desarrollador"];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Trabajadores</h1>
        <p className="text-sm text-gray-500">Gestión de usuarios y roles</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-[800px] w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3">Tienda</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">{u.email ?? "—"}</td>
                <td className="px-4 py-3">{u.nombre ?? "—"}</td>

                {/* Cambiar rol */}
                <td className="px-4 py-3">
                  <form action={updateRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select
                      name="rol"
                      defaultValue={u.rol ?? ""}
                      className="border rounded px-2 py-1"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-gray-900 text-white"
                      title="Guardar rol"
                    >
                      Guardar
                    </button>
                  </form>
                </td>

                {/* Activar/Desactivar */}
                <td className="px-4 py-3">
                  <form action={toggleActivo} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <input
                      type="hidden"
                      name="activo"
                      value={(!u.activo) ? "true" : "false"}
                    />
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${
                        u.activo ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="mr-2">{u.activo ? "Sí" : "No"}</span>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded border"
                      title="Alternar activo"
                    >
                      Cambiar
                    </button>
                  </form>
                </td>

                <td className="px-4 py-3">{u.tienda_id ?? "—"}</td>

                <td className="px-4 py-3 text-right text-gray-400">—</td>
              </tr>
            ))}

            {usuarios.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No hay usuarios registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    
    </div>
  );
}
