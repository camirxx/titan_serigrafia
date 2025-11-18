// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
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

        <div className="flex min-h-screen flex-col">
          {/* Navbar mejorado con contraste */}
          <header className="flex items-center justify-between border-b border-white/20 bg-gradient-to-r from-purple-900/95 to-purple-800/95 p-4 backdrop-blur-md shadow-xl sm:p-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-bold text-white transition hover:text-purple-200"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <div className="h-7 w-7 rounded-full bg-purple-900" />
              </div>
              Inventario & Ventas
            </Link>

            {logged ? (
              <nav className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
                <Link
                  href="/pos"
                  className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                >
                  POS
                </Link>

                <Link
                  href="/inventario"
                  className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                >
                  Inventario
                </Link>

                <Link
                  href="/devoluciones"
                  className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                >
                  Devoluciones
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                >
                  Dashboard
                </Link>

                {rol === "admin" && (
                  <>
                    <Link
                      href="/reportes"
                      className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                    >
                      Reportes
                    </Link>
                    <Link
                      href="/trabajadores"
                      className="rounded-lg px-3 py-2 font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                    >
                      Trabajadores
                    </Link>
                  </>
                )}

                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-purple-200">
                  {email}
                </span>

                <form action="/api/auth/signout?redirect=/login" method="post">
                  <button className="rounded-lg bg-white px-4 py-2 font-bold text-purple-900 shadow-lg transition hover:bg-purple-100">
                    Salir
                  </button>
                </form>
              </nav>
            ) : null}
          </header>

          <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-28">
            {children}
          </main>
        </div>

        <ChatbotWidget />
      </body>
    </html>
  );
}