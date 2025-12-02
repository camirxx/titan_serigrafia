"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

/** Mapea mensajes de Supabase a textos amigables para el usuario */
function mapAuthError(message: string) {
  const msg = message || "";
  if (/Invalid login credentials/i.test(msg)) {
    return "Credenciales inválidas. Revisa tu email o contraseña.";
  }
  if (/Email not confirmed/i.test(msg)) {
    return "Debes confirmar tu email antes de iniciar sesión.";
  }
  if (/rate limit/i.test(msg) || /too many requests/i.test(msg)) {
    return "Demasiados intentos. Intenta nuevamente en unos minutos.";
  }
  if (/network/i.test(msg) || /fetch/i.test(msg)) {
    return "Problema de conexión. Verifica tu internet e intenta de nuevo.";
  }
  // Fallback: muestra el mensaje original si no matchea nada conocido
  return msg || "No se pudo iniciar sesión. Intenta nuevamente.";
}

/** Cartel simple para mostrar errores */
function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function LoginPage() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Lee ?next=/ruta (si no hay, usa "/")
  const next = useMemo(() => {
    if (typeof window === "undefined") return "/";
    return new URLSearchParams(window.location.search).get("next") || "/";
  }, []);

  // Validador simple antes de enviar
  function validate() {
    if (!email.trim()) return "Ingresa tu email.";
    if (!password) return "Ingresa tu contraseña.";
    // Puedes endurecer validación de email si quieres
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const preError = validate();
    if (preError) {
      setErrorMsg(preError);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(mapAuthError(error.message));
        setSubmitting(false);
        return;
      }

      // (Opcional) bootstrap de usuarios: crea fila en public.usuarios si no existe
      await fetch("/api/auth/bootstrap", { method: "POST" }).catch(() => {});

      // Redirige a la ruta original o al home
      window.location.href = next;
    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: string }).message === "string"
          ? (err as { message?: string }).message
          : "Network error";
      setErrorMsg(mapAuthError(errorMessage ?? ""));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-8 rounded-2xl shadow-xl bg-white border border-gray-100"
      >
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

        {/* Mensaje contextual si venías redirigido desde una ruta privada */}
        {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("next") && (
          <p className="text-xs text-gray-500">
            Inicia sesión para continuar a{" "}
            <span className="font-mono">
              {new URLSearchParams(window.location.search).get("next")}
            </span>
          </p>
        )}

        <div className="space-y-2">
          <label className="block text-sm">Email</label>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded outline-none focus:ring"
            autoComplete="email"
            disabled={submitting}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              autoComplete="current-password"
              disabled={submitting}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>


        <ErrorBanner message={errorMsg} />

        <button
            type="submit"
            disabled={submitting}
            className="w-full p-2 rounded bg-black text-white disabled:opacity-60"
        >
          {submitting ? "Ingresando..." : "Entrar"}
        </button>

        <p className="text-sm text-center">
          <a href="/forgot-password" className="underline text-gray-600 hover:text-gray-800">
            ¿Olvidaste tu contraseña?
          </a>
        </p>
      </form>
    </div>
  );
}
