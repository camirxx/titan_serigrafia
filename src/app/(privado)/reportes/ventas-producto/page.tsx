'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';
import ReportHeader from '@/components/ReportHeader';
import { Shirt } from 'lucide-react';

type VentaDetalle = {
  venta_id: number;
  fecha: string;
  variante_id: number;
  cantidad: number;
};

type VarianteInfo = {
  variante_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string;
};

type Row = {
  diseno: string;
  tipo_prenda: string;
  color: string;
  cantidad: number;
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

type Modo = 'diseno' | 'disenoTipo';

export default function VentasPorProductoPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filtroDiseno, setFiltroDiseno] = useState<string>('');
  const [modo, setModo] = useState<Modo>('diseno');

  const buscar = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      // 1) Traer ventas con sus detalles dentro del rango
      let qVentas = supabase
        .from('ventas')
        .select('id, fecha, detalle_ventas!inner(variante_id, cantidad)');

      if (desde) qVentas = qVentas.gte('fecha', desde);
      if (hasta) qVentas = qVentas.lte('fecha', hasta);

      const { data: ventasData, error: errVentas } = await qVentas.limit(2000);
      if (errVentas) throw new Error(errVentas.message);

      const detalles: VentaDetalle[] = [];
      for (const v of (ventasData as any[] | null) ?? []) {
        const items = Array.isArray(v.detalle_ventas) ? v.detalle_ventas : [];
        for (const it of items) {
          detalles.push({
            venta_id: Number(v.id),
            fecha: String(v.fecha),
            variante_id: Number(it.variante_id),
            cantidad: Number(it.cantidad ?? 1),
          });
        }
      }

      // 2) Obtener info de variantes para esos variante_id
      const varianteIds = Array.from(new Set(detalles.map(d => d.variante_id))).filter(Boolean);
      let variantesInfo: VarianteInfo[] = [];
      if (varianteIds.length) {
        // Supabase limita 1000 elementos por in; dividir si es necesario
        const chunkSize = 900;
        for (let i = 0; i < varianteIds.length; i += chunkSize) {
          const chunk = varianteIds.slice(i, i + chunkSize);
          const { data: vdata, error: errV } = await supabase
            .from('variantes_admin_view')
            .select('variante_id, diseno, tipo_prenda, color')
            .in('variante_id', chunk);
          if (errV) throw new Error(errV.message);
          const list = Array.isArray(vdata) ? vdata : [];
          variantesInfo.push(...list.map((r: any) => ({
            variante_id: Number(r.variante_id),
            diseno: String(r.diseno ?? ''),
            tipo_prenda: String(r.tipo_prenda ?? ''),
            color: String(r.color ?? ''),
          })));
        }
      }

      const infoByVar = new Map<number, VarianteInfo>();
      for (const vi of variantesInfo) infoByVar.set(vi.variante_id, vi);

      // 3) Agregar por (diseño, tipo, color)
      const acc = new Map<string, Row>();
      for (const d of detalles) {
        const info = infoByVar.get(d.variante_id);
        if (!info) continue;
        const key = `${info.diseno}|${info.tipo_prenda}|${info.color}`;
        const curr = acc.get(key) ?? { diseno: info.diseno, tipo_prenda: info.tipo_prenda, color: info.color, cantidad: 0 };
        curr.cantidad += d.cantidad;
        acc.set(key, curr);
      }

      setRows(Array.from(acc.values()).sort((a, b) => b.cantidad - a.cantidad));
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

  // Diseños únicos para filtro
  const disenosUnicos = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.diseno))).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Agregaciones para gráficos
  const TOP_N = 12;
  const dataPorDiseno = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) acc.set(r.diseno, (acc.get(r.diseno) ?? 0) + r.cantidad);
    return Array.from(acc.entries())
      .map(([diseno, unidades]) => ({ etiqueta: diseno, unidades }))
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, TOP_N);
  }, [rows]);

  const dataPorDisenoTipo = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.diseno} · ${r.tipo_prenda}`;
      acc.set(key, (acc.get(key) ?? 0) + r.cantidad);
    }
    return Array.from(acc.entries())
      .map(([combo, unidades]) => ({ etiqueta: combo, unidades }))
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, TOP_N);
  }, [rows]);

  const chartData = modo === 'diseno' ? dataPorDiseno : dataPorDisenoTipo;
  const chartTitle = modo === 'diseno' ? `Top ${TOP_N} Diseños más vendidos` : `Top ${TOP_N} Diseños + Tipo más vendidos`;
  const chartSubtitle = modo === 'diseno' ? 'Unidades por diseño' : 'Unidades por combinación diseño + tipo';

  // Estadísticas resumen
  const totalUnidades = rows.reduce((sum, r) => sum + r.cantidad, 0);

  // Funciones de exportación
  const handleExportCSV = () => {
    const columnsMap = {
      diseno: 'Diseño',
      tipo_prenda: 'Tipo',
      color: 'Color',
      cantidad: 'Cantidad'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToCSV(preparedData, `ventas_producto_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const columnsMap = {
      diseno: 'Diseño',
      tipo_prenda: 'Tipo',
      color: 'Color',
      cantidad: 'Cantidad'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToExcel(preparedData, `ventas_producto_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <ReportHeader
        title="Ventas por Producto"
        icon={<Shirt className="w-8 h-8" />}
        subtitle="Ventas por diseño y por tipo"
        onExportCSV={rows.length ? handleExportCSV : undefined}
        onExportExcel={rows.length ? handleExportExcel : undefined}
        actions={(
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-1 flex">
            <button
              onClick={() => setModo('diseno')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'diseno' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Diseño
            </button>
            <button
              onClick={() => setModo('disenoTipo')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'disenoTipo' ? 'bg-white text-purple-600 shadow' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Diseño + Tipo
            </button>
          </div>
        )}
      />

      {/* Filtros Mejorados */}
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div className="flex items-end" />
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
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas rápidas */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl p-6 border border-blue-200">
            <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Unidades Vendidas</div>
            <div className="text-4xl font-bold text-blue-600 mt-1">{totalUnidades.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Registros (diseño·tipo·color)</div>
            <div className="text-4xl font-bold text-gray-900 mt-1">{rows.length}</div>
          </div>
        </div>
      )}

      {/* Gráfico principal */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{chartTitle}</h2>
          <p className="text-gray-600 mb-6">{chartSubtitle}</p>
          <div className="h-[420px] bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 40, left: 20, bottom: 10 }}>
                <defs>
                  {chartData.map((_, index) => (
                    <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '14px', fontWeight: 'bold' }} />
                <YAxis type="category" dataKey="etiqueta" width={modo === 'diseno' ? 220 : 260} tick={{ fontSize: 13, fill: '#374151', fontWeight: '500' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '12px' }}
                  formatter={(value: number) => [value.toLocaleString(), 'Unidades']} labelStyle={{ fontWeight: 'bold', color: '#111827' }} />
                <Bar dataKey="unidades" radius={[0, 12, 12, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#grad-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla Detalle con filtro por diseño */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Detalle de Ventas (Diseño · Tipo · Color)
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600" htmlFor="filtro-diseno">Filtro por diseño:</label>
            <select
              id="filtro-diseno"
              className="border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={filtroDiseno}
              onChange={(e) => setFiltroDiseno(e.target.value)}
            >
              <option value="">Todos</option>
              {disenosUnicos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 sticky top-0 z-10">
              <tr>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">🎨 Diseño</th>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">👕 Tipo</th>
                <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-indigo-200">🧵 Color</th>
                <th className="text-right p-4 font-bold text-gray-700 border-b-2 border-indigo-200">📊 Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter(r => !filtroDiseno || r.diseno === filtroDiseno)
                .map((r, i) => (
                  <tr key={`${r.diseno}-${r.tipo_prenda}-${r.color}-${i}`} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200">
                    <td className="p-4 font-semibold text-gray-800">{r.diseno}</td>
                    <td className="p-4 text-gray-700">{r.tipo_prenda}</td>
                    <td className="p-4 text-gray-700">{r.color}</td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[60px] px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-bold rounded-lg">
                        {r.cantidad}
                      </span>
                    </td>
                  </tr>
              ))}
              {!rows.length && !loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-lg font-semibold">Sin datos</span>
                      <span className="text-sm">Ajusta los filtros de fecha y vuelve a buscar</span>
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