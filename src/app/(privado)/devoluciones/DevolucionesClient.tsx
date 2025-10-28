'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

type MetodoPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'regalo';
type TipoOperacion = 'devolucion' | 'cambio';
type MetodoResolucion = 'reintegro_efectivo' | 'cambio_producto';
type MetodoPagoReintegro = 'efectivo' | 'transferencia';
type MetodoPagoDiferencia = 'efectivo' | 'debito' | 'credito' | 'transferencia';

type DenominacionCaja = {
  denominacion: number;
  cantidad: number;
};

type ProductoVendido = {
  detalle_venta_id: number;
  venta_id: number;
  variante_id: number;
  producto_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string | null;
  talla: string;
  cantidad_vendida: number;
  precio_unitario: number;
  fecha_venta: string;
  metodo_pago: MetodoPago;
  numero_boleta: string | null;
};

type CantidadesSeleccion = Record<number, number>;

export default function DevolucionesClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [tiposPrenda, setTiposPrenda] = useState<string[]>([]);
  const [colores, setColores] = useState<string[]>([]);
  const [disenos, setDisenos] = useState<string[]>([]);
  const [disenosPorTipo, setDisenosPorTipo] = useState<Record<string, string[]>>({});
  const [disenosFiltrados, setDisenosFiltrados] = useState<string[]>([]);

  const [disenoFiltro, setDisenoFiltro] = useState('');
  const [tipoPrendaFiltro, setTipoPrendaFiltro] = useState('');
  const [colorFiltro, setColorFiltro] = useState('');

  // Efecto para filtrar diseños cuando cambia el tipo de prenda
  useEffect(() => {
    if (tipoPrendaFiltro) {
      const disenosDelTipo = disenosPorTipo[tipoPrendaFiltro] || [];
      setDisenosFiltrados(disenosDelTipo);
      // Si el diseño seleccionado no está en la lista filtrada, limpiarlo
      if (disenoFiltro && !disenosDelTipo.includes(disenoFiltro)) {
        setDisenoFiltro('');
      }
    } else {
      setDisenosFiltrados(disenos);
    }
  }, [tipoPrendaFiltro, disenosPorTipo, disenos, disenoFiltro]);

  const [productosVendidos, setProductosVendidos] = useState<ProductoVendido[]>([]);
  const [cantSel, setCantSel] = useState<CantidadesSeleccion>({});

  const [tipo, setTipo] = useState<TipoOperacion>('devolucion');
  const [metodo, setMetodo] = useState<MetodoResolucion>('reintegro_efectivo');
  const [metodoPagoReintegro, setMetodoPagoReintegro] = useState<MetodoPagoReintegro>('efectivo');
  const [montoReintegro, setMontoReintegro] = useState<number>(0);
  const [observacion, setObservacion] = useState('');

  const [montoDiferencia, setMontoDiferencia] = useState<number>(0);
  const [tipoDiferencia, setTipoDiferencia] = useState<'cliente_paga' | 'cliente_recibe' | 'sin_diferencia'>('sin_diferencia');
  const [metodoPagoDiferencia, setMetodoPagoDiferencia] = useState<MetodoPagoDiferencia>('efectivo');

  // Datos para transferencia
  const [datosTransferencia, setDatosTransferencia] = useState({
    rut: '',
    nombre: '',
    banco: '',
    tipoCuenta: 'corriente' as 'corriente' | 'vista' | 'ahorro',
    numeroCuenta: '',
    email: '',
  });

  const [denominaciones, setDenominaciones] = useState<DenominacionCaja[]>([]);
  const [totalEfectivoCaja, setTotalEfectivoCaja] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    obtenerUsuario();
    cargarCatalogos();
    cargarDineroCaja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const obtenerUsuario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioId(user.id);
      } else {
        setError('No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err);
      setError('Error al obtener información del usuario');
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [{ data: tipos }, { data: cols }, { data: productos }] = await Promise.all([
        supabase.from('tipos_prenda').select('nombre').order('nombre'),
        supabase.from('colores').select('nombre').order('nombre'),
        supabase.from('productos').select(`
          disenos!inner(nombre),
          tipos_prenda!inner(nombre)
        `).order('disenos(nombre)'),
      ]);

      setTiposPrenda(tipos?.map((t) => t.nombre) ?? []);
      setColores(cols?.map((c) => c.nombre) ?? []);

      // Crear un mapa de diseños por tipo de prenda
      const disenosPorTipoMap: Record<string, Set<string>> = {};
      const todosDisenos = new Set<string>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productos?.forEach((producto: any) => {
        const diseno = producto.disenos?.nombre;
        const tipoPrenda = producto.tipos_prenda?.nombre;
        
        if (diseno && tipoPrenda) {
          todosDisenos.add(diseno);
          if (!disenosPorTipoMap[tipoPrenda]) {
            disenosPorTipoMap[tipoPrenda] = new Set();
          }
          disenosPorTipoMap[tipoPrenda].add(diseno);
        }
      });

      // Convertir Sets a arrays ordenados
      const disenosPorTipoFinal: Record<string, string[]> = {};
      Object.keys(disenosPorTipoMap).forEach((tipo) => {
        disenosPorTipoFinal[tipo] = Array.from(disenosPorTipoMap[tipo]).sort();
      });

      setDisenos(Array.from(todosDisenos).sort());
      setDisenosPorTipo(disenosPorTipoFinal);
      setDisenosFiltrados(Array.from(todosDisenos).sort());
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const cargarDineroCaja = async () => {
    try {
      const { data: sesion } = await supabase
        .from('caja_sesiones')
        .select('id, saldo_inicial')
        .eq('abierta', true)
        .single();

      if (!sesion) {
        console.warn('No hay sesión de caja abierta');
        return;
      }

      const { data: denoms } = await supabase
        .from('caja_denominaciones')
        .select('denominacion, cantidad')
        .eq('sesion_id', sesion.id)
        .order('denominacion', { ascending: false });

      if (denoms) {
        setDenominaciones(denoms);
        const total = denoms.reduce((acc, d) => acc + d.denominacion * d.cantidad, 0);
        setTotalEfectivoCaja(total);
      }
    } catch (err) {
      console.error('Error cargando dinero en caja:', err);
    }
  };

  const buscarProductos = async () => {
    setError(null);
    setOk(null);
    setLoading(true);

    try {
      // Construir query para detalle_ventas con joins
      let query = supabase
        .from('detalle_ventas')
        .select(`
          id,
          venta_id,
          variante_id,
          cantidad,
          precio_unitario,
          variantes!inner(
            id,
            talla,
            producto_id,
            productos!inner(
              id,
              disenos!inner(nombre),
              tipos_prenda!inner(nombre),
              colores(nombre)
            )
          ),
          ventas!inner(
            id,
            fecha,
            metodo_pago,
            numero_boleta
          )
        `)
        .order('venta_id', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (disenoFiltro) {
        query = query.ilike('variantes.productos.disenos.nombre', `%${disenoFiltro}%`);
      }
      if (tipoPrendaFiltro) {
        query = query.ilike('variantes.productos.tipos_prenda.nombre', `%${tipoPrendaFiltro}%`);
      }
      if (colorFiltro) {
        query = query.ilike('variantes.productos.colores.nombre', `%${colorFiltro}%`);
      }

      const { data: detalles, error: errDetalles } = await query;

      if (errDetalles) {
        console.error('Error en query:', errDetalles);
        throw errDetalles;
      }

      if (!detalles || detalles.length === 0) {
        setProductosVendidos([]);
        setError('No se encontraron productos vendidos con esos criterios.');
        return;
      }

      // Transformar los datos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productosConInfo: ProductoVendido[] = detalles.map((detalle: any) => ({
        detalle_venta_id: detalle.id,
        venta_id: detalle.venta_id,
        variante_id: detalle.variante_id,
        producto_id: detalle.variantes.producto_id,
        diseno: detalle.variantes.productos.disenos.nombre || 'Sin diseño',
        tipo_prenda: detalle.variantes.productos.tipos_prenda.nombre || 'Sin tipo',
        color: detalle.variantes.productos.colores?.nombre || null,
        talla: detalle.variantes.talla || '—',
        cantidad_vendida: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        fecha_venta: detalle.ventas.fecha,
        metodo_pago: detalle.ventas.metodo_pago as MetodoPago,
        numero_boleta: detalle.ventas.numero_boleta,
      }));

      setProductosVendidos(productosConInfo);

      const initSel: CantidadesSeleccion = {};
      productosConInfo.forEach((p) => (initSel[p.detalle_venta_id] = 0));
      setCantSel(initSel);
    } catch (err) {
      console.error('Error completo:', err);
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
      setProductosVendidos([]);
    } finally {
      setLoading(false);
    }
  };

  const totalSeleccionado = useMemo(() => {
    return productosVendidos.reduce((acc, p) => {
      const q = Number(cantSel[p.detalle_venta_id] ?? 0);
      return acc + (q > 0 ? q * p.precio_unitario : 0);
    }, 0);
  }, [productosVendidos, cantSel]);

  const validarEfectivoDisponible = () => {
    if (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'efectivo') {
      if (montoReintegro > totalEfectivoCaja) {
        return false;
      }
    }
    if (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'efectivo') {
      if (montoDiferencia > totalEfectivoCaja) {
        return false;
      }
    }
    return true;
  };

  const confirmar = async () => {
    setError(null);
    setOk(null);

    if (!usuarioId) {
      setError('No se pudo identificar al usuario. Por favor, recarga la página e intenta nuevamente.');
      return;
    }

    const itemsSeleccionados = productosVendidos
      .map((p) => {
        const q = Number(cantSel[p.detalle_venta_id] ?? 0);
        if (q > 0) {
          return {
            detalle_venta_id: p.detalle_venta_id,
            variante_id: p.variante_id,
            cantidad: q,
            venta_id: p.venta_id,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (itemsSeleccionados.length === 0) {
      setError('Selecciona al menos un producto para devolver/cambiar.');
      return;
    }

    for (const item of itemsSeleccionados) {
      if (!item) continue;
      const producto = productosVendidos.find((p) => p.detalle_venta_id === item.detalle_venta_id);
      if (!producto) continue;
      if (item.cantidad > producto.cantidad_vendida) {
        setError(`La cantidad seleccionada excede la vendida (${producto.diseno} - ${producto.talla}).`);
        return;
      }
    }

    if (metodo === 'reintegro_efectivo') {
      if (montoReintegro <= 0) {
        setError('Ingresa un monto de reintegro mayor a 0.');
        return;
      }
      if (montoReintegro > totalSeleccionado) {
        setError('El reintegro no puede superar el total seleccionado.');
        return;
      }

      if (metodoPagoReintegro === 'transferencia') {
        if (!datosTransferencia.rut || !datosTransferencia.nombre || !datosTransferencia.banco || 
            !datosTransferencia.numeroCuenta) {
          setError('Completa todos los datos bancarios obligatorios para la transferencia.');
          return;
        }
      }
    }

    if (metodo === 'cambio_producto' && tipoDiferencia !== 'sin_diferencia') {
      if (montoDiferencia <= 0) {
        setError('Ingresa un monto de diferencia mayor a 0.');
        return;
      }

      if (tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia') {
        if (!datosTransferencia.rut || !datosTransferencia.nombre || !datosTransferencia.banco || 
            !datosTransferencia.numeroCuenta) {
          setError('Completa todos los datos bancarios obligatorios para la transferencia.');
          return;
        }
      }
    }

    if (!validarEfectivoDisponible()) {
      setError('No hay suficiente efectivo en caja para realizar esta operación.');
      return;
    }

    setLoading(true);
    try {
      const porVenta = new Map<number, typeof itemsSeleccionados>();
      itemsSeleccionados.forEach((item) => {
        if (!item) return;
        if (!porVenta.has(item.venta_id)) {
          porVenta.set(item.venta_id, []);
        }
        porVenta.get(item.venta_id)?.push(item);
      });

      const resultados: number[] = [];
      for (const [ventaId, items] of porVenta) {
        // Payload base
        const payload: Record<string, unknown> = {
          p_venta_id: ventaId,
          p_tipo: tipo,
          p_metodo_resolucion: metodo,
          p_monto_reintegro: metodo === 'cambio_producto' ? 0 : Number(montoReintegro || 0),
          p_observacion: observacion?.trim() || null,
          p_usuario_id: usuarioId,
          p_items: items.map((it) => ({
            detalle_venta_id: it!.detalle_venta_id,
            variante_id: it!.variante_id,
            cantidad: it!.cantidad,
            motivo_id: null,
            observacion: null
          })),
        };

        // Agregar datos de transferencia como parámetros individuales
        if (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'transferencia') {
          payload.p_metodo_pago_reintegro = 'transferencia';
          payload.p_transferencia_rut = datosTransferencia.rut;
          payload.p_transferencia_nombre = datosTransferencia.nombre;
          payload.p_transferencia_banco = datosTransferencia.banco;
          payload.p_transferencia_tipo_cuenta = datosTransferencia.tipoCuenta;
          payload.p_transferencia_numero_cuenta = datosTransferencia.numeroCuenta;
          payload.p_transferencia_email = datosTransferencia.email || null;
        } else if (metodo === 'reintegro_efectivo') {
          payload.p_metodo_pago_reintegro = 'efectivo';
        }

        // Manejo de diferencia en cambios
        if (metodo === 'cambio_producto') {
          payload.p_tipo_diferencia = tipoDiferencia;
          payload.p_monto_diferencia = montoDiferencia;
        
          if (tipoDiferencia !== 'sin_diferencia') {
            payload.p_metodo_pago_diferencia = metodoPagoDiferencia;
            
            if (tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia') {
              payload.p_transferencia_rut = datosTransferencia.rut;
              payload.p_transferencia_nombre = datosTransferencia.nombre;
              payload.p_transferencia_banco = datosTransferencia.banco;
              payload.p_transferencia_tipo_cuenta = datosTransferencia.tipoCuenta;
              payload.p_transferencia_numero_cuenta = datosTransferencia.numeroCuenta;
              payload.p_transferencia_email = datosTransferencia.email || null;
            }
          }
        }

      console.log('Payload enviado a RPC:', payload);

      const { data, error: rpcError } = await supabase.rpc('crear_devolucion_json', payload);

      if (rpcError) {
        console.error('Error RPC completo:', rpcError);
        throw new Error(`Error en RPC: ${rpcError.message} (${rpcError.code})`);
      }

      if (!data) {
        throw new Error('La función RPC no devolvió un ID de devolución');
      }

      resultados.push(data);
      
      // Enviar correo si es transferencia
      const esTransferencia = (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'transferencia') ||
                             (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia');
      
      if (esTransferencia && datosTransferencia.rut && datosTransferencia.nombre) {
        try {
          const montoTransferencia = metodo === 'reintegro_efectivo' ? montoReintegro : montoDiferencia;
          
          await fetch('/api/send-transfer-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              devolucionId: data,
              rut: datosTransferencia.rut,
              nombre: datosTransferencia.nombre,
              banco: datosTransferencia.banco,
              tipoCuenta: datosTransferencia.tipoCuenta,
              numeroCuenta: datosTransferencia.numeroCuenta,
              email: datosTransferencia.email,
              monto: montoTransferencia,
              tipo: tipo,
            }),
          });
          console.log('Correo de transferencia enviado');
        } catch (emailError) {
          console.error('Error al enviar correo:', emailError);
          // No fallar la operación si el correo falla
        }
      }
    }

    let mensajeExito = `✅ ${tipo === 'devolucion' ? 'Devolución' : 'Cambio'} creado correctamente. ID(s): ${resultados.join(', ')}`;
    
    if (metodo === 'cambio_producto' && tipoDiferencia !== 'sin_diferencia') {
      if (tipoDiferencia === 'cliente_paga') {
        mensajeExito += `\n💳 Cliente pagó diferencia de $${montoDiferencia.toLocaleString('es-CL')} por ${metodoPagoDiferencia}`;
      } else {
        mensajeExito += `\n💰 Se reintegró diferencia de $${montoDiferencia.toLocaleString('es-CL')} al cliente por ${metodoPagoDiferencia}`;
      }
    }
    
    // Agregar mensaje si se envió correo de transferencia
    const esTransferenciaFinal = (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'transferencia') ||
                                 (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia');
    if (esTransferenciaFinal) {
      mensajeExito += `\n📧 Se envió notificación por correo con los datos de transferencia`;
    }

    setOk(mensajeExito);

    // Remover los productos devueltos de la tabla
    setProductosVendidos((prevProductos) =>
      prevProductos.filter((p) => {
        const cantidadDevuelta = Number(cantSel[p.detalle_venta_id] ?? 0);
        if (cantidadDevuelta === p.cantidad_vendida) {
          return false;
        }
        if (cantidadDevuelta > 0) {
          p.cantidad_vendida -= cantidadDevuelta;
          return true;
        }
        return true;
      })
    );

    setCantSel({});
    setMontoReintegro(0);
    setObservacion('');
    setMontoDiferencia(0);
    setTipoDiferencia('sin_diferencia');
    setDatosTransferencia({
      rut: '',
      nombre: '',
      banco: '',
      tipoCuenta: 'corriente',
      numeroCuenta: '',
      email: '',
    });
    setProductosVendidos([]);
    
    await cargarDineroCaja();
  } catch (err) {
    console.error('Error completo al crear operación:', err);
    setError(err instanceof Error ? err.message : 'Error al crear la operación.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header estilo POS */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Devoluciones / Cambios</h1>
            <p className="text-white/80 text-sm mt-1">
              {fecha} · {hora}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl p-4 shadow-2xl sm:p-6">

        {error && (
          <div className="mb-4 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        {ok && (
          <div className="mb-4 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <h3 className="font-semibold text-green-800">Éxito</h3>
                <p className="text-sm text-green-700 mt-1 whitespace-pre-line">{ok}</p>
              </div>
            </div>
          </div>
        )}

          <div className="mb-6 mx-auto max-w-4xl">
            <div className="rounded-3xl bg-white p-8 shadow-2xl border-t-4 border-purple-600">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                  <span className="text-3xl text-white">↩️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Registrar Devolución o Cambio</h2>
                <p className="mt-2 text-sm text-gray-500">Complete los datos para procesar la operación</p>
              </div>

              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700">Buscar Producto Vendido</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Tipo de Prenda <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                      value={tipoPrendaFiltro}
                      onChange={(e) => setTipoPrendaFiltro(e.target.value)}
                    >
                      <option value="">Seleccione el tipo</option>
                      {tiposPrenda.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Diseño <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                      value={disenoFiltro}
                      onChange={(e) => setDisenoFiltro(e.target.value)}
                      disabled={!tipoPrendaFiltro}
                    >
                      <option value="">
                        {tipoPrendaFiltro ? 'Seleccione un diseño' : 'Primero seleccione un tipo de prenda'}
                      </option>
                      {disenosFiltrados.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Color</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                      value={colorFiltro}
                      onChange={(e) => setColorFiltro(e.target.value)}
                    >
                      <option value="">Todos los colores</option>
                      {colores.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-md transition hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={buscarProductos}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Buscando...
                      </span>
                    ) : (
                      '🔍 Buscar Productos'
                    )}
                  </button>
                  <button
                    className="rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400"
                    onClick={() => {
                      setDisenoFiltro('');
                      setTipoPrendaFiltro('');
                      setColorFiltro('');
                      setProductosVendidos([]);
                      setCantSel({});
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {productosVendidos.length > 0 && (
                <>
                  <div className="mb-8">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                        2
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">Configuración de la Operación</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 bg-gray-50 rounded-xl p-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Tipo de Operación <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value as TipoOperacion)}
                        >
                          <option value="devolucion">📦 Devolución</option>
                          <option value="cambio">🔄 Cambio</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Método de Resolución <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                          value={metodo}
                          onChange={(e) => setMetodo(e.target.value as MetodoResolucion)}
                        >
                          <option value="reintegro_efectivo">💵 Reintegro en Efectivo</option>
                          <option value="cambio_producto">🔄 Cambio de Producto</option>
                        </select>
                      </div>

                      {(metodo === 'reintegro_efectivo') && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Método de Pago <span className="text-red-500">*</span>
                            </label>
                            <select
                              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                              value={metodoPagoReintegro}
                              onChange={(e) => setMetodoPagoReintegro(e.target.value as MetodoPagoReintegro)}
                            >
                              <option value="efectivo">💵 Efectivo</option>
                              <option value="transferencia">🏦 Transferencia</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Monto a Reintegrar <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                $
                              </span>
                              <input
                                type="number"
                                min={0}
                                className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-8 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                value={montoReintegro}
                                onChange={(e) => setMontoReintegro(Math.max(0, Number(e.target.value || 0)))}
                                placeholder="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                Máx: ${totalSeleccionado.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          {metodoPagoReintegro === 'efectivo' && (
                            <div className="md:col-span-2">
                              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4 border border-purple-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  💰 Dinero en caja (efectivo)
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                  {denominaciones.map((d) => (
                                    <div
                                      key={d.denominacion}
                                      className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-gray-200"
                                    >
                                      <span className="text-sm font-medium text-gray-600">
                                        ${d.denominacion.toLocaleString('es-CL')}
                                      </span>
                                      <span className="text-lg font-bold text-purple-600">{d.cantidad}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-3 border-t border-purple-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Total efectivo en caja</span>
                                    <span className="text-2xl font-bold text-purple-700">
                                      ${totalEfectivoCaja.toLocaleString('es-CL')}
                                    </span>
                                  </div>

                                  {montoReintegro > totalEfectivoCaja && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                                      <span>⚠️</span>
                                      <span>El monto a reintegrar excede el efectivo disponible en caja</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {(metodo === 'reintegro_efectivo') && metodoPagoReintegro === 'transferencia' && (
                        <div className="md:col-span-2">
                          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border-2 border-blue-300">
                            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                              🏦 Datos Bancarios para Transferencia
                            </h4>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  RUT <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  placeholder="12.345.678-9"
                                  value={datosTransferencia.rut}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, rut: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  Nombre Completo <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  placeholder="Juan Pérez"
                                  value={datosTransferencia.nombre}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, nombre: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  Banco <span className="text-red-500">*</span>
                                </label>
                                <select
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  value={datosTransferencia.banco}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, banco: e.target.value })}
                                >
                                  <option value="">Seleccione banco</option>
                                  <option value="Banco de Chile">Banco de Chile</option>
                                  <option value="Banco Estado">Banco Estado</option>
                                  <option value="Banco Santander">Banco Santander</option>
                                  <option value="BCI">BCI</option>
                                  <option value="Banco Scotiabank">Banco Scotiabank</option>
                                  <option value="Banco Itaú">Banco Itaú</option>
                                  <option value="Banco Security">Banco Security</option>
                                  <option value="Banco Falabella">Banco Falabella</option>
                                  <option value="Banco Ripley">Banco Ripley</option>
                                  <option value="Banco Consorcio">Banco Consorcio</option>
                                  <option value="Coopeuch">Coopeuch</option>
                                  <option value="Otro">Otro</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  Tipo de Cuenta <span className="text-red-500">*</span>
                                </label>
                                <select
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  value={datosTransferencia.tipoCuenta}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, tipoCuenta: e.target.value as 'corriente' | 'vista' | 'ahorro' })}
                                >
                                  <option value="corriente">Cuenta Corriente</option>
                                  <option value="vista">Cuenta Vista</option>
                                  <option value="ahorro">Cuenta de Ahorro</option>
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  Número de Cuenta <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  placeholder="1234567890"
                                  value={datosTransferencia.numeroCuenta}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, numeroCuenta: e.target.value })}
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  Email (opcional)
                                </label>
                                <input
                                  type="email"
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                  placeholder="correo@ejemplo.com"
                                  value={datosTransferencia.email}
                                  onChange={(e) => setDatosTransferencia({ ...datosTransferencia, email: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="mt-3 rounded-lg bg-blue-100 border border-blue-300 p-3 text-xs text-blue-800">
                              <strong>📌 Nota:</strong> Estos datos se utilizarán para realizar la transferencia bancaria al cliente.
                            </div>
                          </div>
                        </div>
                      )}

                      {metodo === 'cambio_producto' && (
                        <>
                          <div className="md:col-span-2">
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                              ℹ️ En un cambio de producto, puede haber diferencia de precio entre los productos
                            </div>
                          </div>
                        </>
                      )}

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition resize-none"
                          placeholder="Ingrese comentarios adicionales sobre esta operación..."
                          value={observacion}
                          onChange={(e) => setObservacion(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {metodo === 'cambio_producto' && (
                        <div className="md:col-span-2">
                          <label className="mb-3 block text-sm font-semibold text-gray-700">
                            💱 Diferencia de Precio
                          </label>
                          <div className="grid gap-3 md:grid-cols-3 bg-white rounded-lg border-2 border-purple-300 p-4">
                            <div>
                              <label className="mb-2 block text-xs font-medium text-gray-600">
                                Tipo de Diferencia <span className="text-red-500">*</span>
                              </label>
                              <select
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                value={tipoDiferencia}
                                onChange={(e) => setTipoDiferencia(e.target.value as typeof tipoDiferencia)}
                              >
                                <option value="sin_diferencia">⚖️ Sin diferencia</option>
                                <option value="cliente_paga">💳 Cliente paga diferencia</option>
                                <option value="cliente_recibe">💰 Cliente recibe diferencia</option>
                              </select>
                            </div>

                            {tipoDiferencia !== 'sin_diferencia' && (
                              <>
                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-600">
                                    Monto Diferencia <span className="text-red-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      min={0}
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 pl-7 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                      value={montoDiferencia}
                                      onChange={(e) => setMontoDiferencia(Math.max(0, Number(e.target.value || 0)))}
                                      placeholder="0"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-600">
                                    Método de Pago <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={metodoPagoDiferencia}
                                    onChange={(e) => setMetodoPagoDiferencia(e.target.value as MetodoPagoDiferencia)}
                                  >
                                    <option value="efectivo">💵 Efectivo</option>
                                    {tipoDiferencia === 'cliente_paga' && (
                                      <>
                                        <option value="debito">💳 Débito</option>
                                        <option value="credito">💳 Crédito</option>
                                      </>
                                    )}
                                    <option value="transferencia">🏦 Transferencia</option>
                                  </select>
                                </div>
                              </>
                            )}
                          </div>

                          {tipoDiferencia === 'cliente_paga' && montoDiferencia > 0 && (
                            <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">✅</span>
                                <div className="flex-1">
                                  <p className="text-sm text-green-700 font-medium">
                                    El cliente debe pagar <strong className="text-green-800 text-lg">${montoDiferencia.toLocaleString('es-CL')}</strong> adicionales
                                  </p>
                                  <p className="text-xs text-green-600 mt-1">
                                    Método: <span className="font-semibold capitalize">{metodoPagoDiferencia}</span>
                                  </p>
                                  {metodoPagoDiferencia === 'debito' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2">
                                      <span>💳</span>
                                      <span>Procesar pago con tarjeta de débito en terminal POS</span>
                                    </div>
                                  )}
                                  {metodoPagoDiferencia === 'credito' && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2">
                                      <span>💳</span>
                                      <span>Procesar pago con tarjeta de crédito en terminal POS</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {tipoDiferencia === 'cliente_recibe' && montoDiferencia > 0 && (
                            <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 p-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">💰</span>
                                <div className="flex-1">
                                  <p className="text-sm text-orange-700 font-medium">
                                    Se debe reintegrar <strong className="text-orange-800 text-lg">${montoDiferencia.toLocaleString('es-CL')}</strong> al cliente
                                  </p>
                                  <p className="text-xs text-orange-600 mt-1">
                                    Método: <span className="font-semibold capitalize">{metodoPagoDiferencia}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'efectivo' && montoDiferencia > 0 && (
                            <div className="mt-3">
                              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 p-4 border border-purple-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  💰 Dinero en caja (efectivo)
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                  {denominaciones.map((d) => (
                                    <div
                                      key={d.denominacion}
                                      className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-gray-200"
                                    >
                                      <span className="text-sm font-medium text-gray-600">
                                        ${d.denominacion.toLocaleString('es-CL')}
                                      </span>
                                      <span className="text-lg font-bold text-purple-600">{d.cantidad}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-3 border-t border-purple-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Total efectivo en caja</span>
                                    <span className="text-2xl font-bold text-purple-700">
                                      ${totalEfectivoCaja.toLocaleString('es-CL')}
                                    </span>
                                  </div>

                                  {montoDiferencia > totalEfectivoCaja && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                                      <span>⚠️</span>
                                      <span>La diferencia a reintegrar excede el efectivo disponible en caja</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia' && montoDiferencia > 0 && (
                            <div className="mt-3">
                              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border-2 border-blue-300">
                                <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                  🏦 Datos Bancarios para Transferencia
                                </h4>
                                
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      RUT <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      placeholder="12.345.678-9"
                                      value={datosTransferencia.rut}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, rut: e.target.value })}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      Nombre Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      placeholder="Juan Pérez"
                                      value={datosTransferencia.nombre}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, nombre: e.target.value })}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      Banco <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      value={datosTransferencia.banco}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, banco: e.target.value })}
                                    >
                                      <option value="">Seleccione banco</option>
                                      <option value="Banco de Chile">Banco de Chile</option>
                                      <option value="Banco Estado">Banco Estado</option>
                                      <option value="Banco Santander">Banco Santander</option>
                                      <option value="BCI">BCI</option>
                                      <option value="Banco Scotiabank">Banco Scotiabank</option>
                                      <option value="Banco Itaú">Banco Itaú</option>
                                      <option value="Banco Security">Banco Security</option>
                                      <option value="Banco Falabella">Banco Falabella</option>
                                      <option value="Banco Ripley">Banco Ripley</option>
                                      <option value="Banco Consorcio">Banco Consorcio</option>
                                      <option value="Coopeuch">Coopeuch</option>
                                      <option value="Otro">Otro</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      Tipo de Cuenta <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      value={datosTransferencia.tipoCuenta}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, tipoCuenta: e.target.value as 'corriente' | 'vista' | 'ahorro' })}
                                    >
                                      <option value="corriente">Cuenta Corriente</option>
                                      <option value="vista">Cuenta Vista</option>
                                      <option value="ahorro">Cuenta de Ahorro</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      Número de Cuenta <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      placeholder="1234567890"
                                      value={datosTransferencia.numeroCuenta}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, numeroCuenta: e.target.value })}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-700">
                                      Email (opcional)
                                    </label>
                                    <input
                                      type="email"
                                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition"
                                      placeholder="correo@ejemplo.com"
                                      value={datosTransferencia.email}
                                      onChange={(e) => setDatosTransferencia({ ...datosTransferencia, email: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 rounded-lg bg-blue-100 border border-blue-300 p-3 text-xs text-blue-800">
                                  <strong>📌 Nota:</strong> Estos datos se utilizarán para realizar la transferencia bancaria al cliente.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between bg-purple-50 rounded-lg p-4">
                      <span className="text-sm text-gray-600">Total seleccionado:</span>
                      <span className="text-2xl font-bold text-purple-600">${totalSeleccionado.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                        3
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">Seleccionar Cantidades</h3>
                    </div>

                    <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gradient-to-r from-purple-100 to-indigo-100">
                          <tr>
                            <th className="p-3 text-left font-semibold text-gray-700">Producto</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Talla</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Venta</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Fecha</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Precio</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Disponible</th>
                            <th className="p-3 text-left font-semibold text-gray-700">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {productosVendidos.map((p) => {
                            const sel = Number(cantSel[p.detalle_venta_id] ?? 0);
                            return (
                              <tr key={p.detalle_venta_id} className="border-b hover:bg-purple-50 transition">
                                <td className="p-3">
                                  <div className="font-medium text-gray-900">{p.diseno}</div>
                                  <div className="text-xs text-gray-500">
                                    {p.tipo_prenda} {p.color ? `· ${p.color}` : ''}
                                  </div>
                                </td>
                                <td className="p-3 font-medium">{p.talla}</td>
                                <td className="p-3">
                                  <div className="text-xs font-mono text-gray-600">#{p.venta_id}</div>
                                  {p.numero_boleta && <div className="text-xs text-gray-400">{p.numero_boleta}</div>}
                                </td>
                                <td className="p-3 text-xs text-gray-600">
                                  {new Date(p.fecha_venta).toLocaleDateString('es-CL')}
                                </td>
                                <td className="p-3 font-semibold text-gray-700">${p.precio_unitario.toFixed(0)}</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                    {p.cantidad_vendida}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    min={0}
                                    max={p.cantidad_vendida}
                                    className="w-20 rounded-lg border-2 border-gray-300 p-2 text-center focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={sel}
                                    onChange={(e) => {
                                      const next = Math.max(
                                        0,
                                        Math.min(p.cantidad_vendida, Number(e.target.value || 0))
                                      );
                                      setCantSel((prev) => ({ ...prev, [p.detalle_venta_id]: next }));
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <button
                      className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition hover:from-green-700 hover:to-emerald-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={confirmar}
                      disabled={loading || totalSeleccionado === 0}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Procesando...
                        </span>
                      ) : (
                        `✓ Confirmar ${tipo === 'devolucion' ? 'Devolución' : 'Cambio'}`
                      )}
                    </button>
                    <button
                      className="rounded-lg border-2 border-gray-300 px-8 py-4 font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400"
                      onClick={() => {
                        setCantSel({});
                        setMontoReintegro(0);
                        setObservacion('');
                        setMontoDiferencia(0);
                        setTipoDiferencia('sin_diferencia');
                      }}
                    >
                      Limpiar Selección
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
  
  );
}