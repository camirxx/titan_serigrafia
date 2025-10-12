// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
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
          // NO modificar req.cookies directamente
          // Solo establecer en la respuesta
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Intentar obtener sesión y manejar errores de refresh token
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

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

  // Si hay error de refresh token, limpiar cookies y redirigir
  if (
    error?.code === "refresh_token_not_found" ||
    error?.message?.includes("refresh_token_not_found") ||
    error?.message?.includes("Invalid Refresh Token")
  ) {
    // Crear nueva respuesta para limpiar cookies
    const cleanResponse = isPublic
      ? NextResponse.next({ request: req })
      : NextResponse.redirect(new URL("/acceso-restringido", url));

    // Limpiar todas las cookies de Supabase
    const allCookies = req.cookies.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        cleanResponse.cookies.delete(cookie.name);
      }
    });

    if (!isPublic) {
      cleanResponse.headers.set(
        "Location",
        `/acceso-restringido?next=${encodeURIComponent(url.pathname)}`
      );
    }

    return cleanResponse;
  }

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