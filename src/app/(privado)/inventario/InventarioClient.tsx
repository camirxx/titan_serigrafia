"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { ChevronLeft } from "lucide-react";
import ModalAgregarDiseno from "./ModalAgregarDiseno";
import ModalAgregarStock from "./ModalAgregarStock";
import ModalEditarProducto from "./ModalEditarProducto";

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

type VarianteInventario = {
  id: number;
  producto_id: number;
  talla: string;
  stock_actual: number;
};

const ORDEN_CATEGORIAS: { [key: string]: number } = {
  'polera': 1,
  'poleron': 2,
  'canguro': 3,
  'buzo': 4,
  'short': 5,
  'pantalon': 6,
};

const ITEMS_PER_PAGE = 50;

export default function InventarioAgrupado() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [productos, setProductos] = useState<ProductoAgrupado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroColor, setFiltroColor] = useState<string>("todos");
  const [soloConStock, setSoloConStock] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Recopilar todas las tallas únicas que existen en el inventario
  const todasLasTallas = useMemo(() => {
    const tallasSet = new Set<string>();
    productos.forEach(prod => {
      Object.keys(prod.tallas).forEach(talla => {
        tallasSet.add(talla);
      });
    });
    
    // Ordenar: primero las tallas estándar, luego las adicionales alfabéticamente
    const tallasEstandar = ["S", "M", "L", "XL", "XXL", "XXXL"];
    const tallasOrdenadas = [...tallasEstandar.filter(t => tallasSet.has(t))];
    const tallasExtras = [...tallasSet].filter(t => !tallasEstandar.includes(t)).sort();
    
    return [...tallasOrdenadas, ...tallasExtras];
  }, [productos]);

  // Filtrar tallas según la opción seleccionada
  const tallasAMostrar = useMemo(() => {
    if (!soloConStock) return todasLasTallas;
    
    const tallasConStock = new Set<string>();
    productos.forEach(prod => {
      Object.keys(prod.tallas).forEach(talla => {
        if ((prod.tallas[talla]?.total || 0) > 0) {
          tallasConStock.add(talla);
        }
      });
    });
    
    return [...tallasConStock].sort();
  }, [productos, todasLasTallas, soloConStock]);

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
        .eq("activo", true)
        .eq("tienda_id", 1); // <--- FILTRO: Solo tienda principal

      if (errProductos) throw errProductos;

      // Map para acceso rápido y filtrado
      const productosUnicos = new Map<
        number,
        { diseno: string; tipo_prenda: string; color: string }
      >();

      todosProductos?.forEach((p: { 
        id: number; 
        disenos: { nombre: unknown }[]; 
        tipos_prenda: { nombre: unknown }[]; 
        colores: { nombre: unknown }[]; 
      }) => {
        productosUnicos.set(p.id, {
          diseno: (p.disenos?.[0]?.nombre as string) || "Sin diseño",
          tipo_prenda: (p.tipos_prenda?.[0]?.nombre as string) || "Sin tipo",
          color: (p.colores?.[0]?.nombre as string) || "Sin color",
        });
      });

      // 2. Cargar TODAS las variantes paginando en lotes
      let allVariantes: VarianteInventario[] = [];
      let start = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from("variantes")
          .select("id, producto_id, talla, stock_actual")
          .order("id", { ascending: true })
          .range(start, start + batchSize - 1);

        if (error) {
          console.error("Error cargando batch de variantes:", error);
          throw error;
        }

        if (!batch || batch.length === 0) break;

        allVariantes = allVariantes.concat(batch);

        console.log(`Batch cargado: ${start} - ${start + batch.length - 1} (total hasta ahora: ${allVariantes.length})`);

        if (batch.length < batchSize) break;

        start += batchSize;
      }

      const variantes = allVariantes;
      console.log("TODAS LAS VARIANTES CARGADAS →", variantes.length);

      // Transformar al formato esperado
      const variantesTransformadas = variantes.map((v: Record<string, unknown>) => {
        const variante = v as { id: number; producto_id: number; talla: string; stock_actual: number };
        const productoInfo = productosUnicos.get(variante.producto_id);

        return {
          variante_id: variante.id,
          producto_id: variante.producto_id,
          talla: variante.talla || "N/A",
          stock_actual: variante.stock_actual,
          diseno: productoInfo?.diseno || "Sin diseño",
          tipo_prenda: productoInfo?.tipo_prenda || "Sin tipo",
          color: productoInfo?.color || "Sin color",
          producto_activo: true,
        };
      });

      /*
      // --- Bloque opcional para mostrar entradas y salidas por período ---
      const { data: movimientos, error: errMov } = await supabase
        .from("movimientos_inventario")
        .select("variante_id, tipo, cantidad, fecha")
        .gte("fecha", new Date(`${fechaDesde}T00:00:00`).toISOString())
        .lte("fecha", new Date(`${fechaHasta}T23:59:59`).toISOString());
      if (errMov) {
        console.error("Error movimientos:", errMov);
        throw errMov;
      }

      const movMap = new Map<number, { entrada: number; salida: number }>();
      (Array.isArray(movimientos) ? movimientos : []).forEach((m) => {
        if (!movMap.has(m.variante_id)) {
          movMap.set(m.variante_id, { entrada: 0, salida: 0 });
        }
        const mov = movMap.get(m.variante_id)!;

        if (m.tipo === "entrada" || m.tipo === "devolucion") {
          mov.entrada += m.cantidad;
        } else if (m.tipo === "venta") {
          mov.salida += Math.abs(m.cantidad);
        } else if (m.tipo === "ajuste") {
          if (m.cantidad > 0) {
            mov.entrada += m.cantidad;
          } else {
            mov.salida += Math.abs(m.cantidad);
          }
        }
      });
      // --- Fin bloque opcional ---
      */

      // 3. Primero agregar todos los productos únicos (con o sin variantes)
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

      // 4. Luego agregar las variantes con stock
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
        agrupados[key].tallas[talla] = {
          entrada: 0,
          salida: 0,
          total: v.stock_actual || 0,
          variante_id: v.variante_id,
          /*
          // Para reactivar movimientos:
          ...movMap.get(v.variante_id)
          */
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
  }, [supabase]);

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
    setSoloConStock(false);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, filtroTipo, filtroColor, soloConStock]);

  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProductos = useMemo(() => {
    const start = Math.max(0, (currentPage - 1) * ITEMS_PER_PAGE);
    return productosFiltrados.slice(start, start + ITEMS_PER_PAGE);
  }, [productosFiltrados, currentPage]);

  const showingStart = productosFiltrados.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingEnd = productosFiltrados.length === 0 ? 0 : Math.min(currentPage * ITEMS_PER_PAGE, productosFiltrados.length);
  const canGoPrev = currentPage > 1 && productosFiltrados.length > 0;
  const canGoNext = currentPage < totalPages && productosFiltrados.length > 0;

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
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Inventario</h1>
              <p className="text-white/80 text-sm mt-1">
                {(() => {
                  const fecha = new Date();
                  const fechaFormateada = fecha.toLocaleDateString("es-CL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                  const horaActual = fecha.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return `${fechaFormateada} · ${horaActual}`;
                })()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
              </svg>
              <span className="text-sm font-semibold">Bodega principal</span>
            </div>

            <button
              onClick={() => setModalDisenoAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-semibold shadow hover:shadow-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar nuevo producto
            </button>

            <button
              onClick={() => setModalStockAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-semibold shadow hover:shadow-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar stock
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

          {/* Toggle Solo Con Stock */}
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={soloConStock}
                onChange={(e) => setSoloConStock(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-purple-900">
                Solo tallas con stock
              </span>
            </label>
          </div>
        </div>

        {/* Indicadores de filtros activos */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {(busqueda || filtroTipo !== "todos" || filtroColor !== "todos" || soloConStock) && (
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
          {soloConStock && (
            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              Solo con stock
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

      {/* Controles superiores */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {productosFiltrados.length > 0
              ? `Mostrando ${showingStart} – ${showingEnd} de ${productosFiltrados.length} productos`
              : "No hay productos para mostrar"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canGoPrev && setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrev}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página anterior"
            >
              ◀
            </button>

            <select
              value={Math.min(currentPage, totalPages)}
              onChange={(event) => setCurrentPage(Number(event.target.value))}
              className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              aria-label="Seleccionar página"
            >
              {Array.from({ length: Math.max(productosFiltrados.length === 0 ? 0 : totalPages, 0) }, (_, index) => (
                <option key={`page-top-${index + 1}`} value={index + 1}>
                  Página {index + 1}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => canGoNext && setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!canGoNext}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página siguiente"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Tabla principal mejorada */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-slate-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Inventario Detallado
            </h2>
            <div className="flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:items-center sm:gap-4">
              <span className="font-medium">
                {productosFiltrados.length > 0
                  ? `Mostrando ${showingStart} – ${showingEnd} de ${productosFiltrados.length} productos`
                  : "Sin productos para mostrar"}
              </span>
              {productosFiltrados.length > 0 && (
                <span className="font-medium text-emerald-600">
                  Total stock: {productosFiltrados.reduce(
                    (total, prod) =>
                      total +
                      Object.values(prod.tallas).reduce(
                        (sum, talla) => sum + (talla.total || 0),
                        0
                      ),
                    0
                  )}
                </span>
              )}
            </div>
          </div>
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

                {/*
                <th
                  colSpan={tallasAMostrar.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  📥 ENTRADA
                </th>

                <th
                  colSpan={tallasAMostrar.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-orange-500 to-red-600"
                >
                  📤 SALIDA
                </th>
                */}

                {/* STOCK ACTUAL */}
                <th
                  colSpan={tallasAMostrar.length}
                  className="text-center p-4 font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  📦 STOCK ACTUAL
                </th>

                {/* TOTAL GENERAL */}
                <th className="text-center p-4 font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 min-w-[100px]">
                  📊 TOTAL STOCK
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

                {/*
                {tallasAMostrar.map((t) => (
                  <th
                    key={`e-${t}`}
                    className="p-2 text-center text-sm font-bold text-blue-700"
                  >
                    {t}
                  </th>
                ))}
                {tallasAMostrar.map((t) => (
                  <th
                    key={`s-${t}`}
                    className="p-2 text-center text-sm font-bold text-red-700"
                  >
                    {t}
                  </th>
                ))}
                */}
                {tallasAMostrar.map((t) => (
                  <th
                    key={`t-${t}`}
                    className="p-2 text-center text-sm font-bold text-green-700"
                  >
                    {t}
                  </th>
                ))}
                <th className="p-2 text-center text-sm font-bold text-emerald-700">
                  Σ Total Stock
                </th>
                <th className="sticky right-0 bg-gray-50/95 z-20"></th>
              </tr>
            </thead>

            <tbody>
              {paginatedProductos.map((prod, idx) => (
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

                  {/*
                  {tallasAMostrar.map((t) => (
                    <td
                      key={`e-${t}`}
                      className="p-2 text-center bg-blue-50/50 text-sm font-semibold"
                    >
                      {prod.tallas[t]?.entrada || 0}
                    </td>
                  ))}
                  {tallasAMostrar.map((t) => (
                    <td
                      key={`s-${t}`}
                      className="p-2 text-center bg-red-50/50 text-sm font-semibold"
                    >
                      {prod.tallas[t]?.salida || 0}
                    </td>
                  ))}
                  */}
                  {tallasAMostrar.map((t) => {
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

                  {/* TOTAL GENERAL */}
                  <td className="p-2 text-center font-bold text-lg bg-emerald-50 text-emerald-700">
                    {Object.values(prod.tallas).reduce((total, talla) => total + (talla.total || 0), 0)}
                  </td>

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
                  <td colSpan={4 + (tallasAMostrar.length * 3) + 2} className="p-8 text-center text-gray-500">
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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            {productosFiltrados.length > 0
              ? `Mostrando ${showingStart} – ${showingEnd} de ${productosFiltrados.length} productos`
              : "No hay productos para mostrar"}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canGoPrev && setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrev}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página anterior"
            >
              ◀
            </button>

            <select
              value={Math.min(currentPage, totalPages)}
              onChange={(event) => setCurrentPage(Number(event.target.value))}
              className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              aria-label="Seleccionar página"
            >
              {Array.from({ length: Math.max(productosFiltrados.length === 0 ? 0 : totalPages, 0) }, (_, index) => (
                <option key={`page-${index + 1}`} value={index + 1}>
                  Página {index + 1}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => canGoNext && setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={!canGoNext}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Página siguiente"
            >
              ▶
            </button>
          </div>
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
