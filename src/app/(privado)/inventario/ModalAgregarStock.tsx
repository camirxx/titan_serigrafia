"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { X, Search } from "lucide-react";

type Producto = {
  producto_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string;
};

type Variante = {
  id: number;
  producto_id: number;
  talla: string;
  stock_actual: number;
};

type VarianteAdminRow = {
  producto_id: number;
  diseno: string | null;
  tipo_prenda: string | null;
  color: string | null;
};

type VarianteDetalleRow = {
  variante_id: number;
  producto_id: number;
  talla: string | null;
  stock_actual: number | null;
};

const isVarianteAdminArray = (rows: unknown): rows is VarianteAdminRow[] =>
  Array.isArray(rows) &&
  rows.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return (
      typeof row.producto_id === "number" &&
      (typeof row.diseno === "string" || row.diseno === null) &&
      (typeof row.tipo_prenda === "string" || row.tipo_prenda === null) &&
      (typeof row.color === "string" || row.color === null)
    );
  });

const isVarianteDetalleArray = (rows: unknown): rows is VarianteDetalleRow[] =>
  Array.isArray(rows) &&
  rows.every((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return (
      typeof row.variante_id === "number" &&
      typeof row.producto_id === "number" &&
      (typeof row.talla === "string" || row.talla === null) &&
      (typeof row.stock_actual === "number" || row.stock_actual === null)
    );
  });

type ModalAgregarStockProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const TALLAS = ["S", "M", "L", "XL", "XXL", "XXXL"];

