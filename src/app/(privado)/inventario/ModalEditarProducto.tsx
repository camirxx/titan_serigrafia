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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tallasStock, setTallasStock] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (producto) {
      setDiseno(producto.diseno);
      setTipoPrenda(producto.tipo_prenda);
      setColor(producto.color);
      setActivo(producto.activo);
      
      // Cargar stock real de las variantes desde la base de datos
      const cargarStockReal = async () => {
        const supabase = supabaseBrowser();
        const tallasEstandar = ["S", "M", "L", "XL", "XXL", "XXXL"];
        const stockInicial: { [key: string]: number } = {};
        
        try {
          const { data, error } = await supabase
            .from("variantes")
            .select("id, talla, stock_actual")
            .eq("producto_id", producto.producto_id);
          
          if (error) throw error;
          
          // Guardar el mapeo de talla -> variante_id para usar en handleGuardar
          const variantesMap: { [key: string]: number } = {};
          
          // Inicializar todas las tallas en 0
          tallasEstandar.forEach(talla => {
            stockInicial[talla] = 0;
          });
          
          // Actualizar con el stock real de las variantes que existen
          data?.forEach(variante => {
            const talla = variante.talla?.toUpperCase();
            if (talla && tallasEstandar.includes(talla)) {
              stockInicial[talla] = variante.stock_actual || 0;
              variantesMap[talla] = variante.id;
            }
          });
          
          // Guardar el mapa en el estado del componente
          (window as any).__variantesMap = variantesMap;
          
          setTallasStock(stockInicial);
        } catch (err) {
          console.error("Error cargando stock:", err);
          // Si hay error, usar los datos del producto
          tallasEstandar.forEach(talla => {
            stockInicial[talla] = producto.tallas[talla]?.total || 0;
          });
          setTallasStock(stockInicial);
        }
      };
      
      cargarStockReal();
    }
  }, [producto]);

  const handleGuardar = async () => {
    if (!producto) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      // 1. Actualizar solo el estado activo del producto
      // (no actualizamos diseño, tipo, color porque son IDs en la BD)
      const { error: errorProducto } = await supabase
        .from("productos")
        .update({
          activo,
        })
        .eq("id", producto.producto_id);

      if (errorProducto) {
        console.error("Error actualizando producto:", errorProducto);
        throw errorProducto;
      }

      // 2. Actualizar o crear variantes para cada talla
      const tallasEstandar = ["S", "M", "L", "XL", "XXL", "XXXL"];
      const variantesMap = (window as any).__variantesMap || {};
      
      for (const talla of tallasEstandar) {
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              onClick={handleGuardar}
              disabled={loading || !diseno || !tipoPrenda || !color}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "✓ Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
