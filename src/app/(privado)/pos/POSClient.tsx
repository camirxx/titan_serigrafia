"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { ChevronLeft, Check } from 'lucide-react'

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback

type Venta = {
  id: number
  fecha: string
  total: number
  metodo_pago: string
  diseno: string
  tipo_prenda: string
  color: string
  talla: string
}

type MetodoPago = 'efectivo' | 'debito' | 'credito' | 'transferencia'

export default function POSModerno() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  
  const [paso, setPaso] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalDia, setTotalDia] = useState(0)
  const [totalEfectivo, setTotalEfectivo] = useState(0)
  
  const [tipos, setTipos] = useState<string[]>([])
  const [disenos, setDisenos] = useState<string[]>([])
  const [colores, setColores] = useState<string[]>([])
  const [tallas, setTallas] = useState<Array<{talla: string, variante_id: number, stock: number}>>([])
  
  const [tipoSel, setTipoSel] = useState('')
  const [disenoSel, setDisenoSel] = useState('')
  const [colorSel, setColorSel] = useState('')
  const [tallaSel, setTallaSel] = useState<{talla: string, variante_id: number, stock: number} | null>(null)
  const [precio, setPrecio] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  
  const [billetes, setBilletes] = useState({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  })

  useEffect(() => {
    cargarVentasDelDia()
  }, [])

  const cargarVentasDelDia = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error: err } = await supabase
        .from('ventas')
        .select(`id, fecha, total, metodo_pago, detalle_ventas!inner(variante_id)`)
        .gte('fecha', `${hoy}T00:00:00`)
        .lte('fecha', `${hoy}T23:59:59`)
        .order('fecha', { ascending: false })

      if (err) throw err

      const ventasProcesadas: Venta[] = []
      let total = 0
      let totalEf = 0

      for (const v of data || []) {
        const detalles = Array.isArray(v.detalle_ventas) ? v.detalle_ventas : [v.detalle_ventas]
        const varianteId = detalles[0]?.variante_id

        if (varianteId) {
          const { data: varData } = await supabase
            .from('variantes_admin_view')
            .select('diseno, tipo_prenda, color, talla')
            .eq('variante_id', varianteId)
            .single()

          if (varData) {
            ventasProcesadas.push({
              id: v.id,
              fecha: v.fecha,
              total: v.total,
              metodo_pago: v.metodo_pago,
              diseno: varData.diseno || '',
              tipo_prenda: varData.tipo_prenda || '',
              color: varData.color || '',
              talla: varData.talla || ''
            })
            total += Number(v.total)
            if (v.metodo_pago === 'efectivo') {
              totalEf += Number(v.total)
            }
          }
        }
      }

      setVentas(ventasProcesadas)
      setTotalDia(total)
      setTotalEfectivo(totalEf)
    } catch (err: unknown) {
      console.error(err)
      setError(getErrorMessage(err, 'Error al cargar ventas del día'))
    }
  }

  const iniciarVenta = async () => {
    setPaso(1)
    setError(null)
    try {
      const { data } = await supabase
        .from('variantes_admin_view')
        .select('tipo_prenda')
        .eq('producto_activo', true)
        .gt('stock_actual', 0)

      const tiposUnicos = [...new Set(data?.map(d => d.tipo_prenda).filter(Boolean))]
      setTipos(tiposUnicos)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al iniciar la venta'))
    }
  }

  const seleccionarTipo = async (tipo: string) => {
    setTipoSel(tipo)
    try {
      const { data } = await supabase
        .from('variantes_admin_view')
        .select('diseno')
        .eq('producto_activo', true)
        .eq('tipo_prenda', tipo)
        .gt('stock_actual', 0)

      const disenosUnicos = [...new Set(data?.map(d => d.diseno).filter(Boolean))]
      setDisenos(disenosUnicos)
      setPaso(2)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al cargar diseños disponibles'))
    }
  }

  const seleccionarDiseno = async (diseno: string) => {
    setDisenoSel(diseno)
    setError(null)
    try {
      const { data } = await supabase
        .from('variantes_admin_view')
        .select('color')
        .eq('producto_activo', true)
        .eq('tipo_prenda', tipoSel)
        .eq('diseno', diseno)
        .gt('stock_actual', 0)

      const coloresUnicos = [...new Set(data?.map(d => d.color).filter(Boolean))]
      
      if (coloresUnicos.length === 0) {
        setError('No hay colores disponibles para este diseño')
        return
      }
      
      if (coloresUnicos.length === 1) {
        await seleccionarColor(coloresUnicos[0])
      } else {
        setColores(coloresUnicos)
        setPaso(3)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al cargar colores disponibles'))
    }
  }

  const seleccionarColor = async (color: string) => {
    setColorSel(color)
    try {
      const { data } = await supabase
        .from('variantes_admin_view')
        .select('talla, variante_id, stock_actual')
        .eq('producto_activo', true)
        .eq('tipo_prenda', tipoSel)
        .eq('diseno', disenoSel)
        .eq('color', color)
        .gt('stock_actual', 0)
        .order('talla')

      const tallasData = data?.map(d => ({
        talla: d.talla || '',
        variante_id: d.variante_id,
        stock: d.stock_actual || 0
      })) || []

      setTallas(tallasData)
      setPaso(4)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al cargar tallas disponibles'))
    }
  }

  const seleccionarTalla = (talla: {talla: string, variante_id: number, stock: number}) => {
    setTallaSel(talla)
    setPaso(5)
  }

  const continuarAPago = () => {
    if (!precio || parseFloat(precio) <= 0) {
      setError('Ingresa un precio válido')
      return
    }
    if (metodo === 'efectivo') {
      setPaso(6)
    } else {
      registrarVenta()
    }
  }

  const registrarVenta = async () => {
    if (!tallaSel) return

    setLoading(true)
    setError(null)

    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const payload = {
        vendedor_id: userData.user?.id,
        metodo_pago: metodo,
        items: [{
          variante_id: tallaSel.variante_id,
          cantidad: 1,
          precio_unitario: parseFloat(precio)
        }]
      }

      const { error: err } = await supabase.rpc('crear_venta_simple', { p: payload })
      if (err) throw err

      resetearFormulario()
      await cargarVentasDelDia()
      setPaso(0)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al registrar venta'))
    } finally {
      setLoading(false)
    }
  }

  const resetearFormulario = () => {
    setTipoSel('')
    setDisenoSel('')
    setColorSel('')
    setTallaSel(null)
    setPrecio('')
    setMetodo('efectivo')
    setBilletes({ '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0 })
    setError(null)
  }

  const calcularTotalBilletes = () => {
    return Object.entries(billetes).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    )
  }

  if (paso === 0) {
    return (
      <div className="min-h-screen relative">
        <Header />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <tr>
                    <th className="p-4 text-left font-bold">#</th>
                    <th className="p-4 text-left font-bold">NOMBRE</th>
                    <th className="p-4 text-left font-bold">COLOR</th>
                    <th className="p-4 text-left font-bold">TALLA</th>
                    <th className="p-4 text-left font-bold">PRECIO</th>
                    <th className="p-4 text-left font-bold">PAGO</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta, idx) => (
                    <tr key={venta.id} className="border-b hover:bg-purple-50 transition">
                      <td className="p-4 font-bold text-purple-900">{idx + 1}</td>
                      <td className="p-4 font-semibold">{venta.diseno}</td>
                      <td className="p-4">{venta.color}</td>
                      <td className="p-4 font-bold">{venta.talla}</td>
                      <td className="p-4 font-bold text-green-600">${venta.total.toLocaleString()}</td>
                      <td className="p-4 uppercase text-sm">{venta.metodo_pago}</td>
                    </tr>
                  ))}
                  {ventas.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay ventas hoy</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-t-2 border-purple-200">
              <button onClick={iniciarVenta} className="flex-1 py-4 bg-white text-purple-900 text-lg font-bold rounded-xl border-2 border-purple-300 hover:shadow-lg transition">
                NUEVA VENTA
              </button>
            </div>
          </div>

          <PanelCaja totalEfectivo={totalEfectivo} totalDia={totalDia} ventas={ventas.length} />
        </div>
      </div>
    )
  }

  if (paso === 2) {
    return (
      <div className="min-h-screen relative">
        <Header />
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 max-w-3xl mx-auto">{error}</div>}

        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Selecciona el DISEÑO</h2>
          </div>

          <div className="max-h-[500px] overflow-y-auto border-2 border-purple-300 rounded-xl">
            {disenos.map((diseno, idx) => (
              <button
                key={idx}
                onClick={() => seleccionarDiseno(diseno)}
                className="w-full text-left px-6 py-5 hover:bg-purple-50 transition border-b border-gray-200 last:border-0 group"
              >
                <div className="font-bold text-2xl text-gray-900 group-hover:text-purple-700 transition">
                  {diseno}
                </div>
                <div className="text-base text-gray-600 mt-1">{tipoSel}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (paso >= 1 && paso <= 4 && paso !== 2) {
    const opciones = paso === 1 ? tipos : paso === 3 ? colores : []
    const titulo = paso === 1 ? 'Selecciona el TIPO' : paso === 3 ? 'Selecciona el COLOR' : 'Selecciona la TALLA'
    const accion = paso === 1 ? seleccionarTipo : paso === 3 ? seleccionarColor : () => {}

    return (
      <div className="min-h-screen relative">
        <Header />
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 max-w-4xl mx-auto">{error}</div>}

        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(paso === 1 ? 0 : paso - 1)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
          </div>

          {paso < 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {opciones.length > 0 ? opciones.map((opcion, idx) => (
                <button
                  key={idx}
                  onClick={() => accion(opcion)}
                  className="p-8 text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                >
                  {opcion}
                </button>
              )) : (
                <div className="col-span-2 p-8 text-center text-gray-500">
                  No hay opciones disponibles
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {tallas.length > 0 ? tallas.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => seleccionarTalla(t)}
                  className="p-8 border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                >
                  <div className="text-4xl font-bold text-purple-900 mb-2">{t.talla}</div>
                  <div className="text-sm text-gray-600">Stock: {t.stock}</div>
                </button>
              )) : (
                <div className="col-span-3 p-8 text-center text-gray-500">
                  No hay tallas disponibles
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (paso === 5) {
    return (
      <div className="min-h-screen relative">
        <Header />
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 max-w-2xl mx-auto">{error}</div>}

        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(4)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Confirmar Venta</h2>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div><span className="text-purple-700 font-semibold">Tipo:</span> <span className="font-bold">{tipoSel}</span></div>
              <div><span className="text-purple-700 font-semibold">Talla:</span> <span className="font-bold">{tallaSel?.talla}</span></div>
              <div><span className="text-purple-700 font-semibold">Diseño:</span> <span className="font-bold">{disenoSel}</span></div>
              <div><span className="text-purple-700 font-semibold">Color:</span> <span className="font-bold">{colorSel}</span></div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">Precio *</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="13000"
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">Método de Pago *</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
              >
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            <button
              onClick={continuarAPago}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xl font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Procesando...' : metodo === 'efectivo' ? 'Siguiente' : 'Confirmar Venta'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (paso === 6) {
    const totalBilletes = calcularTotalBilletes()
    const precioNum = parseFloat(precio)
    const faltante = precioNum - totalBilletes

    return (
      <div className="min-h-screen relative">
        <Header />

        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(5)} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Desglose de Pago en Efectivo</h2>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <div className="text-lg font-bold text-blue-900">Total a pagar: ${precioNum.toLocaleString()}</div>
          </div>

          <div className="space-y-3 mb-6">
            {Object.keys(billetes).reverse().map((denom) => (
              <div key={denom} className="flex items-center gap-4">
                <span className="font-bold text-lg text-gray-700 w-28">${parseInt(denom).toLocaleString()}</span>
                <input
                  type="number"
                  min="0"
                  value={billetes[denom as keyof typeof billetes]}
                  onChange={(e) => setBilletes(prev => ({ ...prev, [denom]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-24 px-3 py-2 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <span className="text-gray-600">= ${(parseInt(denom) * billetes[denom as keyof typeof billetes]).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl mb-6 ${faltante > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
            <div className="text-lg font-bold">Total ingresado: ${totalBilletes.toLocaleString()}</div>
            {faltante > 0 && <div className="text-red-700 font-semibold">Falta: ${faltante.toLocaleString()}</div>}
            {faltante < 0 && <div className="text-green-700 font-semibold">Vuelto: ${Math.abs(faltante).toLocaleString()}</div>}
            {faltante === 0 && <div className="text-green-700 font-semibold flex items-center gap-2"><Check className="w-5 h-5" /> Monto exacto</div>}
          </div>

          <button
            onClick={registrarVenta}
            disabled={loading || faltante > 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xl font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

function Header() {
  return (
    <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-purple-600 p-6">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative flex items-center justify-between">
        <button onClick={() => window.history.back()} className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Ventas del día</h1>
          <p className="text-white/80 text-sm mt-1">
            {new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })} · {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
          <div className="w-12 h-12 bg-purple-900 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

function PanelCaja({ totalEfectivo, totalDia, ventas }: { totalEfectivo: number, totalDia: number, ventas: number }) {
  const calcularDenominaciones = () => {
    const denoms = [20000, 10000, 5000, 2000, 1000, 500, 100]
    const resultado: Record<number, number> = {}
    
    let restante = totalEfectivo
    for (const denom of denoms) {
      resultado[denom] = Math.floor(restante / denom)
      restante = restante % denom
    }
    
    return resultado
  }

  const denominaciones = calcularDenominaciones()

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Dinero en caja (efectivo)</h3>
        <div className="space-y-2">
          {Object.entries(denominaciones).reverse().map(([denom, cant]) => (
            <div key={denom} className="flex justify-between items-center py-2 border-b">
              <span className="font-semibold text-gray-700">${parseInt(denom).toLocaleString()}</span>
              <span className="text-2xl font-bold text-purple-900">{cant}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t-2 border-purple-200">
          <div className="text-sm text-gray-600 mb-1">Total efectivo</div>
          <div className="text-4xl font-bold text-purple-900">${totalEfectivo.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-2">Total del día</h3>
        <div className="text-6xl font-bold mb-4">${totalDia.toLocaleString()}</div>
        <div className="text-lg opacity-90">{ventas} ventas realizadas</div>
      </div>
    </div>
  )
}
