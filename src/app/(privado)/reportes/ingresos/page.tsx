'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';

type Row = {
  fecha: string;
  total_ingresos: number;
  total_ventas: number;
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

  const totalIngresos = rows.reduce((a, r) => a + r.total_ingresos, 0);
  const totalVentas = rows.reduce((a, r) => a + r.total_ventas, 0);

  // Datos para el gráfico
  const chartData = rows.map((r) => ({
    fecha: new Date(r.fecha).toLocaleDateString(),
    ingresos: r.total_ingresos,
    ventas: r.total_ventas,
  }));

  const exportCSV = () => {
    const header = ['fecha', 'ingresos', 'ventas'];
    const lines = rows.map((r) => [
      new Date(r.fecha).toLocaleDateString(),
      r.total_ingresos,
      r.total_ventas,
    ].join(','));
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ingresos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">💰 Ingresos y Tendencias</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={buscar}
            className="w-full h-10 rounded bg-black text-white"
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Filtrar'}
          </button>
        </div>
        <div className="flex items-end">
          <button
            onClick={exportCSV}
            className="w-full h-10 rounded border"
            disabled={!rows.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Total Ingresos</div>
          <div className="text-2xl font-semibold">
            ${totalIngresos.toLocaleString()}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Total Ventas</div>
          <div className="text-2xl font-semibold">
            ${totalVentas.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="border rounded p-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
            <Line type="monotone" dataKey="ingresos" />
            <Line type="monotone" dataKey="ventas" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-right p-2">Ingresos</th>
              <th className="text-right p-2">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.fecha}-${i}`} className="border-t">
                <td className="p-2">{new Date(r.fecha).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  ${r.total_ingresos.toLocaleString()}
                </td>
                <td className="p-2 text-right">
                  ${r.total_ventas.toLocaleString()}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  Sin datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
