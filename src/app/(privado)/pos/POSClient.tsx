"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { ChevronLeft, Check, AlertCircle } from 'lucide-react'

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const anyErr = err as { message?: string; details?: string; hint?: string }
    const parts = [anyErr.message, anyErr.details, anyErr.hint].filter(Boolean)
    return parts.join(' · ') || fallback
  }
  return fallback
}

type Venta = {
  id: number
  fecha: string
  total: number
  metodo_pago: string
  diseno: string
  tipo_prenda: string
  color: string
  talla: string
  numero_boleta: string | null
}

type MetodoPago = 'efectivo' | 'debito' | 'credito' | 'transferencia'

type DatosTalla = {
  variante_id: number
  talla: string | null
  stock_actual: number | null
}

export default function POSModerno() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  
  const [paso, setPaso] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [ventas, setVentas] = useState<Venta[]>([])
  const [totalDia, setTotalDia] = useState(0)
  const [saldoInicialCaja, setSaldoInicialCaja] = useState(0)
  const [sesionCajaId, setSesionCajaId] = useState<number | null>(null)
  // const [tiendaId, setTiendaId] = useState<number | null>(null) // Eliminado por no usarse
  
  const [tipos, setTipos] = useState<string[]>([])
  const [disenos, setDisenos] = useState<string[]>([])
  const [colores, setColores] = useState<string[]>([])
  const [tallas, setTallas] = useState<Array<{talla: string, variante_id: number, stock: number}>>([])
  const [busquedaDiseno, setBusquedaDiseno] = useState('')
  
  const [tipoSel, setTipoSel] = useState('')
  const [disenoSel, setDisenoSel] = useState('')
  const [colorSel, setColorSel] = useState('')
  const [tallaSel, setTallaSel] = useState<{talla: string, variante_id: number, stock: number} | null>(null)
  const [precio, setPrecio] = useState('')
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [numeroBoleta, setNumeroBoleta] = useState('')
  
  const [billetes, setBilletes] = useState({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  })

  // Estado para los billetes del vuelto (change)
  const [billetesVuelto, setBilletesVuelto] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  })

  // Estado para la fecha seleccionada (por defecto hoy)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  // Función para formatear números de forma consistente
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }
<<<<<<< HEAD
=======
  
  // --- FUNCIÓN CRÍTICA DE RECARGA DE INVENTARIO (NUEVA) ---
  const cargarInventarioPOS = useCallback(async () => {
      if (!tiendaId) return false;
      
      setError(null);
      
      try {
        console.log('🔍 Recargando variantes para POS, tienda:', tiendaId)
        
        const { data, error } = await supabase
          .from('variantes_admin_view')
          .select('tipo_prenda, stock_actual')
          .eq('tienda_id', tiendaId)
          .eq('producto_activo', true)
          // Mostrar todos los productos activos, incluso sin stock
          .not('stock_actual', 'is', null)

        if (error) throw error

        const tiposUnicos = [...new Set(data?.map(d => d.tipo_prenda).filter(Boolean))]
        setTipos(tiposUnicos)
        
        if (tiposUnicos.length === 0) {
          setError('No hay productos disponibles con stock en tu tienda')
          return false
        }
        
        return true
      } catch (err: unknown) {
        console.error('💥 Error completo en cargarInventarioPOS:', err)
        setError(getErrorMessage(err, 'Error al cargar el inventario del POS.'))
        return false
      }
  }, [tiendaId, supabase])
  // -----------------------------------------------------------------

