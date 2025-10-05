import { redirect } from "next/navigation";
import { requireRole } from "@/lib/guards";

export default async function AdminLayout({ children }:{children:React.ReactNode}){
  const gate = await requireRole("admin");
  if(!gate.ok) redirect("/acceso-denegado");
  return <>{children}</>;
}
