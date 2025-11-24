"use client";

import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon, Palette, Bell, Lock, User } from "lucide-react";
import { useState } from "react";

export default function ConfiguracionPage() {
  const { theme, toggleTheme } = useTheme();
  const [notificaciones, setNotificaciones] = useState(true);
  const [autoGuardar, setAutoGuardar] = useState(true);

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Configuración
          </h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Personaliza tu experiencia en Inventario & Ventas
          </p>
        </div>

        {/* Tema */}
        <div className={`rounded-2xl shadow-lg p-6 mb-6 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-purple-900/30" : "bg-purple-100"}`}>
              <Palette className={`w-6 h-6 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Tema
            </h2>
          </div>

          <div className="space-y-4">
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Elige entre modo claro y oscuro para una mejor experiencia visual
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Modo Claro */}
              <button
                onClick={() => {
                  if (theme === "dark") toggleTheme();
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  theme === "light"
                    ? isDark
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-purple-600 bg-purple-50"
                    : isDark
                    ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Sun className={`w-6 h-6 ${theme === "light" ? "text-yellow-500" : isDark ? "text-gray-500" : "text-gray-400"}`} />
                  <span className={`font-semibold ${theme === "light" ? (isDark ? "text-white" : "text-gray-900") : isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Modo Claro
                  </span>
                </div>
                <p className={`text-sm ${theme === "light" ? (isDark ? "text-gray-300" : "text-gray-700") : isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Interfaz blanca y limpia
                </p>
              </button>

              {/* Modo Oscuro */}
              <button
                onClick={() => {
                  if (theme === "light") toggleTheme();
                }}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  theme === "dark"
                    ? isDark
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-purple-600 bg-purple-50"
                    : isDark
                    ? "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Moon className={`w-6 h-6 ${theme === "dark" ? "text-indigo-400" : isDark ? "text-gray-500" : "text-gray-400"}`} />
                  <span className={`font-semibold ${theme === "dark" ? (isDark ? "text-white" : "text-gray-900") : isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Modo Oscuro
                  </span>
                </div>
                <p className={`text-sm ${theme === "dark" ? (isDark ? "text-gray-300" : "text-gray-700") : isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Morado medianoche elegante
                </p>
              </button>
            </div>

            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800/50 border border-gray-700" : "bg-gray-100 border border-gray-200"}`}>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                ✨ Tema actual: <span className="font-semibold">{theme === "light" ? "Modo Claro" : "Modo Oscuro"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className={`rounded-2xl shadow-lg p-6 mb-6 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
              <Bell className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Notificaciones
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }}>
              <div>
                <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Notificaciones de ventas
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Recibe alertas cuando se registren nuevas ventas
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificaciones}
                  onChange={() => setNotificaciones(!notificaciones)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer transition-colors ${notificaciones ? "bg-purple-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}></div>
                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${notificaciones ? "translate-x-5" : ""}`}></span>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }}>
              <div>
                <p className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Auto-guardar
                </p>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Guarda automáticamente los cambios mientras trabajas
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGuardar}
                  onChange={() => setAutoGuardar(!autoGuardar)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer transition-colors ${autoGuardar ? "bg-purple-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}></div>
                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoGuardar ? "translate-x-5" : ""}`}></span>
              </label>
            </div>
          </div>
        </div>

        {/* Privacidad y Seguridad */}
        <div className={`rounded-2xl shadow-lg p-6 mb-6 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-red-900/30" : "bg-red-100"}`}>
              <Lock className={`w-6 h-6 ${isDark ? "text-red-400" : "text-red-600"}`} />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Privacidad y Seguridad
            </h2>
          </div>

          <div className="space-y-3">
            <button className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
              Cambiar contraseña
            </button>
            <button className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
              Sesiones activas
            </button>
            <button className={`w-full p-4 rounded-lg text-left font-semibold transition-all ${isDark ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
              Historial de acceso
            </button>
          </div>
        </div>

        {/* Perfil */}
        <div className={`rounded-2xl shadow-lg p-6 ${isDark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
              <User className={`w-6 h-6 ${isDark ? "text-green-400" : "text-green-600"}`} />
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Perfil
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Nombre
              </label>
              <input
                type="text"
                placeholder="Tu nombre"
                className={`w-full px-4 py-2 rounded-lg border-2 transition-all ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-600"}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                disabled
                className={`w-full px-4 py-2 rounded-lg border-2 transition-all opacity-50 cursor-not-allowed ${isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-300 text-gray-500"}`}
              />
            </div>
            <button className="w-full py-3 mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg transition-all">
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
