// src/app/api/auth/signout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(request: Request) {
  // 1) Prepara la respuesta (redirige a /login por defecto)
  const url = new URL(request.url);
  const to = url.searchParams.get("redirect") || "/login";
  const res = NextResponse.redirect(new URL(to, url), { status: 303 });

  // 2) Usa cookies() de forma asíncrona en tu versión de Next
  const cookieStore = await cookies(); // 👈 importante: await

  // 3) Crea el cliente de Supabase atado a LAS COOKIES DE LA RESPUESTA
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // eliminar = expirar (maxAge: 0) en la RESPUESTA
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // 4) Cierra sesión (esto muta las cookies en `res`)
  await supabase.auth.signOut();

  // 5) Devuelve la redirección con cookies actualizadas
  return res;
}
