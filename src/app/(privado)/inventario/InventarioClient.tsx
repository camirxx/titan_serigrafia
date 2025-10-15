"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ChevronLeft } from "lucide-react";
import ModalAgregarDiseno from "./ModalAgregarDiseno";
import ModalAgregarStock from "./ModalAgregarStock";
import ModalEditarProducto from "./ModalEditarProducto";

// type VarianteData = {
//   variante_id: number;
//   talla: string | null;
//   stock_actual: number;
//   producto_id: number;
//   diseno: string | null;
//   tipo_prenda: string | null;
//   color: string | null;
//   producto_activo: boolean;
// };

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

type MovimientoInventario = {
  variante_id: number;
  tipo: string;
  cantidad: number;
  fecha: string;
};

// type ProductoSupabase = {
//   id: number;
//   disenos: { nombre: string }[];
//   tipos_prenda: { nombre: string }[];
//   colores: { nombre: string }[];
// };

// type VarianteSupabase = {
//   id: number;
//   producto_id: number;
//   talla: string | null;
//   stock_actual: number;
//   productos: {
//     id: number;
//     activo: boolean;
//     disenos: { nombre: string }[];
//     tipos_prenda: { nombre: string }[];
//     colores: { nombre: string }[];
//   }[];
// };

const isMovimientoInventarioArray = (
  data: unknown
): data is MovimientoInventario[] => {
  return (
    Array.isArray(data) &&
    data.every((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return (
        typeof row.variante_id === "number" &&
        typeof row.tipo === "string" &&
        typeof row.cantidad === "number" &&
        typeof row.fecha === "string"
      );
    })
  );
};

const TALLAS_ORDEN = ["S", "M", "L", "XL", "XXL", "XXXL"];

// Orden de categorías para ordenamiento
const ORDEN_CATEGORIAS: { [key: string]: number } = {
  'polera': 1,
  'poleron': 2,
  'canguro': 3,
  'buzo': 4,
  'short': 5,
  'pantalon': 6,
};

