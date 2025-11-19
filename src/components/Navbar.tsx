"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

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
];

export default function Navbar({ logged, email, rol }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const headerClasses = `fixed top-0 left-0 w-full z-[9999] transition-all duration-300 ${
    scrolled
      ? "bg-white/70 backdrop-blur-md shadow-md py-2"
      : "bg-gradient-to-r from-purple-900/95 to-purple-800/95 py-4"
  }`;

  return (
    <header className={headerClasses}>
      <div className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold text-white transition hover:text-purple-200"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
              <div className="h-7 w-7 rounded-full bg-purple-900" />
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
                      className="rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 hover:text-purple-200"
                    >
                      {link.label}
                    </Link>
                  ))}
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-purple-100">
                  {email}
                </span>
                <form action="/api/auth/signout?redirect=/login" method="post">
                  <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-900 shadow-lg transition hover:bg-purple-100">
                    Salir
                  </button>
                </form>
              </nav>

              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white md:hidden"
                aria-label="Abrir menú"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
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
            className={`md:hidden ${
              mobileOpen ? "mt-4 grid gap-3 pb-4" : "hidden"
            }`}
          >
            {navigationLinks
              .filter((link) => !link.roles || (rol && link.roles.includes(rol)))
              .map((link) => (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-white/20"
                >
                  {link.label}
                </Link>
              ))}
            <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-purple-100">
              {email}
            </span>
            <form action="/api/auth/signout?redirect=/login" method="post">
              <button className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-purple-900 shadow-lg transition hover:bg-purple-100">
                Salir
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
