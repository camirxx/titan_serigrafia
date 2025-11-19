// src/app/HomeClient.tsx 
'use client';

import { useRouter } from 'next/navigation';

interface HomeClientProps {
  userRole: 'admin' | 'vendedor' | 'desarrollador';
}

export default function HomeClient({ userRole }: HomeClientProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isAdmin = userRole === 'admin' || userRole === 'desarrollador';

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute inset-0">
          <div className="absolute left-1/4 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-indigo-400/60 to-transparent" />
          <div className="absolute left-[42%] top-0 h-full w-20 -skew-x-12 transform bg-gradient-to-b from-purple-500/50 to-transparent" />
          <div className="absolute right-1/4 top-0 h-full w-28 -skew-x-12 transform bg-gradient-to-b from-pink-400/60 to-transparent" />
        </div>
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-12">
        <section className="rounded-3xl bg-white/85 p-6 shadow-2xl backdrop-blur-md sm:p-10">
          <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Panel principal</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Accesos rápidos</h1>
              <p className="text-sm text-slate-500">Explora las secciones clave del sistema desde una sola vista.</p>
            </div>
          </header>

          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 ${
              isAdmin ? 'lg:grid-cols-3' : ''
            }`}
          >
            <button
              onClick={() => handleNavigation('/pos')}
              className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-6xl sm:text-7xl">💰</div>
                <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                  Punto de Venta
                </h3>
                <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                  Registra ventas y gestiona cobros en tiempo real.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleNavigation('/inventario')}
              className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-6xl sm:text-7xl">📦</div>
                <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                  Inventario
                </h3>
                <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                  Controla stock, variaciones y movimientos de productos.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleNavigation('/devoluciones')}
              className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-6xl sm:text-7xl">🔄</div>
                <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                  Devoluciones
                </h3>
                <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                  Gestiona cambios, reembolsos y movimientos asociados.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleNavigation('/dashboard')}
              className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
            >
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="text-6xl sm:text-7xl">📊</div>
                <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                  Dashboard
                </h3>
                <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                  Visualiza el desempeño general y métricas clave.
                </p>
              </div>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleNavigation('/reportes')}
                className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
              >
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="text-6xl sm:text-7xl">📈</div>
                  <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                    Reportes
                  </h3>
                  <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                    Analiza resultados y exporta información detallada.
                  </p>
                </div>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleNavigation('/trabajadores')}
                className="group min-h-[170px] rounded-2xl border-2 border-slate-200 bg-white/90 p-6 text-slate-800 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/80 hover:shadow-xl sm:min-h-[210px] sm:p-10"
              >
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <div className="text-6xl sm:text-7xl">👥</div>
                  <h3 className="text-xl font-bold tracking-wide text-slate-800 group-hover:text-indigo-600 sm:text-2xl">
                    Trabajadores
                  </h3>
                  <p className="text-center text-sm text-slate-500 group-hover:text-indigo-600/90">
                    Administra roles, permisos y disponibilidad del equipo.
                  </p>
                </div>
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
