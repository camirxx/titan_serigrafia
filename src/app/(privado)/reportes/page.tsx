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
    slug: 'ingresos', 
    title: '💰 Ingresos y Tendencias', 
    desc: 'Evolución de ingresos y comparación por períodos.', 
    cta: 'Ver tendencias',
    color: 'green'
  },

];

const colorClasses = {
  purple: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white hover:border-purple-200 focus:ring-2 focus:ring-purple-100',
  pink: 'border-pink-100 bg-gradient-to-br from-pink-50 to-white hover:border-pink-200 focus:ring-2 focus:ring-pink-100',
  red: 'border-red-100 bg-gradient-to-br from-red-50 to-white hover:border-red-200 focus:ring-2 focus:ring-red-100',
  blue: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:border-blue-200 focus:ring-2 focus:ring-blue-100',
  green: 'border-green-100 bg-gradient-to-br from-green-50 to-white hover:border-green-200 focus:ring-2 focus:ring-green-100',
  indigo: 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white hover:border-indigo-200 focus:ring-2 focus:ring-indigo-100',
};

const textColors = {
  purple: 'text-purple-700',
  pink: 'text-pink-700',
  red: 'text-red-700',
  blue: 'text-blue-700',
  green: 'text-green-700',
  indigo: 'text-indigo-700',
};

const iconBackgrounds = {
  purple: 'bg-purple-100 text-purple-600',
  pink: 'bg-pink-100 text-pink-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  indigo: 'bg-indigo-100 text-indigo-600',
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tiles.map((t) => {
          // Extraer el emoji del título
          const emoji = t.title.match(/^[\p{Emoji}\p{Emoji_Modifier}]+/u)?.[0] || '📊';
          const titleWithoutEmoji = t.title.replace(/^[\p{Emoji}\p{Emoji_Modifier}\s]+/u, '').trim();
          
          return (
          <div key={t.slug} className="group relative">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r opacity-70 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
            <button
              onClick={() => router.push(`/reportes/${t.slug}`)}
              className={`relative flex h-full w-full flex-col rounded-2xl border p-6 text-left transition-all duration-200 
                         hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2
                         ${colorClasses[t.color as keyof typeof colorClasses]}`}
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${iconBackgrounds[t.color as keyof typeof iconBackgrounds]}`}>
                {emoji}
              </div>
              <h3 className={`mb-2 text-xl font-bold ${textColors[t.color as keyof typeof textColors]}`}>
                {titleWithoutEmoji}
              </h3>
              <p className="mb-6 text-sm text-gray-600">
                {t.desc}
              </p>
              <div className="mt-auto">
                <span className={`inline-flex items-center text-sm font-medium ${textColors[t.color as keyof typeof textColors]} group-hover:underline`}>
                  {t.cta}
                  <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </button>
          </div>
        )})}
      
      </div>

       
    </div>
  );
}