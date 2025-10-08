'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = {
  variante_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string;
  talla: string;
  stock_actual: number;
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

  const low = useMemo(
    () => rows.filter((r) => r.stock_actual <= critico),
    [rows, critico]
  );

  const exportCSV = () => {
    const header = ['diseño', 'tipo_prenda', 'color', 'talla', 'stock'];
    const lines = rows.map((r) =>
      [r.diseno, r.tipo_prenda, r.color, r.talla, r.stock_actual].join(',')
    );
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">📦 Estado del Stock</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Crítico ≤</label>
        <input
          type="number"
          className="w-24 border rounded px-3 py-2"
          value={critico}
          onChange={(e) => setCritico(Number(e.target.value || 0))}
        />
        <span className="text-sm text-gray-600">
          Alertas: {low.length} / {rows.length}
        </span>

        <button
          onClick={cargar}
          className="ml-auto h-10 px-3 rounded border hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? 'Actualizando…' : 'Recargar'}
        </button>
        <button
          onClick={exportCSV}
          className="h-10 px-3 rounded border hover:bg-gray-50"
          disabled={!rows.length}
        >
          Exportar CSV
        </button>
      </div>

      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Diseño</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Color</th>
              <th className="text-left p-2">Talla</th>
              <th className="text-right p-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.variante_id}
                className={`border-t ${r.stock_actual <= critico ? 'bg-red-50' : ''}`}
              >
                <td className="p-2">{r.diseno}</td>
                <td className="p-2">{r.tipo_prenda}</td>
                <td className="p-2">{r.color}</td>
                <td className="p-2">{r.talla}</td>
                <td className="p-2 text-right font-medium">{r.stock_actual}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-gray-500">
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