export default function ModalAgregarStock({
  isOpen,
  onClose,
  onSuccess,
}: ModalAgregarStockProps) {
  const supabase = supabaseBrowser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [mostrarLista, setMostrarLista] = useState(false);

  const [cantidades, setCantidades] = useState<Record<string, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
    XXXL: 0,
  });
  const [referencia, setReferencia] = useState("");

  // ----- CARGA DE PRODUCTOS (memorizada) -----
  const cargarProductos = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from("variantes_admin_view")
        .select("producto_id, diseno, tipo_prenda, color, producto_activo")
        .eq("producto_activo", true)
        .order("tipo_prenda", { ascending: true })
        .order("diseno", { ascending: true });

      if (err) throw err;

      const productosUnicos = new Map<number, Producto>();
      const rows = isVarianteAdminArray(data) ? data : [];

      rows.forEach((v) => {
        if (!productosUnicos.has(v.producto_id)) {
          productosUnicos.set(v.producto_id, {
            producto_id: v.producto_id,
            diseno: v.diseno || "Sin diseño",
            tipo_prenda: v.tipo_prenda || "Sin tipo",
            color: v.color || "Sin color",
          });
        }
      });

      setProductos(Array.from(productosUnicos.values()));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error cargando productos";
      setError(message);
    }
  }, [supabase]);

  // ----- CARGA DE VARIANTES (memorizada) -----
  const cargarVariantes = useCallback(
    async (productoId: number) => {
      setError(null);
      try {
        const { data, error } = await supabase
          .from("variantes_admin_view")
          .select("variante_id, producto_id, talla, stock_actual")
          .eq("producto_id", productoId)
          .order("variante_id", { ascending: true })
          .range(0, 500);

        if (error) throw error;

        const rows = isVarianteDetalleArray(data) ? data : [];
        const vs: Variante[] = rows.map((r) => ({
          id: r.variante_id,
          producto_id: r.producto_id,
          talla: (r.talla ?? "").trim().toUpperCase(),
          stock_actual: Number(r.stock_actual ?? 0),
        }));

        setVariantes(vs);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error cargando variantes";
        setError(message);
      }
    },
    [supabase]
  );

  // ----- EFFECT: al abrir modal, cargar productos -----
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccess(null);
    cargarProductos();
  }, [isOpen, cargarProductos]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const termino = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        p.diseno.toLowerCase().includes(termino) ||
        p.tipo_prenda.toLowerCase().includes(termino) ||
        p.color.toLowerCase().includes(termino)
    );
  }, [productos, busqueda]);

  const seleccionarProducto = async (producto: Producto) => {
    setProductoSeleccionado(producto);
    setBusqueda(
      `${producto.tipo_prenda} - ${producto.diseno} - ${producto.color}`
    );
    setMostrarLista(false);
    setCantidades({ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 });
    await cargarVariantes(producto.producto_id);
  };

  const handleCantidadChange = (talla: string, valor: string) => {
    const num = parseInt(valor) || 0;
    setCantidades((prev) => ({ ...prev, [talla]: num < 0 ? 0 : num }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!productoSeleccionado) {
      setError("Debes seleccionar un producto");
      return;
    }

    const totalCantidad = Object.values(cantidades).reduce(
      (sum, c) => sum + c,
      0
    );
    if (totalCantidad === 0) {
      setError("Debes ingresar al menos una cantidad mayor a 0");
      return;
    }

    setLoading(true);
    try {
      const ref = referencia.trim() || "entrada_manual";

      // Asegura variantes cargadas
      if (variantes.length === 0) {
        await cargarVariantes(productoSeleccionado.producto_id);
      }

      const variantesNorm = variantes.map((v) => ({
        ...v,
        talla: (v.talla ?? "").trim().toUpperCase(),
      }));

      for (const talla of TALLAS) {
        const cantidad = Number(cantidades[talla] || 0);
        if (cantidad > 0) {
          const tallaKey = talla.toUpperCase().trim();
          const variante = variantesNorm.find(
            (v) => (v.talla ?? "") === tallaKey
          );
          if (!variante) {
            throw new Error(`No se encontró variante para talla ${talla}`);
          }

          const { error: errRpc } = await supabase.rpc("ajustar_stock", {
            p_variante_id: variante.id,
            p_tipo: "entrada",
            p_cantidad: cantidad,
            p_referencia: ref,
          });
          if (errRpc) throw errRpc;
        }
      }

      setSuccess(`Stock agregado correctamente: ${totalCantidad} unidades`);
      await cargarVariantes(productoSeleccionado.producto_id);
      await onSuccess();

      limpiarFormulario();
      setTimeout(() => onClose(), 800);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al agregar stock";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setBusqueda("");
    setProductoSeleccionado(null);
    setVariantes([]);
    setCantidades({ S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 });
    setReferencia("");
    setError(null);
    setSuccess(null);
  };

  const totalUnidades = Object.values(cantidades).reduce(
    (sum, c) => sum + c,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slideUp">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-6 flex items-center justify-between z-10 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/80 mb-1">
                Inventario
              </p>
              <h2 className="text-3xl font-bold">
                Agregar Stock a Productos
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 hover:rotate-90 transform"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-7 space-y-7 max-h-[calc(90vh-120px)] overflow-y-auto">
          {error && (
            <div className="rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 font-semibold">{success}</p>
              </div>
            </div>
          )}

          <div className="relative">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar Producto *
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setMostrarLista(true);
                  if (!e.target.value) setProductoSeleccionado(null);
                }}
                onFocus={() => setMostrarLista(true)}
                placeholder="Escribe para buscar por diseño, tipo o color..."
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none text-base"
                disabled={loading}
              />
            </div>

            {mostrarLista && busqueda && productosFiltrados.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white border-2 border-indigo-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                <div className="p-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200 sticky top-0">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {productosFiltrados.length} productos encontrados
                  </p>
                </div>
                {productosFiltrados.map((producto) => (
                  <button
                    key={producto.producto_id}
                    onClick={() => seleccionarProducto(producto)}
                    className="w-full text-left px-5 py-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100 last:border-0 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 group-hover:text-indigo-700 transition-colors mb-1">
                          {producto.diseno}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full font-medium">
                            {producto.tipo_prenda}
                          </span>
                          <span>·</span>
                          <span>{producto.color}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mostrarLista && busqueda && productosFiltrados.length === 0 && (
              <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-300 rounded-xl shadow-xl p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 font-semibold">No se encontraron productos</p>
                <p className="text-gray-500 text-sm mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>

          {productoSeleccionado && (
            <>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-3 rounded-xl">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold mb-2">
                      Producto seleccionado
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {productoSeleccionado.diseno}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-3 py-1 bg-white rounded-full font-semibold text-indigo-700">
                        {productoSeleccionado.tipo_prenda}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-700 font-medium">{productoSeleccionado.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Cantidad por talla
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TALLAS.map((talla) => {
                    const variante = variantes.find((v) => v.talla === talla);
                    const stockActual = variante?.stock_actual ?? 0;
                    return (
                      <div
                        key={talla}
                        className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 hover:border-indigo-300 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-2xl text-gray-900">
                            {talla}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            stockActual === 0 ? 'bg-red-100 text-red-700' :
                            stockActual <= 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            Stock: {stockActual}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={cantidades[talla] || ""}
                          onChange={(e) =>
                            handleCantidadChange(talla, e.target.value)
                          }
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-center text-xl font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
                          placeholder="0"
                          disabled={loading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-slate-100 border-2 border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Referencia o nota
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
                    placeholder="Ej: reposición proveedor, compra local..."
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-indigo-200">
                  <span className="text-sm font-bold text-gray-700">Total a ingresar:</span>
                  <span className="text-3xl font-bold text-indigo-600">
                    {totalUnidades} <span className="text-lg">unidades</span>
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
            <button
              onClick={() => {
                limpiarFormulario();
                onClose();
              }}
              disabled={loading}
              className="flex-1 py-4 px-6 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 hover:border-gray-400 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                !productoSeleccionado ||
                totalUnidades === 0 ||
                variantes.length === 0
              }
              className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Stock
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
