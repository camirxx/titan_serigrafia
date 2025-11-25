"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Bell, LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const HEADER_HEIGHT = 64;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type HeaderProps = {
  onToggleSidebar: () => void;
  isSidebarExpanded: boolean;
  isMobile: boolean;
  isMobileOpen: boolean;
  breadcrumbs: string[];
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  role: "admin" | "vendedor" | "desarrollador" | null;
};

export default function Header({
  onToggleSidebar,
  isSidebarExpanded,
  isMobile,
  isMobileOpen,
  breadcrumbs,
  user,
  role,
}: HeaderProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));
  const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()));

  const handleSignOut = async () => {
    const confirmed = window.confirm("¿Estás seguro de cerrar sesión?");
    if (confirmed) {
      try {
        console.log("Iniciando cierre de sesión...");
        
        // Usar el endpoint API que ya funciona
        const response = await fetch("/api/auth/signout?redirect=/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        console.log("Respuesta del API:", response.status, response.url);
        
        if (!response.ok) {
          console.error("Error en la respuesta del API:", response.status);
          throw new Error("Error al cerrar sesión");
        }
        
        // La respuesta debería ser una redirección, pero si no lo es, forzamos la redirección
        if (response.redirected) {
          window.location.href = response.url;
        } else {
          window.location.href = "/login";
        }
        
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        // Si hay error, igualmente intentamos redirigir
        window.location.href = "/login";
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(formatDate(now));
      setCurrentTime(formatTime(now));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const breadcrumbsContent = useMemo(() => {
    if (!breadcrumbs.length) return null;
    return breadcrumbs.map((crumb, index) => (
      <span key={`${crumb}-${index}`} className="flex items-center gap-2 text-sm text-slate-300">
        {index > 0 ? <span className="text-slate-500">/</span> : null}
        <span className={index === breadcrumbs.length - 1 ? "font-semibold text-white" : "text-slate-300"}>
          {crumb}
        </span>
      </span>
    ));
  }, [breadcrumbs]);

  const toggleIcon = isMobile ? (isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />) : isSidebarExpanded ? (
    <X className="h-5 w-5" />
  ) : (
    <Menu className="h-5 w-5" />
  );

  const initials = useMemo(() => {
    if (!user.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }, [user.name]);

  const firstName = useMemo(() => {
    if (!user.name) return "Usuario";
    const parts = user.name.trim().split(" ").filter(Boolean);
    return parts.length > 0 ? parts[0] : user.name;
  }, [user.name]);

  const roleLabel = useMemo(() => {
    if (!role) return "Usuario";
    const map: Record<NonNullable<typeof role>, string> = {
      admin: "Administrador",
      vendedor: "Vendedor",
      desarrollador: "Desarrollador",
    };
    return map[role] ?? role;
  }, [role]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[99999] h-16 bg-slate-900/95 backdrop-blur-md shadow-[0_2px_8px_rgba(15,23,42,0.45)] border-b border-white/10"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isSidebarExpanded ? "Colapsar navegación" : "Expandir navegación"}
            aria-pressed={isSidebarExpanded}
          >
            {toggleIcon}
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-white transition hover:text-indigo-200 md:hidden"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-indigo-700 shadow">
              <span className="text-base font-bold">IV</span>
            </span>
            Inventario & Ventas
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {breadcrumbsContent}
          </div>
        </div>

        {/* Center */}
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-3 text-white shadow-lg backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Hola</p>
              <p className="text-sm font-semibold sm:text-base">{firstName}</p>
            </div>
            <span className="hidden h-10 w-px bg-white/20 sm:block" />
            <div className="flex flex-col text-xs text-white/70 sm:text-sm">
              <span className="font-semibold text-white/90">{roleLabel}</span>
              <span>
                {currentDate} · {currentTime}
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
