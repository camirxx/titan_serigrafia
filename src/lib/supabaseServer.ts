// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // La operación `setAll` fue llamada desde un Server Component.
            // Esto puede ser ignorado si tienes middleware refrescando
            // las sesiones de usuario.
          }
        },
      },
    }
  );

  // Validar la sesión y limpiar si el refresh token falló
  try {
    const { error: authError } = await supabase.auth.getSession();
    
    if (authError?.message?.includes('refresh_token_not_found') || 
        authError?.code === 'refresh_token_not_found') {
      // Limpiar todas las cookies de autenticación
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          try {
            cookieStore.delete(cookie.name);
          } catch {
            // Ignorar errores al eliminar cookies
          }
        }
      });
    }
  } catch {
    // Ignorar errores de validación en Server Components
  }

  return supabase;
}