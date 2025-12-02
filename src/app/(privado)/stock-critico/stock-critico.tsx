'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ReportHeader from '@/components/ReportHeader';
import { Boxes, ChevronLeft, ChevronRight, Mail, MessageSquare } from 'lucide-react';
import ModalModCorreo from './ModalModCorreo';
import ModalEnviarMensaje from './ModalEnviarMensaje';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Mapeo de colores
const COLOR_MAP: Record<string, string> = {
  'NEGRO': '#000000', 'BLANCO': '#FFFFFF', 'ROJO': '#DC2626',
  'AZUL': '#2563EB', 'VERDE': '#16A34A', 'AMARILLO': '#EAB308',
  'NARANJA': '#EA580C', 'ROSA': '#EC4899', 'MORADO': '#9333EA',
  'VIOLETA': '#7C3AED', 'GRIS': '#6B7280', 'CAFE': '#92400E',
  'CAFÉ': '#92400E', 'MARRON': '#78350F', 'MARRÓN': '#78350F',
  'BEIGE': '#D4A574', 'CELESTE': '#7DD3FC', 'TURQUESA': '#14B8A6',
  'FUCSIA': '#D946EF', 'LILA': '#C084FC', 'ARENA': '#E7C9A9',
  'CREMA': '#FEF3C7', 'DORADO': '#F59E0B', 'PLATEADO': '#D1D5DB',
  'VINO': '#7F1D1D', 'NAVY': '#1E3A8A', 'CORAL': '#FB7185',
  'MENTA': '#6EE7B7', 'LAVANDA': '#DDD6FE',
};

function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName.toUpperCase().trim()] || '#94A3B8';
}

type Row = {
  variante_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string;
  talla: string;
  stock_actual: number;
};

type GroupedProduct = {
  diseno: string;
  tipo_prenda: string;
  color: string;
  tallas: Map<string, number>;
  stock_actual: number;
};

