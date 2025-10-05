// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";



// Wrapper compatible con varias versiones de @supabase/ssr
function makeCookieMethods(req: NextRequest, res: NextResponse) {
  return {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      res.cookies.set({ name, value, ...options });
    },
    remove(name: string, options: CookieOptions) {
      res.cookies.set({ name, value: "", ...options, maxAge: 0 });
    },
  } as unknown as Parameters<typeof createServerClient>[2]["cookies"];
}

export async function middleware(req: NextRequest) {
  // Usamos 'res' para permitir a Supabase actualizar cookies
  const res = NextResponse.next({ request: { headers: req.headers } });

  // 👇 evita el error de tipos usando el wrapper/cast compatible
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: makeCookieMethods(req, res),
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl;

  // Rutas públicas (incluye API de auth y las pantallas de error)
  const publicRoutes = [
    "/login",
    "/auth/callback",
    "/api/auth",
    "/acceso-restringido",
    "/acceso-denegado",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/images",
    "/public",
    "/_next",
  ];
  const isPublic = publicRoutes.some((p) => url.pathname.startsWith(p));

  // Sin sesión → 401 (acceso restringido)
  if (!session && !isPublic) {
    const redirectUrl = new URL("/acceso-restringido", url);
    redirectUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Con sesión y entrando a /login → home
  if (session && url.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", url));
  }

  // Gate de rol para /trabajadores (solo admin) → 403 (acceso denegado)
  if (session && url.pathname.startsWith("/trabajadores")) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single();

    const rol = data?.rol ?? null;
    if (error || rol !== "admin") {
      return NextResponse.redirect(new URL("/acceso-denegado", url));
    }
  }

  // Importante: devuelve 'res' para aplicar set/remove de cookies
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
