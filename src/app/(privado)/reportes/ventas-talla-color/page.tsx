'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row = {
  talla: string;
  color: string;
  unidades: number;
  fecha: string;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando reporte';
}

export default function VentasTallaColorPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function buscar() {
    setErrorMsg(null);
    setLoading(true);
    try {
      let q = supabase
        .from('ventas_talla_color_view')
        .select('*')
        .returns<Row[]>();

      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      const { data, error } = await q
        .order('unidades', { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);
      setRows(data ?? []);
    } catch (e: unknown) {
      setRows([]);
      setErrorMsg(toMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    buscar();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">🛒 Ventas por Talla y Color</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={buscar} className="w-full h-10 rounded bg-black text-white" disabled={loading}>
            {loading ? 'Buscando…' : 'Filtrar'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      )}

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
              <tr><td colSpan={3} className="p-3 text-center text-gray-500">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
