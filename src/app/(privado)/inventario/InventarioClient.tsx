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
  polera: 1,
  poleron: 2,
  canguro: 3,
  buzo: 4,
  short: 5,
  pantalon: 6,
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
    productos.forEach((prod) => {
      Object.keys(prod.tallas).forEach((talla) => {
        tallasSet.add(talla);
      });
    });

    // Ordenar: primero las tallas estándar, luego las adicionales alfabéticamente
    const tallasEstandar = ["S", "M", "L", "XL", "XXL", "XXXL"];
    const tallasOrdenadas = [...tallasEstandar.filter((t) => tallasSet.has(t))];
    const tallasExtras = [...tallasSet]
      .filter((t) => !tallasEstandar.includes(t))
      .sort();

    return [...tallasOrdenadas, ...tallasExtras];
  }, [productos]);

  // Filtrar tallas según la opción seleccionada
  const tallasAMostrar = useMemo(() => {
    if (!soloConStock) return todasLasTallas;

    const tallasConStock = new Set<string>();
    productos.forEach((prod) => {
      Object.keys(prod.tallas).forEach((talla) => {
        if ((prod.tallas[talla]?.total || 0) > 0) {
          tallasConStock.add(talla);
        }
      });
    });

    return [...tallasConStock].sort();
  }, [productos, todasLasTallas, soloConStock]);

  // ---- CARGAR INVENTARIO ----
  const cargarInventario = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar SOLO productos de la TIENDA 1 (Tienda Principal)
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

      todosProductos?.forEach((p: any) => {
        productosUnicos.set(p.id, {
          diseno: p.disenos?.nombre || "Sin diseño",
          tipo_prenda: p.tipos_prenda?.nombre || "Sin tipo",
          color: p.colores?.nombre || "Sin color",
        });
      });

      // 2. Cargar TODAS las variantes paginando
      let allVariantes: VarianteInventario[] = [];
      let start = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from("variantes")
          .select("id, producto_id, talla, stock_actual")
          .order("id", { ascending: true })
          .range(start, start + batchSize - 1);

        if (error) throw error;
        if (!batch || batch.length === 0) break;

        allVariantes = allVariantes.concat(batch as VarianteInventario[]);
        if (batch.length < batchSize) break;
        start += batchSize;
      }

      // 3. Filtrar variantes que no pertenecen a la tienda 1
      const variantesFiltradas = allVariantes
        .filter((v) => productosUnicos.has(v.producto_id))
        .map((v) => {
          const info = productosUnicos.get(v.producto_id);
          return {
            variante_id: v.id,
            producto_id: v.producto_id,
            talla: v.talla || "N/A",
            stock_actual: v.stock_actual,
            diseno: info?.diseno || "Sin diseño",
            tipo_prenda: info?.tipo_prenda || "Sin tipo",
            color: info?.color || "Sin color",
            producto_activo: true,
          };
        });

      // 4. Agrupar datos
      const agrupados: { [key: string]: ProductoAgrupado } = {};

      // Inicializar con todos los productos (aunque no tengan stock)
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

      // Llenar stock
      variantesFiltradas.forEach((v) => {
        const key = `${v.producto_id}`;
        if (!agrupados[key]) return; // Seguridad extra

        const talla = v.talla || "N/A";
        agrupados[key].tallas[talla] = {
          entrada: 0,
          salida: 0,
          total: v.stock_actual || 0,
          variante_id: v.variante_id,
        };
      });

      setProductos(Object.values(agrupados));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar inventario";
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  // Listas para filtros
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(productos.map((p) => p.tipo_prenda));
    return Array.from(tipos).sort();
  }, [productos]);

  const coloresUnicos = useMemo(() => {
    const colores = new Set(productos.map((p) => p.color));
    return Array.from(colores).sort();
  }, [productos]);

  // Lógica de filtrado y orden
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((prod) => {
      const texto = busqueda.toLowerCase().trim();
      const coincideTexto =
        !texto ||
        prod.diseno.toLowerCase().includes(texto) ||
        prod.tipo_prenda.toLowerCase().includes(texto) ||
        prod.color.toLowerCase().includes(texto);

      const coincideTipo = filtroTipo === "todos" || prod.tipo_prenda === filtroTipo;
      const coincideColor = filtroColor === "todos" || prod.color === filtroColor;

      return coincideTexto && coincideTipo && coincideColor;
    });

    return filtrados.sort((a, b) => {
      const ordenA = ORDEN_CATEGORIAS[a.tipo_prenda.toLowerCase()] || 999;
      const ordenB = ORDEN_CATEGORIAS[b.tipo_prenda.toLowerCase()] || 999;
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.diseno.localeCompare(b.diseno);
    });
  }, [productos, busqueda, filtroTipo, filtroColor]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipo("todos");
    setFiltroColor("todos");
    setSoloConStock(false);
  };

  // Paginación
  useEffect(() => setCurrentPage(1), [busqueda, filtroTipo, filtroColor, soloConStock]);
  
  const totalPages = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));
  
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
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
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Inventario</h1>
              <p className="text-white/80 text-sm mt-1">
                {new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setModalDisenoAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-semibold shadow hover:shadow-lg transition"
            >
              + Nuevo producto
            </button>
            <button
              onClick={() => setModalStockAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-semibold shadow hover:shadow-lg transition"
            >
              + Agregar stock
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-purple-900 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="todos">Todos</option>
              {tiposUnicos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">Color</label>
            <select
              value={filtroColor}
              onChange={(e) => setFiltroColor(e.target.value)}
              className="w-full border border-purple-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="todos">Todos</option>
              {coloresUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {(busqueda || filtroTipo !== "todos" || filtroColor !== "todos") && (
          <div className="mt-4">
            <button onClick={limpiarFiltros} className="text-sm text-purple-700 hover:underline">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Mensajes */}
      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">⚠️ {error}</div>}
      {loading && <div className="text-center py-4 text-purple-700">Cargando...</div>}

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                <th className="p-4 text-left text-gray-700 font-bold sticky left-0 bg-indigo-50 z-20">Estado</th>
                <th className="p-4 text-left text-gray-700 font-bold sticky left-[80px] bg-indigo-50 z-20">Tipo</th>
                <th className="p-4 text-left text-gray-700 font-bold sticky left-[150px] bg-indigo-50 z-20">Diseño</th>
                <th className="p-4 text-left text-gray-700 font-bold">Color</th>
                {tallasAMostrar.map((t) => (
                  <th key={t} className="p-4 text-center font-bold text-white bg-green-600 min-w-[50px]">{t}</th>
                ))}
                <th className="p-4 text-center font-bold text-white bg-emerald-600">Total</th>
                <th className="p-4 text-center text-white bg-gray-700 sticky right-0 z-20">Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProductos.map((prod, idx) => (
                <tr key={idx} className={`border-b border-gray-100 hover:bg-purple-50 transition ${!prod.activo ? "opacity-50" : ""}`}>
                  <td className="p-4 sticky left-0 bg-white z-10">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${prod.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {prod.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-indigo-600 sticky left-[80px] bg-white z-10">{prod.tipo_prenda}</td>
                  <td className="p-4 font-bold text-gray-900 sticky left-[150px] bg-white z-10">{prod.diseno}</td>
                  <td className="p-4 text-gray-700">{prod.color}</td>
                  
                  {tallasAMostrar.map((t) => {
                    const stock = prod.tallas[t]?.total || 0;
                    let bgClass = "bg-purple-50 text-purple-700";
                    if (stock === 0) bgClass = "bg-gray-100 text-gray-400";
                    else if (stock <= 2) bgClass = "bg-red-100 text-red-700";
                    
                    return (
                      <td key={t} className={`p-2 text-center font-bold text-sm ${bgClass}`}>
                        {stock}
                      </td>
                    );
                  })}
                  
                  <td className="p-2 text-center font-bold text-lg bg-emerald-50 text-emerald-700">
                    {Object.values(prod.tallas).reduce((acc, curr) => acc + (curr.total || 0), 0)}
                  </td>
                  
                  <td className="p-2 sticky right-0 bg-white z-10">
                    <button
                      onClick={() => abrirModalEditar(prod)}
                      className="w-full py-2 px-3 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación simple */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
        <button
          disabled={!canGoPrev}
          onClick={() => setCurrentPage(p => p - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span>Página {currentPage} de {totalPages}</span>
        <button
          disabled={!canGoNext}
          onClick={() => setCurrentPage(p => p + 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      {/* Modales */}
      <ModalAgregarDiseno
        isOpen={modalDisenoAbierto}
        onClose={() => setModalDisenoAbierto(false)}
        onSuccess={cargarInventario}
      />
      <ModalAgregarStock
        isOpen={modalStockAbierto}
        onClose={() => setModalStockAbierto(false)}
        onSuccess={cargarInventario}
      />
      <ModalEditarProducto
        isOpen={modalEditarAbierto}
        onClose={() => {
          setModalEditarAbierto(false);
          setProductoEditar(null);
        }}
        producto={productoEditar}
        onSuccess={cargarInventario}
      />
    </div>
  );
}