export default function InventarioAgrupado() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [productos, setProductos] = useState<ProductoAgrupado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroColor, setFiltroColor] = useState<string>("todos");

  const [fechaDesde, setFechaDesde] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 90);
    return fecha.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // ---- 1) Declarar primero cargarInventario (useCallback) ----
  const cargarInventario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar TODOS los productos activos directamente de la tabla productos
      const { data: todosProductos, error: errProductos } = await supabase
        .from("productos")
        .select(`
          id,
          disenos!inner(nombre),
          tipos_prenda!inner(nombre),
          colores(nombre)
        `)
        .eq("activo", true);
      
      if (errProductos) {
        console.error("Error cargando productos:", errProductos);
        throw errProductos;
      }

      // Obtener productos únicos
      const productosUnicos = new Map<number, { diseno: string; tipo_prenda: string; color: string }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      todosProductos?.forEach((p: any) => {
        productosUnicos.set(p.id, {
          diseno: p.disenos?.nombre || "Sin diseño",
          tipo_prenda: p.tipos_prenda?.nombre || "Sin tipo",
          color: p.colores?.nombre || "Sin color"
        });
      });

      // 2. Cargar variantes directamente de la tabla (no de la vista)
      const { data: variantes, error: errVariantes } = await supabase
        .from("variantes")
        .select(`
          id,
          producto_id,
          talla,
          stock_actual,
          productos!inner(
            id,
            activo,
            disenos(nombre),
            tipos_prenda(nombre),
            colores(nombre)
          )
        `)
        .eq("productos.activo", true);
      
      if (errVariantes) {
        console.error("Error cargando variantes:", errVariantes);
        throw errVariantes;
      }
      
      // Transformar al formato esperado
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const variantesTransformadas = variantes?.map((v: any) => ({
        variante_id: v.id,
        producto_id: v.producto_id,
        talla: v.talla,
        stock_actual: v.stock_actual,
        diseno: v.productos?.disenos?.nombre || "Sin diseño",
        tipo_prenda: v.productos?.tipos_prenda?.nombre || "Sin tipo",
        color: v.productos?.colores?.nombre || "Sin color",
        producto_activo: v.productos?.activo || false
      })) || [];
      

      // 2. Movimientos del período
      const { data: movimientos, error: errMov } = await supabase
        .from("movimientos_inventario")
        .select("variante_id, tipo, cantidad, fecha")
        .gte("fecha", new Date(`${fechaDesde}T00:00:00`).toISOString())
        .lte("fecha", new Date(`${fechaHasta}T23:59:59`).toISOString());
      if (errMov) {
        console.error("Error movimientos:", errMov);
        throw errMov;
      }

      // 3. Mapear entradas/salidas por variante
      const movMap = new Map<number, { entrada: number; salida: number }>();
      const movimientosArray = isMovimientoInventarioArray(movimientos)
        ? movimientos
        : [];

      movimientosArray.forEach((m) => {
      if (!movMap.has(m.variante_id)) {
        movMap.set(m.variante_id, { entrada: 0, salida: 0 });
      }
      const mov = movMap.get(m.variante_id)!;

      if (m.tipo === 'entrada' || m.tipo === 'devolucion') {
        mov.entrada += m.cantidad;
      } else if (m.tipo === 'venta') {
        mov.salida += Math.abs(m.cantidad);
      } else if (m.tipo === 'ajuste') {
        if (m.cantidad > 0) {
          mov.entrada += m.cantidad;
        } else {
          mov.salida += Math.abs(m.cantidad);
        }
      }
    });

      // 4. Primero agregar todos los productos únicos (con o sin variantes)
      const agrupados: { [key: string]: ProductoAgrupado } = {};
      
      productosUnicos.forEach((info, productoId) => {
        agrupados[`${productoId}`] = {
          producto_id: productoId,
          diseno: info.diseno,
          tipo_prenda: info.tipo_prenda,
          color: info.color,
          activo: true,
          tallas: {},
        };
      });
      
      // 5. Luego agregar las variantes con stock
      variantesTransformadas.forEach((v) => {
        const key = `${v.producto_id}`;
        
        // Si el producto no existe en agrupados, agregarlo
        if (!agrupados[key]) {
          agrupados[key] = {
            producto_id: v.producto_id,
            diseno: v.diseno || "Sin diseño",
            tipo_prenda: v.tipo_prenda || "Sin tipo",
            color: v.color || "Sin color",
            activo: v.producto_activo,
            tallas: {},
          };
        }
        
        const talla = v.talla || "N/A";
        const mov = movMap.get(v.variante_id);
        agrupados[key].tallas[talla] = {
          entrada: mov?.entrada || 0,
          salida: mov?.salida || 0,
          total: v.stock_actual || 0,
          variante_id: v.variante_id,
        };
      });

      const productosArray = Object.values(agrupados);
      setProductos(productosArray);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al cargar inventario";
      setError(message);
      console.error("Error completo:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, fechaDesde, fechaHasta]);

  // ---- 2) Luego el useEffect que la invoca ----
  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  // Listas únicas para filtros
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(productos.map((p) => p.tipo_prenda));
    return Array.from(tipos).sort();
  }, [productos]);

  const coloresUnicos = useMemo(() => {
    const colores = new Set(productos.map((p) => p.color));
    return Array.from(colores).sort();
  }, [productos]);

  // Filtrado y ordenamiento
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((prod) => {
      const texto = busqueda.toLowerCase().trim();
      const coincideTexto =
        !texto ||
        prod.diseno.toLowerCase().includes(texto) ||
        prod.tipo_prenda.toLowerCase().includes(texto) ||
        prod.color.toLowerCase().includes(texto);

      const coincideTipo =
        filtroTipo === "todos" || prod.tipo_prenda === filtroTipo;

      const coincideColor =
        filtroColor === "todos" || prod.color === filtroColor;

      return coincideTexto && coincideTipo && coincideColor;
    });

    // Ordenar por categoría y luego alfabéticamente
    return filtrados.sort((a, b) => {
      const ordenA = ORDEN_CATEGORIAS[a.tipo_prenda.toLowerCase()] || 999;
      const ordenB = ORDEN_CATEGORIAS[b.tipo_prenda.toLowerCase()] || 999;
      
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      
      // Si son de la misma categoría, ordenar alfabéticamente por diseño
      return a.diseno.localeCompare(b.diseno);
    });
  }, [productos, busqueda, filtroTipo, filtroColor]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipo("todos");
    setFiltroColor("todos");
  };

  // Modales
  const [modalDisenoAbierto, setModalDisenoAbierto] = useState(false);
  const [modalStockAbierto, setModalStockAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [productoEditar, setProductoEditar] = useState<ProductoAgrupado | null>(null);

  const abrirModalEditar = (producto: ProductoAgrupado) => {
    setProductoEditar(producto);
    setModalEditarAbierto(true);
  };

  return (
    <div className="min-h-screen relative">
      {/* Header con fondo morado/verde */}
      <div
        className="relative mb-6 rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #4C1D95 0%, #5B21B6 50%, #7C3AED 100%)",
        }}
      >
        {/* Diseño decorativo verde */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative flex items-center justify-between p-6">
          <button
            onClick={() => window.history.back()}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              Inventario
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {new Date().toLocaleDateString("es-CL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              ·{" "}
              {new Date().toLocaleTimeString("es-CL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="w-12 h-12 bg-purple-900 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filtros de fecha y acciones mejorados */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 mb-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Período de Movimientos
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Movimientos desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={cargarInventario}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Actualizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Acciones rápidas mejoradas */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-100 border-t-2 border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setModalDisenoAbierto(true)}
              className="flex-1 py-4 px-6 bg-white border-2 border-indigo-300 text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-400 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>AGREGAR NUEVO DISEÑO</span>
            </button>
            <button
              onClick={() => setModalStockAbierto(true)}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>AGREGAR PRODUCTOS</span>
            </button>
          </div>
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
              {tiposUnicos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
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
              {coloresUnicos.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-purple-900 font-medium">
            Resultados: {productosFiltrados.length} de {productos.length}
          </span>

          {(busqueda || filtroTipo !== "todos" || filtroColor !== "todos") && (
            <button
              onClick={limpiarFiltros}
              className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition"
            >
              Limpiar filtros ✕
            </button>
          )}

          {busqueda && (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
              Búsqueda: &quot;{busqueda}&quot;
            </span>
          )}
          {filtroTipo !== "todos" && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Tipo: {filtroTipo}
            </span>
          )}
          {filtroColor !== "todos" && (
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

      {/* Tabla principal mejorada */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-slate-100 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Inventario Detallado
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <th className="text-left p-4 font-bold text-gray-700 sticky left-0 bg-gradient-to-r from-indigo-50 to-purple-50 z-20 min-w-[80px]">
                  Estado
                </th>
                <th className="text-left p-4 font-bold text-gray-700 sticky left-[80px] bg-gradient-to-r from-indigo-50 to-purple-50 z-20 min-w-[120px]">
                  Tipo
                </th>
                <th className="text-left p-4 font-bold text-gray-700 sticky left-[200px] bg-gradient-to-r from-indigo-50 to-purple-50 z-20 min-w-[180px]">
                  Diseño
                </th>
                <th className="text-left p-4 font-bold text-gray-700 min-w-[120px]">
                  Color
                </th>

                {/* ENTRADA */}
                <th
                  colSpan={TALLAS_ORDEN.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  📥 ENTRADA
                </th>

                {/* SALIDA */}
                <th
                  colSpan={TALLAS_ORDEN.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-orange-500 to-red-600"
                >
                  📤 SALIDA
                </th>

                {/* TOTAL */}
                <th
                  colSpan={TALLAS_ORDEN.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  📦 STOCK
                </th>

                {/* ACCIONES */}
                <th className="text-center p-4 font-bold text-white bg-gradient-to-r from-gray-700 to-gray-800 sticky right-0 z-20 min-w-[100px]">
                  ⚙️ ACCIONES
                </th>
              </tr>

              {/* Subtítulos de tallas */}
              <tr className="border-b border-indigo-100 bg-indigo-50/50">
                <th className="sticky left-0 bg-indigo-50/95 z-20"></th>
                <th className="sticky left-[80px] bg-indigo-50/95 z-20"></th>
                <th className="sticky left-[200px] bg-indigo-50/95 z-20"></th>
                <th></th>

                {TALLAS_ORDEN.map((t) => (
                  <th
                    key={`e-${t}`}
                    className="p-2 text-center text-sm font-bold text-blue-700"
                  >
                    {t}
                  </th>
                ))}
                {TALLAS_ORDEN.map((t) => (
                  <th
                    key={`s-${t}`}
                    className="p-2 text-center text-sm font-bold text-red-700"
                  >
                    {t}
                  </th>
                ))}
                {TALLAS_ORDEN.map((t) => (
                  <th
                    key={`t-${t}`}
                    className="p-2 text-center text-sm font-bold text-purple-700"
                  >
                    {t}
                  </th>
                ))}
                <th className="sticky right-0 bg-gray-50/95 z-20"></th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((prod, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group ${
                    !prod.activo ? 'opacity-50 bg-gray-50' : ''
                  }`}
                >
                  <td className="p-4 sticky left-0 bg-white group-hover:bg-gradient-to-r group-hover:from-indigo-50 group-hover:to-purple-50 z-10">
                    {prod.activo ? (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        ✓ Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                        ✕ Inactivo
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-indigo-600 sticky left-[80px] bg-white group-hover:bg-gradient-to-r group-hover:from-indigo-50 group-hover:to-purple-50 z-10 uppercase text-sm">
                    {prod.tipo_prenda}
                  </td>
                  <td className="p-4 font-bold text-gray-900 sticky left-[200px] bg-white group-hover:bg-gradient-to-r group-hover:from-indigo-50 group-hover:to-purple-50 z-10">
                    {prod.diseno}
                  </td>
                  <td className="p-4 text-gray-700 font-medium">{prod.color}</td>

                  {TALLAS_ORDEN.map((t) => (
                    <td
                      key={`e-${t}`}
                      className="p-2 text-center bg-blue-50/50 text-sm font-semibold"
                    >
                      {prod.tallas[t]?.entrada || 0}
                    </td>
                  ))}
                  {TALLAS_ORDEN.map((t) => (
                    <td
                      key={`s-${t}`}
                      className="p-2 text-center bg-red-50/50 text-sm font-semibold"
                    >
                      {prod.tallas[t]?.salida || 0}
                    </td>
                  ))}
                  {TALLAS_ORDEN.map((t) => {
                    const stock = prod.tallas[t]?.total || 0;
                    return (
                      <td
                        key={`t-${t}`}
                        className={`p-2 text-center font-bold text-sm ${
                          stock === 0
                            ? 'bg-gray-100 text-gray-400'
                            : stock <= 2
                            ? 'bg-red-100 text-red-700'
                            : stock <= 5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-purple-50/50 text-purple-700'
                        }`}
                      >
                        {stock}
                      </td>
                    );
                  })}

                  <td className="p-2 sticky right-0 bg-white group-hover:bg-gradient-to-r group-hover:from-indigo-50 group-hover:to-purple-50 z-10">
                    <button
                      onClick={() => abrirModalEditar(prod)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
                      title="Editar producto"
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}

              {productosFiltrados.length === 0 && !loading && (
                <tr>
                  <td colSpan={100} className="p-8 text-center text-gray-500">
                    {productos.length === 0
                      ? "No hay productos en el inventario para el período seleccionado"
                      : "No se encontraron productos con los filtros aplicados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      <ModalAgregarDiseno
        isOpen={modalDisenoAbierto}
        onClose={() => setModalDisenoAbierto(false)}
        onSuccess={async () => {
          await cargarInventario();
        }}
      />

      <ModalAgregarStock
        isOpen={modalStockAbierto}
        onClose={() => setModalStockAbierto(false)}
        onSuccess={async () => {
          await cargarInventario();
        }}
      />

      <ModalEditarProducto
        isOpen={modalEditarAbierto}
        onClose={() => {
          setModalEditarAbierto(false);
          setProductoEditar(null);
        }}
        producto={productoEditar}
        onSuccess={async () => {
          await cargarInventario();
        }}
      />
    </div>
  );
}