>>>>>>> parent of f3d2605 (UPDATE de POS)
  useEffect(() => {
    void cargarVentasDelDia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada])

  useEffect(() => {
    void cargarSesionCaja()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sesionCajaId) {
      void cargarDenominacionesCaja()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionCajaId])

  // Recargar tallas cuando se vuelve al paso 4 (para actualizar stock después de ventas)
  useEffect(() => {
    if (paso === 4 && colorSel && tipoSel && disenoSel) {
      void cargarTallasDisponibles(colorSel).then(tallasData => {
        if (tallasData.length > 0) {
          setTallas(tallasData)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso])

const [denominacionesReales, setDenominacionesReales] = useState<Record<number, number>>({})

const cargarDenominacionesCaja = async () => {
  if (!sesionCajaId) return
  
  try {
    const { data, error } = await supabase.rpc('caja_obtener_denominaciones', {
      p_sesion_id: sesionCajaId
    })
    
    if (error) throw error
    
    const denoms: Record<number, number> = {}
    data?.forEach((d: { denominacion: number; cantidad: number }) => {
      denoms[d.denominacion] = d.cantidad
    })
    
    setDenominacionesReales(denoms)
  } catch (err) {
    console.error('Error cargando denominaciones:', err)
  }
}
  

const cargarVentasDelDia = async () => {
  try {
    const { data, error: err } = await supabase
      .from('ventas')
      .select(`id, fecha, total, metodo_pago, numero_boleta, detalle_ventas!inner(variante_id)`)
      .gte('fecha', `${fechaSeleccionada}T00:00:00`)
      .lte('fecha', `${fechaSeleccionada}T23:59:59`)
      .order('fecha', { ascending: false })

    if (err) throw err

    const ventasProcesadas: Venta[] = []
    let total = 0

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
            talla: varData.talla || '',
            numero_boleta: v.numero_boleta || null
          })
          total += Number(v.total)
        }
      }
    }

    setVentas(ventasProcesadas)
    setTotalDia(total)
  } catch (err: unknown) {
    console.error(err)
    setError(getErrorMessage(err, 'Error al cargar ventas del día'))
  }
}
  const cargarSesionCaja = async () => {
    try {
      const { data: u } = await supabase.auth.getUser()
      const uid = u.user?.id
      if (!uid) return
      
      const { data: usr, error: eUsr } = await supabase
        .from('usuarios')
        .select('tienda_id')
        .eq('id', uid)
        .maybeSingle()
      if (eUsr) throw eUsr
      
      const tId = usr?.tienda_id as number | null
      setTiendaId(tId ?? null)
      
      if (!tId) return
      
      const { data: ses, error: eSes } = await supabase
        .from('v_caja_sesion_abierta')
        .select('id, saldo_inicial')
        .eq('tienda_id', tId)
        .maybeSingle()
      
      if (eSes) throw eSes
      
      setSesionCajaId(ses?.id ?? null)
      setSaldoInicialCaja(Number(ses?.saldo_inicial || 0))
    } catch (err) {
      console.warn('No se pudo cargar sesión de caja', err)
      setSesionCajaId(null)
      setSaldoInicialCaja(0)
    }
  }

  const registrarIngresoCaja = async (denominaciones: Record<string, number>, concepto: string) => {
    if (!sesionCajaId) { setError('Abre la caja antes de registrar ingresos'); return }
    setError(null); setLoading(true)
    try {
      // Convertir las claves de string a number para el JSON
      const denomsJSON: Record<number, number> = {}
      Object.entries(denominaciones).forEach(([key, value]) => {
        if (value > 0) {
          denomsJSON[parseInt(key)] = value
        }
      })
      
      const { error } = await supabase.rpc('caja_agregar_denominaciones', {
        p_sesion_id: sesionCajaId,
        p_denominaciones: denomsJSON,
        p_concepto: concepto || 'Ingreso manual',
      })
      if (error) {
        console.error('Error RPC:', error)
        throw error
      }
      
      await cargarVentasDelDia()
      await cargarDenominacionesCaja()
    } catch (err: unknown) {
      console.error('Error completo:', err)
      setError(getErrorMessage(err, 'Error registrando ingreso en caja'))
    } finally {
      setLoading(false)
    }
  }
  
  const registrarEgresoCaja = async (denominaciones: Record<string, number>, concepto: string) => {
    if (!sesionCajaId) { setError('Abre la caja antes de registrar egresos'); return }
    setError(null); setLoading(true)
    try {
      // Calcular total del egreso
      const totalEgreso = Object.entries(denominaciones).reduce((sum, [denom, cant]) =>
        sum + (parseInt(denom) * cant), 0
      );

      const { error } = await supabase.rpc('caja_retirar_denominaciones', {
        p_sesion_id: sesionCajaId,
        p_denominaciones: denominaciones,
        p_concepto: concepto || 'retiro',
      })
      if (error) {
        console.error('Error RPC:', error)
        throw error
      }

      // Enviar email de notificación de egreso
      console.log('💸 Enviando email de egreso por retiro de efectivo:', totalEgreso);
      try {
        await fetch('/api/send-caja-egreso-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            monto: totalEgreso,
            motivo: concepto || 'Retiro manual de efectivo',
            usuario: 'Usuario del POS', // Podríamos obtener el nombre real del usuario
          }),
        });
        console.log('✅ Email de egreso enviado exitosamente');
      } catch (emailError) {
        console.error('❌ Error al enviar email de egreso:', emailError);
        // No fallar la operación si el email falla
      }

      await cargarVentasDelDia()
      await cargarDenominacionesCaja()
    } catch (err: unknown) {
      console.error('Error completo:', err)
      setError(getErrorMessage(err, 'Error registrando egreso en caja'))
    } finally {
      setLoading(false)
    }
  }

  const iniciarVenta = async () => {
    if (!tiendaId) {
      setError('No se pudo determinar tu tienda. Verifica tu usuario.')
      return
    }
    
    setError(null)
    
    // 🎯 REEMPLAZO DE LA LÓGICA DE CARGA DIRECTA
    const success = await cargarInventarioPOS(); 
    
    if (success) {
      setPaso(1) // Avanza solo si se encontraron productos
    } else {
      setPaso(0) // Se queda en la vista principal si no hay stock
    }
  }
  // -----------------------------------------------------------------

  const seleccionarDiseno = async (diseno: string) => {
    setDisenoSel(diseno)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('variantes_admin_view')
        .select('color, stock_actual')
        .eq('tipo_prenda', tipoSel)
        .eq('diseno', diseno)
        .eq('tienda_id', tiendaId as number)
        .eq('producto_activo', true)
        // Mostrar todos los colores, incluso sin stock
        .not('stock_actual', 'is', null)

      if (error) throw error

      const coloresUnicos = [...new Set(data?.map(d => d.color).filter(Boolean))]
      
      if (coloresUnicos.length === 0) {
        setError('No hay colores disponibles para este diseño')
        return
      }
      
      setColores(coloresUnicos)
      setPaso(3)
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar colores disponibles'))
    }
  }
  const seleccionarTipo = async (tipo: string) => {
    setTipoSel(tipo)
    try {
      const { data, error } = await supabase
        .from('variantes_admin_view')
        .select('diseno, stock_actual')
        .eq('tipo_prenda', tipo)
        .eq('tienda_id', tiendaId as number)
        .eq('producto_activo', true)
        .gt('stock_actual', 0)
        .not('stock_actual', 'is', null)

      if (error) throw error

      const disenosUnicos = [...new Set(data?.map(d => d.diseno).filter(Boolean))]
      
      if (disenosUnicos.length === 0) {
        setError('No hay diseños disponibles para este tipo de prenda')
        return
      }
      
      setDisenos(disenosUnicos)
      setBusquedaDiseno('')
      setPaso(2)
<<<<<<< HEAD
    } catch (err: unknown) {
=======
    } catch (err) {
>>>>>>> parent of f3d2605 (UPDATE de POS)
      setError(getErrorMessage(err, 'Error al cargar diseños disponibles'))
    }
  }

  const seleccionarColor = async (color: string) => {
    setColorSel(color)
    try {
      const { data, error } = await supabase
        .from('variantes_admin_view')
        .select('variante_id, talla, stock_actual')
        .eq('tipo_prenda', tipoSel)
        .eq('diseno', disenoSel)
        .eq('color', color)
        .eq('tienda_id', 1)
        .eq('producto_activo', true)
        .gt('stock_actual', 0)
        .order('talla')

      if (error) throw error

      const tallasData = data?.map((d: DatosTalla) => ({
        talla: d.talla || '',
        variante_id: d.variante_id,
        stock: d.stock_actual || 0
      })) || []

      if (tallasData.length === 0) {
        setError('No hay tallas disponibles con stock para este color')
        return []
      }

      return tallasData
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al cargar tallas disponibles'))
      return []
    }
  }



  const seleccionarTalla = (talla: {talla: string, variante_id: number, stock: number}) => {
    if (talla.stock <= 0) {
      setError('Esta talla no tiene stock disponible')
      return
    }
    setTallaSel(talla)
    setPaso(5)
  }

  const continuarAPago = () => {
    if (!precio || parseFloat(precio) <= 0) {
      setError('Ingresa un precio válido')
      return
    }
    
    // Si es débito o crédito, validar número de boleta
    if ((metodo === 'debito' || metodo === 'credito') && !numeroBoleta.trim()) {
      setError('Debes ingresar el número de boleta para pagos con tarjeta')
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
      // Verificación de stock en tiempo real
      const { data: varCheck, error: eVar } = await supabase
        .from('variantes')
        .select('stock_actual')
        .eq('id', tallaSel.variante_id)
        .single()
      
      if (eVar) throw eVar
      
      const stockNow = Number(varCheck?.stock_actual ?? 0)
      if (stockNow <= 0) {
        setError('⚠️ Sin stock disponible para esta talla. El stock se agotó.')
        setLoading(false)
        return
      }

      const { data: userData } = await supabase.auth.getUser()
      
      const payload = {
        vendedor_id: userData.user?.id,
        metodo_pago: metodo,
        numero_boleta: (metodo === 'debito' || metodo === 'credito') ? numeroBoleta : null,
        items: [{
          variante_id: tallaSel.variante_id,
          cantidad: 1,
          precio_unitario: parseFloat(precio)
        }]
      }

      const { error: err } = await supabase.rpc('crear_venta_simple', { p: payload })
      if (err) throw err

      // Si es pago en efectivo, registrar el ingreso de los billetes del cliente
      if (metodo === 'efectivo' && Object.values(billetes).some(cant => cant > 0)) {
        await registrarIngresoCaja(billetes, `Ingreso venta - ${tipoSel} ${disenoSel} ${colorSel} ${tallaSel.talla}`)
      }

      // Si hay vuelto que entregar, registrar el egreso de caja
      const precioNum = parseFloat(precio)
      const totalBilletes = calcularTotalBilletes()
      const faltante = precioNum - totalBilletes

      if (faltante < 0 && Object.values(billetesVuelto).some(cant => cant > 0)) {
        await registrarEgresoCaja(billetesVuelto, `Vuelto venta - ${tipoSel} ${disenoSel} ${colorSel} ${tallaSel.talla}`)
      }

      resetearFormulario()
      await cargarVentasDelDia()
      await cargarSesionCaja()
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
    setNumeroBoleta('')
    setBilletes({ '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0 })
    setBilletesVuelto({ '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0 })
    setError(null)
  }

  const calcularTotalBilletes = () => {
    return Object.entries(billetes).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    )
  }

  if (paso === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Header 
          fechaSeleccionada={fechaSeleccionada} 
          setFechaSeleccionada={setFechaSeleccionada}
          onNuevaVenta={iniciarVenta}
          sesionCajaId={sesionCajaId}
        />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Registro de Ventas
              </h2>
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">#</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Categoría</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Diseño</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Color</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Talla</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Precio</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">Pago</th>
                    <th className="p-4 text-left font-bold text-gray-700 border-b-2 border-indigo-200">N° Boleta</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta, idx) => (
                    <tr key={venta.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group">
                      <td className="p-4 font-bold text-indigo-600">{idx + 1}</td>
                      <td className="p-4 text-gray-700 font-medium">{venta.tipo_prenda}</td>
                      <td className="p-4 font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{venta.diseno}</td>
                      <td className="p-4 text-gray-700">{venta.color}</td>
                      <td className="p-4 font-bold text-gray-800">{venta.talla}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-bold rounded-lg">
                          ${formatNumber(venta.total)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded uppercase">
                          {venta.metodo_pago}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {venta.numero_boleta || (venta.metodo_pago === 'efectivo' ? 'Efectivo' : '-')}
                      </td>
                    </tr>
                  ))}
                  {ventas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-lg font-semibold">No hay ventas hoy</span>
                          <span className="text-sm">Las ventas aparecerán aquí</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <PanelCaja
          saldoInicial={saldoInicialCaja}
          totalDia={totalDia}
          ventas={ventas.length}
          sesionAbierta={Boolean(sesionCajaId)}
          denominacionesReales={denominacionesReales}
          onIngresar={registrarIngresoCaja}
          onRetirar={registrarEgresoCaja}
        />
        </div>
      </div>
    )
  }

  if (paso === 2) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Header fechaSeleccionada={fechaSeleccionada} setFechaSeleccionada={setFechaSeleccionada} />
        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg animate-pulse max-w-3xl mx-auto mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(1)} className="p-2 hover:bg-indigo-50 rounded-xl transition">
              <ChevronLeft className="w-6 h-6 text-indigo-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Selecciona el Diseño</h2>
              <p className="text-sm text-gray-600 mt-1">Busca y selecciona el diseño que deseas vender</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={busquedaDiseno}
                onChange={(e) => setBusquedaDiseno(e.target.value)}
                placeholder="Buscar diseño..."
                className="w-full px-4 py-3 pl-12 text-base border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto border-2 border-gray-200 rounded-xl">
            {disenos
              .filter(d => d.toLowerCase().includes(busquedaDiseno.toLowerCase()))
              .map((diseno, idx) => (
              <button
                key={idx}
                onClick={() => seleccionarDiseno(diseno)}
                className="w-full text-left px-6 py-5 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-200 last:border-0 group"
              >
                <div className="font-bold text-xl text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {diseno}
                </div>
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                    {tipoSel}
                  </span>
                </div>
              </button>
            ))}
            {disenos.filter(d => d.toLowerCase().includes(busquedaDiseno.toLowerCase())).length === 0 && (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-lg font-semibold">No se encontraron diseños</span>
                  <span className="text-sm">Intenta con otro término de búsqueda</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (paso >= 1 && paso <= 4 && paso !== 2) {
    const opciones = paso === 1 ? tipos : paso === 3 ? colores : []
    const titulo = paso === 1 ? 'Selecciona el Tipo' : paso === 3 ? 'Selecciona el Color' : 'Selecciona la Talla'
    const accion = paso === 1 ? seleccionarTipo : paso === 3 ? seleccionarColor : () => {}

    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Header fechaSeleccionada={fechaSeleccionada} setFechaSeleccionada={setFechaSeleccionada} />
        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg animate-pulse max-w-4xl mx-auto mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(paso === 1 ? 0 : paso - 1)} className="p-2 hover:bg-indigo-50 rounded-xl transition">
              <ChevronLeft className="w-6 h-6 text-indigo-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
              <p className="text-sm text-gray-600 mt-1">Selecciona una opción para continuar</p>
            </div>
          </div>

          {paso < 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {opciones.length > 0 ? opciones.map((opcion, idx) => (
                <button
                  key={idx}
                  onClick={() => accion(opcion)}
                  className="p-8 text-xl font-bold text-gray-900 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {opcion}
                </button>
              )) : (
                <div className="col-span-2 p-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-semibold">No hay opciones disponibles</span>
                    <span className="text-sm">Verifica el stock de tus productos</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {tallas.length > 0 ? tallas.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => seleccionarTalla(t)}
                  disabled={t.stock <= 0}
                  className="p-6 border-2 border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white shadow-sm hover:shadow-md"
                >
                  <div className="text-4xl font-bold text-indigo-600 mb-2">{t.talla}</div>
                  <div className={`text-sm font-semibold ${t.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Stock: {t.stock}
                  </div>
                </button>
              )) : (
                <div className="col-span-3 p-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-semibold">No hay tallas disponibles con stock</span>
                    <span className="text-sm">Este producto no tiene stock disponible</span>
                  </div>
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Header fechaSeleccionada={fechaSeleccionada} setFechaSeleccionada={setFechaSeleccionada} />
        {error && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg animate-pulse max-w-3xl mx-auto mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(4)} className="p-2 hover:bg-indigo-50 rounded-xl transition">
              <ChevronLeft className="w-6 h-6 text-indigo-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Confirmar Venta</h2>
              <p className="text-sm text-gray-600 mt-1">Verifica la información de la venta</p>
            </div>
          </div>

          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div><span className="text-indigo-700 font-semibold">Tipo:</span> <span className="font-bold">{tipoSel}</span></div>
              <div><span className="text-indigo-700 font-semibold">Talla:</span> <span className="font-bold">{tallaSel?.talla}</span></div>
              <div><span className="text-indigo-700 font-semibold">Diseño:</span> <span className="font-bold">{disenoSel}</span></div>
              <div><span className="text-indigo-700 font-semibold">Color:</span> <span className="font-bold">{colorSel}</span></div>
            </div>
            {tallaSel && (
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <span className="text-indigo-700 font-semibold">Stock disponible:</span> 
                <span className={`ml-2 font-bold ${tallaSel.stock > 5 ? 'text-green-600' : 'text-orange-600'}`}>
                  {tallaSel.stock} unidad{tallaSel.stock !== 1 ? 'es' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">Precio *</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="13000"
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">Método de Pago *</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none bg-white"
              >
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>

            {/* Campo de número de boleta para débito/crédito */}
            {(metodo === 'debito' || metodo === 'credito') && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                <label className="block text-base font-bold text-gray-800 mb-2">
                  Número de Boleta *
                </label>
                <input
                  type="text"
                  value={numeroBoleta}
                  onChange={(e) => setNumeroBoleta(e.target.value)}
                  placeholder="Ingresa el número de boleta"
                  className="w-full px-4 py-4 text-lg border-2 border-yellow-400 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                />
                <p className="text-sm text-yellow-700 mt-2">
                  ⚠️ Obligatorio para pagos con tarjeta
                </p>
              </div>
            )}

            <button
              onClick={continuarAPago}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Header fechaSeleccionada={fechaSeleccionada} setFechaSeleccionada={setFechaSeleccionada} />

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-8 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setPaso(5)} className="p-2 hover:bg-indigo-50 rounded-xl transition">
              <ChevronLeft className="w-6 h-6 text-indigo-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Desglose de Pago en Efectivo</h2>
              <p className="text-sm text-gray-600 mt-1">Verifica el monto ingresado</p>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <div className="text-lg font-bold text-blue-900">Total a pagar: ${formatNumber(precioNum)}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Columna izquierda: Dinero que recibe */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">💵</span>
                Dinero recibido del cliente
              </h3>
              <div className="space-y-3">
                {Object.keys(billetes).reverse().map((denom) => (
                  <div key={denom} className="flex items-center gap-4">
                    <span className="font-bold text-lg text-gray-700 w-28">${formatNumber(parseInt(denom))}</span>
                    <input
                      type="number"
                      min="0"
                      value={billetes[denom as keyof typeof billetes]}
                      onChange={(e) => setBilletes(prev => ({ ...prev, [denom]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-24 px-3 py-2 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    />
                    <span className="text-gray-600">= ${formatNumber(parseInt(denom) * billetes[denom as keyof typeof billetes])}</span>
                  </div>
                ))}
              </div>

              <div className={`p-4 rounded-xl mt-6 ${faltante > 0 ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <div className="text-lg font-bold">Total ingresado: ${formatNumber(totalBilletes)}</div>
                {faltante > 0 && <div className="text-red-700 font-semibold">Falta: ${formatNumber(faltante)}</div>}
                {faltante < 0 && <div className="text-orange-700 font-semibold text-xl">⚠️ Vuelto a entregar: ${formatNumber(Math.abs(faltante))}</div>}
                {faltante === 0 && <div className="text-green-700 font-semibold flex items-center gap-2"><Check className="w-5 h-5" /> Monto exacto</div>}
              </div>
            </div>

            {/* Columna derecha: Vuelto a entregar (solo si hay vuelto) */}
            {faltante < 0 && (
              <VueltoSelector
                vuelto={Math.abs(faltante)}
                denominacionesDisponibles={denominacionesReales}
                billetesVuelto={billetesVuelto}
                onBilletesChange={setBilletesVuelto}
              />
            )}
          </div>

          <button
            onClick={registrarVenta}
            disabled={loading || faltante > 0 || (faltante < 0 && (() => {
              const totalVueltoSeleccionado = Object.entries(billetesVuelto).reduce((sum, [denom, cant]) => 
                sum + (parseInt(denom) * cant), 0
              )
              return Math.abs(totalVueltoSeleccionado - Math.abs(faltante)) > 0.01
            })())}
            className="w-full py-4 mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 
             faltante > 0 ? 'Falta dinero por ingresar' :
             (faltante < 0 && (() => {
               const totalVueltoSeleccionado = Object.entries(billetesVuelto).reduce((sum, [denom, cant]) => 
                 sum + (parseInt(denom) * cant), 0
               )
               return Math.abs(totalVueltoSeleccionado - Math.abs(faltante)) > 0.01
             })()) ? 'Completa el vuelto exacto' :
             'Confirmar Venta'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

function VueltoSelector({ 
  vuelto, 
  denominacionesDisponibles, 
  billetesVuelto, 
  onBilletesChange 
}: { 
  vuelto: number
  denominacionesDisponibles: Record<number, number>
  billetesVuelto: Record<string, number>
  onBilletesChange: React.Dispatch<React.SetStateAction<Record<string, number>>>
}) {
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const calcularTotalVueltoSeleccionado = () => {
    return Object.entries(billetesVuelto).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    )
  }

  const totalSeleccionado = calcularTotalVueltoSeleccionado()
  const restante = vuelto - totalSeleccionado

  return (
    <div className="min-w-0">
      <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <span className="text-xl sm:text-2xl flex-shrink-0">💰</span>
        <span className="truncate">Vuelto a entregar</span>
      </h3>

      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="text-sm sm:text-lg font-bold text-orange-900 truncate">Vuelto requerido: ${formatNumber(vuelto)}</div>
        <div className={`text-xs sm:text-sm font-semibold mt-1 ${totalSeleccionado === vuelto ? 'text-green-600' : restante > 0 ? 'text-red-600' : 'text-blue-600'}`}>
          {totalSeleccionado === vuelto ? '✓ Exacto' : restante > 0 ? `Faltan: ${formatNumber(restante)}` : `Exceso: ${formatNumber(Math.abs(restante))}`}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {Object.keys(billetesVuelto).reverse().map((denom) => {
          const cantidad = billetesVuelto[denom as keyof typeof billetesVuelto]
          const disponible = denominacionesDisponibles[parseInt(denom)] || 0
          const subtotal = parseInt(denom) * cantidad

          return (
            <div key={denom} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="font-bold text-gray-700 flex-shrink-0">${formatNumber(parseInt(denom))}</span>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nuevaCantidad = Math.max(0, cantidad - 1)
                    onBilletesChange({ 
                      ...billetesVuelto, 
                      [denom]: nuevaCantidad 
                    })
                  }}
                  className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm sm:text-lg transition"
                  disabled={cantidad <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max={disponible}
                  value={cantidad}
                  onChange={(e) => {
                    const valor = Math.max(0, Math.min(parseInt(e.target.value) || 0, disponible))
                    onBilletesChange({ 
                      ...billetesVuelto, 
                      [denom]: valor 
                    })
                  }}
                  className="w-12 sm:w-16 px-1 sm:px-2 py-1 text-center text-xs sm:text-sm font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nuevaCantidad = Math.min(cantidad + 1, disponible)
                    onBilletesChange({ 
                      ...billetesVuelto, 
                      [denom]: nuevaCantidad 
                    })
                  }}
                  className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-bold text-sm sm:text-lg transition"
                  disabled={cantidad >= disponible}
                >
                  +
                </button>
              </div>
              <span className="text-gray-600 text-xs sm:text-sm flex-shrink-0">
                Disp: {disponible}
              </span>
              <span className="text-gray-600 text-xs sm:text-sm">= ${formatNumber(subtotal)}</span>
            </div>
          )
        })}
      </div>

      <div className={`p-2 sm:p-3 rounded-xl mt-3 sm:mt-4 ${totalSeleccionado === vuelto ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
        <div className="text-sm sm:text-lg font-bold truncate">Total: ${formatNumber(totalSeleccionado)}</div>
      </div>
    </div>
  )
}

function Header({ 
  fechaSeleccionada, 
  setFechaSeleccionada,
  onNuevaVenta,
  sesionCajaId
}: { 
  fechaSeleccionada: string
  setFechaSeleccionada: (fecha: string) => void
  onNuevaVenta?: () => void
  sesionCajaId?: number | null
}) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Ventas del día</h1>
          <p className="text-white/80 text-sm mt-1">
            {(() => {
              const [year, month, day] = fechaSeleccionada.split('-').map(Number);
              const fecha = new Date(year, month - 1, day);
              return fecha.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
            })()} · {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {/* Botón Nueva Venta */}
        {onNuevaVenta && (
          <button
            onClick={onNuevaVenta}
            disabled={!sesionCajaId}
            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nueva Venta</span>
          </button>
        )}
        
        {/* Selector de fecha */}
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>
    </div>
  )
}

function PanelCaja({ 
  saldoInicial,
  totalDia, 
  ventas, 
  sesionAbierta, 
  denominacionesReales,
  onIngresar, 
  onRetirar
}: { 
  saldoInicial: number
  totalDia: number
  ventas: number
  sesionAbierta?: boolean
  denominacionesReales: Record<number, number>
  onIngresar?: (denominaciones: Record<string, number>, concepto: string) => void
  onRetirar?: (denominaciones: Record<string, number>, concepto: string) => void 
}) {
  const [modalIngreso, setModalIngreso] = useState(false)
  const [modalRetiro, setModalRetiro] = useState(false)
  
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }
  
  // Calcular total desde las denominaciones REALES
  const calcularTotalReal = () => {
    return Object.entries(denominacionesReales).reduce((sum, [denom, cant]) => {
      return sum + (parseInt(denom) * cant)
    }, 0)
  }
  
  const efectivoTotal = calcularTotalReal() + saldoInicial

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Dinero en caja (efectivo)</h3>
          {!sesionAbierta && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              ⚠️ No hay sesión de caja abierta.
            </div>
          )}
          
          {sesionAbierta && saldoInicial > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700 font-medium">Saldo inicial de caja</div>
              <div className="text-2xl font-bold text-blue-900">${formatNumber(saldoInicial)}</div>
            </div>
          )}
          
          {/* Mostrar DENOMINACIONES REALES */}
          <div className="space-y-2">
            {[20000, 10000, 5000, 2000, 1000, 500, 100].map(denom => {
              const cantidad = denominacionesReales[denom] || 0
              return (
                <div key={denom} className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold text-gray-700">${formatNumber(denom)}</span>
                  <span className="text-2xl font-bold text-purple-900">{cantidad}</span>
                </div>
              )
            })}
          </div>
          
          <div className="mt-6 pt-6 border-t-2 border-purple-200">
            <div className="text-sm text-gray-600 mb-1">Total efectivo en caja</div>
            <div className="text-4xl font-bold text-purple-900">${formatNumber(efectivoTotal)}</div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              disabled={!sesionAbierta}
              onClick={() => setModalIngreso(true)}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold disabled:opacity-50 hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <span className="text-2xl">💰</span>
              <span>Ingresar</span>
            </button>
            <button 
              disabled={!sesionAbierta}
              onClick={() => setModalRetiro(true)}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold disabled:opacity-50 hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <span className="text-2xl">💸</span>
              <span>Retirar</span>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Total del día</h3>
          <div className="text-6xl font-bold mb-4">${formatNumber(totalDia)}</div>
          <div className="text-lg opacity-90">{ventas} ventas realizadas</div>
        </div>
      </div>

      {modalIngreso && (
        <ModalMovimientoCaja
          tipo="ingreso"
          onClose={() => setModalIngreso(false)}
          onConfirmar={(denominaciones, concepto) => {
            if (onIngresar) {
              onIngresar(denominaciones, concepto);
            }
            setModalIngreso(false);
          }}
        />
      )}


      {modalRetiro && (
        <ModalMovimientoCaja
          tipo="retiro"
          denominacionesActuales={denominacionesReales}
          onClose={() => setModalRetiro(false)}
          onConfirmar={(denominaciones, concepto) => {
            onRetirar?.(denominaciones, concepto);
            setModalRetiro(false);
          }}
        />
      )}
    </>
  )
}

// Modal UNIFICADO para ingreso Y retiro
function ModalMovimientoCaja({
  tipo,
  denominacionesActuales = {},
  onClose,
  onConfirmar
}: {
  tipo: 'ingreso' | 'retiro'
  denominacionesActuales?: Record<number, number>
  onClose: () => void
  onConfirmar: (denominaciones: Record<string, number>, concepto: string) => void
}) {
  const [concepto, setConcepto] = useState(tipo === 'ingreso' ? 'Ingreso manual' : 'Retiro de caja')
  const [billetes, setBilletes] = useState({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  })

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const calcularTotal = () => {
    return Object.entries(billetes).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    )
  }

  const total = calcularTotal()

  const handleConfirmar = () => {
    if (total <= 0) {
      alert('Debe ingresar un monto mayor a 0')
      return
    }
    if (!concepto.trim()) {
      alert('Debe ingresar un concepto')
      return
    }
    
    // Para RETIRO: validar que no saque más de lo que hay
    if (tipo === 'retiro') {
      for (const [denom, cantRetiro] of Object.entries(billetes)) {
        const cantDisponible = denominacionesActuales[parseInt(denom)] || 0
        if (cantRetiro > cantDisponible) {
          alert(`No puedes retirar ${cantRetiro} billetes de $${formatNumber(parseInt(denom))}. Solo hay ${cantDisponible} disponibles.`)
          return
        }
      }
    }
    
    onConfirmar(billetes, concepto)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mejorado con gradiente y diseño moderno */}
        <div className={`relative overflow-hidden rounded-t-2xl ${tipo === 'ingreso' ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600' : 'bg-gradient-to-br from-red-500 via-rose-600 to-pink-600'}`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="relative px-6 py-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${tipo === 'ingreso' ? 'bg-white/20' : 'bg-white/20'} backdrop-blur-sm flex items-center justify-center`}>
                  <span className="text-4xl leading-none">{tipo === 'ingreso' ? '💰' : '💸'}</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {tipo === 'ingreso' ? 'Ingresar Dinero' : 'Retirar Dinero'}
                  </h2>
                  <p className="text-white/90 text-sm mt-0.5">
                    {tipo === 'ingreso' ? 'Especifica los billetes que agregas a la caja' : 'Especifica los billetes que retiras de la caja'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 text-white hover:rotate-90 transform"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido del modal con scroll */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Campo de concepto mejorado */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Concepto del movimiento *
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={tipo === 'ingreso' ? 'Ej: Fondo de caja inicial, Venta externa...' : 'Ej: Compra de insumos, Pago a proveedor...'}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 outline-none"
            />
          </div>

          {/* Desglose de billetes mejorado */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                <svg className={`w-4 h-4 ${tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Desglose de billetes y monedas</span>
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 space-y-1.5 border-2 border-gray-200">
              {Object.keys(billetes).reverse().map((denom) => {
                const cantidad = billetes[denom as keyof typeof billetes]
                const disponible = denominacionesActuales[parseInt(denom)] || 0
                const subtotal = parseInt(denom) * cantidad
                const isLowStock = tipo === 'retiro' && disponible <= 3 && disponible > 0
                
                return (
                  <div key={denom} className={`flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm hover:shadow transition-all duration-200 border ${cantidad > 0 ? (tipo === 'ingreso' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-gray-200'}`}>
                    <div className="min-w-[100px]">
                      <div className="font-bold text-base text-gray-800 flex items-center gap-1">
                        <span className="text-lg">{parseInt(denom) === 100 || parseInt(denom) === 500 ? '🪙' : '💵'}</span>
                        ${formatNumber(parseInt(denom))}
                      </div>
                      {tipo === 'retiro' && (
                        <div className={`text-[10px] font-semibold ${isLowStock ? 'text-orange-600' : 'text-gray-500'}`}>
                          {isLowStock && '⚠️ '} Disp: {disponible}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBilletes(prev => ({ 
                          ...prev, 
                          [denom]: Math.max(0, prev[denom as keyof typeof billetes] - 1) 
                        }))}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-lg transition-all duration-200 ${
                          tipo === 'ingreso' 
                            ? 'bg-green-100 hover:bg-green-200 text-green-700 active:scale-95' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 active:scale-95'
                        }`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={tipo === 'retiro' ? disponible : undefined}
                        value={cantidad}
                        onChange={(e) => {
                          const valor = parseInt(e.target.value) || 0
                          const maximo = tipo === 'retiro' ? disponible : 9999
                          setBilletes(prev => ({ 
                            ...prev, 
                            [denom]: Math.max(0, Math.min(valor, maximo))
                          }))
                        }}
                        className="w-16 px-2 py-1.5 text-center text-base font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const maximo = tipo === 'retiro' ? disponible : 9999
                          setBilletes(prev => ({ 
                            ...prev, 
                            [denom]: Math.min(prev[denom as keyof typeof billetes] + 1, maximo)
                          }))
                        }}
                        disabled={tipo === 'retiro' && cantidad >= disponible}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                          tipo === 'ingreso' 
                            ? 'bg-green-100 hover:bg-green-200 text-green-700 active:scale-95' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 active:scale-95'
                        }`}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1 text-right">
                      <span className={`text-base font-bold ${subtotal > 0 ? (tipo === 'ingreso' ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}>
                        = ${formatNumber(subtotal)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total mejorado con animación */}
          <div className={`relative overflow-hidden p-3 rounded-xl border-2 shadow-md ${
            tipo === 'ingreso' 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Total a {tipo === 'ingreso' ? 'ingresar' : 'retirar'}
                </div>
                <div className={`text-3xl font-bold ${tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'} transition-all duration-300`}>
                  ${formatNumber(total)}
                </div>
              </div>
              {total > 0 && (
                <div className="text-4xl animate-bounce">{tipo === 'ingreso' ? '💰' : '💸'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con botones mejorados */}
        <div className="p-3 bg-gray-50 border-t-2 border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 text-sm shadow-sm hover:shadow active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={total <= 0}
              className={`flex-1 py-3 px-4 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md hover:shadow-lg active:scale-95 ${
                tipo === 'ingreso' 
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700' 
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
              }`}
            >
              {total > 0 
                ? `✓ Confirmar ${tipo === 'ingreso' ? 'Ingreso' : 'Retiro'}`
                : 'Selecciona billetes'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}