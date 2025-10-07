'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
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
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">🛒 Ventas por Talla y Color</h1>

      {/* Filtros + acciones */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            className="mt-1 w-full border rounded px-3 py-2"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <button
            onClick={buscar}
            className="w-full h-10 rounded bg-black text-white"
            disabled={loading}
          >
            {loading ? 'Buscando…' : 'Filtrar'}
          </button>
          <button
            onClick={exportCSV}
            className="w-full h-10 rounded border"
            disabled={!rows.length}
          >
            Exportar CSV
          </button>
        </div>
        <div className="md:col-span-2 flex items-end">
          <div className="inline-flex rounded-lg border">
            <button
              onClick={() => setModo('talla')}
              className={`px-3 h-10 rounded-l-lg ${modo === 'talla' ? 'bg-black text-white' : ''}`}
            >
              Ver por Talla
            </button>
            <button
              onClick={() => setModo('color')}
              className={`px-3 h-10 rounded-r-lg ${modo === 'color' ? 'bg-black text-white' : ''}`}
            >
              Ver por Color
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Gráfico de barras */}
      <div className="border rounded p-4 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="etiqueta" width={140} tick={{ fontSize: 12 }} />
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
              <th className="text-left p-2">Talla</th>
              <th className="text-left p-2">Color</th>
              <th className="text-right p-2">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.talla}-${r.color}-${i}`} className="border-t">
                <td className="p-2">{r.talla}</td>
                <td className="p-2">{r.color}</td>
                <td className="p-2 text-right">{r.unidades}</td>
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