export const EstadoStockPage: React.FC = () => {
  
  // ✅ Guardar el correo del taller
  const [correoTaller, setCorreoTaller] = useState<string>('');

  // Estados del componente
  const [critico, setCritico] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stock-critico-umbral');
      return saved ? Number(saved) : 5;
    }
    return 5;
  });
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Estados para los modales
  const [modalCorreoAbierto, setModalCorreoAbierto] = useState<boolean>(false);
  const [modalMensajeAbierto, setModalMensajeAbierto] = useState<boolean>(false);

  const handleCriticoChange = (value: number) => {
    setCritico(value);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stock-critico-umbral', value.toString());
    }
  };

  // ✅ Cargar el correo del taller al inicio
  async function cargarCorreoTaller() {
    try {
      const { data, error } = await supabase
        .from('configuracion_taller')
        .select('correo')
        .eq('id', 1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando correo del taller:', error);
        return;
      }

      if (data?.correo) {
        setCorreoTaller(data.correo);
        console.log('✅ Correo del taller cargado:', data.correo);
      } else {
        console.log('⚠️ No hay correo configurado');
      }
    } catch (err) {
      console.error('Error inesperado cargando correo:', err);
    }
  }

  async function cargar() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { data: todosProductos, error: errProductos } = await supabase
        .from("productos")
        .select(`
          id,
          disenos!inner(nombre),
          tipos_prenda!inner(nombre),
          colores(nombre)
        `)
        .eq("activo", true)
        .eq("tienda_id", 1);

      if (errProductos) throw new Error(errProductos.message);

      const productosUnicos = new Map<number, { diseno: string; tipo_prenda: string; color: string }>();

      interface Producto {
        id: number | string;
        disenos: { nombre: string } | { nombre: string }[];
        tipos_prenda: { nombre: string } | { nombre: string }[];
        colores: { nombre: string } | { nombre: string }[] | null;
      }

      interface Variante {
        id: number | string;
        producto_id: number | string;
        talla: string;
        stock_actual: number;
      }

      todosProductos?.forEach((p: Producto) => {
        productosUnicos.set(Number(p.id), {
          diseno: Array.isArray(p.disenos) ? p.disenos[0]?.nombre || "Sin diseño" : p.disenos?.nombre || "Sin diseño",
          tipo_prenda: Array.isArray(p.tipos_prenda) ? p.tipos_prenda[0]?.nombre || "Sin tipo" : p.tipos_prenda?.nombre || "Sin tipo",
          color: Array.isArray(p.colores) ? p.colores[0]?.nombre || "Sin color" : p.colores?.nombre || "Sin color",
        });
      });

      let allVariantes: Variante[] = [];
      let start = 0;
      const batchSize = 1000;

      while (true) {
        const { data: batch, error } = await supabase
          .from("variantes")
          .select("id, producto_id, talla, stock_actual")
          .order("id", { ascending: true })
          .range(start, start + batchSize - 1);

        if (error) throw new Error(error.message);
        if (!batch || batch.length === 0) break;

        allVariantes = allVariantes.concat(batch);
        if (batch.length < batchSize) break;
        start += batchSize;
      }

      const variantesFiltradas = allVariantes
        .filter((v) => productosUnicos.has(Number(v.producto_id)))
        .map((v) => {
          const info = productosUnicos.get(Number(v.producto_id));
          return {
            variante_id: Number(v.id),
            diseno: info?.diseno || "Sin diseño",
            tipo_prenda: info?.tipo_prenda || "Sin tipo",
            color: info?.color || "Sin color",
            talla: v.talla || "N/A",
            stock_actual: v.stock_actual || 0,
          };
        });

      setRows(variantesFiltradas);
    } catch (e: unknown) {
      setRows([]);
      setErrorMsg(e instanceof Error ? e.message : 'Error cargando stock');
    } finally {
      setLoading(false);
    }
  }

  // ✅ Cargar datos al montar el componente
  useEffect(() => {
    cargar();
    cargarCorreoTaller();
  }, []);

  // Agrupar productos (SIN filtrar por stock crítico aún)
  const allGroupedProducts: GroupedProduct[] = useMemo(() => {
    const groups = new Map<string, GroupedProduct>();
    
    let filteredRows = rows;
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filteredRows = rows.filter(row => 
        row.diseno.toLowerCase().includes(term) ||
        row.tipo_prenda.toLowerCase().includes(term) ||
        row.color.toLowerCase().includes(term)
      );
    }
    
    // Agrupar TODOS los productos
    for (const row of filteredRows) {
      const key = `${row.diseno}|${row.tipo_prenda}|${row.color}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          diseno: row.diseno,
          tipo_prenda: row.tipo_prenda,
          color: row.color,
          tallas: new Map(),
          stock_actual: 0,
        });
      }
      
      const group = groups.get(key)!;
      const currentStock = group.tallas.get(row.talla) || 0;
      group.tallas.set(row.talla, currentStock + row.stock_actual);
      group.stock_actual += row.stock_actual;
    }
    
    return Array.from(groups.values())
      .sort((a, b) => a.stock_actual - b.stock_actual);
  }, [rows, searchTerm]);

  // ✅ Filtrar para mostrar en la tabla según umbral actual
  const groupedProducts: GroupedProduct[] = useMemo(() => {
    return allGroupedProducts.filter(product => {
      return Array.from(product.tallas.values()).some(stock => stock <= critico);
    });
  }, [allGroupedProducts, critico]);

  const allSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    rows.forEach((row) => {
      if (row.talla && row.talla !== "N/A") {
        sizesSet.add(row.talla);
      }
    });

    const tallasEstandar = ["S", "M", "L", "XL", "XXL", "XXXL"];
    const tallasOrdenadas = tallasEstandar.filter((t) => sizesSet.has(t));
    const tallasExtras = [...sizesSet].filter(
      (t) => !tallasEstandar.includes(t)
    ).sort();

    return [...tallasOrdenadas, ...tallasExtras];
  }, [rows]);

  const totalPages = Math.ceil(groupedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = groupedProducts.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, critico, itemsPerPage]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {groupedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                ⚠️ {groupedProducts.length} productos con stock crítico (≤ {critico} unidades)
              </h3>
              <div className="mt-1 text-sm text-red-700">
                <p>Revisa y repone los productos marcados en rojo.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportHeader
        title="Stock Crítico"
        icon={<Boxes className="w-8 h-8" />}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setModalCorreoAbierto(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-purple-700 font-semibold shadow hover:shadow-lg transition"
            >
              <Mail className="h-4 w-4" />
              {correoTaller ? 'Modificar correo' : 'Configurar correo'}
            </button>
            <button
              onClick={() => {
                if (!correoTaller) {
                  toast.warning('⚠️ Primero configura el correo del taller');
                  setModalCorreoAbierto(true);
                } else {
                  setModalMensajeAbierto(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow hover:shadow-lg transition disabled:opacity-50"
              disabled={groupedProducts.length === 0}
            >
              <MessageSquare className="h-4 w-4" />
              Enviar alerta
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px]">
            <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-1">
              🔍 Buscar
            </label>
            <input
              id="search"
              type="text"
              placeholder="Diseño, tipo o color..."
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              ⚠️ Stock Crítico ≤
            </label>
            <input
              type="number"
              min="0"
              className="w-24 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              value={critico}
              onChange={(e) => handleCriticoChange(Number(e.target.value || 0))}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Mostrar:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">{errorMsg}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Stock Crítico
            </h2>
            <span className="text-sm font-normal text-gray-600">
              {groupedProducts.length} productos con stock bajo
            </span>
          </div>
        </div>

        {groupedProducts.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{startIndex + 1}</span> - <span className="font-semibold">{Math.min(endIndex, groupedProducts.length)}</span> de <span className="font-semibold">{groupedProducts.length}</span> productos
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-black p-2 rounded-lg border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-black font-semibold">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-black p-2 rounded-lg border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-red-50 to-orange-50 sticky top-0 z-10">
              <tr>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-red-200">#</th>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-red-200">👕 Diseño</th>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-red-200">📦 Tipo</th>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-red-200">🎨 Color</th>
                {allSizes.map((size) => (
                  <th key={size} className="text-center p-4 font-bold text-gray-700 border-b-2 border-red-200">
                    {size}
                  </th>
                ))}
                <th className="text-right p-4 font-bold text-gray-700 border-b-2 border-red-200">📊 Total</th>
              </tr>
            </thead>
            <tbody>
              {currentProducts.map((product, idx) => (
                <tr 
                  key={`${product.diseno}-${product.tipo_prenda}-${product.color}-${idx}`}
                  className="border-b border-gray-100 hover:bg-red-50 transition-all duration-200 bg-red-50/30"
                >
                  <td className="p-4 font-bold text-gray-600">{startIndex + idx + 1}</td>
                  <td className="p-4">
                    <span className="font-bold text-gray-800">{product.diseno}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-700 font-medium">{product.tipo_prenda}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block w-8 h-8 rounded-lg border-2 border-gray-300 shadow-md"
                        style={{ 
                          backgroundColor: getColorHex(product.color),
                          boxShadow: `0 4px 6px -1px ${getColorHex(product.color)}40`
                        }}
                      />
                      <span className="font-medium text-gray-700">{product.color}</span>
                    </div>
                  </td>
                  {allSizes.map((size) => {
                    const stock = product.tallas.get(size);
                    const isCritical = stock !== undefined && stock <= critico;
                    
                    return (
                      <td key={size} className="p-4 text-center">
                        {stock !== undefined ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[80px] px-4 py-2 font-bold rounded-lg ${
                              isCritical
                                ? 'bg-red-200 text-red-800 ring-2 ring-red-400 animate-pulse'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {stock}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xl">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-4 text-right">
                    <span className="inline-flex items-center justify-center min-w-[90px] px-4 py-2 bg-red-200 text-red-800 font-bold rounded-lg ring-2 ring-red-400">
                      {product.stock_actual}
                    </span>
                  </td>
                </tr>
              ))}
              {currentProducts.length === 0 && !loading && (
                <tr>
                  <td colSpan={allSizes.length + 5} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-lg font-semibold text-green-600">✅ ¡Todo bien!</span>
                      <span className="text-sm">No hay productos con stock crítico (≤ {critico} unidades)</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {groupedProducts.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{startIndex + 1}</span> - <span className="font-semibold">{Math.min(endIndex, groupedProducts.length)}</span> de <span className="font-semibold">{groupedProducts.length}</span> productos
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-black p-2 rounded-lg border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-black font-semibold">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-black p-2 rounded-lg border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Modales */}
      <ModalModCorreo
        isOpen={modalCorreoAbierto}
        onClose={() => setModalCorreoAbierto(false)}
        correoActualProp={correoTaller}
        onSuccess={(nuevoCorreo: string) => {
          setCorreoTaller(nuevoCorreo);
          toast.success("✅ Correo actualizado correctamente");
          setModalCorreoAbierto(false);
        }}
      />

      <ModalEnviarMensaje
        isOpen={modalMensajeAbierto}
        onClose={() => setModalMensajeAbierto(false)}
        productos={allGroupedProducts}
        correoTaller={correoTaller}
        umbralActual={critico}
      />
    </div>
  );
}