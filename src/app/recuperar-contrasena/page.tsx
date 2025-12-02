"use client";

import { useState } from "react";

function mapAuthError(message: string) {
  const msg = message || "";
  if (/rate limit/i.test(msg) || /too many requests/i.test(msg)) {
    return "Demasiados intentos. Intenta nuevamente en unos minutos.";
  }
  if (/network/i.test(msg) || /fetch/i.test(msg)) {
    return "Problema de conexión. Verifica tu internet e intenta de nuevo.";
  }
  if (/User not found/i.test(msg)) {
    return "No existe una cuenta con este email.";
  }
  return msg || "No se pudo enviar el email. Intenta nuevamente.";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function validate() {
    if (!email.trim()) return "Ingresa tu email.";
    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Ingresa un email válido.";
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
      // Llamar a nuestra API para enviar el email de reseteo
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el email");
      }

      setSuccessMsg(
        "¡Email enviado! Revisa tu bandeja de entrada y sigue las instrucciones para resetear tu contraseña."
      );

      // Limpiar el campo de email
      setEmail("");

    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: string }).message === "string"
          ? (err as { message?: string }).message
          : "Error al enviar el email";
      setErrorMsg(mapAuthError(errorMessage ?? ""));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 p-8 rounded-2xl shadow-xl bg-white/90 backdrop-blur-sm border border-gray-100"
      >
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-gray-600">
          Ingresa tu email y te enviaremos un enlace para resetear tu contraseña.
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            autoComplete="email"
            disabled={submitting}
            required
          />
        </div>

        <ErrorBanner message={errorMsg} />
        <SuccessBanner message={successMsg} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full p-2 rounded bg-black text-white disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar email de recuperación"}
        </button>

        <div className="flex justify-between text-sm">
          <a href="/login" className="underline text-gray-600 hover:text-gray-800">
            Volver al inicio de sesión
          </a>
        </div>
      </form>
    </div>
  );
}
