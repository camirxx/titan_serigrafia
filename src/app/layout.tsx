// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import SupabaseListener from "@/components/SupabaseListener";
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
  if (logged) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session!.user!.id)
      .single();
    rol = (data?.rol as typeof rol) ?? null;
  }

  return (
    <html lang="es">
      <body
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo.jpeg')" }}
      >
        <SupabaseListener />

        {/* Navbar mejorado con contraste */}
        <header className="border-b border-white/20 p-4 flex items-center justify-between bg-gradient-to-r from-purple-900/95 to-purple-800/95 backdrop-blur-md shadow-xl">
          <Link href="/" className="font-bold text-2xl text-white hover:text-purple-200 transition flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <div className="w-7 h-7 bg-purple-900 rounded-full"></div>
            </div>
            Inventario & Ventas
          </Link>

          {logged ? (
            <nav className="flex items-center gap-5">
              <Link href="/pos" className="text-white font-medium hover:text-purple-200 transition px-3 py-2 rounded-lg hover:bg-white/10">
                POS
              </Link>
              <Link href="/inventario" className="text-white font-medium hover:text-purple-200 transition px-3 py-2 rounded-lg hover:bg-white/10">
                Inventario
              </Link>

              <Link href="/devoluciones" className="text-white font-medium hover:text-purple-200 transition px-3 py-2 rounded-lg hover:bg-white/10">
                Devoluciones
              </Link>

              {rol === "admin" && (
                <>
                    <Link href="/reportes" className="text-white font-medium hover:text-purple-200 transition px-3 py-2 rounded-lg hover:bg-white/10">
                    Reportes
                  </Link>
                  <Link href="/trabajadores" className="text-white font-medium hover:text-purple-200 transition px-3 py-2 rounded-lg hover:bg-white/10">
                    Trabajadores
                  </Link>
                </>
              )}

              <span className="text-sm text-purple-200 bg-white/10 px-3 py-1 rounded-full">
                {email}
              </span>

              <form action="/api/auth/signout?redirect=/login" method="post">
                <button className="px-4 py-2 rounded-lg bg-white text-purple-900 font-bold hover:bg-purple-100 transition shadow-lg">
                  Salir
                </button>
              </form>
            </nav>
          ) : (
            <nav>
              <Link href="/login" className="px-4 py-2 rounded-lg bg-white text-purple-900 font-bold hover:bg-purple-100 transition shadow-lg">
                Ingresar
              </Link>
            </nav>
          )}
        </header>

        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}