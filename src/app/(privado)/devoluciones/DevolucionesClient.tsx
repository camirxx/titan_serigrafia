'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

// --- Tipos base ---
type MetodoPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'regalo';
type TipoOperacion = 'devolucion' | 'cambio';
type MetodoResolucion = 'reintegro_efectivo' | 'nota_credito' | 'cambio_producto';

type Venta = {
  id: number;
  fecha: string;
  total: number;
  metodo_pago: MetodoPago;
  tienda_id: number | null;
  vendedor_id: string | null;
};

type LineaDetalle = {
  id: number;            // detalle_ventas.id
  venta_id: number;
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number | null;
  diseno?: string | null;
  tipo_prenda?: string | null;
  talla?: string | null;
  color?: string | null;
};

type CantidadesSeleccion = Record<number, number>;

// --- Tipos del payload para la RPC sin any ---
type ItemSeleccionado = {
  detalle_venta_id: number;
  variante_id: number;
  cantidad: number;
  motivo_id?: number | null;
};

type ItemCambioEntregado = {
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
};

type PayloadDevolucion = {
  venta_id: number;
  tipo: TipoOperacion;
  metodo_resolucion: MetodoResolucion;
  monto_reintegro: number;
  observacion: string | null;
  items: ItemSeleccionado[];
  cambio_items_entregados?: ItemCambioEntregado[]; // opcional
};

