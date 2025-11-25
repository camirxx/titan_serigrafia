"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useSidebar } from "@/hooks/useSidebar";

const PATH_LABELS: Record<string, string> = {
  dashboard: "Panel de Control",
  pos: "Punto de Venta",
  inventario: "Inventario",
  devoluciones: "Devoluciones",
  reportes: "Reportes y Analíticas",
  trabajadores: "Equipo",
};

function buildBreadcrumbs(pathname: string): string[] {
  if (!pathname) return [];
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "(privado)");

  if (segments.length === 0) {
    return ["Inicio"];
  }

  return segments.map((segment) => PATH_LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()));
}

type PrivateAppLayoutProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  role: "admin" | "vendedor" | "desarrollador" | null;
};

export default function PrivateAppLayout({ children, user, role }: PrivateAppLayoutProps) {
  const sidebar = useSidebar();
  const pathname = usePathname();
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const isSidebarExpanded = sidebar.isMobile
    ? sidebar.isMobileOpen
    : sidebar.sidebarWidth > 100;

  const mainStyle = useMemo(() => ({
    paddingTop: `${sidebar.headerHeight}px`,
    marginLeft: sidebar.isMobile ? 0 : `${sidebar.sidebarWidth}px`,
    minHeight: `calc(100vh - ${sidebar.headerHeight}px)`,
  }), [sidebar.headerHeight, sidebar.isMobile, sidebar.sidebarWidth]);

  return (
    <div className="relative min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[1100] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>

      <Header
        onToggleSidebar={sidebar.toggleSidebar}
        isSidebarExpanded={isSidebarExpanded}
        isMobile={sidebar.isMobile}
        isMobileOpen={sidebar.isMobileOpen}
        breadcrumbs={breadcrumbs}
        user={user}
        role={role}
      />

      <Sidebar
        isMobile={sidebar.isMobile}
        isMobileOpen={sidebar.isMobileOpen}
        sidebarWidth={sidebar.sidebarWidth}
        user={user}
        role={role}
        onClose={sidebar.closeSidebar}
        onMouseEnter={sidebar.handleMouseEnter}
        onMouseLeave={sidebar.handleMouseLeave}
      />

      {sidebar.isMobile && sidebar.isMobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={sidebar.closeSidebar}
          className="fixed inset-0 z-[998] bg-slate-900/60 backdrop-blur-sm"
        />
      ) : null}

      <main
        id="main-content"
        style={mainStyle}
        className="relative bg-transparent text-white transition-[margin-left] duration-300 ease-in-out"
      >
        {children}
      </main>
    </div>
  );
}
