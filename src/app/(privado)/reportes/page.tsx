'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const tiles = [
  { 
    slug: 'ventas-producto', 
    title: '📈 Ventas por Producto', 
    desc: 'Ranking de productos más vendidos. Filtra por semana/mes/año.', 
    cta: 'Ver ranking',
    color: 'purple'
  },
  { 
    slug: 'ventas-talla-color', 
    title: '🛒 Ventas por Talla y Color', 
    desc: 'Estadísticas por talla (S–XXXL) y color para ajustar producción.', 
    cta: 'Ver tallas/colores',
    color: 'pink'
  },
  { 
    slug: 'devoluciones', 
    title: '↩️ Devoluciones y Cambios', 
    desc: 'Análisis completo de devoluciones, cambios y productos más devueltos.', 
    cta: 'Ver devoluciones',
    color: 'red'
  },
  { 
    slug: 'stock', 
    title: '📦 Estado del Stock', 
    desc: 'Stock en tiempo real con alertas de stock crítico.', 
    cta: 'Ver stock',
    color: 'blue'
  },
  { 
    slug: 'ingresos', 
    title: '💰 Ingresos y Tendencias', 
    desc: 'Evolución de ingresos y comparación por períodos.', 
    cta: 'Ver tendencias',
    color: 'green'
  },

];

const colorClasses = {
  purple: 'hover:border-purple-300 focus:ring-purple-400/40 group-hover:text-purple-700 text-purple-700',
  pink: 'hover:border-pink-300 focus:ring-pink-400/40 group-hover:text-pink-700 text-pink-700',
  red: 'hover:border-red-300 focus:ring-red-400/40 group-hover:text-red-700 text-red-700',
  blue: 'hover:border-blue-300 focus:ring-blue-400/40 group-hover:text-blue-700 text-blue-700',
  green: 'hover:border-green-300 focus:ring-green-400/40 group-hover:text-green-700 text-green-700',
  indigo: 'hover:border-indigo-300 focus:ring-indigo-400/40 group-hover:text-indigo-700 text-indigo-700',
};

export default function ReportesHubPage() {
  const router = useRouter();
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setFecha(now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }));
      setHora(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header estilo POS */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Reportes</h1>
            <p className="text-white/80 text-sm mt-1">
              {fecha} · {hora}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de reportes */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.slug}
            onClick={() => router.push(`/reportes/${t.slug}`)}
            className={`group rounded-2xl border-2 border-white/20 bg-white/90 p-5 text-left shadow-xl
                       backdrop-blur transition-all hover:-translate-y-0.5
                       focus:outline-none focus:ring-2 ${colorClasses[t.color as keyof typeof colorClasses]}`}
          >
            <div className="mb-1 text-lg font-semibold text-gray-900 group-hover:opacity-90">
              {t.title}
            </div>
            <div className="mb-4 text-sm text-gray-600">{t.desc}</div>
            <span className={`inline-flex items-center gap-2 text-sm font-semibold group-hover:underline ${
              t.color === 'purple' ? 'text-purple-700' :
              t.color === 'pink' ? 'text-pink-700' :
              t.color === 'red' ? 'text-red-700' :
              t.color === 'blue' ? 'text-blue-700' :
              t.color === 'green' ? 'text-green-700' :
              'text-indigo-700'
            }`}>
              {t.cta} →
            </span>
          </button>
          ))}
        </div>

       
    </div>
  );
}