// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Intentar obtener sesión y manejar errores de refresh token
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Si hay error de refresh token, limpiar cookies y redirigir
  if (error?.code === "refresh_token_not_found" || 
      error?.message?.includes("refresh_token_not_found") ||
      error?.message?.includes("Invalid Refresh Token")) {
    
    // Limpiar todas las cookies de Supabase
    const allCookies = req.cookies.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith("sb-")) {
        res.cookies.delete(cookie.name);
      }
    });

    // Redirigir a acceso restringido si no está en ruta pública
    const url = req.nextUrl;
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

    if (!isPublic) {
      const redirectUrl = new URL("/acceso-restringido", url);
      redirectUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  }

  const url = req.nextUrl;

  // Rutas públicas
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
    const { data, error: roleError } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id", session.user.id)
      .single();

    const rol = data?.rol ?? null;
    if (roleError || rol !== "admin") {
      return NextResponse.redirect(new URL("/acceso-denegado", url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};