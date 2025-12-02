"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  Undo2,
  BarChart2,
  Users2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { href: "/pos", label: "Punto de Venta", icon: ShoppingCart, roles: ["admin", "vendedor", "desarrollador"] },
  { href: "/inventario", label: "Inventario", icon: Package, roles: ["admin", "vendedor", "desarrollador"] },
  { href: "/devoluciones", label: "Devoluciones", icon: Undo2, roles: ["admin", "vendedor", "desarrollador"] },
  { href: "/stock-critico", label: "Stock Crítico", icon: AlertTriangle, roles: ["admin", "vendedor", "desarrollador"] },
  { href: "/reportes", label: "Reportes", icon: BarChart2, roles: ["admin", "desarrollador"] },
  { href: "/trabajadores", label: "Trabajadores", icon: Users2, roles: ["admin", "desarrollador"] },
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
  role: "admin" | "vendedor" | "desarrollador" | null;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export default function Sidebar({
  isMobile,
  isMobileOpen,
  sidebarWidth,
  user,
  role,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: SidebarProps) {
  const pathname = usePathname();
  const showLabels = !isMobile && sidebarWidth >= 200;
  const isVisible = isMobile ? isMobileOpen : sidebarWidth > 0;

  // Filtrar elementos según el rol del usuario
  const filteredNavItems = navItems.filter(item => 
    !item.roles || (role && item.roles.includes(role))
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-[999] flex h-[calc(100vh-64px)] flex-col border-r border-gray-200 bg-white text-gray-900 shadow-lg transition-[width,transform] duration-300 ease-in-out",
        isMobile && !isMobileOpen ? "-translate-x-full" : "translate-x-0"
      )}
      style={{ width: isMobile ? 280 : sidebarWidth }}
      onMouseEnter={!isMobile ? onMouseEnter : undefined}
      onMouseLeave={!isMobile ? onMouseLeave : undefined}
      aria-hidden={!isVisible}
    >
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-900 transition hover:text-indigo-600"
          onClick={isMobile ? onClose : undefined}
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">IV</span>
          {showLabels || isMobile ? (
            <span className="text-sm font-semibold text-gray-900">Inventario & Ventas</span>
          ) : null}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 font-medium">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const cleanedHref = item.href.replace(/\/$/, "");
            const isActive = pathname === cleanedHref || pathname?.startsWith(`${cleanedHref}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all duration-200",
                    isActive
                      ? "border-l-3 border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {(showLabels || isMobile) && <span className="truncate text-xs font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative border-t border-gray-200 px-2 py-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-2 text-sm text-gray-800",
            !showLabels && !isMobile ? "justify-center" : ""
          )}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500 text-xs font-semibold uppercase text-white">
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
              <p className="text-xs font-medium text-gray-900">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
