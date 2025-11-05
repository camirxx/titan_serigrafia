'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';

type Row = {
  producto: string;
  total_unidades: number;
  total_monto: number;
  fecha: string;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando reporte';
}

// Colores vibrantes para el gráfico con gradientes
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', 
  '#10b981', '#3b82f6', '#14b8a6', '#f97316',
  '#ef4444', '#a855f7', '#06b6d4', '#84cc16'
];

export default function VentasPorProductoPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      let q = supabase
        .from('ventas_por_producto_view')
        .select('producto,total_unidades,total_monto,fecha');

      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      const { data, error } = await q
        .order('total_unidades', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      const list = Array.isArray(data) ? data : [];
      const cleaned: Row[] = list.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          producto: String(rec.producto ?? ''),
          total_unidades: Number(rec.total_unidades ?? 0),
          total_monto: Number(rec.total_monto ?? 0),
          fecha: String(rec.fecha ?? ''),
        };
      });

      setRows(cleaned);
    } catch (e: unknown) {
      setRows([]);
      setErrorMsg(toMsg(e));
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Datos para el gráfico
  const TOP_N = 12;
  const topData = rows.slice(0, TOP_N).map((r) => ({
    producto: r.producto.length > 30 ? r.producto.substring(0, 30) + '...' : r.producto,
    unidades: r.total_unidades,
    monto: r.total_monto,
  }));

  // Estadísticas resumen
  const totalUnidades = rows.reduce((sum, r) => sum + r.total_unidades, 0);
  const totalMonto = rows.reduce((sum, r) => sum + r.total_monto, 0);

  // Funciones de exportación
  const handleExportCSV = () => {
    const columnsMap = {
      producto: 'Producto',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)',
      fecha: 'Fecha'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToCSV(preparedData, `ventas_producto_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const columnsMap = {
      producto: 'Producto',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)',
      fecha: 'Fecha'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToExcel(preparedData, `ventas_producto_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Moderno con Gradiente */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">Ventas por Producto</h1>
            <p className="text-white/90 text-lg">Análisis detallado de productos más vendidos</p>
          </div>
          {rows.length > 0 && (
            <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl">
              <div className="text-sm text-white/80">Total Productos</div>
              <div className="text-3xl font-bold">{rows.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros Mejorados */}
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha Desde
            </label>
            <input
              type="date"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha Hasta
            </label>
            <input
              type="date"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 outline-none"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={buscar}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cargando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </>
              )}
            </button>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleExportCSV}
              className="flex-1 py-3 rounded-xl border-2 border-indigo-300 bg-white text-indigo-700 font-bold hover:bg-indigo-50 hover:border-indigo-400 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!rows.length}
            >
              📄 CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="flex-1 py-3 rounded-xl border-2 border-green-300 bg-white text-green-700 font-bold hover:bg-green-50 hover:border-green-400 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={!rows.length}
            >
              📊 Excel
            </button>
          </div>
        </div>
      </div>

      {/* Error Mejorado */}
      {errorMsg && (
        <div className="rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 shadow-lg animate-pulse">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-xl">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-red-800 font-bold text-lg">Error al cargar datos</h3>
              <p className="text-red-700 mt-2">{errorMsg}</p>
              <p className="text-red-600 text-sm mt-3 bg-red-100 px-3 py-2 rounded-lg">
                💡 Asegúrate de que la vista <code className="font-mono font-bold">ventas_por_producto_view</code> existe en Supabase
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas con Diseño 3D */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-xl p-6 border border-gray-200 transform hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-gray-500 to-gray-700 p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Productos Únicos</div>
                <div className="text-4xl font-bold text-gray-900 mt-1">{rows.length}</div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl p-6 border border-blue-200 transform hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Unidades Vendidas</div>
                <div className="text-4xl font-bold text-blue-600 mt-1">
                  {totalUnidades.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-xl p-6 border border-green-200 transform hover:scale-105 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-700 uppercase tracking-wide">Monto Total</div>
                <div className="text-4xl font-bold text-green-600 mt-1">
                  ${totalMonto.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Mejorado con Gradientes */}
      {topData.length > 0 && (
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Top {TOP_N} Productos Más Vendidos
              </h2>
              <p className="text-gray-600 mt-2">Ranking de productos por unidades vendidas</p>
            </div>
          </div>
          <div className="h-[500px] bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topData}
                layout="vertical"
                margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
              >
                <defs>
                  {topData.map((entry, index) => (
                    <linearGradient key={`gradient-${index}`} id={`colorGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '14px', fontWeight: 'bold' }} />
                <YAxis 
                  type="category" 
                  dataKey="producto" 
                  width={220} 
                  tick={{ fontSize: 13, fill: '#374151', fontWeight: '500' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    padding: '12px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'unidades') return [value.toLocaleString(), 'Unidades'];
                    if (name === 'monto') return [`$${value.toLocaleString()}`, 'Monto'];
                    return [value, name];
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                />
                <Bar dataKey="unidades" radius={[0, 12, 12, 0]}>
                  {topData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#colorGradient${index})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}