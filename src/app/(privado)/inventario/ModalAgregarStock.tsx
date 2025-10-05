"use client"

import { useState, useEffect, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { X, Search } from 'lucide-react'

type Producto = {
  producto_id: number
  diseno: string
  tipo_prenda: string
  color: string
}

type Variante = {
  id: number
  producto_id: number
  talla: string
  stock_actual: number
}

type VarianteAdminRow = {
  producto_id: number
  diseno: string | null
  tipo_prenda: string | null
  color: string | null
}

type VarianteDetalleRow = {
  variante_id: number
  producto_id: number
  talla: string | null
  stock_actual: number | null
}

const isVarianteAdminArray = (rows: unknown): rows is VarianteAdminRow[] => {
  return (
    Array.isArray(rows) &&
    rows.every((item) => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.producto_id === 'number' &&
        (typeof row.diseno === 'string' || row.diseno === null) &&
        (typeof row.tipo_prenda === 'string' || row.tipo_prenda === null) &&
        (typeof row.color === 'string' || row.color === null)
      )
    })
  )
}

const isVarianteDetalleArray = (rows: unknown): rows is VarianteDetalleRow[] => {
  return (
    Array.isArray(rows) &&
    rows.every((item) => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.variante_id === 'number' &&
        typeof row.producto_id === 'number' &&
        (typeof row.talla === 'string' || row.talla === null) &&
        (typeof row.stock_actual === 'number' || row.stock_actual === null)
      )
    })
  )
}

type ModalAgregarStockProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const TALLAS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export default function ModalAgregarStock({ isOpen, onClose, onSuccess }: ModalAgregarStockProps) {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [productos, setProductos] = useState<Producto[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [mostrarLista, setMostrarLista] = useState(false)
  
  const [cantidades, setCantidades] = useState<Record<string, number>>({
    S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0
  })
  const [referencia, setReferencia] = useState('')

  useEffect(() => {
    if (isOpen) {
      cargarProductos()
      setError(null)
      setSuccess(null)
    }
  }, [isOpen])


  
const cargarProductos = async () => {
  try {
    const { data, error: err } = await supabase
      .from('variantes_admin_view')
      .select('producto_id, diseno, tipo_prenda, color, producto_activo')
      .order('producto_id', { ascending: false })   // ← trae lo último primero
      .range(0, 4999);                              // ← aumenta el rango (ajusta si quieres)

    if (err) throw err;

    const productosUnicos = new Map<number, Producto>();
    const rows = isVarianteAdminArray(data) ? data : [];

    rows.forEach((v) => {
      if (!productosUnicos.has(v.producto_id)) {
        productosUnicos.set(v.producto_id, {
          producto_id: v.producto_id,
          diseno: v.diseno || 'Sin diseño',
          tipo_prenda: v.tipo_prenda || 'Sin tipo',
          color: v.color || 'Sin color',
        });
      }
    });

    setProductos(Array.from(productosUnicos.values()));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error cargando productos';
    setError(message);
  }
};

const cargarVariantes = async (productoId: number) => {
  setError(null);
  try {
    const { data, error } = await supabase
      .from('variantes_admin_view')
      // Pedimos las columnas reales de la vista (NO usar 'variante_id:id')
      .select('variante_id, producto_id, talla, stock_actual')
      .eq('producto_id', productoId)
      .order('variante_id', { ascending: true })
      .range(0, 500);

    if (error) throw error;

    // Normaliza al tipo Variante que usa tu modal
    const rows = isVarianteDetalleArray(data) ? data : []
    const vs: Variante[] = rows.map((r) => ({
      id: r.variante_id,
      producto_id: r.producto_id,
      talla: (r.talla ?? '').trim().toUpperCase(),
      stock_actual: Number(r.stock_actual ?? 0)
    }))

    setVariantes(vs)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error cargando variantes'
    setError(message)
  }
}



  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos
    const termino = busqueda.toLowerCase()
    return productos.filter(p =>
      p.diseno.toLowerCase().includes(termino) ||
      p.tipo_prenda.toLowerCase().includes(termino) ||
      p.color.toLowerCase().includes(termino)
    )
  }, [productos, busqueda])

const seleccionarProducto = async (producto: Producto) => {
  setProductoSeleccionado(producto)
  setBusqueda(`${producto.tipo_prenda} - ${producto.diseno} - ${producto.color}`)
  setMostrarLista(false)
  setCantidades({ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 })
  await cargarVariantes(producto.producto_id)   // espera la carga
}


  const handleCantidadChange = (talla: string, valor: string) => {
    const num = parseInt(valor) || 0
    setCantidades(prev => ({ ...prev, [talla]: num < 0 ? 0 : num }))
  }

