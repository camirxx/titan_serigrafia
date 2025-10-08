// src/lib/supabaseServer.ts
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

type MaybePromise<T> = T | Promise<T>

const resolveSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY  

  const key = serviceRoleKey || anonKey

  if (!url || !anonKey) {
    throw new Error(
      "Supabase URL/Anon key are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY) in your environment."
    )
  }

  return { url, anonKey }
}



const warn = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, error)
  }
}

const isPromise = <T,>(value: MaybePromise<T>): value is Promise<T> =>
  typeof (value as { then?: unknown })?.then === "function"

export async function supabaseServer() {
  const cookieStoreMaybe = cookies()
  const cookieStore = isPromise(cookieStoreMaybe)
    ? await cookieStoreMaybe
    : cookieStoreMaybe

  type CookieTriplet = {
    get?: (name: string) => { value: string } | undefined
    set?: (name: string, value: string, options?: CookieOptions) => void
    delete?: (name: string, options?: CookieOptions) => void
  }

  type CookieObject = {
    get?: (name: string) => { value: string } | undefined
    set?: (payload: { name: string; value: string } & CookieOptions) => void
    delete?: (name: string, options?: CookieOptions) => void
  }

  const storeTriplet = cookieStore as CookieTriplet
  const storeObject = cookieStore as CookieObject

  const getCookie = (name: string) => {
    try {
      return storeTriplet.get?.(name)?.value ?? storeObject.get?.(name)?.value
    } catch (error) {
      warn("[supabaseServer] Unable to read cookie", error)
      return undefined
    }
  }

  const trySetTriplet = (name: string, value: string, options: CookieOptions) => {
    try {
      storeTriplet.set?.(name, value, options)
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        warn("[supabaseServer] Triplet-set failed", error)
      }
      return false
    }
  }

  const trySetObject = (name: string, value: string, options: CookieOptions) => {
    try {
      storeObject.set?.({ name, value, ...options })
      return true
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        warn("[supabaseServer] Object-set failed", error)
      }
      return false
    }
  }

  const setCookie = (name: string, value: string, options: CookieOptions) => {
    if (!storeTriplet.set && !storeObject.set) return
    if (trySetTriplet(name, value, options)) return
    trySetObject(name, value, options)
  }

  const removeCookie = (name: string, options: CookieOptions) => {
    if (typeof storeTriplet.delete === "function") {
      try {
        storeTriplet.delete(name, options)
        return
      } catch (error) {
        warn("[supabaseServer] delete(name, options) failed", error)
      }
    }
    if (typeof storeObject.delete === "function") {
      try {
        storeObject.delete(name, options)
        return
      } catch (error) {
        warn("[supabaseServer] delete(payload) failed", error)
      }
    }
    setCookie(name, "", { ...options, maxAge: 0 })
  }

  const { url, anonKey } = resolveSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
