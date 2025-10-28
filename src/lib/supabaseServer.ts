// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const resolveSupabaseEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL/Anon key are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY)."
    );
  }
  return { url, anonKey };
};

export async function supabaseServer() {
  // En Next.js 15+, cookies() retorna una Promise
  const cookieStore = await cookies();
  const { url, anonKey } = resolveSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Si el contexto es readonly (RSC), esto lanzará; lo ignoramos.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* noop en entorno readonly */
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
            expires: new Date(0),
          });
        } catch {
          /* noop en entorno readonly */
        }
      },
    },
  });

  return supabase;
}

// Cliente de administrador con service role key para operaciones privilegiadas
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Supabase URL is missing. Set NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!serviceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local");
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Please add it to your .env.local file. You can find it in Supabase Dashboard → Settings → API → service_role key"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}