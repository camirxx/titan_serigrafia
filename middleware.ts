// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Actualizar tanto request como response
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: "",
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Refrescar sesión si es necesario
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;

  // PRIMERO: Verificar rutas restringidas por rol (antes que cualquier otra cosa)
  if (user) {
    // Rutas que solo admin y desarrollador pueden acceder
    const adminOnlyRoutes = ["/trabajadores", "/reportes"];
    
    for (const route of adminOnlyRoutes) {
      if (url.pathname.startsWith(route)) {
        const { data, error: roleError } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", user.id)
          .single();

        const rol = data?.rol ?? null;
        
        // Si hay error o el rol no está permitido, redirigir
        if (roleError || (rol !== "admin" && rol !== "desarrollador")) {
          console.log(`🚫 ACCESO DENEGADO: Rol=${rol} intentó acceder a ${url.pathname}`);
          return NextResponse.redirect(new URL("/acceso-denegado", url));
        }
        
        // Si el rol es permitido, continuar
        console.log(`✅ ACCESO PERMITIDO: Rol=${rol} accedió a ${url.pathname}`);
        break;
      }
    }
  }

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
  ];

  // Verificar si la ruta es pública
  const isPublic =
    publicRoutes.some((p) => url.pathname.startsWith(p)) ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/images") ||
    url.pathname.startsWith("/public");

  // Sin usuario → redirigir a login
  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", url);
    redirectUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Con usuario y entrando a /login → home
  if (user && url.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};