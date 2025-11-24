"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

type NavbarProps = {
  logged: boolean;
  email: string | null;
  rol: "admin" | "vendedor" | "desarrollador" | null;
};

const navigationLinks: { href: string; label: string; roles?: NavbarProps["rol"][] }[] = [
  { href: "/pos", label: "POS" },
  { href: "/inventario", label: "Inventario" },
  { href: "/devoluciones", label: "Devoluciones" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reportes", label: "Reportes", roles: ["admin"] },
  { href: "/trabajadores", label: "Trabajadores", roles: ["admin"] },
  { href: "/configuracion", label: "Configuración" },
];

export default function Navbar({ logged, email, rol }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  const isDark = theme === "dark";
  
  const headerClasses = `fixed top-0 left-0 w-full z-[9998] transition-all duration-300 ${
    isDark
      ? scrolled
        ? "bg-purple-950/70 backdrop-blur-md shadow-md py-2"
        : "bg-gradient-to-r from-purple-950 via-purple-900 to-purple-800 py-4"
      : scrolled
      ? "bg-white/70 backdrop-blur-md shadow-md py-2"
      : "bg-gradient-to-r from-white to-gray-50 py-4"
  }`;

  const textColorClass = isDark ? "text-white" : "text-gray-900";
  const hoverColorClass = isDark ? "hover:text-purple-300" : "hover:text-purple-600";
  const linkHoverClass = isDark ? "hover:bg-white/10 hover:text-purple-200" : "hover:bg-purple-100/50 hover:text-purple-700";
  const badgeBgClass = isDark ? "bg-white/10" : "bg-purple-100/50";
  const badgeTextClass = isDark ? "text-purple-100" : "text-purple-700";
  const buttonClass = isDark ? "bg-white text-purple-900" : "bg-purple-600 text-white";
  const buttonHoverClass = isDark ? "hover:bg-purple-100" : "hover:bg-purple-700";
  const mobileMenuBgClass = isDark ? "bg-white/10" : "bg-purple-100/50";
  const mobileMenuTextClass = isDark ? "text-purple-100" : "text-purple-700";
  const mobileMenuHoverClass = isDark ? "hover:bg-white/20" : "hover:bg-purple-200/50";

  return (
    <header className={headerClasses}>
      <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className={`flex items-center gap-2 text-2xl font-bold transition ${textColorClass} ${hoverColorClass}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-white" : "bg-purple-600"}`}>
              <div className={`h-7 w-7 rounded-full ${isDark ? "bg-purple-900" : "bg-white"}`} />
            </div>
            Inventario & Ventas
          </Link>

          {logged ? (
            <>
              <nav className="hidden items-center gap-3 md:flex">
                {navigationLinks
                  .filter((link) => !link.roles || (rol && link.roles.includes(rol)))
                  .map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${linkHoverClass} ${textColorClass}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                <button
                  onClick={toggleTheme}
                  className={`rounded-lg p-2 transition ${isDark ? "bg-white/10 hover:bg-white/20 text-yellow-300" : "bg-purple-100/50 hover:bg-purple-200/50 text-purple-700"}`}
                  aria-label="Cambiar tema"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeBgClass} ${badgeTextClass}`}>
                  {email}
                </span>
                <form action="/api/auth/signout?redirect=/login" method="post">
                  <button className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-lg transition ${buttonClass} ${buttonHoverClass}`}>
                    Salir
                  </button>
                </form>
              </nav>

              <div className="flex items-center gap-2 md:hidden">
                <button
                  onClick={toggleTheme}
                  className={`rounded-lg p-2 transition ${isDark ? "bg-white/10 hover:bg-white/20 text-yellow-300" : "bg-purple-100/50 hover:bg-purple-200/50 text-purple-700"}`}
                  aria-label="Cambiar tema"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className={`inline-flex items-center justify-center rounded-lg p-2 transition focus:outline-none focus:ring-2 ${isDark ? "bg-white/10 text-white hover:bg-white/20 focus:ring-white" : "bg-purple-100/50 text-purple-700 hover:bg-purple-200/50 focus:ring-purple-600"}`}
                  aria-label="Abrir menú"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-900 shadow-lg transition hover:bg-purple-100"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

        {logged ? (
          <div
            className={`md:hidden fixed left-0 right-0 top-20 z-[9997] px-4 sm:px-6 py-4 backdrop-blur-md shadow-lg ${
              mobileOpen ? "grid gap-3" : "hidden"
            } ${isDark ? "bg-purple-950/95 border-b border-purple-900/50" : "bg-white/95 border-b border-gray-200/50"}`}
          >
            {navigationLinks
              .filter((link) => !link.roles || (rol && link.roles.includes(rol)))
              .map((link) => (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mobileMenuBgClass} ${mobileMenuTextClass} ${mobileMenuHoverClass}`}
                >
                  {link.label}
                </Link>
              ))}
            <div className={`rounded-lg px-3 py-2 text-xs font-medium border-t ${isDark ? "border-purple-900/50 text-gray-400" : "border-gray-200 text-gray-600"}`}>
              {email}
            </div>
            <form action="/api/auth/signout?redirect=/login" method="post">
              <button className={`w-full rounded-lg px-4 py-2 text-sm font-semibold shadow-lg transition ${buttonClass} ${buttonHoverClass}`}>
                Salir
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
