import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";

export default async function PrivadoLayout({
  children,
}: { children: React.ReactNode }) {
  const auth = await requireAuth();
  if (!auth.ok) redirect("/acceso-restringido");
  return <>{children}</>;
}
