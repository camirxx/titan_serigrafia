'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = { fecha: string; num_ventas: number; total_vendido: number }

export default function VentasDiariasPage() {
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buscar = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      let query = supabase
        .from('ventas_diarias_view')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(365)

      if (desde) query = query.gte('fecha', desde)
      if (hasta) query = query.lte('fecha', hasta)

      const { data, error } = await query
      if (error) throw error
      setRows((data ?? []) as Row[])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al consultar ventas'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    buscar()
  }, [buscar])

  const exportCSV = () => {
    const header = ['fecha', 'ventas', 'total_vendido']
    const lines = rows.map((r) =>
      [
        new Date(r.fecha).toLocaleDateString(),
        r.num_ventas,
        r.total_vendido,
      ].join(',')
    )
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas_diarias.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPeriodo = rows.reduce((a, r) => a + Number(r.total_vendido || 0), 0)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 bg-white">
      <h1 className="text-2xl font-semibold">Ventas Diarias</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={buscar}
            className="w-full h-10 rounded bg-black text-white"
            disabled={loading}
          >
            {loading ? 'Buscando…' : 'Filtrar'}
          </button>
        </div>
        <div className="flex items-end">
          <button
            onClick={exportCSV}
            className="w-full h-10 rounded border"
            disabled={!rows.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Días</div>
          <div className="text-2xl font-semibold">{rows.length}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Total del período</div>
          <div className="text-2xl font-semibold">
            ${totalPeriodo.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-right p-2">N° Ventas</th>
              <th className="text-right p-2">Total vendido</th>
            </tr>
          </thead>
        </table>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{new Date(r.fecha).toLocaleDateString()}</td>
                <td className="p-2 text-right">{r.num_ventas}</td>
                <td className="p-2 text-right">
                  ${Number(r.total_vendido).toLocaleString()}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
