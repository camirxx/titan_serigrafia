'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
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
      // 1) select sin genéricos y SIN .returns<T>()
      let q = supabase
        .from('ventas_por_producto_view')
        .select('producto,total_unidades,total_monto,fecha');

      // 2) filtros
      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      // 3) orden/limit y fetch
      const { data, error } = await q
        .order('total_unidades', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);

      // 4) Narrowing seguro
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

  // --- Datos para el gráfico (Top N) ---
  const TOP_N = 12;
  const topData = rows.slice(0, TOP_N).map((r) => ({
    producto: r.producto,
    unidades: r.total_unidades,
  }));

  // --- Export CSV ---
  const exportCSV = () => {
    const header = ['producto', 'unidades', 'monto', 'fecha'];
    const lines = rows.map((r) =>
      [r.producto, r.total_unidades, r.total_monto, new Date(r.fecha).toLocaleDateString()].join(',')
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ventas_por_producto.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">📈 Ventas por Producto</h1>

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
            {loading ? 'Buscando…' : 'Filtrar'}
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

      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Gráfico: barras horizontales Top N */}
      <div className="border rounded p-4 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="producto" width={180} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="unidades" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla */}
      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Producto</th>
              <th className="text-right p-2">Unidades</th>
              <th className="text-right p-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.producto}-${r.fecha}`} className="border-t">
                <td className="p-2">{r.producto}</td>
                <td className="p-2 text-right">{r.total_unidades}</td>
                <td className="p-2 text-right">
                  ${Number(r.total_monto).toLocaleString()}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
