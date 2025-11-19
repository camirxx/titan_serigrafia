import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";
import PrivateAppLayout from "@/components/layout/PrivateAppLayout";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function PrivadoLayout({
  children,
}: { children: React.ReactNode }) {
  const auth = await requireAuth();
  if (!auth.ok) redirect("/acceso-restringido");
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("usuarios")
    .select("rol, nombre")
    .eq("id", auth.user.id)
    .single();

  const userName = data?.nombre ?? auth.user.user_metadata?.full_name ?? auth.user.email ?? "Usuario";
  const role = (data?.rol as "admin" | "vendedor" | "desarrollador" | null) ?? null;

  return (
    <PrivateAppLayout
      user={{
        name: userName,
        email: auth.user.email ?? "",
        avatarUrl: auth.user.user_metadata?.avatar_url ?? null,
      }}
      role={role}
    >
      {children}
    </PrivateAppLayout>
  );
}
