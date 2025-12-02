"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
  if (/Password should be at least/i.test(msg)) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (/Password reset link is invalid or has expired/i.test(msg)) {
    return "El enlace de reseteo es inválido o ha expirado. Solicita uno nuevo.";
  }
  return msg || "No se pudo resetear la contraseña. Intenta nuevamente.";
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function SuccessBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      {message}
    </div>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Extraer el hash de la URL que contiene el token
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Supabase incluye el token en el hash como #access_token=...&refresh_token=...
      setIsValidToken(true);
      
      // Extraer el access_token del hash
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Establecer la sesión con los tokens del hash
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(({ error }) => {
          if (error) {
            setErrorMsg("El enlace de reseteo es inválido o ha expirado.");
            setIsValidToken(false);
          }
        });
      } else {
        setErrorMsg("Enlace de reseteo inválido. Solicita uno nuevo.");
        setIsValidToken(false);
      }
    } else {
      setErrorMsg("Enlace de reseteo inválido. Solicita uno nuevo.");
      setIsValidToken(false);
    }
  }, [supabase.auth]);

  function validate() {
    if (!password.trim()) return "Ingresa tu nueva contraseña.";
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (password !== confirmPassword) return "Las contraseñas no coinciden.";
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
    setSuccessMsg(null);

    try {
      // Usar updateUser para cambiar la contraseña (la sesión ya está establecida)
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setErrorMsg(mapAuthError(error.message));
        setSubmitting(false);
        return;
      }

      setSuccessMsg("¡Contraseña actualizada correctamente! Redirigiendo...");
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: string }).message === "string"
          ? (err as { message?: string }).message
          : "Error al resetear la contraseña";
      setErrorMsg(mapAuthError(errorMessage ?? ""));
      setSubmitting(false);
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm p-8 rounded-2xl shadow-xl bg-white border border-gray-100">
          <div className="text-center">Verificando enlace...</div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm p-8 rounded-2xl shadow-xl bg-white border border-gray-100">
          <ErrorBanner message={errorMsg} />
          <button
            onClick={() => router.push("/recuperar-contrasena")}
            className="w-full mt-4 p-2 rounded bg-black text-white"
          >
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-8 rounded-2xl shadow-xl bg-white border border-gray-100"
      >
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <p className="text-sm text-gray-600">
          Ingresa tu nueva contraseña para tu cuenta.
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              autoComplete="new-password"
              disabled={submitting}
              required
              minLength={6}
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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              autoComplete="new-password"
              disabled={submitting}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <ErrorBanner message={errorMsg} />
        <SuccessBanner message={successMsg} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full p-2 rounded bg-black text-white disabled:opacity-60"
        >
          {submitting ? "Actualizando..." : "Actualizar contraseña"}
        </button>

        <p className="text-sm text-center">
          <a href="/login" className="underline text-gray-600">
            Volver al inicio de sesión
          </a>
        </p>
      </form>
    </div>
  );
}
