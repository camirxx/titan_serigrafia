'use client'

import { useRouter } from 'next/navigation'

const tiles = [
  {
    slug: 'ventas-producto',
    title: '📈 Ventas por Producto',
    desc: 'Ranking de productos más vendidos. Filtra por semana/mes/año.',
    cta: 'Ver ranking',
  },
  {
    slug: 'ventas-talla-color',
    title: '🛒 Ventas por Talla y Color',
    desc: 'Estadísticas por talla (S–XXXL) y color para ajustar producción.',
    cta: 'Ver tallas/colores',
  },
  {
    slug: 'stock',
    title: '📦 Estado del Stock',
    desc: 'Stock en tiempo real con alertas de stock crítico.',
    cta: 'Ver stock',
  },
  {
    slug: 'ingresos',
    title: '💰 Ingresos y Tendencias',
    desc: 'Evolución de ingresos y comparación por períodos.',
    cta: 'Ver tendencias',
  },
  {
    slug: 'exportes',
    title: '📊 Reportes y Exportación',
    desc: 'Descarga CSV/Excel con ventas, stock y tendencias.',
    cta: 'Generar reportes',
  },
]

export default function ReportesHubPage() {
  const router = useRouter()
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Reportes</h1>
      <p className="text-sm text-gray-600 mb-6">Selecciona un reporte para analizar tu operación.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <button
            key={t.slug}
            onClick={() => router.push(`/reportes/${t.slug}`)}
            className="text-left rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition"
          >
            <div className="text-lg font-semibold mb-1">{t.title}</div>
            <div className="text-sm text-gray-600 mb-4">{t.desc}</div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-black">
              {t.cta} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
