import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/guards";
import InventarioClient from "./InventarioClient";


export default async function Page() {
  const auth = await requireAuth();
  if (!auth.ok) redirect("/acceso-restringido");
  return <InventarioClient/>;
}
