'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';

// Mapeo de nombres de colores a códigos hexadecimales
const COLOR_MAP: Record<string, string> = {
  'NEGRO': '#000000',
  'BLANCO': '#FFFFFF',
  'ROJO': '#DC2626',
  'AZUL': '#2563EB',
  'VERDE': '#16A34A',
  'AMARILLO': '#EAB308',
  'NARANJA': '#EA580C',
  'ROSA': '#EC4899',
  'MORADO': '#9333EA',
  'VIOLETA': '#7C3AED',
  'GRIS': '#6B7280',
  'CAFE': '#92400E',
  'CAFÉ': '#92400E',
  'MARRON': '#78350F',
  'MARRÓN': '#78350F',
  'BEIGE': '#D4A574',
  'CELESTE': '#7DD3FC',
  'TURQUESA': '#14B8A6',
  'FUCSIA': '#D946EF',
  'LILA': '#C084FC',
  'ARENA': '#E7C9A9',
  'CREMA': '#FEF3C7',
  'DORADO': '#F59E0B',
  'PLATEADO': '#D1D5DB',
  'VINO': '#7F1D1D',
  'NAVY': '#1E3A8A',
  'CORAL': '#FB7185',
  'MENTA': '#6EE7B7',
  'LAVANDA': '#DDD6FE',
};

function getColorHex(colorName: string): string {
  const upper = colorName.toUpperCase().trim();
  return COLOR_MAP[upper] || '#94A3B8'; // slate-400 como default
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
  tallas: Map<string, number>; // talla -> stock
  totalStock: number;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando stock';
}

export default function EstadoStockPage() {
  const [critico, setCritico] = useState(5);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function cargar() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('variantes_admin_view')
        .select('variante_id,diseno,tipo_prenda,color,talla,stock_actual')
        .order('stock_actual', { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);

      const list = Array.isArray(data) ? data : [];
      const cleaned: Row[] = list.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          variante_id: Number(rec.variante_id ?? 0),
          diseno: String(rec.diseno ?? ''),
          tipo_prenda: String(rec.tipo_prenda ?? ''),
          color: String(rec.color ?? 'Sin color'),
          talla: String(rec.talla ?? ''),
          stock_actual: Number(rec.stock_actual ?? 0),
        };
      });

      setRows(cleaned);
    } catch (e: unknown) {
      setRows([]);
      setErrorMsg(toMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Agrupar productos por diseño + tipo + color
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, GroupedProduct>();
    
    for (const row of rows) {
      const key = `${row.diseno}|${row.tipo_prenda}|${row.color}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          diseno: row.diseno,
          tipo_prenda: row.tipo_prenda,
          color: row.color,
          tallas: new Map(),
          totalStock: 0,
        });
      }
      
      const group = groups.get(key)!;
      group.tallas.set(row.talla, row.stock_actual);
      group.totalStock += row.stock_actual;
    }
    
    return Array.from(groups.values()).sort((a, b) => a.totalStock - b.totalStock);
  }, [rows]);

  // Obtener todas las tallas únicas ordenadas
  const allSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const row of rows) {
      sizes.add(row.talla);
    }
    // Ordenar tallas de forma lógica
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    return Array.from(sizes).sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [rows]);

  const low = useMemo(
    () => rows.filter((r) => r.stock_actual <= critico),
    [rows, critico]
  );

  const handleExportCSV = () => {
    const columnsMap = {
      diseno: 'Diseño',
      tipo_prenda: 'Tipo Prenda',
      color: 'Color',
      talla: 'Talla',
      stock_actual: 'Stock Actual'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToCSV(preparedData, `stock_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const columnsMap = {
      diseno: 'Diseño',
      tipo_prenda: 'Tipo Prenda',
      color: 'Color',
      talla: 'Talla',
      stock_actual: 'Stock Actual'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToExcel(preparedData, `stock_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Estado del Stock</h1>
            <p className="text-white/80 text-sm mt-1">Inventario agrupado por diseño y tallas disponibles</p>
          </div>
        </div>
      </div>

      {/* Controles y filtros */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">⚠️ Stock Crítico ≤</label>
            <input
              type="number"
              className="w-24 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              value={critico}
              onChange={(e) => setCritico(Number(e.target.value || 0))}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-gradient-to-r from-red-100 to-orange-100 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold text-red-700">
                Alertas: {low.length} / {rows.length}
              </span>
            </div>

            <div className="ml-auto flex gap-3">
              <button
                onClick={cargar}
                className="h-11 px-5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Actualizando…
                  </span>
                ) : '🔄 Recargar'}
              </button>
              <button
                onClick={handleExportCSV}
                className="h-11 px-5 rounded-lg border-2 border-indigo-300 bg-white text-indigo-700 font-semibold hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rows.length}
              >
                📄 CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="h-11 px-5 rounded-lg border-2 border-green-300 bg-white text-green-700 font-semibold hover:bg-green-50 hover:border-green-400 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rows.length}
              >
                📊 Excel
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Tabla agrupada por diseño */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Inventario por Diseño
              <span className="ml-auto text-sm font-normal text-gray-600">
                {groupedProducts.length} productos únicos
              </span>
            </h2>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">👕 Diseño</th>
                  <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">📦 Tipo</th>
                  <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">🎨 Color</th>
                  {allSizes.map((size) => (
                    <th key={size} className="text-center p-4 font-bold text-gray-700 border-b-2 border-indigo-200">
                      {size}
                    </th>
                  ))}
                  <th className="text-right p-4 font-bold text-gray-700 border-b-2 border-indigo-200">📊 Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedProducts.map((product, idx) => {
                  const hasLowStock = Array.from(product.tallas.values()).some(stock => stock <= critico);
                  return (
                    <tr 
                      key={`${product.diseno}-${product.tipo_prenda}-${product.color}-${idx}`}
                      className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group ${
                        hasLowStock ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-bold text-gray-800 text-base group-hover:text-indigo-600 transition-colors">
                          {product.diseno}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-700 font-medium">{product.tipo_prenda}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <span
                              className="inline-block w-8 h-8 rounded-lg border-2 border-gray-300 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200"
                              style={{ 
                                backgroundColor: getColorHex(product.color),
                                boxShadow: `0 4px 6px -1px ${getColorHex(product.color)}40`
                              }}
                              title={product.color}
                            />
                            {product.color.toUpperCase() === 'BLANCO' && (
                              <span className="absolute inset-0 rounded-lg border border-gray-400" />
                            )}
                          </div>
                          <span className="font-medium text-gray-700 group-hover:text-gray-900">{product.color}</span>
                        </div>
                      </td>
                      {allSizes.map((size) => {
                        const stock = product.tallas.get(size);
                        const isCritical = stock !== undefined && stock <= critico;
                        const isEmpty = stock === undefined || stock === 0;
                        
                        return (
                          <td key={size} className="p-4 text-center">
                            {stock !== undefined ? (
                              <span className={`inline-flex items-center justify-center min-w-[50px] px-3 py-1.5 font-bold rounded-lg transition-all duration-200 ${
                                isCritical
                                  ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 ring-2 ring-red-300'
                                  : isEmpty
                                  ? 'bg-gray-100 text-gray-400'
                                  : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                              }`}>
                                {stock}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xl">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[60px] px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-bold rounded-lg text-base">
                          {product.totalStock}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!groupedProducts.length && !loading && (
                  <tr>
                    <td colSpan={allSizes.length + 4} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-lg font-semibold">Sin datos disponibles</span>
                        <span className="text-sm">Haz clic en Recargar para actualizar el inventario</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}