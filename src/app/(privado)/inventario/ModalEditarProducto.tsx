"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type ProductoAgrupado = {
  producto_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string;
  activo: boolean;
  tallas: {
    [talla: string]: {
      entrada: number;
      salida: number;
      total: number;
      variante_id?: number;
    };
  };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producto: ProductoAgrupado | null;
  onSuccess: () => void;
};

export default function ModalEditarProducto({ isOpen, onClose, producto, onSuccess }: Props) {
  const [diseno, setDiseno] = useState("");
  const [tipoPrenda, setTipoPrenda] = useState("");
  const [color, setColor] = useState("");
  const [activo, setActivo] = useState(true);
  const [tiendaId, setTiendaId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tallasStock, setTallasStock] = useState<{ [key: string]: number }>({});
  const [mostrarConfirmacionEliminar, setMostrarConfirmacionEliminar] = useState(false);
  const [tiendas, setTiendas] = useState<{ id: number; nombre: string }[]>([]);

  // Cargar tiendas disponibles
  useEffect(() => {
    const cargarTiendas = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data, error } = await supabase
          .from("tiendas")
          .select("id, nombre")
          .order("id");

        if (error) throw error;
        setTiendas(data || []);
      } catch (err) {
        console.error("Error cargando tiendas:", err);
      }
    };

    if (isOpen) {
      cargarTiendas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (producto) {
      setDiseno(producto.diseno);
      setTipoPrenda(producto.tipo_prenda);
      setColor(producto.color);
      setActivo(producto.activo);
      
      // Cargar tienda_id actual del producto
      const cargarTiendaProducto = async () => {
        try {
          const supabase = supabaseBrowser();
          const { data, error } = await supabase
            .from("productos")
            .select("tienda_id")
            .eq("id", producto.producto_id)
            .single();

          if (error) throw error;
          setTiendaId(data?.tienda_id || 1);
        } catch (err) {
          console.error("Error cargando tienda del producto:", err);
          setTiendaId(1);
        }
      };

      cargarTiendaProducto();
      
      // Cargar stock real solo de las variantes de este producto específico
      const cargarStockReal = async () => {
        const supabase = supabaseBrowser();
        const stockInicial: { [key: string]: number } = {};
        
        try {
          // Cambiar la consulta para filtrar por producto_id específico en lugar de por diseño/tipo/color
          const { data, error } = await supabase
            .from("variantes")
            .select("id, talla, stock_actual")
            .eq("producto_id", producto.producto_id); // Solo variantes de este producto
          
          if (error) throw error;
          
          // Guardar el mapeo de talla -> variante_id para usar en handleGuardar
          const variantesMap: { [key: string]: number } = {};
          
          // Crear un set de todas las tallas que existen para este producto
          const tallasExistentes = new Set<string>();
          data?.forEach(variante => {
            if (variante.talla) {
              tallasExistentes.add(variante.talla.toUpperCase());
            }
          });
          
          // Inicializar todas las tallas existentes en 0
          tallasExistentes.forEach(talla => {
            stockInicial[talla] = 0;
          });
          
          // Actualizar con el stock real de las variantes que existen
          data?.forEach(variante => {
            const talla = variante.talla?.toUpperCase();
            if (talla) {
              stockInicial[talla] = variante.stock_actual || 0;
              variantesMap[talla] = variante.id;
            }
          });
          
          // Guardar el mapa en el estado del componente
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__variantesMap = variantesMap;
          
          setTallasStock(stockInicial);
        } catch (err) {
          console.error("Error cargando stock:", err);
          // Si hay error, usar los datos del producto
          Object.keys(producto.tallas).forEach(talla => {
            stockInicial[talla] = producto.tallas[talla]?.total || 0;
          });
          setTallasStock(stockInicial);
        }
      };
      
      cargarStockReal();
    }
  }, [producto]);

  const handleEliminar = async () => {
    if (!producto) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      console.log('🗑️ Iniciando eliminación del producto:', producto.producto_id);

      // PASO 1: Obtener todas las variantes del producto
      const { data: variantes, error: errorGetVariantes } = await supabase
        .from("variantes")
        .select("id")
        .eq("producto_id", producto.producto_id);

      if (errorGetVariantes) {
        console.error("Error obteniendo variantes:", errorGetVariantes);
        throw new Error("No se pudo verificar las variantes del producto");
      }

      const varianteIds = variantes?.map(v => v.id) || [];
      console.log('📦 Variantes encontradas:', varianteIds.length);

      if (varianteIds.length > 0) {
        // PASO 2: Verificar si hay ventas asociadas (NO ELIMINAR SI HAY VENTAS)
        const { count, error: errorVentas } = await supabase
          .from("detalle_ventas")
          .select("*", { count: 'exact', head: true })
          .in("variante_id", varianteIds);

        if (errorVentas) {
          console.error("Error verificando ventas:", errorVentas);
        }

        const cantidadVentas = count || 0;
        
        if (cantidadVentas > 0) {
          throw new Error(`❌ No se puede eliminar este producto porque tiene ${cantidadVentas} ventas registradas. Por seguridad, no eliminamos productos con historial de ventas. Si deseas ocultarlo, marca el producto como "Inactivo".`);
        }

        console.log('✓ Sin ventas asociadas, procediendo con la eliminación...');

        // PASO 3: Eliminar devoluciones_items
        const { error: errorDevolucionesItems } = await supabase
          .from("devoluciones_items")
          .delete()
          .in("variante_id", varianteIds);

        if (errorDevolucionesItems && errorDevolucionesItems.code !== 'PGRST116') {
          console.warn("⚠️ Error al eliminar devoluciones_items:", errorDevolucionesItems);
        } else {
          console.log('✅ devoluciones_items eliminados');
        }

        // PASO 4: Eliminar cambios_items_entregados
        const { error: errorCambiosItems } = await supabase
          .from("cambios_items_entregados")
          .delete()
          .in("variante_id", varianteIds);

        if (errorCambiosItems && errorCambiosItems.code !== 'PGRST116') {
          console.warn("⚠️ Error al eliminar cambios_items_entregados:", errorCambiosItems);
        } else {
          console.log('✅ cambios_items_entregados eliminados');
        }

        // PASO 5: Eliminar cambios_detalle (from_variante_id)
        const { error: errorCambiosDetalleFrom } = await supabase
          .from("cambios_detalle")
          .delete()
          .in("from_variante_id", varianteIds);

        if (errorCambiosDetalleFrom && errorCambiosDetalleFrom.code !== 'PGRST116') {
          console.warn("⚠️ Error al eliminar cambios_detalle (from):", errorCambiosDetalleFrom);
        } else {
          console.log('✅ cambios_detalle (from) eliminados');
        }

        // PASO 6: Eliminar cambios_detalle (to_variante_id)
        const { error: errorCambiosDetalleTo } = await supabase
          .from("cambios_detalle")
          .delete()
          .in("to_variante_id", varianteIds);

        if (errorCambiosDetalleTo && errorCambiosDetalleTo.code !== 'PGRST116') {
          console.warn("⚠️ Error al eliminar cambios_detalle (to):", errorCambiosDetalleTo);
        } else {
          console.log('✅ cambios_detalle (to) eliminados');
        }

        // PASO 7: Eliminar movimientos_inventario
        const { error: errorMovimientos } = await supabase
          .from("movimientos_inventario")
          .delete()
          .in("variante_id", varianteIds);

        if (errorMovimientos && errorMovimientos.code !== 'PGRST116') {
          console.warn("⚠️ Error al eliminar movimientos_inventario:", errorMovimientos);
        } else {
          console.log('✅ movimientos_inventario eliminados');
        }

        // PASO 8: Eliminar variantes
        const { error: errorVariantes } = await supabase
          .from("variantes")
          .delete()
          .eq("producto_id", producto.producto_id);

        if (errorVariantes) {
          console.error("❌ Error eliminando variantes:", errorVariantes);
          throw new Error(`Error al eliminar variantes: ${errorVariantes.message}`);
        }
        console.log('✅ Variantes eliminadas');
      }

      // PASO 9: Finalmente eliminar el producto
      const { error: errorProducto } = await supabase
        .from("productos")
        .delete()
        .eq("id", producto.producto_id);

      if (errorProducto) {
        console.error("❌ Error eliminando producto:", errorProducto);
        throw new Error(`Error al eliminar producto: ${errorProducto.message}`);
      }

      console.log('✅ Producto eliminado exitosamente');

      // PASO 10: Cerrar modal y notificar éxito
      setMostrarConfirmacionEliminar(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("💥 Error al eliminar:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGuardar = async () => {
    if (!producto) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      // 1. Actualizar el estado activo y tienda_id del producto
      const { error: errorProducto } = await supabase
        .from("productos")
        .update({
          activo,
          tienda_id: tiendaId,
        })
        .eq("id", producto.producto_id);

      if (errorProducto) {
        console.error("Error actualizando producto:", errorProducto);
        throw errorProducto;
      }

      // 2. Actualizar o crear variantes para cada talla
      // Usar las tallas que existen en tallasStock (que incluye todas las tallas del producto)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantesMap = (window as any).__variantesMap || {};
      
      for (const talla of Object.keys(tallasStock)) {
        const nuevoStock = tallasStock[talla] || 0;
        const varianteId = variantesMap[talla];
        
        if (varianteId) {
          // Actualizar variante existente (incluso si tiene stock 0)
          const { error: errorVariante } = await supabase
            .from("variantes")
            .update({ stock_actual: nuevoStock })
            .eq("id", varianteId);

          if (errorVariante) {
            console.error(`Error actualizando variante ${talla}:`, errorVariante);
            throw errorVariante;
          }
        } else if (nuevoStock > 0) {
          // Crear nueva variante solo si no existe y se ingresó stock
          const { data: nuevaVariante, error: errorNuevaVariante } = await supabase
            .from("variantes")
            .insert({
              producto_id: producto.producto_id,
              talla: talla,
              stock_actual: nuevoStock
            })
            .select()
            .single();

          if (errorNuevaVariante) {
            console.error(`Error creando variante ${talla}:`, errorNuevaVariante);
            throw errorNuevaVariante;
          }

          // Registrar movimiento de entrada para el stock inicial
          if (nuevaVariante) {
            const { error: errorMovimiento } = await supabase
              .from("movimientos_inventario")
              .insert({
                variante_id: nuevaVariante.id,
                tipo: "entrada",
                cantidad: nuevoStock,
                referencia: "Stock inicial al crear variante"
              });

            if (errorMovimiento) {
              console.error(`Error registrando movimiento para ${talla}:`, errorMovimiento);
              // No lanzar error, solo logear
            }
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error al actualizar:", err);
      setError(err instanceof Error ? err.message : "Error al actualizar producto");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Editar Producto</h2>
              <p className="text-white/90">Modifica la información del producto</p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 hover:rotate-90 transform"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-8 space-y-6 max-h-[calc(90vh-250px)] overflow-y-auto">
          {error && (
            <div className="rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4">
              <p className="text-red-700 font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Información básica - Solo lectura */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información del Producto (Solo lectura)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Diseño</label>
                <div className="mt-1 px-4 py-3 bg-white rounded-lg border border-gray-200 text-gray-900 font-medium">
                  {diseno}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Categoría</label>
                <div className="mt-1 px-4 py-3 bg-white rounded-lg border border-gray-200 text-gray-900 font-medium">
                  {tipoPrenda}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Color</label>
                <div className="mt-1 px-4 py-3 bg-white rounded-lg border border-gray-200 text-gray-900 font-medium">
                  {color}
                </div>
              </div>
            </div>
          </div>

          {/* Estado del producto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Estado
              </label>
              <div className="flex items-center gap-4 h-[52px]">
                <button
                  type="button"
                  onClick={() => setActivo(!activo)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all duration-200 ${
                    activo
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {activo ? "✓ Activo" : "Inactivo"}
                </button>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Tienda
              </label>
              <select
                value={tiendaId}
                onChange={(e) => setTiendaId(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 outline-none font-medium"
              >
                {tiendas.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>
                    {tienda.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock por tallas */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              Stock por Tallas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Object.entries(tallasStock).map(([talla, stock]) => (
                <div key={talla} className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4 border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
                    {talla}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setTallasStock(prev => ({
                      ...prev,
                      [talla]: parseInt(e.target.value) || 0
                    }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-center font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t-2 border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={() => setMostrarConfirmacionEliminar(true)}
              disabled={loading}
              className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Eliminar
            </button>
            <button
              onClick={handleGuardar}
              disabled={loading || !diseno || !tipoPrenda || !color}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "✓ Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {mostrarConfirmacionEliminar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-slideUp">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Eliminar Producto?</h3>
                <p className="text-gray-600">
                  Esta acción eliminará permanentemente el producto <strong>{diseno} - {tipoPrenda} - {color}</strong> y todas sus variantes/tallas.
                </p>
                <p className="text-red-600 font-semibold mt-2">Esta acción no se puede deshacer.</p>
              </div>

              {error && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 mb-6">
                  <p className="text-red-700 font-semibold">⚠️ {error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setMostrarConfirmacionEliminar(false);
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminar}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? "Eliminando..." : "🗑️ Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
