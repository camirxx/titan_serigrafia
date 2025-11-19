"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Undo2,
  BarChart2,
  Users2,
  LogOut,
} from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/devoluciones", label: "Cambios y Devoluciones", icon: Undo2 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reportes", label: "Reportes", icon: BarChart2 },
  { href: "/trabajadores", label: "Trabajadores", icon: Users2 },
];

type SidebarProps = {
  isMobile: boolean;
  isMobileOpen: boolean;
  sidebarWidth: number;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export default function Sidebar({
  isMobile,
  isMobileOpen,
  sidebarWidth,
  user,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: SidebarProps) {
  const pathname = usePathname();
  const showLabels = !isMobile && sidebarWidth >= 200;
  const isVisible = isMobile ? isMobileOpen : sidebarWidth > 0;

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-[999] flex h-[calc(100vh-64px)] flex-col border-r border-white/30 bg-white/85 text-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-[width,transform] duration-300 ease-in-out",
        isMobile && !isMobileOpen ? "-translate-x-full" : "translate-x-0"
      )}
      style={{ width: isMobile ? 280 : sidebarWidth }}
      onMouseEnter={!isMobile ? onMouseEnter : undefined}
      onMouseLeave={!isMobile ? onMouseLeave : undefined}
      aria-hidden={!isVisible}
    >
      <div className="sticky top-0 z-10 border-b border-white/40 bg-white/90 px-4 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 text-slate-900 transition hover:text-indigo-500"
          onClick={isMobile ? onClose : undefined}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-lg">IV</span>
          {showLabels || isMobile ? (
            <span className="text-lg font-semibold">Inventario & Ventas</span>
          ) : null}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 font-medium">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const cleanedHref = item.href.replace(/\/$/, "");
            const isActive = pathname === cleanedHref || pathname?.startsWith(`${cleanedHref}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "border-l-4 border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {(showLabels || isMobile) && <span className="truncate">{item.label}</span>}

                  {!showLabels && !isMobile ? (
                    <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900/95 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                      {item.label}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative border-t border-white/10 px-3 py-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl bg-slate-100/80 px-3 py-3 text-sm text-slate-800",
            !showLabels && !isMobile ? "justify-center" : ""
          )}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500 text-sm font-semibold uppercase text-white">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("") || "U"
            )}
          </span>
          {(showLabels || isMobile) && (
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
          <form action="/api/auth/signout?redirect=/login" method="post">
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-500 transition hover:bg-rose-500 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
