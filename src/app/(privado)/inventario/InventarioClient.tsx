"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { ChevronLeft } from 'lucide-react'
import ModalAgregarDiseno from './ModalAgregarDiseno'
import ModalAgregarStock from './ModalAgregarStock'


type VarianteData = {
  variante_id: number
  talla: string | null
  stock_actual: number
  producto_id: number
  diseno: string | null
  tipo_prenda: string | null
  color: string | null
}

type ProductoAgrupado = {
  producto_id: number
  diseno: string
  tipo_prenda: string
  color: string
  tallas: {
    [talla: string]: {
      entrada: number
      salida: number
      total: number
    }
  }
}

type MovimientoInventario = {
  variante_id: number
  tipo: string
  cantidad: number
  fecha: string
}

const isMovimientoInventarioArray = (data: unknown): data is MovimientoInventario[] => {
  return (
    Array.isArray(data) &&
    data.every((item) => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.variante_id === 'number' &&
        typeof row.tipo === 'string' &&
        typeof row.cantidad === 'number' &&
        typeof row.fecha === 'string'
      )
    })
  )
}



const TALLAS_ORDEN = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export default function InventarioAgrupado() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [productos, setProductos] = useState<ProductoAgrupado[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroColor, setFiltroColor] = useState<string>('todos')
  
  const [fechaDesde, setFechaDesde] = useState(() => {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - 90)
    return fecha.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Obtener todas las variantes activas
      const { data: variantes, error: errVariantes } = await supabase
        .from('variantes_admin_view')
        .select('*')
        .eq('producto_activo', true)
        .order('variante_id', { ascending: false }) // trae primero lo recién creado
        .range(0, 999)  

      if (errVariantes) throw errVariantes

      // 2. Obtener movimientos del período directamente
      const { data: movimientos, error: errMov } = await supabase
        .from('movimientos_inventario')
        .select('variante_id, tipo, cantidad, fecha')
        .gte('fecha', new Date(`${fechaDesde}T00:00:00`).toISOString())
        .lte('fecha', new Date(`${fechaHasta}T23:59:59`).toISOString())

      if (errMov) {
        console.error('Error movimientos:', errMov)
        throw errMov
      }

      // 3. Procesar movimientos por variante
      const movMap = new Map<number, { entrada: number; salida: number }>()
      
      const movimientosArray = isMovimientoInventarioArray(movimientos) ? movimientos : []
      movimientosArray.forEach((m) => {
        if (!movMap.has(m.variante_id)) {
          movMap.set(m.variante_id, { entrada: 0, salida: 0 })
        }
        
        const mov = movMap.get(m.variante_id)!
        
        // Clasificar entradas y salidas
        if (m.tipo === 'entrada' || m.tipo === 'devolucion') {
          mov.entrada += m.cantidad
        } else if (m.tipo === 'venta') {
          mov.salida += Math.abs(m.cantidad)
        } else if (m.tipo === 'ajuste') {
          if (m.cantidad > 0) {
            mov.entrada += m.cantidad
          } else {
            mov.salida += Math.abs(m.cantidad)
          }
        }
      })

      // 4. Agrupar por producto
      const agrupados: { [key: string]: ProductoAgrupado } = {}

      const variantesArray = variantes || []
      variantesArray.forEach((v: VarianteData) => {
        const key = `${v.producto_id}`
        
        if (!agrupados[key]) {
          agrupados[key] = {
            producto_id: v.producto_id,
            diseno: v.diseno || 'Sin diseño',
            tipo_prenda: v.tipo_prenda || 'Sin tipo',
            color: v.color || 'Sin color',
            tallas: {}
          }
        }

        const talla = v.talla || 'N/A'
        const mov = movMap.get(v.variante_id)

        agrupados[key].tallas[talla] = {
          entrada: mov?.entrada || 0,
          salida: mov?.salida || 0,
          total: v.stock_actual || 0
        }
      })

      setProductos(Object.values(agrupados))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar inventario'
      setError(message)
      console.error('Error completo:', err)
    } finally {
      setLoading(false)
    }
  }

  // Obtener listas únicas para filtros
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(productos.map(p => p.tipo_prenda))
    return Array.from(tipos).sort()
  }, [productos])

  const coloresUnicos = useMemo(() => {
    const colores = new Set(productos.map(p => p.color))
    return Array.from(colores).sort()
  }, [productos])

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    return productos.filter(prod => {
      // Filtro de búsqueda por texto
      const textoBusqueda = busqueda.toLowerCase().trim()
      const coincideTexto = !textoBusqueda || 
        prod.diseno.toLowerCase().includes(textoBusqueda) ||
        prod.tipo_prenda.toLowerCase().includes(textoBusqueda) ||
        prod.color.toLowerCase().includes(textoBusqueda)

      // Filtro por tipo
      const coincideTipo = filtroTipo === 'todos' || prod.tipo_prenda === filtroTipo

      // Filtro por color
      const coincideColor = filtroColor === 'todos' || prod.color === filtroColor

      return coincideTexto && coincideTipo && coincideColor
    })
  }, [productos, busqueda, filtroTipo, filtroColor])

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroTipo('todos')
    setFiltroColor('todos')
  }


  //CONST MODALES
  
  const [modalDisenoAbierto, setModalDisenoAbierto] = useState(false)
  const [modalStockAbierto, setModalStockAbierto] = useState(false)

  return (
    <div className="min-h-screen relative">
      {/* Header con fondo morado/verde */}
      <div className="relative mb-6 rounded-2xl overflow-hidden" 
           style={{
             background: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 50%, #7C3AED 100%)',
           }}>
        {/* Diseño decorativo verde */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative flex items-center justify-between p-6">
          <button 
            onClick={() => window.history.back()}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">Inventario</h1>
            <p className="text-white/80 text-sm mt-1">
              {new Date().toLocaleDateString('es-CL', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} · {new Date().toLocaleTimeString('es-CL', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          </div>

          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="w-12 h-12 bg-purple-900 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-purple-900">
          Movimientos desde:
        </label>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="border border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <label className="text-sm font-medium text-purple-900">
          hasta:
        </label>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="border border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <button
          onClick={cargarInventario}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
        >
          Actualizar
        </button>

        {/* Botones de acción */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 flex gap-4 justify-center border-t border-purple-200">
        <button 
          onClick={() => setModalDisenoAbierto(true)}
          className="px-8 py-3 bg-white text-purple-900 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition border-2 border-purple-300">
          AGREGAR NUEVO DISEÑO
        </button>
          <button 
            onClick={() => setModalStockAbierto(true)}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition">
            AGREGAR PRODUCTOS
          </button>
        </div>


      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Buscador */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-purple-900 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por diseño, tipo o color..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Filtro Tipo */}
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">
              Tipo de prenda
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
            >
              <option value="todos">Todos los tipos</option>
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Filtro Color */}
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">
              Color
            </label>
            <select
              value={filtroColor}
              onChange={(e) => setFiltroColor(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
            >
              <option value="todos">Todos los colores</option>
              {coloresUnicos.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-purple-900 font-medium">
            Resultados: {productosFiltrados.length} de {productos.length}
          </span>
          
          {(busqueda || filtroTipo !== 'todos' || filtroColor !== 'todos') && (
            <button
              onClick={limpiarFiltros}
              className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition"
            >
              Limpiar filtros ✕
            </button>
          )}

          {/* Tags de filtros activos */}
          {busqueda && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              Búsqueda: &quot;{busqueda}&quot;
            </span>
          )}
          {filtroTipo !== 'todos' && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Tipo: {filtroTipo}
            </span>
          )}
          {filtroColor !== 'todos' && (
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
              Color: {filtroColor}
            </span>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-lg">
          ⚠️ {error}
        </div>
      )}
      {loading && (
        <div className="text-center py-4 text-white bg-purple-900/70 backdrop-blur-sm rounded-lg mb-4">
          <div className="animate-pulse">Cargando inventario...</div>
        </div>
      )}

      {/* Tabla principal */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-purple-200">
                <th className="text-left p-4 font-bold text-purple-900 sticky left-0 bg-white/95 z-20 min-w-[100px]">
                  Tipo
                </th>
                <th className="text-left p-4 font-bold text-purple-900 sticky left-[100px] bg-white/95 z-20 min-w-[150px]">
                  Diseño
                </th>
                <th className="text-left p-4 font-bold text-purple-900 min-w-[100px]">
                  Color
                </th>
                
                {/* ENTRADA */}
                <th colSpan={TALLAS_ORDEN.length} 
                    className="text-center p-4 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600">
                  ENTRADA
                </th>
                
                {/* SALIDA */}
                <th colSpan={TALLAS_ORDEN.length} 
                    className="text-center p-4 font-bold text-white bg-gradient-to-r from-orange-500 to-red-500">
                  SALIDA
                </th>
                
                {/* TOTAL */}
                <th colSpan={TALLAS_ORDEN.length} 
                    className="text-center p-4 font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700">
                  TOTAL
                </th>
              </tr>
              
              {/* Subtítulos de tallas */}
              <tr className="border-b border-purple-100 bg-purple-50/50">
                <th className="sticky left-0 bg-purple-50/95 z-20"></th>
                <th className="sticky left-[100px] bg-purple-50/95 z-20"></th>
                <th></th>
                
                {/* Tallas ENTRADA */}
                {TALLAS_ORDEN.map(t => (
                  <th key={`e-${t}`} className="p-2 text-center text-sm font-semibold text-blue-700">
                    {t}
                  </th>
                ))}
                
                {/* Tallas SALIDA */}
                {TALLAS_ORDEN.map(t => (
                  <th key={`s-${t}`} className="p-2 text-center text-sm font-semibold text-red-700">
                    {t}
                  </th>
                ))}
                
                {/* Tallas TOTAL */}
                {TALLAS_ORDEN.map(t => (
                  <th key={`t-${t}`} className="p-2 text-center text-sm font-semibold text-purple-700">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((prod, idx) => (
                <tr key={idx} 
                    className="border-b border-purple-100 hover:bg-purple-50/30 transition">
                  <td className="p-4 font-medium text-purple-900 sticky left-0 bg-white/95 z-10">
                    {prod.tipo_prenda}
                  </td>
                  <td className="p-4 font-bold text-purple-900 sticky left-[100px] bg-white/95 z-10">
                    {prod.diseno}
                  </td>
                  <td className="p-4 text-gray-700">
                    {prod.color}
                  </td>
                  
                  {/* ENTRADA */}
                  {TALLAS_ORDEN.map(t => (
                    <td key={`e-${t}`} className="p-2 text-center bg-blue-50/50 text-sm">
                      {prod.tallas[t]?.entrada || 0}
                    </td>
                  ))}
                  
                  {/* SALIDA */}
                  {TALLAS_ORDEN.map(t => (
                    <td key={`s-${t}`} className="p-2 text-center bg-red-50/50 text-sm">
                      {prod.tallas[t]?.salida || 0}
                    </td>
                  ))}
                  
                  {/* TOTAL */}
                  {TALLAS_ORDEN.map(t => (
                    <td key={`t-${t}`} className="p-2 text-center bg-purple-50/50 font-semibold text-sm">
                      {prod.tallas[t]?.total || 0}
                    </td>
                  ))}
                </tr>
              ))}
              
              {productosFiltrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500">
                    {productos.length === 0 
                      ? 'No hay productos en el inventario para el período seleccionado'
                      : 'No se encontraron productos con los filtros aplicados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

  
        
        
      </div>
      
      {/*MODALES */}

<ModalAgregarDiseno
  isOpen={modalDisenoAbierto}
  onClose={() => setModalDisenoAbierto(false)}
  onSuccess={async () => {           // ← async
    await cargarInventario();        // ← await
  }}
/>


          <ModalAgregarStock
        isOpen={modalStockAbierto}
        onClose={() => setModalStockAbierto(false)}
        onSuccess={async () => {           // ← async
          await cargarInventario();        // ← await
        }}
      />


      
    </div>
    
  )

  
}
