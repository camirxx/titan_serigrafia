'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const tiles = [
  { slug: 'ventas-producto',    title: '📈 Ventas por Producto',    desc: 'Ranking de productos más vendidos. Filtra por semana/mes/año.', cta: 'Ver ranking' },
  { slug: 'ventas-talla-color', title: '🛒 Ventas por Talla y Color', desc: 'Estadísticas por talla (S–XXXL) y color para ajustar producción.', cta: 'Ver tallas/colores' },
  { slug: 'stock',              title: '📦 Estado del Stock',         desc: 'Stock en tiempo real con alertas de stock crítico.', cta: 'Ver stock' },
  { slug: 'ingresos',           title: '💰 Ingresos y Tendencias',    desc: 'Evolución de ingresos y comparación por períodos.', cta: 'Ver tendencias' },
  { slug: 'exportes',           title: '📊 Reportes y Exportación',   desc: 'Descarga CSV/Excel con ventas, stock y tendencias.', cta: 'Generar reportes' },
];

export default function ReportesHubPage() {
  const router = useRouter();
  const [fecha, setFecha] = useState('');
  const [hora, setHora]   = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setFecha(now.toLocaleDateString('es-CL', { year:'numeric', month:'long', day:'numeric' }));
      setHora (now.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Bandas diagonales */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute inset-0">
          <div className="absolute left-1/5 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent" />
          <div className="absolute left-1/3 top-0 h-full w-24 -skew-x-12 transform bg-gradient-to-b from-green-500 to-transparent" />
          <div className="absolute right-1/4 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header estilo Inventario */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between rounded-[28px] bg-gradient-to-r from-indigo-700 via-purple-700 to-violet-700 p-4 text-white shadow-2xl sm:p-6">
            <button
              onClick={() => router.back()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 sm:h-14 sm:w-14"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-xl">‹</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold drop-shadow-lg">Reportes</h1>
              <p className="mt-1 text-sm text-white/80">{fecha} · {hora}</p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg sm:h-16 sm:w-16">
              <div className="h-8 w-8 rounded-full bg-purple-900 sm:h-12 sm:w-12" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tiles.map((t) => (
            <button
              key={t.slug}
              onClick={() => router.push(`/reportes/${t.slug}`)}
              className="group rounded-2xl border-2 border-white/20 bg-white/90 p-5 text-left shadow-xl
                         backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300
                         focus:outline-none focus:ring-2 focus:ring-purple-400/40"
            >
              <div className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-purple-700">
                {t.title}
              </div>
              <div className="mb-4 text-sm text-gray-600">{t.desc}</div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 group-hover:underline">
                {t.cta} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