const handleSubmit = async () => {
  setError(null);
  setSuccess(null);

  if (!productoSeleccionado) {
    setError('Debes seleccionar un producto');
    return;
  }

  const totalCantidad = Object.values(cantidades).reduce((sum, c) => sum + c, 0);
  if (totalCantidad === 0) {
    setError('Debes ingresar al menos una cantidad mayor a 0');
    return;
  }

  setLoading(true);
  try {
    const ref = referencia.trim() || 'entrada_manual';

    // Asegura que tengamos las variantes del producto seleccionado
    if (variantes.length === 0) {
      await cargarVariantes(productoSeleccionado.producto_id);
    }

    // Trabaja con una copia local tras la posible recarga
    const variantesNorm = variantes.map(v => ({
      ...v,
      talla: (v.talla ?? '').trim().toUpperCase(),
    }));

    // Ejecuta la RPC por cada talla con cantidad > 0
    for (const talla of TALLAS) {
      const cantidad = Number(cantidades[talla] || 0);
      if (cantidad > 0) {
        const tallaKey = talla.toUpperCase().trim();
        const variante = variantesNorm.find(v => (v.talla ?? '') === tallaKey);

        if (!variante) {
          throw new Error(`No se encontró variante para talla ${talla}`);
        }

        const { error: errRpc } = await supabase.rpc('ajustar_stock', {
          p_variante_id: variante.id,
          p_tipo: 'entrada',
          p_cantidad: cantidad,
          p_referencia: ref,
        });

        if (errRpc) throw errRpc;
      }
    }

    setSuccess(`Stock agregado correctamente: ${totalCantidad} unidades`);

    // Refresca las variantes en el modal (para ver stock actualizado al instante)
    await cargarVariantes(productoSeleccionado.producto_id);

    // Pide al padre que refresque el inventario
    await onSuccess();

    // Limpia y cierra suave
    limpiarFormulario();
    setTimeout(() => onClose(), 800);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al agregar stock';
    setError(message);
  } finally {
    setLoading(false);
  }
};



  const limpiarFormulario = () => {
    setBusqueda('')
    setProductoSeleccionado(null)
    setVariantes([])
    setCantidades({ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 })
    setReferencia('')
    setError(null)
    setSuccess(null)
  }

  const totalUnidades = Object.values(cantidades).reduce((sum, c) => sum + c, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 text-white px-8 py-6 rounded-t-3xl flex items-center justify-between z-10 shadow">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-1">Inventario</p>
            <h2 className="text-3xl font-bold leading-tight">Agregar stock a productos</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-7 space-y-7">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
              {success}
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar Producto *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setMostrarLista(true)
                  if (!e.target.value) setProductoSeleccionado(null)
                }}
                onFocus={() => setMostrarLista(true)}
                placeholder="Escribe para buscar por diseño, tipo o color..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                disabled={loading}
              />
            </div>

           {mostrarLista && busqueda && productosFiltrados.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white border-2 border-purple-300 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                {productosFiltrados.slice(0, 20).map((producto) => (
                  <button
                    key={producto.producto_id}
                    onClick={() => seleccionarProducto(producto)}
                    className="w-full text-left px-5 py-4 hover:bg-purple-50 transition border-b border-gray-200 last:border-0 group"
                  >
                    <div className="font-bold text-lg text-gray-900 group-hover:text-purple-700 transition mb-1">
                      {producto.diseno}
                    </div>
                    <div className="text-base text-gray-600">
                      {producto.tipo_prenda} · {producto.color}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {productoSeleccionado && (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-purple-600 font-semibold mb-1">Producto seleccionado</div>
                <div className="text-xl font-bold text-purple-900">{productoSeleccionado.diseno}</div>
                <div className="text-sm text-purple-700">
                  {productoSeleccionado.tipo_prenda} · {productoSeleccionado.color}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Cantidad por talla
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {TALLAS.map((talla) => {
                    const variante = variantes.find((v) => v.talla === talla)
                    return (
                      <div key={talla} className="border-2 border-gray-200 rounded-2xl p-4 shadow-sm bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-xl text-gray-900">{talla}</span>
                          <span className="text-xs text-gray-500 uppercase">Stock actual</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {variante?.stock_actual ?? 0} unidades
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={cantidades[talla] || ''}
                          onChange={(e) => handleCantidadChange(talla, e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-center text-lg font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Referencia o nota</label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="Ej: reposición proveedor, compra local..."
                    disabled={loading}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Total a ingresar: <span className="font-semibold text-purple-700">{totalUnidades} unidades</span>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t">
            <button
              onClick={() => {
                limpiarFormulario()
                onClose()
              }}
              disabled={loading}
              className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
         <button
            onClick={handleSubmit}
            disabled={loading || !productoSeleccionado || totalUnidades === 0 || variantes.length === 0}
            className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Procesando…' : 'Agregar stock'}
          </button>

          </div>
        </div>
      </div>
    </div>
  )
}
