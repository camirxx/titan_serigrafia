'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';

type Row = {
  producto: string;
  total_unidades: number;
  total_monto: number;
  fecha: string;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando reporte';
}

// Colores para el gráfico
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

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

  // Export CSV
  const exportCSV = () => {
    const header = ['Producto', 'Unidades Vendidas', 'Monto Total', 'Fecha'];
    const lines = rows.map((r) =>
      [
        `"${r.producto}"`,
        r.total_unidades,
        r.total_monto,
        new Date(r.fecha).toLocaleDateString()
      ].join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_por_producto_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">📈 Ventas por Producto</h1>
        <p className="text-gray-600 mt-2">Análisis de productos más vendidos</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={buscar}
              className="w-full h-11 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Buscar'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={exportCSV}
              className="w-full h-11 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={!rows.length}
            >
              📥 Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-600 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-red-800 font-medium">Error al cargar datos</h3>
              <p className="text-red-700 text-sm mt-1">{errorMsg}</p>
              <p className="text-red-600 text-xs mt-2">
                Asegúrate de que la vista 'ventas_por_producto_view' existe en Supabase
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Productos Únicos</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{rows.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Unidades Vendidas</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {totalUnidades.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Monto Total</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              ${totalMonto.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      {topData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top {TOP_N} Productos Más Vendidos
          </h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis 
                  type="category" 
                  dataKey="producto" 
                  width={200} 
                  tick={{ fontSize: 12, fill: '#374151' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'unidades') return [value, 'Unidades'];
                    if (name === 'monto') return [`$${value.toLocaleString()}`, 'Monto'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="unidades" radius={[0, 8, 8, 0]}>
                  {topData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidades
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r, idx) => (
                <tr key={`${r.producto}-${r.fecha}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {r.producto}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {r.total_unidades.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                    ${r.total_monto.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📊</div>
                    <p className="text-gray-500 font-medium">No hay datos disponibles</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Ajusta los filtros o verifica que existan ventas en el período seleccionado
                    </p>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-2 animate-pulse">⏳</div>
                    <p className="text-gray-500 font-medium">Cargando datos...</p>
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