'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = {
  variante_id: number
  producto_nombre: string
  variante_nombre: string
  movimiento_id: number
  fecha: string
  tipo: string
  referencia: string | null
  entrada: number
  salida: number
  saldo: number
}

export default function KardexPage() {
  const [varianteId, setVarianteId] = useState<number | ''>('')
  const [desde, setDesde] = useState<string>('')
  const [hasta, setHasta] = useState<string>('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    setError(null)
    setLoading(true)
    try {
      let query = supabase.from('kardex_view').select('*').order('fecha', { ascending: true }).limit(1000)
      if (varianteId) query = query.eq('variante_id', varianteId)
      if (desde) query = query.gte('fecha', desde)
      if (hasta) query = query.lte('fecha', hasta)
      const { data, error } = await query
      if (error) throw error
      setRows((data ?? []) as Row[])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al buscar movimientos'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { /* opcional: autoload */ }, [])

  const exportCSV = () => {
    const header = ['fecha','producto','variante','tipo','referencia','entrada','salida','saldo']
    const lines = rows.map(r => [
      new Date(r.fecha).toLocaleString(),
      r.producto_nombre,
      r.variante_nombre,
      r.tipo,
      r.referencia ?? '',
      r.entrada,
      r.salida,
      r.saldo
    ].join(','))
    const blob = new Blob([header.join(',')+'\n'+lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kardex_${varianteId || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 bg-white">
      <h1 className="text-2xl font-semibold">Kardex (Historial de Stock)</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-sm font-medium">Variante ID</label>
          <input type="number" className="mt-1 w-full border rounded px-3 py-2"
                 value={varianteId} onChange={e => setVarianteId(e.target.value ? Number(e.target.value) : '')}
                 placeholder="Ej: 10" />
        </div>
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                 value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                 value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={buscar} disabled={loading} className="w-full h-10 rounded bg-black text-white">
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        <div className="flex items-end">
          <button onClick={exportCSV} disabled={!rows.length} className="w-full h-10 rounded border">
            Exportar CSV
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Producto</th>
              <th className="text-left p-2">Variante</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Ref</th>
              <th className="text-right p-2">Entrada</th>
              <th className="text-right p-2">Salida</th>
              <th className="text-right p-2">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.movimiento_id} className="border-t">
                <td className="p-2">{new Date(r.fecha).toLocaleString()}</td>
                <td className="p-2">{r.producto_nombre}</td>
                <td className="p-2">{r.variante_nombre}</td>
                <td className="p-2">{r.tipo}</td>
                <td className="p-2">{r.referencia ?? ''}</td>
                <td className="p-2 text-right">{r.entrada}</td>
                <td className="p-2 text-right">{r.salida}</td>
                <td className="p-2 text-right">{r.saldo}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td className="p-3 text-center text-gray-500" colSpan={8}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
