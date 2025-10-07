'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      // Tipamos el select con <Row> y evitamos .returns<T>()
      let q = supabase
        .from('ventas_por_producto_view')
        .select<Row>('producto,total_unidades,total_monto,fecha');

      if (desde) q = q.gte('fecha', desde);
      if (hasta) q = q.lte('fecha', hasta);

      const { data, error } = await q.order('total_unidades', { ascending: false }).limit(100);
      if (error) throw new Error(error.message);

      setRows(data ?? []);
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4 bg-white">
      <h1 className="text-2xl font-bold">📈 Ventas por Producto</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                 value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input type="date" className="mt-1 w-full border rounded px-3 py-2"
                 value={hasta} onChange={(e) => setHasta(e.target.value)} />
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
              <th className="text-left p-2">Producto</th>
              <th className="text-right p-2">Unidades</th>
              <th className="text-right p-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.producto}-${i}`} className="border-t">
                <td className="p-2">{r.producto}</td>
                <td className="p-2 text-right">{r.total_unidades}</td>
                <td className="p-2 text-right">${Number(r.total_monto).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
