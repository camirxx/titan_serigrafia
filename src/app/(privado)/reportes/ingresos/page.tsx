'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';
import ReportHeader from '@/components/ReportHeader';
import { TrendingUp, ChevronDown } from 'lucide-react';

type Row = {
  fecha: string;
  total_ingresos: number;
  total_ventas: number;
  mes?: string;
  anio?: string;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando datos';
}

export default function IngresosTendenciasPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chartType, setChartType] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  const buscar = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      let q = supabase
        .from('ingresos_diarios_view')
        .select('fecha,total_ingresos,total_ventas');

      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      const { data, error } = await q.order('fecha', { ascending: true }).limit(365);
      if (error) throw new Error(error.message);

      const list = Array.isArray(data) ? data : [];
      const cleaned: Row[] = list.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          fecha: String(rec.fecha ?? ''),
          total_ingresos: Number(rec.total_ingresos ?? 0),
          total_ventas: Number(rec.total_ventas ?? 0),
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

  // Obtener años únicos para el filtro
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    rows.forEach(row => {
      years.add(new Date(row.fecha).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Orden descendente
  }, [rows]);

  // Filtrar datos por mes/año
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const date = new Date(row.fecha);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      if (filterMonth && month !== parseInt(filterMonth)) return false;
      if (filterYear && year !== parseInt(filterYear)) return false;
      
      return true;
    });
  }, [rows, filterMonth, filterYear]);

  const totalIngresos = useMemo(() => 
    filteredRows.reduce((a, r) => a + r.total_ingresos, 0), 
    [filteredRows]
  );
  
  const totalVentas = useMemo(() => 
    filteredRows.reduce((a, r) => a + r.total_ventas, 0),
    [filteredRows]
  );

  // Datos para los gráficos
  const chartData = useMemo(() => {
    if (chartType === 'ingresos_mes') {
      const monthlyData: Record<string, { fecha: string; ingresos: number; ventas: number }> = {};
      
      rows.forEach(row => {
        const date = new Date(row.fecha);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { fecha: monthYear, ingresos: 0, ventas: 0 };
        }
        
        monthlyData[monthYear].ingresos += row.total_ingresos;
        monthlyData[monthYear].ventas += row.total_ventas;
      });
      
      return Object.values(monthlyData);
    } else if (chartType === 'ventas_dia') {
      return rows.map(r => ({
        fecha: new Date(r.fecha).toLocaleDateString(),
        ventas: r.total_ventas,
        name: new Date(r.fecha).toLocaleDateString('es-CL', { weekday: 'short' })
      }));
    } else if (chartType === 'ventas_mes') {
      const monthlySales: Record<string, { fecha: string; ventas: number }> = {};
      
      rows.forEach(row => {
        const date = new Date(row.fecha);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!monthlySales[monthYear]) {
          monthlySales[monthYear] = { fecha: monthYear, ventas: 0 };
        }
        
        monthlySales[monthYear].ventas += row.total_ventas;
      });
      
      return Object.values(monthlySales);
    }
    
    // Por defecto, mostrar ingresos diarios
    return rows.map(r => ({
      fecha: new Date(r.fecha).toLocaleDateString(),
      ingresos: r.total_ingresos,
      name: new Date(r.fecha).toLocaleDateString('es-CL', { weekday: 'short' })
    }));
  }, [rows, chartType]);

  const handleExportCSV = () => {
    const columnsMap = {
      fecha: 'Fecha',
      total_ingresos: 'Total Ingresos ($)',
      total_ventas: 'Total Ventas'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToCSV(preparedData, `ingresos_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportExcel = () => {
    const columnsMap = {
      fecha: 'Fecha',
      total_ingresos: 'Total Ingresos ($)',
      total_ventas: 'Total Ventas'
    };
    const preparedData = prepareDataForExport(rows, columnsMap);
    exportToExcel(preparedData, `ingresos_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <ReportHeader
        title="Ingresos y Tendencias"
        subtitle="Análisis temporal de ingresos y ventas"
        icon={<TrendingUp className="w-8 h-8" />}
        onExportCSV={rows.length ? handleExportCSV : undefined}
        onExportExcel={rows.length ? handleExportExcel : undefined}
      />
      {/* Filtros Modernos */}
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100 transform hover:scale-[1.01] transition-transform duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha Desde
            </label>
            <input
              type="date"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha Hasta
            </label>
            <input
              type="date"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-200 outline-none"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={buscar}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  Filtrar
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

      {/* Selector de tipo de gráfico */}
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              {chartType === 'ingresos_dia' ? 'Ingresos Diarios' : 
               chartType === 'ingresos_mes' ? 'Ingresos Mensuales' :
               chartType === 'ventas_dia' ? 'Ventas Diarias' : 
               chartType === 'ventas_mes' ? 'Ventas Mensuales' : 'Selecciona un gráfico'}
            </h2>
            <p className="text-gray-600 mt-2">
              {chartType === 'ingresos_dia' ? 'Evolución de ingresos diarios' : 
               chartType === 'ingresos_mes' ? 'Ingresos totales por mes' :
               chartType === 'ventas_dia' ? 'Cantidad de ventas por día' : 
               chartType === 'ventas_mes' ? 'Total de ventas por mes' : 'Selecciona un tipo de gráfico para comenzar'}
            </p>
          </div>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-between w-full sm:w-64 px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <span className="truncate">
                {chartType === 'ingresos_dia' ? 'Ingresos Diarios' : 
                 chartType === 'ingresos_mes' ? 'Ingresos Mensuales' :
                 chartType === 'ventas_dia' ? 'Ventas Diarias' : 
                 chartType === 'ventas_mes' ? 'Ventas Mensuales' : 'Seleccionar gráfico'}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setChartType('ingresos_dia');
                      setShowDropdown(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${chartType === 'ingresos_dia' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Ingresos Diarios
                  </button>
                  <button
                    onClick={() => {
                      setChartType('ingresos_mes');
                      setShowDropdown(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${chartType === 'ingresos_mes' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Ingresos Mensuales
                  </button>
                  <button
                    onClick={() => {
                      setChartType('ventas_dia');
                      setShowDropdown(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${chartType === 'ventas_dia' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Ventas Diarias
                  </button>
                  <button
                    onClick={() => {
                      setChartType('ventas_mes');
                      setShowDropdown(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${chartType === 'ventas_mes' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Ventas Mensuales
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {chartType && (
          <div className="h-[400px] bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl p-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType.includes('ventas') ? (
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [value, 'Ventas']}
                    labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                  />
                  <Bar 
                    dataKey="ventas" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Ventas"
                  />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: '500' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    labelStyle={{ fontWeight: 'bold', color: '#111827' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Ingresos"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl shadow-xl p-6 border border-emerald-200">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Total Ingresos</div>
              <div className="text-4xl font-bold text-emerald-600">
                ${totalIngresos.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl shadow-xl p-6 border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-2xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Ventas</div>
              <div className="text-4xl font-bold text-blue-600">
                {totalVentas.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Mejorada */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-50 to-slate-100 px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Detalle Diario
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                >
                  <option value="">Todos los meses</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('es-CL', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                >
                  <option value="">Todos los años</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              {(filterMonth || filterYear) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterMonth('');
                      setFilterYear('');
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 sticky top-0 z-10">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-emerald-200">
                  Fecha
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-emerald-200">
                  Día
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-emerald-200">
                  Ingresos
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-emerald-200">
                  Ventas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredRows.length > 0 ? (filteredRows.map((r, i) => (
                <tr key={`${r.fecha}-${i}`} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 group">
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                    {new Date(r.fecha).toLocaleDateString('es-CL', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium group-hover:text-emerald-600 transition-colors">
                    {new Date(r.fecha).toLocaleDateString('es-CL', { 
                      weekday: 'long'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 font-bold rounded-lg">
                      ${r.total_ingresos.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-bold rounded-lg">
                      {r.total_ventas}
                    </span>
                  </td>
                </tr>
              )))
              : !rows.length && !loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-full">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-700 font-bold text-lg">No hay datos disponibles</p>
                        <p className="text-gray-500 text-sm mt-2">
                          Ajusta los filtros para ver información
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-gray-700 font-bold text-lg">Cargando datos...</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
