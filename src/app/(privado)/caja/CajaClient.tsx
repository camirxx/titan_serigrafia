// src/app/caja/CajaClient.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient' // ajusta este import si tu helper se llama distinto

type Sesion = {
  id: number
  tienda_id: number
  usuario_id: string
  fecha_apertura: string
  saldo_inicial: number
  fecha_cierre: string | null
  saldo_final: number | null
  abierta: boolean
}

type Movimiento = {
  id: number
  fecha: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
  venta_id: number | null
  usuario_id: string
  sesion_id: number
}

export default function CajaClient() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [tiendaId, setTiendaId] = useState<number | ''>('') // si solo usas 1 tienda, puedes fijar 1
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Formularios
  const [saldoInicial, setSaldoInicial] = useState<number>(0)
  const [retiroMonto, setRetiroMonto] = useState<number>(0)
  const [retiroConcepto, setRetiroConcepto] = useState<string>('retiro')

  // Carga sesión y movimientos
  const load = useCallback(
    async (tid: number) => {
      setLoading(true)
      setError(null)
      setOk(null)
      try {
        // Sesión abierta de la tienda
        const { data: sesiones, error: e1 } = await supabase
          .from('v_caja_sesion_abierta')
          .select('*')
          .eq('tienda_id', tid)
          .limit(1)

        if (e1) throw e1
        const s = (sesiones ?? [])[0] as Sesion | undefined
        setSesion(s ?? null)

        if (s) {
          const { data: mvs, error: e2 } = await supabase
            .from('caja_movimientos')
            .select('id,fecha,tipo,concepto,monto,venta_id,usuario_id,sesion_id')
            .eq('sesion_id', s.id)
            .order('fecha', { ascending: false })
            .limit(500)

          if (e2) throw e2
          setMovs((mvs ?? []) as Movimiento[])
        } else {
          setMovs([])
        }
      } catch (e: unknown) {
        if (e instanceof Error) setError(e.message ?? 'Error cargando caja')
        else setError('Error cargando caja')
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    if (tiendaId !== '') {
      void load(Number(tiendaId))
    }
  }, [tiendaId, load])

  const abrir = async () => {
    setError(null)
    setOk(null)
    if (tiendaId === '') {
      setError('Selecciona la tienda')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('caja_abrir', {
        p_tienda_id: Number(tiendaId),
        p_saldo_inicial: Number(saldoInicial || 0),
      })
      if (error) throw error
      setOk(`✅ Caja abierta (sesión #${data as number})`)
      await load(Number(tiendaId))
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? 'Error al abrir caja')
      else setError('Error al abrir caja')
    } finally {
      setLoading(false)
    }
  }

  const cerrar = async () => {
    setError(null)
    setOk(null)
    if (!sesion) {
      setError('No hay sesión abierta')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.rpc('caja_cerrar', { p_sesion_id: sesion.id })
      if (error) throw error
      setOk('✅ Caja cerrada')
      await load(Number(tiendaId))
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? 'Error al cerrar caja')
      else setError('Error al cerrar caja')
    } finally {
      setLoading(false)
    }
  }

  const retiro = async () => {
    setError(null)
    setOk(null)
    if (!sesion) {
      setError('Abre la caja primero')
      return
    }
    if (retiroMonto <= 0) {
      setError('Monto de retiro debe ser > 0')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.rpc('caja_retiro', {
        p_sesion_id: sesion.id,
        p_monto: Number(retiroMonto),
        p_concepto: retiroConcepto || 'retiro',
      })
      if (error) throw error
      setOk('✅ Retiro registrado')
      setRetiroMonto(0)
      setRetiroConcepto('retiro')
      await load(Number(tiendaId))
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message ?? 'Error registrando retiro')
      else setError('Error registrando retiro')
    } finally {
      setLoading(false)
    }
  }

  const ingresos = movs
    .filter((m) => m.tipo === 'ingreso')
    .reduce((s, m) => s + Number(m.monto || 0), 0)
  const egresos = movs
    .filter((m) => m.tipo === 'egreso')
    .reduce((s, m) => s + Number(m.monto || 0), 0)
  const saldoActual = (sesion?.saldo_inicial ?? 0) + ingresos - egresos

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Caja</h1>
      {error && <div className="bg-red-100 border border-red-300 text-red-700 p-2 rounded">{error}</div>}
      {ok && <div className="bg-green-100 border border-green-300 text-green-700 p-2 rounded">{ok}</div>}
      {loading && <div className="text-sm opacity-70">Procesando…</div>}

      <div className="bg-white p-3 rounded-xl shadow flex items-center gap-2">
        <select
          className="border rounded p-2"
          value={tiendaId === '' ? '' : String(tiendaId)}
          onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">Selecciona tienda…</option>
          <option value="1">1 · Titan Serigrafía</option>
          {/* Cárgalo de DB si manejas varias */}
        </select>

        {!sesion ? (
          <>
            <input
              type="number"
              className="border rounded p-2 w-40"
              placeholder="Saldo inicial"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(Number(e.target.value || 0))}
            />
            <button className="bg-black text-white rounded px-3 py-2" onClick={abrir}>
              Abrir caja
            </button>
          </>
        ) : (
          <>
            <div className="text-sm px-2">
              Sesión <b>#{sesion.id}</b> · Abierta desde {new Date(sesion.fecha_apertura).toLocaleString()}
            </div>
            <div className="ml-auto text-sm">
              Saldo inicial: <b>${Number(sesion.saldo_inicial || 0).toFixed(0)}</b> ·{' '}
              Ingresos: <b>${ingresos.toFixed(0)}</b> · Egresos: <b>${egresos.toFixed(0)}</b>{' '}
              <span className="ml-2">
                Saldo actual: <b>${saldoActual.toFixed(0)}</b>
              </span>
            </div>
            <button className="border rounded px-3 py-2 ml-2" onClick={cerrar}>
              Cerrar caja
            </button>
          </>
        )}
      </div>

      {sesion && (
        <div className="bg-white p-3 rounded-xl shadow">
          <h2 className="font-medium mb-2">Registrar retiro</h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="border rounded p-2 w-40"
              placeholder="Monto"
              value={retiroMonto}
              onChange={(e) => setRetiroMonto(Number(e.target.value || 0))}
            />
            <input
              className="border rounded p-2 w-80"
              placeholder="Concepto"
              value={retiroConcepto}
              onChange={(e) => setRetiroConcepto(e.target.value)}
            />
            <button className="border rounded px-3 py-2" onClick={retiro}>
              Agregar egreso
            </button>
          </div>
        </div>
      )}

      {sesion && (
        <div className="bg-white p-3 rounded-xl shadow overflow-auto">
          <h2 className="font-medium mb-2">Movimientos de la sesión</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Concepto</th>
                <th className="py-2 pr-3">Venta</th>
                <th className="py-2 pr-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">{new Date(m.fecha).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{m.concepto}</td>
                  <td className="py-2 pr-3">{m.venta_id ?? '—'}</td>
                  <td className="py-2 pr-3 font-medium">${Number(m.monto || 0).toFixed(0)}</td>
                </tr>
              ))}
              {movs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-neutral-500">
                    Sin movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
