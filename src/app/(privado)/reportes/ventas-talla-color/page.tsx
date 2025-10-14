'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';

type Row = {
  talla: string;
  color: string;
  unidades: number;
  fecha: string;
};

type Modo = 'talla' | 'color';

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando reporte';
}

// Paleta de colores vibrantes para el gráfico
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#84cc16', // lime-500
];

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

export default function VentasTallaColorPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>('talla'); // vista por defecto

  const buscar = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      // 1) select sin genéricos y SIN .returns<T>()
      let q = supabase
        .from('ventas_talla_color_view')
        .select('talla,color,unidades,fecha');

      // 2) filtros
      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      // 3) orden/limit y fetch
      const { data, error } = await q.order('unidades', { ascending: false }).limit(200);
      if (error) throw new Error(error.message);

      // 4) Narrowing seguro
      const list = Array.isArray(data) ? data : [];
      const cleaned: Row[] = list.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          talla: String(rec.talla ?? ''),
          color: String(rec.color ?? ''),
          unidades: Number(rec.unidades ?? 0),
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

  // --- Datos agregados para gráfico ---
  const dataPorTalla = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) acc.set(r.talla, (acc.get(r.talla) ?? 0) + r.unidades);
    return Array.from(acc.entries())
      .map(([talla, unidades]) => ({ etiqueta: talla, unidades }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [rows]);

  const dataPorColor = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) acc.set(r.color, (acc.get(r.color) ?? 0) + r.unidades);
    return Array.from(acc.entries())
      .map(([color, unidades]) => ({ etiqueta: color, unidades }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [rows]);

  const chartData = modo === 'talla' ? dataPorTalla : dataPorColor;

  // --- Export CSV ---
  const exportCSV = () => {
    const header = ['talla', 'color', 'unidades', 'fecha'];
    const lines = rows.map((r) =>
      [r.talla, r.color, r.unidades, new Date(r.fecha).toLocaleDateString()].join(','),
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ventas_talla_color.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Ventas por Talla y Color</h1>
              <p className="text-white/80 text-sm mt-1">Análisis detallado de ventas por categorías</p>
            </div>
          </div>
        </div>

        {/* Filtros + acciones con diseño mejorado */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Desde</label>
              <input
                type="date"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Hasta</label>
              <input
                type="date"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-3">
              <button
                onClick={buscar}
                className="flex-1 h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Buscando…
                  </span>
                ) : '🔍 Filtrar'}
              </button>
              <button
                onClick={exportCSV}
                className="flex-1 h-11 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rows.length}
              >
                📊 Exportar CSV
              </button>
            </div>
            <div className="md:col-span-2 flex items-end">
              <div className="inline-flex rounded-lg bg-gray-100 p-1 w-full">
                <button
                  onClick={() => setModo('talla')}
                  className={`flex-1 px-4 h-9 rounded-md font-semibold transition-all duration-200 ${
                    modo === 'talla'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👕 Por Talla
                </button>
                <button
                  onClick={() => setModo('color')}
                  className={`flex-1 px-4 h-9 rounded-md font-semibold transition-all duration-200 ${
                    modo === 'color'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎨 Por Color
                </button>
              </div>
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

        {/* Gráfico de barras con efecto 3D */}
        <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">{modo === 'talla' ? '👕' : '🎨'}</span>
              Análisis {modo === 'talla' ? 'por Talla' : 'por Color'}
            </h2>
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold text-indigo-700">
                Total: {chartData.reduce((sum, item) => sum + item.unidades, 0)} unidades
              </span>
            </div>
          </div>
          <div className="h-96 relative">
            {/* Efecto de sombra 3D en el fondo */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg opacity-50" />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <defs>
                  {/* Gradientes para la paleta genérica (modo talla) */}
                  {CHART_COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                  {/* Gradientes para colores reales (modo color) */}
                  {modo === 'color' && chartData.map((entry, index) => {
                    const colorHex = getColorHex(entry.etiqueta);
                    return (
                      <linearGradient key={`color-gradient-${index}`} id={`color-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={colorHex} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={colorHex} stopOpacity={1} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis 
                  type="number" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px', fontWeight: '600' }}
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="etiqueta" 
                  width={140} 
                  tick={{ fontSize: 13, fill: '#374151', fontWeight: '600' }} 
                  stroke="#6b7280"
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.2)',
                    padding: '12px',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}
                  itemStyle={{ color: '#4b5563', fontWeight: '600' }}
                  cursor={{ fill: '#f3f4f6', opacity: 0.5 }}
                />
                <Bar 
                  dataKey="unidades" 
                  radius={[0, 12, 12, 0]}
                  animationDuration={1000}
                  animationBegin={0}
                >
                  {chartData.map((entry, index) => {
                    // Si estamos en modo color, usar el color real; si no, usar la paleta genérica
                    const fillColor = modo === 'color' 
                      ? `url(#color-gradient-${index})`
                      : `url(#gradient-${index % CHART_COLORS.length})`;
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillColor}
                        style={{
                          filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla con diseño mejorado */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Detalle de Ventas
            </h2>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">👕 Talla</th>
                  <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">🎨 Color</th>
                  <th className="text-right p-4 font-bold text-gray-700 border-b-2 border-indigo-200">📊 Unidades</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr 
                    key={`${r.talla}-${r.color}-${i}`} 
                    className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 cursor-pointer group"
                  >
                    <td className="p-4">
                      <span className="font-bold text-gray-800 text-base group-hover:text-indigo-600 transition-colors">
                        {r.talla}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <span
                            className="inline-block w-8 h-8 rounded-lg border-2 border-gray-300 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200"
                            style={{ 
                              backgroundColor: getColorHex(r.color),
                              boxShadow: `0 4px 6px -1px ${getColorHex(r.color)}40`
                            }}
                            title={r.color}
                          />
                          {r.color.toUpperCase() === 'BLANCO' && (
                            <span className="absolute inset-0 rounded-lg border border-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-gray-700 group-hover:text-gray-900">{r.color}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-bold rounded-lg group-hover:from-indigo-200 group-hover:to-purple-200 transition-all duration-200">
                        {r.unidades}
                      </span>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-lg font-semibold">Sin datos disponibles</span>
                        <span className="text-sm">Intenta ajustar los filtros de búsqueda</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

