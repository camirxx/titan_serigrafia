"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, Bell, ChevronDown } from "lucide-react";

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
  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));
  const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(formatDate(now));
      setCurrentTime(formatTime(now));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      className="fixed top-0 left-0 right-0 z-[10000] h-16 bg-slate-900/95 backdrop-blur-md shadow-[0_2px_8px_rgba(15,23,42,0.45)] border-b border-white/10"
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
          <div className="flex flex-col text-[11px] text-white/75 md:hidden">
            <span className="font-semibold text-white">{firstName}</span>
            <span className="capitalize">{roleLabel}</span>
            <span>{currentDate}</span>
            <span>{currentTime}</span>
          </div>
          <div ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Ver notificaciones"
              aria-haspopup="menu"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
                3
              </span>
            </button>

            {isNotificationsOpen ? (
              <div
                role="menu"
                className="fixed top-20 right-4 sm:right-6 lg:right-8 w-80 rounded-2xl border border-slate-800/60 bg-slate-900/95 p-3 text-sm text-slate-200 shadow-2xl z-[10001]"
              >
                <div className="mb-3 font-semibold text-white">Notificaciones</div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer">
                    <p className="font-medium text-white">Nueva venta registrada</p>
                    <p className="text-xs text-slate-400 mt-1">Se registró una venta por $45.000</p>
                    <p className="text-xs text-slate-500 mt-1">Hace 5 minutos</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer">
                    <p className="font-medium text-white">Stock bajo</p>
                    <p className="text-xs text-slate-400 mt-1">El producto &quot;Camiseta Básica&quot; tiene bajo stock</p>
                    <p className="text-xs text-slate-500 mt-1">Hace 1 hora</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer">
                    <p className="font-medium text-white">Devolución pendiente</p>
                    <p className="text-xs text-slate-400 mt-1">Hay una devolución pendiente de revisión</p>
                    <p className="text-xs text-slate-500 mt-1">Hace 2 horas</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full mt-3 rounded-xl px-3 py-2 text-center text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  Ver todas las notificaciones
                </button>
              </div>
            ) : null}
          </div>

          <div ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1 text-left text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-sm font-semibold uppercase text-white">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-sm font-semibold text-white">{user.name}</span>
                <span className="text-xs text-slate-300">{user.email}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-300" />
            </button>

            {isDropdownOpen ? (
              <div
                role="menu"
                className="fixed top-20 right-4 sm:right-6 lg:right-8 w-56 rounded-2xl border border-slate-800/60 bg-slate-900/95 p-3 text-sm text-slate-200 shadow-2xl z-[10001]"
              >
                <div className="mb-3 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
                  <p className="font-semibold text-slate-50">{user.name}</p>
                  <p>{user.email}</p>
                </div>
                <Link
                  href="/configuracion"
                  role="menuitem"
                  className="block rounded-xl px-3 py-2 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Configuración
                </Link>
                <form action="/api/auth/signout?redirect=/login" method="post" className="mt-2">
                  <button
                    type="submit"
                    role="menuitem"
                    className="w-full rounded-xl bg-rose-500/10 px-3 py-2 text-left font-semibold text-rose-300 transition hover:bg-rose-500 hover:text-white"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
