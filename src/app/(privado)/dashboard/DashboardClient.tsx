'use client' // Renderiza en el navegador (más simple para los charts)

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'

/** -----------------------
 *  Tipos de las vistas SQL
 *  ----------------------*/
type VentasSemana = {
  tienda_id: number
  semana: string        // ISO date (ej: "2025-09-01")
  venta_total: number
  costo_total: number
  ganancia: number
}

type TopDiseno = {
  tienda_id: number
  diseno: string
  unidades: number
  venta_total: number
}

type Tienda = { id: number; nombre: string }

export default function DashboardPage() {
  // Cliente de Supabase para el navegador
  const supabase = useMemo(() => supabaseBrowser(), [])

  // ---------------- Filtros ----------------
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [tiendaId, setTiendaId] = useState<number | ''>('') // '' = todas
  const [from, setFrom] = useState<string>('')               // yyyy-mm-dd
  const [to, setTo] = useState<string>('')                   // yyyy-mm-dd

  // ---------------- Estado de datasets ----------------
  const [semanas, setSemanas] = useState<VentasSemana[]>([])
  const [top, setTop] = useState<TopDiseno[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  /** Carga catálogo de tiendas (para el selector) */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id, nombre')
        .order('id', { ascending: true })
      if (!error) setTiendas((data ?? []) as Tienda[])
    })()
  }, [supabase])

  /** Cargar datos cuando cambian filtros */
  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        // 1) Ventas por semana (vista con tienda_id y campo semana::date)
        let q1 = supabase.from('v_dash_ventas_semana').select('*')
        if (tiendaId !== '') q1 = q1.eq('tienda_id', tiendaId)
        if (from) q1 = q1.gte('semana', from)
        if (to)   q1 = q1.lte('semana', to)
        const r1 = await q1
        if (r1.error) throw r1.error
        setSemanas((r1.data ?? []) as VentasSemana[])

        // 2) Top diseños (RPC con filtros por tienda y rango de fechas)
        const r2 = await supabase.rpc('top_disenos_rango', {
          p_tienda_id: tiendaId === '' ? null : Number(tiendaId),
          p_desde: from || null,
          p_hasta: to || null,
          p_limit: 20,
        })
        if (r2.error) throw r2.error
        setTop((r2.data ?? []) as TopDiseno[])
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error cargando el dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase, tiendaId, from, to])

  // Formateo de fechas para el eje X del gráfico semanal
  const dataSemanas = useMemo(
    () => semanas.map(s => ({
      ...s,
      semanaLabel: new Date(s.semana).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
    })),
    [semanas]
  )

  return (
    <div className="min-h-screen p-6">
      {/* Header estilo POS */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-white/80 text-sm mt-1">Análisis y métricas de rendimiento</p>
          </div>
        </div>
      </div>

      {/* Filtros con diseño moderno */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">🏪 Tienda</label>
            <select
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 bg-white"
              value={tiendaId === '' ? '' : String(tiendaId)}
              onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todas</option>
              {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Desde</label>
            <input
              type="date"
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              value={from}
              onChange={(e)=>setFrom(e.target.value)}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Hasta</label>
            <input
              type="date"
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              value={to}
              onChange={(e)=>setTo(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                <span className="text-sm font-medium text-indigo-600">Cargando...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Actualizado</span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl mb-8 flex items-center gap-3 animate-pulse">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 1) Ventas/Ganancia por semana */}
      <section className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Ventas y Ganancia</h2>
            <p className="text-sm text-gray-500">Evolución semanal</p>
          </div>
        </div>
        <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataSemanas}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="semanaLabel" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="venta_total" name="Ventas" stroke="#6366f1" strokeWidth={3} fill="url(#colorVentas)" />
              <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke="#10b981" strokeWidth={3} fill="url(#colorGanancia)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2) Top 20 diseños por unidades */}
      <section className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-pink-500 to-orange-600 p-3 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10M12 3v18m0-18c-1.5 0-3 1-4 2.5M12 3c1.5 0 3 1 4 2.5M8 5.5C6 7 5 9 5 11c0 3 2 5 4 6m8-6c0-2-1-4-3-5.5M17 11c0 2-1 4-3 5.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Top Diseños</h2>
            <p className="text-sm text-gray-500">Los más vendidos</p>
          </div>
        </div>
        <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="diseno" hide />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="unidades" name="Unidades" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Etiquetas en grid con diseño mejorado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {top.map((t, i) => (
            <div key={i} className="bg-gradient-to-r from-pink-50 to-orange-50 p-3 rounded-xl border border-pink-100 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{t.diseno}</p>
                  <p className="text-sm text-gray-600">{t.unidades} unidades</p>
                </div>
              </div>
            </div>
          ))}
          {top.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="font-medium">Sin datos disponibles</p>
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
