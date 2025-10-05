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

type CajaSesion = {
  sesion_id: number
  tienda_id: number
  usuario_id: string
  fecha_apertura: string
  saldo_inicial: number
  abierta: boolean
  ingresos: number
  egresos: number
  saldo_actual_calculado: number
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
  const [caja, setCaja] = useState<CajaSesion[]>([])
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

        // 3) Caja por sesión (filtra por tienda y por fecha de apertura)
        let q3 = supabase.from('v_dash_caja_sesiones').select('*')
        if (tiendaId !== '') q3 = q3.eq('tienda_id', tiendaId)
        if (from) q3 = q3.gte('fecha_apertura', from)
        if (to)   q3 = q3.lte('fecha_apertura', to)
        const r3 = await q3
        if (r3.error) throw r3.error
        setCaja((r3.data ?? []) as CajaSesion[])
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
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1">Tienda</label>
          <select
            className="border rounded p-2 min-w-52"
            value={tiendaId === '' ? '' : String(tiendaId)}
            onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Todas</option>
            {tiendas.map(t => <option key={t.id} value={t.id}>{t.id} · {t.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1">Desde</label>
          <input
            type="date"
            className="border rounded p-2"
            value={from}
            onChange={(e)=>setFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1">Hasta</label>
          <input
            type="date"
            className="border rounded p-2"
            value={to}
            onChange={(e)=>setTo(e.target.value)}
          />
        </div>

        <div className="text-xs text-neutral-500 ml-auto">
          {loading ? 'Cargando…' : 'Listo'}
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-300 text-red-700 p-2 rounded">{error}</div>}

      {/* 1) Ventas/Ganancia por semana */}
      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-medium mb-3">Ventas y ganancia por semana</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataSemanas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semanaLabel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="venta_total" name="Ventas" fillOpacity={0.3} />
              <Area type="monotone" dataKey="ganancia"   name="Ganancia" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 2) Top 20 diseños por unidades */}
      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-medium mb-3">Top diseños por unidades</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="diseno" hide /> {/* si hay muchos, ocultamos etiquetas */}
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="unidades" name="Unidades" />
              {/* Otra barra opcional: <Bar dataKey="venta_total" name="Ventas" /> */}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Etiquetas debajo, en 2 columnas, para lectura humana */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-3 text-sm">
          {top.map((t, i) => (
            <li key={i} className="truncate">• {t.diseno} — {t.unidades} u.</li>
          ))}
          {top.length === 0 && <li className="text-neutral-500">Sin datos.</li>}
        </ul>
      </section>

      {/* 3) Caja por sesión */}
      <section className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-medium mb-3">Caja por sesión</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Sesión</th>
                <th className="py-2 pr-3">Tienda</th>
                <th className="py-2 pr-3">Fecha apertura</th>
                <th className="py-2 pr-3">Saldo inicial</th>
                <th className="py-2 pr-3">Ingresos</th>
                <th className="py-2 pr-3">Egresos</th>
                <th className="py-2 pr-3">Saldo calc.</th>
                <th className="py-2 pr-3">Abierta</th>
              </tr>
            </thead>
            <tbody>
              {caja.map(row => (
                <tr key={row.sesion_id} className="border-b last:border-0">
                  <td className="py-2 pr-3">{row.sesion_id}</td>
                  <td className="py-2 pr-3">{row.tienda_id}</td>
                  <td className="py-2 pr-3">{new Date(row.fecha_apertura).toLocaleString()}</td>
                  <td className="py-2 pr-3">${row.saldo_inicial}</td>
                  <td className="py-2 pr-3 text-green-700">+${row.ingresos}</td>
                  <td className="py-2 pr-3 text-red-700">-${row.egresos}</td>
                  <td className="py-2 pr-3 font-medium">${row.saldo_actual_calculado}</td>
                  <td className="py-2 pr-3">{row.abierta ? 'Sí' : 'No'}</td>
                </tr>
              ))}
              {caja.length === 0 && (
                <tr><td className="py-2 text-neutral-500" colSpan={8}>Sin sesiones.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
