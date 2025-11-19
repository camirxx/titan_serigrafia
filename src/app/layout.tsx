// src/app/layout.tsx
import "./globals.css";
import SupabaseListener from "@/components/SupabaseListener";
import ChatbotWidget from "@/components/ChatbotWidget";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const logged = !!session?.user;
  const email = session?.user?.email ?? null;

  let rol: "admin" | "vendedor" | "desarrollador" | null = null;
  
  if (logged && session?.user?.id) {
    try {
      const supabase = await supabaseServer();
      const { data, error } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", session.user.id)
        .single();
      
      if (!error && data) {
        rol = (data.rol as typeof rol) ?? null;
      }
    } catch (err) {
      console.error("Error obteniendo rol del usuario:", err);
    }
  }

  return (
    <html lang="es">
      <body
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo.jpeg')" }}
      >
        <SupabaseListener />

        {children}

        <ChatbotWidget />

      </body>
    </html>
  );
}