export default function DevolucionesClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [ventaIdInput, setVentaIdInput] = useState<string>('');
  const [venta, setVenta] = useState<Venta | null>(null);
  const [lineas, setLineas] = useState<LineaDetalle[]>([]);
  const [cantSel, setCantSel] = useState<CantidadesSeleccion>({});
  const [tipo, setTipo] = useState<TipoOperacion>('devolucion');
  const [metodo, setMetodo] = useState<MetodoResolucion>('reintegro_efectivo');
  const [montoReintegro, setMontoReintegro] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Header fecha/hora (estilo Inventario)
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setFecha(now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }));
      setHora(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeleccionado = useMemo(() => {
    return lineas.reduce((acc, l) => {
      const q = Number(cantSel[l.id] ?? 0);
      const unit = Number(l.precio_unitario ?? 0);
      return acc + (q > 0 ? q * unit : 0);
    }, 0);
  }, [lineas, cantSel]);

  const buscarVenta = async () => {
    setError(null);
    setOk(null);

    const vid = Number(ventaIdInput);
    if (!vid || isNaN(vid)) {
      setError('Ingresa un ID de venta válido.');
      return;
    }

    setLoading(true);
    try {
      const { data: v, error: e1 } = await supabase
        .from('ventas')
        .select('id, fecha, total, metodo_pago, tienda_id, vendedor_id')
        .eq('id', vid)
        .single();

      if (e1) throw e1;
      if (!v) {
        setVenta(null);
        setLineas([]);
        setCantSel({});
        setError('Venta no encontrada.');
        return;
      }

      setVenta(v as Venta);

      const { data: det, error: e2 } = await supabase
        .from('detalle_ventas_view')
        .select('*')
        .eq('venta_id', vid)
        .order('id', { ascending: true });

      if (e2) throw e2;

      const rows = (det ?? []) as LineaDetalle[];
      setLineas(rows);
      const initSel: CantidadesSeleccion = {};
      rows.forEach((l) => (initSel[l.id] = 0));
      setCantSel(initSel);
    } catch (err: unknown) {
      setVenta(null);
      setLineas([]);
      setCantSel({});
      setError(err instanceof Error ? err.message : 'Error buscando la venta.');
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    setError(null);
    setOk(null);

    if (!venta) {
      setError('Primero busca una venta.');
      return;
    }

    const itemsSeleccionados: ItemSeleccionado[] = lineas
      .map((l) => {
        const q = Number(cantSel[l.id] ?? 0);
        return q > 0
          ? { detalle_venta_id: l.id, variante_id: l.variante_id, cantidad: q }
          : null;
      })
      .filter((x): x is ItemSeleccionado => x !== null);

    if (itemsSeleccionados.length === 0) {
      setError('Selecciona cantidades a devolver/cambiar en al menos una línea.');
      return;
    }

    for (const it of itemsSeleccionados) {
      const linea = lineas.find((l) => l.id === it.detalle_venta_id);
      if (!linea) {
        setError('Línea de venta inválida.');
        return;
      }
      if (it.cantidad > linea.cantidad) {
        setError(`La cantidad seleccionada excede a la vendida en la línea #${linea.id}.`);
        return;
      }
    }

    if (metodo === 'reintegro_efectivo' || metodo === 'nota_credito') {
      if (montoReintegro <= 0) {
        setError('Ingresa un monto de reintegro mayor a 0.');
        return;
      }
      if (montoReintegro > totalSeleccionado) {
        setError('El reintegro no puede superar el total de los ítems seleccionados.');
        return;
      }
    } else {
      if (montoReintegro !== 0) setMontoReintegro(0);
    }

    setLoading(true);
    try {
      const payload: PayloadDevolucion = {
        venta_id: venta.id,
        tipo,
        metodo_resolucion: metodo,
        monto_reintegro: metodo === 'cambio_producto' ? 0 : Number(montoReintegro || 0),
        observacion: observacion?.trim() || null,
        items: itemsSeleccionados,
      };

      const { data, error: e } = (await supabase
        .rpc('crear_devolucion_json', { p: payload })) as { data: number | null; error: Error | null };

      if (e) throw e;
      if (!data) throw new Error('La RPC no devolvió un ID');

      setOk(`✅ ${tipo === 'devolucion' ? 'Devolución' : 'Cambio'} creado correctamente. ID: ${data}`);

      setCantSel((prev) => {
        const copy: CantidadesSeleccion = { ...prev };
        Object.keys(copy).forEach((k) => (copy[Number(k)] = 0));
        return copy;
      });
      setMontoReintegro(0);
      setObservacion('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la operación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="">
      {/* Bandas diagonales (decoración) */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute inset-0">
          <div className="absolute left-1/5 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent" />
          <div className="absolute left-1/3 top-0 h-full w-24 -skew-x-12 transform bg-gradient-to-b from-green-500 to-transparent" />
          <div className="absolute right-1/4 top-0 h-full w-32 -skew-x-12 transform bg-gradient-to-b from-green-400 to-transparent" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header estilo Inventario */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between rounded-[28px] bg-gradient-to-r from-indigo-700 via-purple-700 to-violet-700 p-4 text-white shadow-2xl sm:p-6">
            {/* Volver */}
            <button
              onClick={() => router.back()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 sm:h-14 sm:w-14"
              aria-label="Volver"
              title="Volver"
            >
              <span className="text-xl">‹</span>
            </button>

            {/* Título centrado */}
            <div className="text-center">
              <h1 className="text-3xl font-bold drop-shadow-lg">Devoluciones / Cambios</h1>
              <p className="mt-1 text-sm text-white/80">
                {fecha} · {hora}
              </p>
            </div>

            {/* Círculo decorativo */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg sm:h-16 sm:w-16">
              <div className="h-8 w-8 rounded-full bg-purple-900 sm:h-12 sm:w-12" />
            </div>
          </div>
        </div>

        {/* Contenido principal en card blanca */}
        <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur sm:p-6">
          {error && (
            <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {ok && (
            <div className="mb-4 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-700">
              {ok}
            </div>
          )}

          {/* Buscar venta */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-3 shadow sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <input
                className="w-48 rounded border-2 border-purple-200 p-2 focus:border-purple-400 focus:outline-none"
                placeholder="ID de venta"
                value={ventaIdInput}
                onChange={(e) => setVentaIdInput(e.target.value)}
              />
              <button
                className="rounded-lg bg-purple-600 px-3 py-2 text-white transition hover:bg-purple-700 disabled:opacity-50"
                onClick={buscarVenta}
                disabled={loading}
              >
                {loading ? 'Buscando…' : 'Buscar venta'}
              </button>
            </div>

            {venta && (
              <div className="sm:ml-auto text-sm">
                Venta <b>#{venta.id}</b> — {new Date(venta.fecha).toLocaleString()} — Total:{' '}
                <b>${Number(venta.total || 0).toFixed(0)}</b>
              </div>
            )}
          </div>

          {/* Configuración */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow">
            <div className="flex items-center gap-2">
              <label className="text-sm">Tipo:</label>
              <select
                className="rounded border-2 border-purple-200 p-2 focus:border-purple-400 focus:outline-none"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoOperacion)}
              >
                <option value="devolucion">Devolución</option>
                <option value="cambio">Cambio</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Método:</label>
              <select
                className="rounded border-2 border-purple-200 p-2 focus:border-purple-400 focus:outline-none"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as MetodoResolucion)}
              >
                <option value="reintegro_efectivo">Reintegro efectivo</option>
                <option value="nota_credito">Nota de crédito</option>
                <option value="cambio_producto">Cambio de producto</option>
              </select>
            </div>

            {(metodo === 'reintegro_efectivo' || metodo === 'nota_credito') && (
              <div className="flex items-center gap-2">
                <label className="text-sm">Monto reintegro:</label>
                <input
                  type="number"
                  min={0}
                  className="w-40 rounded border-2 border-purple-200 p-2 focus:border-purple-400 focus:outline-none"
                  value={montoReintegro}
                  onChange={(e) => setMontoReintegro(Math.max(0, Number(e.target.value || 0)))}
                />
                <span className="text-xs text-neutral-500">Máx: ${totalSeleccionado.toFixed(0)}</span>
              </div>
            )}

            <input
              className="w-full rounded border-2 border-purple-200 p-2 focus:border-purple-400 focus:outline-none md:flex-1"
              placeholder="Observación (opcional)"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />

            <div className="ml-auto text-sm">
              Total seleccionado: <b>${totalSeleccionado.toFixed(0)}</b>
            </div>
          </div>

          {/* Líneas */}
          <div className="overflow-auto rounded-xl bg-white p-3 shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Detalle</th>
                  <th className="py-2 pr-3">Variante</th>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Vendida</th>
                  <th className="py-2 pr-3">Precio</th>
                  <th className="py-2 pr-3">Devolver/Cambiar</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => {
                  const sel = Number(cantSel[l.id] ?? 0);
                  const maxQ = Number(l.cantidad ?? 0);
                  return (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">#{l.id}</td>
                      <td className="py-2 pr-3">
                        #{l.variante_id}
                        {l.talla ? <span className="text-xs opacity-70"> · {l.talla}</span> : null}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="text-sm">
                          {l.diseno ?? '—'}{' '}
                          <span className="opacity-60">/ {l.tipo_prenda ?? '—'}</span>
                          {l.color ? <span className="opacity-60"> / {l.color}</span> : null}
                        </div>
                      </td>
                      <td className="py-2 pr-3">{maxQ}</td>
                      <td className="py-2 pr-3">${Number(l.precio_unitario || 0).toFixed(0)}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          max={maxQ}
                          className="w-24 rounded border-2 border-purple-200 p-1 text-center focus:border-purple-400 focus:outline-none"
                          value={sel}
                          onChange={(e) => {
                            const next = Math.max(0, Math.min(maxQ, Number(e.target.value || 0)));
                            setCantSel((prev) => ({ ...prev, [l.id]: next }));
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
                {lineas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-neutral-500">
                      Busca una venta para ver sus ítems.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Acciones */}
          <div className="mt-4 flex items-center gap-3">
            <button
              className="rounded bg-black px-4 py-2 text-white transition hover:bg-gray-900 disabled:opacity-50"
              onClick={confirmar}
              disabled={loading || !venta || lineas.length === 0}
            >
              {loading ? 'Guardando…' : tipo === 'devolucion' ? 'Confirmar devolución' : 'Confirmar cambio'}
            </button>
            <button
              className="rounded border px-4 py-2"
              onClick={() => {
                setCantSel({});
                setMontoReintegro(0);
                setObservacion('');
                setOk(null);
                setError(null);
              }}
              disabled={loading}
            >
              Limpiar selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
