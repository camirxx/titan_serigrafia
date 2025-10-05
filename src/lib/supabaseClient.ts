// Cliente SSR-friendly para Supabase
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Cliente para el NAVEGADOR (componentes `use client`).
 * No usa `next/headers`, por eso es seguro en el cliente.
 */
export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

/**
 * Cliente para el SERVIDOR (layouts, server components, loaders).
 * Importa `cookies` dinámicamente y normaliza los tipos sin usar `any`,
 * así evitamos errores de build y de ESLint.
 */
export const supabaseServer = async () => {
  // 1) Import dinámico del módulo de headers
  type CookiesModule = typeof import('next/headers')
  const nh = (await import('next/headers')) as CookiesModule

  // 2) `cookies()` en Next devuelve ReadonlyRequestCookies.
  //    En algunos setups teclea como si fuera Promise<...>.
  //    Detectamos ambas posibilidades sin usar `any`.
  const maybeStore = nh.cookies() as unknown

  const isPromise = (v: unknown): v is Promise<unknown> =>
    typeof (v as { then?: unknown })?.then === 'function'

  // Si "parece" una promesa, la esperamos; si no, lo usamos directo
  const cookieStoreUnknown = isPromise(maybeStore) ? await maybeStore : maybeStore

  // 3) Definimos los tipos “parecidos” al store que necesitamos:
  type CookieTripletSig = {
    get(name: string): { value: string } | undefined
    set(name: string, value: string, options?: CookieOptions): void
  }
  type CookieObjectSig = {
    get(name: string): { value: string } | undefined
    set(opts: { name: string; value: string } & CookieOptions): void
  }

  // No sabemos cuál firma tiene en runtime; por eso casteamos a unknown y resolvemos en tiempo de ejecución.
  const cookieStore = cookieStoreUnknown as unknown

  // Wrappers sin `any`, compatibles con ambas firmas
  const getCookie = (name: string): string | undefined => {
    return (cookieStore as CookieTripletSig | CookieObjectSig).get(name)?.value
  }

  const setCookie = (name: string, value: string, options: CookieOptions) => {
    // Intento 1: firma set(name, value, options)
    try {
      ;((cookieStore as unknown as CookieTripletSig).set)(name, value, options)
      return
    } catch {
      // Intento 2: firma set({ name, value, ...options })
      ;((cookieStore as unknown as CookieObjectSig).set)({ name, value, ...options })
    }
  }

  const removeCookie = (name: string, options: CookieOptions) => {
    setCookie(name, '', { ...options, maxAge: 0 })
  }

  // 4) Creamos el server client usando los wrappers normalizados
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: getCookie,
        set: setCookie,
        remove: removeCookie,
      },
    }
  )
}
