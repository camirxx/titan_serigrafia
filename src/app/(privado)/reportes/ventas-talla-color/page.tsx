'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';
import ReportHeader from '@/components/ReportHeader';
import { Palette } from 'lucide-react';

type Row = {
  talla: string;
  color: string;
  unidades: number;
  fecha: string;
};

type Modo = 'talla' | 'color' | 'talla-color';

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
      .map(([talla, unidades]) => ({ 
        etiqueta: talla, 
        unidades,
        tipo: 'talla' as const
      }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [rows]);

  const dataPorColor = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) acc.set(r.color, (acc.get(r.color) ?? 0) + r.unidades);
    return Array.from(acc.entries())
      .map(([color, unidades]) => ({ 
        etiqueta: color, 
        unidades,
        tipo: 'color' as const
      }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [rows]);

  const dataPorTallaColor = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.talla} - ${r.color}`;
      acc.set(key, (acc.get(key) ?? 0) + r.unidades);
    }
    return Array.from(acc.entries())
      .map(([combinacion, unidades]) => ({
        etiqueta: combinacion,
        unidades,
        tipo: 'talla-color' as const
      }))
      .sort((a, b) => b.unidades - a.unidades);
  }, [rows]);

  const chartData = useMemo(() => {
    if (modo === 'talla') return dataPorTalla;
    if (modo === 'color') return dataPorColor;
    return dataPorTallaColor;
  }, [modo, dataPorTalla, dataPorColor, dataPorTallaColor]);

  // --- Export CSV ---
  const handleExportCSV = () => {
    const columnsMap = modo === 'talla' ? {
      talla: 'Talla',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)'
    } : {
      color: 'Color',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToCSV(preparedData, `ventas_${modo}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const columnsMap = modo === 'talla' ? {
      talla: 'Talla',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)'
    } : {
      color: 'Color',
      total_unidades: 'Unidades Vendidas',
      total_monto: 'Monto Total ($)'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToExcel(preparedData, `ventas_${modo}_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <ReportHeader
        title="Ventas por Talla y Color"
        subtitle="Análisis detallado de ventas por categorías"
        icon={<Palette className="w-8 h-8" />}
        onExportCSV={rows.length ? handleExportCSV : undefined}
        onExportExcel={rows.length ? handleExportExcel : undefined}
        actions={
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-1 flex flex-wrap gap-1">
            <button
              onClick={() => setModo('talla')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'talla' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Por Talla
            </button>
            <button
              onClick={() => setModo('color')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'color' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Por Color
            </button>
            <button
              onClick={() => setModo('talla-color')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'talla-color' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Talla + Color
            </button>
          </div>
        }
      />
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
              className="flex-1 h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
          <div className="md:col-span-2" />
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

      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl shadow-xl p-6 border border-indigo-200">
            <div className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Total categorías</div>
            <div className="text-4xl font-bold text-indigo-700 mt-1">{rows.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl shadow-xl p-6 border border-green-200">
            <div className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Unidades totales</div>
            <div className="text-4xl font-bold text-emerald-700 mt-1">
              {chartData.reduce((sum: number, item: { unidades: number }) => sum + item.unidades, 0)}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-2xl p-4 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">
              {modo === 'talla' ? '👕' : modo === 'color' ? '🎨' : '📊'}
            </span>
            Análisis {
              modo === 'talla' ? 'por Talla' : 
              modo === 'color' ? 'por Color' : 
              'Talla + Color'
            }
          </h2>
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-lg">
            <span className="text-sm font-semibold text-indigo-700">
              Total: {chartData.reduce((sum: number, item: { unidades: number }) => sum + item.unidades, 0)} unidades
            </span>
          </div>
        </div>
        <div className="h-96 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg opacity-50" />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <defs>
                {CHART_COLORS.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                  </linearGradient>
                ))}
                {modo === 'color' && chartData.map((entry: { etiqueta: string }, index: number) => {
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
                {chartData.map((entry: { etiqueta: string }, index: number) => {
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
    </div>
  );
}
