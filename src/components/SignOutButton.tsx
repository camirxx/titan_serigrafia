"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SignOutButton() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const onClick = async () => {
    await supabase.auth.signOut(); // limpia tokens/cookies en el navegador
    router.push("/login");
    router.refresh();              // asegura que el layout y server comps vean “sin sesión”
  };

  return (
    <button onClick={onClick} className="px-3 py-1 rounded bg-gray-900 text-white">
      Salir
    </button>
  );
}
