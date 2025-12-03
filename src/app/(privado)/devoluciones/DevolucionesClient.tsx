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

type ItemSeleccionado = {
  detalle_venta_id: number;
  venta_id: number;
  variante_id: number;
  producto_id: number;
  diseno: string;
  tipo_prenda: string;
  color: string | null;
  talla: string;
  cantidad: number;
  precio_unitario: number;
  fecha_venta: string;
  metodo_pago: MetodoPago;
  numero_boleta: string | null;
};

type CantidadesSeleccion = Record<number, number>;

type ProductoConVariantes = {
  id: number;
  disenos: { nombre: string }[];
  tipos_prenda: { nombre: string }[];
  colores: { nombre: string }[];
  variantes: {
    id: number;
    talla: string;
    stock_actual: number;
    costo_unitario: number;
  }[];
};

type Variante = {
  id: number;
  talla: string;
  stock_actual: number;
  costo_unitario: number;
};

export default function DevolucionesClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  // Función de validación de RUT chileno
  const validarRUT = (rut: string): boolean => {
    if (!rut) return false;
    
    // Limpiar el RUT: remover puntos y guiones, convertir a mayúsculas
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    
    // El RUT debe tener entre 8 y 9 caracteres (7-8 números + 1 dígito verificador)
    if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;
    
    // Separar el cuerpo y el dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    
    // Validar que el cuerpo sea solo números
    if (!/^[0-9]+$/.test(cuerpo)) return false;
    
    // Calcular el dígito verificador esperado
    let suma = 0;
    let multiplo = 2;
    
    // Recorrer el cuerpo de derecha a izquierda
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    // Calcular el dígito verificador
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
    
    // Comparar el dígito verificador
    return dv === dvCalculado;
  };

  // Función para formatear RUT mientras se escribe
  const formatearRUT = (rut: string): string => {
    if (!rut) return '';
    
    // Limpiar el RUT
    const rutLimpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    
    // Si está vacío, retornar vacío
    if (rutLimpio.length === 0) return '';
    
    // Separar cuerpo y dígito verificador
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    
    // Formatear el cuerpo con puntos
    let cuerpoFormateado = '';
    let contador = 0;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
      contador++;
      if (contador === 3 && i !== 0) {
        cuerpoFormateado = '.' + cuerpoFormateado;
        contador = 0;
      }
    }
    
    // Unir cuerpo formateado con guión y dígito verificador
    return cuerpoFormateado + (rutLimpio.length > 1 ? '-' + dv : dv);
  };

  // Manejador de cambios para el RUT
  const handleRUTChange = (value: string) => {
    const rutFormateado = formatearRUT(value);
    setDatosTransferencia({ ...datosTransferencia, rut: rutFormateado });
    // Limpiar error de RUT cuando el usuario modifica el campo
    if (errorRUT) {
      setErrorRUT('');
    }
  };

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

  // Estado para panel de cambio (seleccionar producto por reemplazo)
  const [cambioTipoPrenda, setCambioTipoPrenda] = useState<string>('');
  const [cambioColor, setCambioColor] = useState<string>('');
  const [cambioDiseno, setCambioDiseno] = useState<string>('');
  const [cambioTalla, setCambioTalla] = useState<string>('');
  const [cambioTallas, setCambioTallas] = useState<string[]>([]);
  const [cambioSeleccionado, setCambioSeleccionado] = useState<{
    tipo_prenda?: string;
    diseno?: string;
    color?: string | null;
    talla?: string | null;
  } | null>(null);
  const [precioReemplazoUnitario, setPrecioReemplazoUnitario] = useState<number>(0); // Nuevo estado para precio unitario del reemplazo

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
  
  // Estados para manejo de denominaciones en reintegros
  const [denominacionesReintegro, setDenominacionesReintegro] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [mostrarSelectorDenominaciones, setMostrarSelectorDenominaciones] = useState(false);
  
  // Estados para manejo de denominaciones en diferencias de cambios
  const [denominacionesDiferencia, setDenominacionesDiferencia] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [mostrarSelectorDenominacionesDiferencia, setMostrarSelectorDenominacionesDiferencia] = useState(false);
  
  // Estados para manejo de vuelto
  const [denominacionesVueltoReintegro, setDenominacionesVueltoReintegro] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [denominacionesVueltoDiferencia, setDenominacionesVueltoDiferencia] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [mostrarSelectorVuelto, setMostrarSelectorVuelto] = useState(false);
  const [mostrarSelectorVueltoDiferencia, setMostrarSelectorVueltoDiferencia] = useState(false);
  
  // Estados para manejo de denominaciones cuando cliente paga
  const [denominacionesClientePaga, setDenominacionesClientePaga] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [mostrarSelectorClientePaga, setMostrarSelectorClientePaga] = useState(false);
  
  // Estados para manejo de vuelto cuando cliente paga
  const [denominacionesVueltoClientePaga, setDenominacionesVueltoClientePaga] = useState<Record<string, number>>({
    '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
  });
  const [mostrarSelectorVueltoClientePaga, setMostrarSelectorVueltoClientePaga] = useState(false);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorRUT, setErrorRUT] = useState<string>('');

  // Calculos de totales de denominaciones (después de declarar los estados)
  const totalDenominacionesReintegro = useMemo(() => {
    return Object.entries(denominacionesReintegro).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesReintegro]);

  const totalDenominacionesDiferencia = useMemo(() => {
    return Object.entries(denominacionesDiferencia).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesDiferencia]);

  const totalDenominacionesVueltoReintegro = useMemo(() => {
    return Object.entries(denominacionesVueltoReintegro).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesVueltoReintegro]);

  const totalDenominacionesVueltoDiferencia = useMemo(() => {
    return Object.entries(denominacionesVueltoDiferencia).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesVueltoDiferencia]);

  const totalDenominacionesClientePaga = useMemo(() => {
    return Object.entries(denominacionesClientePaga).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesClientePaga]);

  const totalDenominacionesVueltoClientePaga = useMemo(() => {
    return Object.entries(denominacionesVueltoClientePaga).reduce((sum, [denom, cant]) => 
      sum + (parseInt(denom) * cant), 0
    );
  }, [denominacionesVueltoClientePaga]);

  // Funciones auxiliares para denominaciones (después de declarar los estados)
  const denominacionesDisponibles = useMemo(() => {
    const record: Record<number, number> = {};
    denominaciones.forEach(d => {
      record[d.denominacion] = d.cantidad;
    });
    return record;
  }, [denominaciones]);

  // Cargar tallas disponibles para la selección de cambio cuando cambia tipo/diseno/color
  useEffect(() => {
    const cargarTallas = async () => {
      try {
        // si no hay ningún filtro, limpiar
        if (!cambioTipoPrenda && !cambioDiseno && !cambioColor) {
          setCambioTallas([]);
          setCambioTalla('');
          return;
        }

        let query = supabase
          .from('productos')
          .select(`
            variantes(id, talla, stock_actual, costo_unitario),
            disenos!inner(nombre),
            tipos_prenda!inner(nombre),
            colores!inner(nombre)
          `)
          .limit(1);

        if (cambioDiseno) query = query.eq('disenos.nombre', cambioDiseno);
        if (cambioTipoPrenda) query = query.eq('tipos_prenda.nombre', cambioTipoPrenda);
        if (cambioColor) query = query.eq('colores.nombre', cambioColor);

        const { data: prods, error: prodErr } = await query;
        if (prodErr) {
          console.warn('Error cargando tallas para cambio:', prodErr);
          setCambioTallas([]);
          setCambioTalla('');
        } else if (prods && prods.length > 0) {
          const vars: Variante[] = prods[0].variantes || [];
          const tallas = Array.from(new Set(vars.map((v) => v.talla).filter(Boolean)));
          setCambioTallas(tallas);
          if (!tallas.includes(cambioTalla)) {
            setCambioTalla('');
          }
        } else {
          setCambioTallas([]);
          setCambioTalla('');
        }
      } catch (err) {
        console.error('Error cargando tallas de cambio:', err);
        setCambioTallas([]);
        setCambioTalla('');
      }
    };

    void cargarTallas();
  }, [cambioTipoPrenda, cambioDiseno, cambioColor, cambioTalla, supabase]);

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

      setTiposPrenda(tipos?.map((t: Record<string, string>) => t.nombre) ?? []);
      setColores(cols?.map((c: Record<string, string>) => c.nombre) ?? []);

      // Crear un mapa de diseños por tipo de prenda
      const disenosPorTipoMap: Record<string, Set<string>> = {};
      const todosDisenos = new Set<string>();

      productos?.forEach((producto: Record<string, unknown>) => {
        const prod = producto as { disenos?: { nombre?: string }; tipos_prenda?: { nombre?: string } };
        const diseno = prod.disenos?.nombre;
        const tipoPrenda = prod.tipos_prenda?.nombre;
        
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
    // Usar la nueva vista que calcula cantidades disponibles
    let query = supabase
      .from('v_venta_detalle_devolucion')
      .select('*');

    // Aplicar filtros
    if (disenoFiltro) {
      query = query.ilike('diseno', `%${disenoFiltro}%`);
    }
    if (tipoPrendaFiltro) {
      query = query.ilike('tipo_prenda', `%${tipoPrendaFiltro}%`);
    }
    if (colorFiltro) {
      query = query.ilike('color', `%${colorFiltro}%`);
    }

    const { data: detalles, error: errDetalles } = await query
      .order('venta_id', { ascending: false })
      .limit(100);

    if (errDetalles) {
      console.error('Error en query:', errDetalles);
      throw errDetalles;
    }

    if (!detalles || detalles.length === 0) {
      setProductosVendidos([]);
      setError('No se encontraron productos vendidos con esos criterios o todos ya fueron devueltos.');
      return;
    }

    // Mapear directamente desde la vista
    const productosConInfo: ProductoVendido[] = (detalles as Record<string, unknown>[]).map((detalle: Record<string, unknown>) => {
      const det = detalle as {
        detalle_venta_id: number;
        venta_id: number;
        variante_id: number;
        producto_id: number;
        diseno: string;
        tipo_prenda: string;
        color: string | null;
        talla: string;
        cantidad_disponible: number;
        precio_unitario: number;
        fecha: string;
        metodo_pago: MetodoPago;
        numero_boleta: string | null;
      };
      return {
        detalle_venta_id: det.detalle_venta_id,
        venta_id: det.venta_id,
        variante_id: det.variante_id,
        producto_id: det.producto_id,
        diseno: det.diseno || 'Sin diseño',
        tipo_prenda: det.tipo_prenda || 'Sin tipo',
        color: det.color,
        talla: det.talla || '—',
        cantidad_vendida: det.cantidad_disponible, //  Mostrar solo lo disponible
        precio_unitario: det.precio_unitario,
        fecha_venta: det.fecha,
        metodo_pago: det.metodo_pago,
        numero_boleta: det.numero_boleta,
      };
    });

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

  // Nueva memo para calcular la cantidad total seleccionada (para cambios)
  const totalCantidadSeleccionada = useMemo(() => {
    return productosVendidos.reduce((acc, p) => {
      const q = Number(cantSel[p.detalle_venta_id] ?? 0);
      return acc + q;
    }, 0);
  }, [productosVendidos, cantSel]);

  // Efecto para calcular automáticamente la diferencia cuando cambia el precio del reemplazo o selección
  useEffect(() => {
    if (metodo === 'cambio_producto' && precioReemplazoUnitario > 0 && totalCantidadSeleccionada > 0) {
      const totalNuevo = precioReemplazoUnitario * totalCantidadSeleccionada;
      const diferencia = totalNuevo - totalSeleccionado;
      setMontoDiferencia(Math.abs(diferencia));
      if (diferencia > 0) {
        setTipoDiferencia('cliente_paga');
      } else if (diferencia < 0) {
        setTipoDiferencia('cliente_recibe');
      } else {
        setTipoDiferencia('sin_diferencia');
      }
    }
  }, [metodo, precioReemplazoUnitario, totalCantidadSeleccionada, totalSeleccionado]);

  const validarEfectivoDisponible = () => {
    if (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'efectivo') {
      if (montoReintegro > totalEfectivoCaja) {
        return false;
      }
      // Validar que se hayan seleccionado denominaciones suficientes
      if (totalDenominacionesReintegro < montoReintegro) {
        return false;
      }
    }
    if (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'efectivo') {
      if (montoDiferencia > totalEfectivoCaja) {
        return false;
      }
      // Validar que se hayan seleccionado denominaciones suficientes
      if (totalDenominacionesDiferencia < montoDiferencia) {
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
            !datosTransferencia.numeroCuenta || !datosTransferencia.email) {
          setError('Completa todos los datos bancarios obligatorios para la transferencia, incluyendo el correo electrónico.');
          return;
        }
        
        // Validar RUT
        if (!validarRUT(datosTransferencia.rut)) {
          setErrorRUT('El RUT ingresado no es válido. Ejemplo: 12.345.678-9');
          return;
        } else {
          setErrorRUT('');
        }
      } else if (metodoPagoReintegro === 'efectivo') {
        // Validar que se hayan seleccionado denominaciones suficientes
        if (totalDenominacionesReintegro < montoReintegro) {
          setError('Debes seleccionar billetes/monedas que sumen al menos el monto del reintegro.');
          return;
        }
        
        // Validar que las denominaciones seleccionadas estén disponibles en caja
        for (const [denom, cantReintegro] of Object.entries(denominacionesReintegro)) {
          if (cantReintegro > 0) {
            const cantDisponible = denominacionesDisponibles[parseInt(denom)] || 0;
            if (cantReintegro > cantDisponible) {
              setError(`No hay suficientes billetes de $${parseInt(denom).toLocaleString('es-CL')}. Disponibles: ${cantDisponible}, Solicitados: ${cantReintegro}`);
              return;
            }
          }
        }
        
        // Validar vuelto si hay
        if (totalDenominacionesReintegro > montoReintegro) {
          const vueltoEsperado = totalDenominacionesReintegro - montoReintegro;
          if (totalDenominacionesVueltoReintegro !== vueltoEsperado) {
            setError(`El vuelto registrado (${totalDenominacionesVueltoReintegro.toLocaleString('es-CL')}) no coincide con el esperado (${vueltoEsperado.toLocaleString('es-CL')}).`);
            return;
          }
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
            !datosTransferencia.numeroCuenta || !datosTransferencia.email) {
          setError('Completa todos los datos bancarios obligatorios para la transferencia, incluyendo el correo electrónico.');
          return;
        }
        
        // Validar RUT
        if (!validarRUT(datosTransferencia.rut)) {
          setErrorRUT('El RUT ingresado no es válido. Ejemplo: 12.345.678-9');
          return;
        } else {
          setErrorRUT('');
        }
      } else if (tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'efectivo') {
        // Validar que se hayan seleccionado denominaciones suficientes
        if (totalDenominacionesDiferencia < montoDiferencia) {
          setError('Debes seleccionar billetes/monedas que sumen al menos el monto de la diferencia.');
          return;
        }
        
        // Validar que las denominaciones seleccionadas estén disponibles en caja
        for (const [denom, cantDiferencia] of Object.entries(denominacionesDiferencia)) {
          if (cantDiferencia > 0) {
            const cantDisponible = denominacionesDisponibles[parseInt(denom)] || 0;
            if (cantDiferencia > cantDisponible) {
              setError(`No hay suficientes billetes de $${parseInt(denom).toLocaleString('es-CL')}. Disponibles: ${cantDisponible}, Solicitados: ${cantDiferencia}`);
              return;
            }
          }
        }
        
        // Validar vuelto si hay
        if (totalDenominacionesDiferencia > montoDiferencia) {
          const vueltoEsperado = totalDenominacionesDiferencia - montoDiferencia;
          if (totalDenominacionesVueltoDiferencia !== vueltoEsperado) {
            setError(`El vuelto registrado (${totalDenominacionesVueltoDiferencia.toLocaleString('es-CL')}) no coincide con el esperado (${vueltoEsperado.toLocaleString('es-CL')}).`);
            return;
          }
        }
      } else if (tipoDiferencia === 'cliente_paga' && metodoPagoDiferencia === 'efectivo') {
        // Validar que se hayan seleccionado denominaciones suficientes
        if (totalDenominacionesClientePaga < montoDiferencia) {
          setError('Debes registrar billetes/monedas que sumen al menos el monto que el cliente debe pagar.');
          return;
        }
        
        // Validar vuelto si hay
        if (totalDenominacionesClientePaga > montoDiferencia) {
          const vueltoEsperado = totalDenominacionesClientePaga - montoDiferencia;
          console.log('🪙 [CLIENT] Vuelto a dar cliente:', vueltoEsperado);
          
          // Validar que el vuelto registrado sea correcto
          if (totalDenominacionesVueltoClientePaga !== vueltoEsperado) {
            setError(`El vuelto registrado (${totalDenominacionesVueltoClientePaga.toLocaleString('es-CL')}) no coincide con el esperado (${vueltoEsperado.toLocaleString('es-CL')}).`);
            return;
          }
        }
      }
    }

    if (!validarEfectivoDisponible()) {
      setError('No hay suficiente efectivo en caja para realizar esta operación.');
      return;
    }

    // Validar que si es cambio de producto, se haya seleccionado el producto de reemplazo
    if (metodo === 'cambio_producto' && !cambioSeleccionado) {
      setError('Seleccione el producto de reemplazo en el panel de cambio.');
      return;
    }

    // Validaciones adicionales para cambios de producto
    if (metodo === 'cambio_producto' && cambioSeleccionado) {
      // Validar que los campos obligatorios estén completos
      if (!cambioSeleccionado.tipo_prenda) {
        setError('El tipo de prenda es obligatorio para el cambio.');
        return;
      }
      
      if (!cambioSeleccionado.diseno) {
        setError('El diseño es obligatorio para el cambio.');
        return;
      }

      // Validar stock disponible antes de procesar
      try {
        const itemsSeleccionados: ItemSeleccionado[] = productosVendidos
          .map((p) => {
            const q = Number(cantSel[p.detalle_venta_id] ?? 0);
            if (q > 0) {
              return {
                detalle_venta_id: p.detalle_venta_id,
                venta_id: p.venta_id,
                variante_id: p.variante_id,
                producto_id: p.producto_id,
                diseno: p.diseno,
                tipo_prenda: p.tipo_prenda,
                color: p.color,
                talla: p.talla,
                cantidad: q,
                precio_unitario: p.precio_unitario,
                fecha_venta: p.fecha_venta,
                metodo_pago: p.metodo_pago,
                numero_boleta: p.numero_boleta,
              };
            }
            return null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);
        
        const totalCantidad = itemsSeleccionados.reduce((acc: number, item: ItemSeleccionado) => acc + item.cantidad, 0);
        
        // Construir query para verificar stock actual
        let query = supabase
          .from('productos')
          .select(`id, disenos!inner(nombre), tipos_prenda!inner(nombre), colores!inner(nombre), variantes(id, talla, stock_actual, costo_unitario)`)
          .limit(1);

        if (cambioSeleccionado.diseno) {
          query = query.eq('disenos.nombre', cambioSeleccionado.diseno);
        }
        if (cambioSeleccionado.tipo_prenda) {
          query = query.eq('tipos_prenda.nombre', cambioSeleccionado.tipo_prenda);
        }
        if (cambioSeleccionado.color) {
          query = query.eq('colores.nombre', cambioSeleccionado.color);
        }

        const { data: prods, error: prodErr } = await query;
        if (prodErr || !prods || prods.length === 0) {
          setError('No se puede verificar el stock del producto de reemplazo. Intente nuevamente.');
          return;
        }

        const variantesArr: Variante[] = prods[0].variantes || [];
        let variante: Variante | undefined;
        
        if (cambioSeleccionado.talla) {
          // Buscar variante con talla específica
          variante = variantesArr.find((v) => v.talla === cambioSeleccionado.talla);
          
          if (!variante) {
            setError(`No existe la talla ${cambioSeleccionado.talla} para este producto.`);
            return;
          }
          
          // Validar stock disponible
          if (variante.stock_actual < totalCantidad) {
            setError(`Stock insuficiente para realizar el cambio. Disponible: ${variante.stock_actual} unidades, Solicitado: ${totalCantidad} unidades.`);
            return;
          }
        } else {
          // Si no se seleccionó talla, buscar cualquier variante con stock suficiente
          variante = variantesArr.find((v) => v.stock_actual >= totalCantidad);
          
          if (!variante) {
            const stockTotal = variantesArr.reduce((sum, v) => sum + v.stock_actual, 0);
            if (stockTotal > 0) {
              setError(`Ninguna talla tiene stock suficiente para completar el cambio. Stock total disponible: ${stockTotal} unidades, Solicitado: ${totalCantidad} unidades.`);
            } else {
              setError('No hay stock disponible para este producto.');
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error verificando stock para cambio:', err);
        setError('Error al verificar stock disponible. Intente nuevamente.');
        return;
      }
    }

    console.log('📝 [CLIENT] Iniciando creación de devolución:', {
      tipo,
      metodo,
      itemsSeleccionados: itemsSeleccionados.length,
      cambioSeleccionado,
      usuarioId
    });

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
        const innerPayload: Record<string, unknown> = {
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
          innerPayload.p_metodo_pago_reintegro = 'transferencia';
          innerPayload.p_transferencia_rut = datosTransferencia.rut;
          innerPayload.p_transferencia_nombre = datosTransferencia.nombre;
          innerPayload.p_transferencia_banco = datosTransferencia.banco;
          innerPayload.p_transferencia_tipo_cuenta = datosTransferencia.tipoCuenta;
          innerPayload.p_transferencia_numero_cuenta = datosTransferencia.numeroCuenta;
          innerPayload.p_transferencia_email = datosTransferencia.email || null;
        } else if (metodo === 'reintegro_efectivo') {
          innerPayload.p_metodo_pago_reintegro = 'efectivo';
        }

        // Manejo de diferencia en cambios
        if (metodo === 'cambio_producto') {
          innerPayload.p_tipo_diferencia = tipoDiferencia;
          innerPayload.p_monto_diferencia = montoDiferencia;
        
          if (tipoDiferencia !== 'sin_diferencia') {
            innerPayload.p_metodo_pago_diferencia = metodoPagoDiferencia;
            
            if (tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia') {
              innerPayload.p_transferencia_rut = datosTransferencia.rut;
              innerPayload.p_transferencia_nombre = datosTransferencia.nombre;
              innerPayload.p_transferencia_banco = datosTransferencia.banco;
              innerPayload.p_transferencia_tipo_cuenta = datosTransferencia.tipoCuenta;
              innerPayload.p_transferencia_numero_cuenta = datosTransferencia.numeroCuenta;
              innerPayload.p_transferencia_email = datosTransferencia.email || null;
            }
          }
        }

      // Si es un cambio, intentar buscar una variante disponible que coincida con la selección de reemplazo
      if (metodo === 'cambio_producto' && cambioSeleccionado) {
        try {
          const totalCantidad = items.reduce((acc, it) => acc + (it?.cantidad ?? 0), 0);

          // Construir query sobre productos y sus variantes
          let query = supabase
            .from('productos')
            .select(`id, disenos!inner(nombre), tipos_prenda!inner(nombre), colores!inner(nombre), variantes(id, talla, stock_actual, costo_unitario)`)
            .limit(1);

          if (cambioSeleccionado.diseno) {
            query = query.eq('disenos.nombre', cambioSeleccionado.diseno);
          }
          if (cambioSeleccionado.tipo_prenda) {
            query = query.eq('tipos_prenda.nombre', cambioSeleccionado.tipo_prenda);
          }
          if (cambioSeleccionado.color) {
            query = query.eq('colores.nombre', cambioSeleccionado.color);
          }

          const { data: prods, error: prodErr } = await query;
          if (prodErr) {
            console.warn('Error buscando producto de reemplazo:', prodErr);
          } else if (prods && prods.length > 0) {
            const prod: ProductoConVariantes = prods[0];
            const variantesArr: Variante[] = prod.variantes || [];
            // Si el usuario eligió talla, intentar buscar exactamente esa variante (preferir stock>0)
            let variante: Variante | undefined;
            if (cambioSeleccionado.talla) {
              variante = variantesArr.find((v) => v.talla === cambioSeleccionado.talla && v.stock_actual > 0) || variantesArr.find((v) => v.talla === cambioSeleccionado.talla);
            }
            // Si no se encontró por talla, fallback a cualquier variante con stock, o la primera
            if (!variante) {
              variante = variantesArr.find((v) => v.stock_actual > 0) || variantesArr[0];
            }
            if (variante) {
              innerPayload.p_items_entregados = [
                {
                  variante_id: variante.id,
                  cantidad: totalCantidad,
                  precio_unitario: variante.costo_unitario ?? 0, // Asumimos que costo_unitario es el precio de venta; si no, ajusta esto
                },
              ];
              console.log('🔎 Variante encontrada para cambio:', variante.id, 'cantidad:', totalCantidad);
            } else {
              console.warn('No se encontraron variantes en el producto de reemplazo.');
            }
          } else {
            console.warn('No se encontró producto que coincida con la selección de reemplazo.');
          }
        } catch (err) {
          console.error('Error buscando variante de reemplazo:', err);
        }
      }

      console.log('🚀 [CLIENT] Enviando payload a RPC:', innerPayload);

      const { data, error: rpcError } = await supabase.rpc('crear_devolucion_json', { payload: innerPayload });

      console.log('📥 [CLIENT] Respuesta RPC:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ [CLIENT] Error RPC completo:', rpcError);
        throw new Error(`Error en RPC: ${rpcError.message} (${rpcError.code})`);
      }

      if (!data) {
        console.error('❌ [CLIENT] RPC no devolvió ID de devolución');
        throw new Error('La función RPC no devolvió un ID de devolución');
      }

      console.log('✅ [CLIENT] Devolución creada con ID:', data);
      resultados.push(data);
      
      // Enviar email de egreso si es reintegro en efectivo
      if (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'efectivo' && montoReintegro > 0) {
        console.log('💸 [CLIENT] Descontando denominaciones de caja por reintegro:', montoReintegro);
        
        // Primero descontar las denominaciones de la caja
        try {
          // Obtener sesión de caja abierta
          const { data: sesion } = await supabase
            .from('caja_sesiones')
            .select('id')
            .eq('abierta', true)
            .single();

          if (sesion) {
            // Convertir denominaciones de reintegro al formato esperado por la RPC
            const denominacionesARetirar: Record<number, number> = {};
            Object.entries(denominacionesReintegro).forEach(([denom, cant]) => {
              if (cant > 0) {
                denominacionesARetirar[parseInt(denom)] = cant;
              }
            });

            // Retirar denominaciones de la caja
            const { error: errorRetiro } = await supabase.rpc('caja_retirar_denominaciones', {
              p_sesion_id: sesion.id,
              p_denominaciones: denominacionesARetirar,
              p_concepto: `Reintegro devolución #${data}`,
            });

            if (errorRetiro) {
              console.error('❌ [CLIENT] Error al retirar denominaciones:', errorRetiro);
              throw new Error(`Error al descontar dinero de caja: ${errorRetiro.message}`);
            }

            console.log('✅ [CLIENT] Denominaciones descontadas exitosamente');
            
            // Procesar vuelto si hay
            if (totalDenominacionesReintegro > montoReintegro && totalDenominacionesVueltoReintegro > 0) {
              const montoVuelto = totalDenominacionesReintegro - montoReintegro;
              console.log('🪙 [CLIENT] Procesando vuelto:', montoVuelto);
              
              try {
                // Agregar denominaciones de vuelto a la caja
                const denominacionesAAgregar: Record<number, number> = {};
                Object.entries(denominacionesVueltoReintegro).forEach(([denom, cant]) => {
                  if (cant > 0) {
                    denominacionesAAgregar[parseInt(denom)] = cant;
                  }
                });
                
                const { error: errorVuelto } = await supabase.rpc('caja_agregar_denominaciones', {
                  p_sesion_id: sesion.id,
                  p_denominaciones: denominacionesAAgregar,
                  p_concepto: `Vuelto devolución #${data}`,
                });
                
                if (errorVuelto) {
                  console.error('❌ [CLIENT] Error al agregar vuelto:', errorVuelto);
                  throw new Error(`Error al registrar vuelto en caja: ${errorVuelto.message}`);
                }
                
                console.log('✅ [CLIENT] Vuelto registrado exitosamente');
              } catch (err) {
                console.error('❌ [CLIENT] Error al procesar vuelto:', err);
                throw new Error('Error al procesar vuelto');
              }
            }
          } else {
            console.warn('⚠️ [CLIENT] No hay sesión de caja abierta para descontar denominaciones');
          }
        } catch (err) {
          console.error('❌ [CLIENT] Error al descontar denominaciones:', err);
          throw new Error('Error al descontar dinero de caja');
        }

        // Enviar email de notificación
        console.log('💸 [CLIENT] Enviando email de egreso por reintegro:', montoReintegro);
        try {
          await fetch('/api/send-caja-egreso-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              monto: montoReintegro,
              motivo: `Reintegro devolución #${data}`,
              usuario: 'Sistema', // Por ahora, después podríamos obtener el nombre del usuario
            }),
          });
          console.log('✅ [CLIENT] Email de egreso enviado exitosamente');
        } catch (emailError) {
          console.error('❌ [CLIENT] Error al enviar email de egreso:', emailError);
          // No fallar la operación si el email falla
        }
      }
      
      // Descontar denominaciones de diferencia si es efectivo
      if (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'efectivo' && montoDiferencia > 0) {
        console.log('💸 [CLIENT] Descontando denominaciones de caja por diferencia:', montoDiferencia);
        
        try {
          // Obtener sesión de caja abierta
          const { data: sesion } = await supabase
            .from('caja_sesiones')
            .select('id')
            .eq('abierta', true)
            .single();

          if (sesion) {
            // Convertir denominaciones de diferencia al formato esperado por la RPC
            const denominacionesARetirar: Record<number, number> = {};
            Object.entries(denominacionesDiferencia).forEach(([denom, cant]) => {
              if (cant > 0) {
                denominacionesARetirar[parseInt(denom)] = cant;
              }
            });

            // Retirar denominaciones de la caja
            const { error: errorRetiro } = await supabase.rpc('caja_retirar_denominaciones', {
              p_sesion_id: sesion.id,
              p_denominaciones: denominacionesARetirar,
              p_concepto: `Diferencia devolución #${data}`,
            });

            if (errorRetiro) {
              console.error('❌ [CLIENT] Error al retirar denominaciones de diferencia:', errorRetiro);
              throw new Error(`Error al descontar dinero de caja: ${errorRetiro.message}`);
            }

            console.log('✅ [CLIENT] Denominaciones de diferencia descontadas exitosamente');
            
            // Procesar vuelto si hay
            if (totalDenominacionesDiferencia > montoDiferencia && totalDenominacionesVueltoDiferencia > 0) {
              const montoVuelto = totalDenominacionesDiferencia - montoDiferencia;
              console.log('🪙 [CLIENT] Procesando vuelto de diferencia:', montoVuelto);
              
              try {
                // Agregar denominaciones de vuelto a la caja
                const denominacionesAAgregar: Record<number, number> = {};
                Object.entries(denominacionesVueltoDiferencia).forEach(([denom, cant]) => {
                  if (cant > 0) {
                    denominacionesAAgregar[parseInt(denom)] = cant;
                  }
                });
                
                const { error: errorVuelto } = await supabase.rpc('caja_agregar_denominaciones', {
                  p_sesion_id: sesion.id,
                  p_denominaciones: denominacionesAAgregar,
                  p_concepto: `Vuelto diferencia devolución #${data}`,
                });
                
                if (errorVuelto) {
                  console.error('❌ [CLIENT] Error al agregar vuelto de diferencia:', errorVuelto);
                  throw new Error(`Error al registrar vuelto en caja: ${errorVuelto.message}`);
                }
                
                console.log('✅ [CLIENT] Vuelto de diferencia registrado exitosamente');
              } catch (err) {
                console.error('❌ [CLIENT] Error al procesar vuelto de diferencia:', err);
                throw new Error('Error al procesar vuelto');
              }
            }
          } else {
            console.warn('⚠️ [CLIENT] No hay sesión de caja abierta para descontar denominaciones de diferencia');
          }
        } catch (err) {
          console.error('❌ [CLIENT] Error al descontar denominaciones de diferencia:', err);
          throw new Error('Error al descontar dinero de caja');
        }

        // Enviar email de notificación de egreso por diferencia
        console.log('💸 [CLIENT] Enviando email de egreso por diferencia:', montoDiferencia);
        try {
          await fetch('/api/send-caja-egreso-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              monto: montoDiferencia,
              motivo: `Diferencia devolución #${data}`,
              usuario: 'Sistema',
            }),
          });
          console.log('✅ [CLIENT] Email de egreso por diferencia enviado exitosamente');
        } catch (emailError) {
          console.error('❌ [CLIENT] Error al enviar email de egreso por diferencia:', emailError);
          // No fallar la operación si el email falla
        }
      }
      
      // Agregar denominaciones a caja si cliente paga en efectivo
      if (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_paga' && metodoPagoDiferencia === 'efectivo' && montoDiferencia > 0) {
        console.log('💰 [CLIENT] Agregando denominaciones a caja por pago del cliente:', montoDiferencia);
        
        try {
          // Obtener sesión de caja abierta
          const { data: sesion } = await supabase
            .from('caja_sesiones')
            .select('id')
            .eq('abierta', true)
            .single();

          if (sesion) {
            // Convertir denominaciones del cliente al formato esperado por la RPC
            const denominacionesAAgregar: Record<number, number> = {};
            Object.entries(denominacionesClientePaga).forEach(([denom, cant]) => {
              if (cant > 0) {
                denominacionesAAgregar[parseInt(denom)] = cant;
              }
            });

            // Agregar denominaciones a la caja
            const { error: errorAgregar } = await supabase.rpc('caja_agregar_denominaciones', {
              p_sesion_id: sesion.id,
              p_denominaciones: denominacionesAAgregar,
              p_concepto: `Pago diferencia devolución #${data}`,
            });

            if (errorAgregar) {
              console.error('❌ [CLIENT] Error al agregar denominaciones:', errorAgregar);
              throw new Error(`Error al agregar dinero a caja: ${errorAgregar.message}`);
            }

            console.log('✅ [CLIENT] Denominaciones agregadas exitosamente');
            
            // Procesar vuelto si hay
            if (totalDenominacionesClientePaga > montoDiferencia && totalDenominacionesVueltoClientePaga > 0) {
              const montoVuelto = totalDenominacionesClientePaga - montoDiferencia;
              console.log('🪙 [CLIENT] Procesando vuelto a cliente:', montoVuelto);
              
              try {
                // Descontar denominaciones de vuelto de la caja
                const denominacionesARetirar: Record<number, number> = {};
                Object.entries(denominacionesVueltoClientePaga).forEach(([denom, cant]) => {
                  if (cant > 0) {
                    denominacionesARetirar[parseInt(denom)] = cant;
                  }
                });
                
                const { error: errorVuelto } = await supabase.rpc('caja_retirar_denominaciones', {
                  p_sesion_id: sesion.id,
                  p_denominaciones: denominacionesARetirar,
                  p_concepto: `Vuelto cliente paga devolución #${data}`,
                });
                
                if (errorVuelto) {
                  console.error('❌ [CLIENT] Error al descontar vuelto:', errorVuelto);
                  throw new Error(`Error al descontar vuelto de caja: ${errorVuelto.message}`);
                }
                
                console.log('✅ [CLIENT] Vuelto descontado exitosamente');
              } catch (err) {
                console.error('❌ [CLIENT] Error al procesar vuelto:', err);
                throw new Error('Error al procesar vuelto');
              }
            }
            
            // Enviar email de notificación de ingreso
            console.log('💰 [CLIENT] Enviando email de ingreso por diferencia:', montoDiferencia);
            try {
              await fetch('/api/send-caja-ingreso-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  monto: montoDiferencia,
                  motivo: `Pago diferencia devolución #${data}`,
                  usuario: 'Sistema',
                }),
              });
              console.log('✅ [CLIENT] Email de ingreso por diferencia enviado exitosamente');
            } catch (emailError) {
              console.error('❌ [CLIENT] Error al enviar email de ingreso:', emailError);
              // No fallar la operación si el correo falla
            }
          } else {
            console.warn('⚠️ [CLIENT] No hay sesión de caja abierta para agregar denominaciones');
          }
        } catch (err) {
          console.error('❌ [CLIENT] Error al agregar denominaciones:', err);
          throw new Error('Error al agregar dinero a caja');
        }
      }
      
      // Enviar correo si es transferencia
      const esTransferencia = (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'transferencia') ||
                             (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_recibe' && metodoPagoDiferencia === 'transferencia');
      
      if (esTransferencia && datosTransferencia.rut && datosTransferencia.nombre) {
        console.log('📧 [CLIENT] Enviando correo de transferencia para devolución:', data, '- Monto:', metodo === 'reintegro_efectivo' ? montoReintegro : montoDiferencia);
        try {
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
              monto: metodo === 'reintegro_efectivo' ? montoReintegro : montoDiferencia,
              tipo: tipo,
            }),
          });
          console.log('✅ [CLIENT] Correo de transferencia enviado exitosamente');
        } catch (emailError) {
          console.error('❌ [CLIENT] Error al enviar correo:', emailError);
          // No fallar la operación si el correo falla
        }
      }
    }

    let mensajeExito = `✅ ${tipo === 'devolucion' ? 'Devolución' : 'Cambio'} creado correctamente. ID(s): ${resultados.join(', ')}`;
    if (metodo === 'cambio_producto' && cambioSeleccionado) {
      mensajeExito += `\n🔁 Cambio solicitado: ${cambioSeleccionado.tipo_prenda ?? '—'} · ${cambioSeleccionado.diseno ?? '—'} · ${cambioSeleccionado.color ?? '—'}`;
    }
    
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

    // Agregar mensaje si se envió email de egreso
    if (metodo === 'reintegro_efectivo' && metodoPagoReintegro === 'efectivo' && montoReintegro > 0) {
      mensajeExito += `\n💸 Se envió notificación por correo de egreso de caja`;
    }

    // Agregar mensaje si se envió email de ingreso por cliente paga
    if (metodo === 'cambio_producto' && tipoDiferencia === 'cliente_paga' && metodoPagoDiferencia === 'efectivo' && montoDiferencia > 0) {
      mensajeExito += `\n💰 Se envió notificación por correo de ingreso a caja`;
      
      if (totalDenominacionesClientePaga > montoDiferencia && totalDenominacionesVueltoClientePaga > 0) {
        const montoVuelto = totalDenominacionesClientePaga - montoDiferencia;
        mensajeExito += `\n🪙 Se descontó vuelto de $${montoVuelto.toLocaleString('es-CL')} de caja`;
      }
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
    setErrorRUT(''); // Limpiar error de RUT al resetear
    setDenominacionesReintegro({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de reintegro
    setMostrarSelectorDenominaciones(false); // Ocultar selector
    setDenominacionesDiferencia({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de diferencia
    setMostrarSelectorDenominacionesDiferencia(false); // Ocultar selector de diferencia
    setDenominacionesVueltoReintegro({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de vuelto reintegro
    setMostrarSelectorVuelto(false); // Ocultar selector de vuelto
    setDenominacionesVueltoDiferencia({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de vuelto diferencia
    setMostrarSelectorVueltoDiferencia(false); // Ocultar selector de vuelto diferencia
    setDenominacionesClientePaga({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de cliente paga
    setMostrarSelectorClientePaga(false); // Ocultar selector de cliente paga
    setDenominacionesVueltoClientePaga({
      '20000': 0, '10000': 0, '5000': 0, '2000': 0, '1000': 0, '500': 0, '100': 0
    }); // Resetear denominaciones de vuelto cliente paga
    setMostrarSelectorVueltoClientePaga(false); // Ocultar selector de vuelto cliente paga
    setProductosVendidos([]);
    setPrecioReemplazoUnitario(0); // Resetear precio de reemplazo
    
    await cargarDineroCaja();
  } catch (err) {
    console.error('Error completo al crear operación:', err);
    setError(err instanceof Error ? err.message : 'Error al crear la operación.');
  } finally {
    setLoading(false);
  }
};

  // Nueva función async para seleccionar el producto de cambio y calcular precio
  const seleccionarProductoCambio = async () => {
    // Validar campos obligatorios
    if (!cambioTipoPrenda) {
      setError('Seleccione el tipo de prenda para el cambio.');
      return;
    }
    
    if (!cambioDiseno) {
      setError('Seleccione el diseño para el cambio.');
      return;
    }

    try {
      // Construir query similar a la de confirmar
      let query = supabase
        .from('productos')
        .select(`id, disenos!inner(nombre), tipos_prenda!inner(nombre), colores!inner(nombre), variantes(id, talla, stock_actual, costo_unitario)`)
        .limit(1);

      if (cambioDiseno) {
        query = query.eq('disenos.nombre', cambioDiseno);
      }
      if (cambioTipoPrenda) {
        query = query.eq('tipos_prenda.nombre', cambioTipoPrenda);
      }
      if (cambioColor) {
        query = query.eq('colores.nombre', cambioColor);
      }

      const { data: prods, error: prodErr } = await query;
      if (prodErr) {
        throw prodErr;
      }
      if (!prods || prods.length === 0) {
        setError('No se encontró un producto que coincida con la selección de reemplazo.');
        return;
      }

      const prod: ProductoConVariantes = prods[0];
      const variantesArr: Variante[] = prod.variantes || [];
      
      // Calcular cantidad total que se necesita para el cambio
      const itemsSeleccionados: ItemSeleccionado[] = productosVendidos
        .map((p) => {
          const q = Number(cantSel[p.detalle_venta_id] ?? 0);
          if (q > 0) {
            return {
              detalle_venta_id: p.detalle_venta_id,
              venta_id: p.venta_id,
              variante_id: p.variante_id,
              producto_id: p.producto_id,
              diseno: p.diseno,
              tipo_prenda: p.tipo_prenda,
              color: p.color,
              talla: p.talla,
              cantidad: q,
              precio_unitario: p.precio_unitario,
              fecha_venta: p.fecha_venta,
              metodo_pago: p.metodo_pago,
              numero_boleta: p.numero_boleta,
            };
          }
          return null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      
      const totalCantidad = itemsSeleccionados.reduce((acc: number, item: ItemSeleccionado) => acc + item.cantidad, 0);
      
      let variante: Variante | undefined;
      if (cambioTalla) {
        // Buscar variante con talla específica
        variante = variantesArr.find((v) => v.talla === cambioTalla);
        
        if (!variante) {
          setError(`No existe la talla ${cambioTalla} para este producto.`);
          return;
        }
        
        // Validar stock disponible
        if (variante.stock_actual < totalCantidad) {
          setError(`Stock insuficiente. Disponible: ${variante.stock_actual} unidades, Solicitado: ${totalCantidad} unidades.`);
          return;
        }
      } else {
        // Si no se seleccionó talla, buscar cualquier variante con stock suficiente
        variante = variantesArr.find((v) => v.stock_actual >= totalCantidad);
        
        if (!variante) {
          // Verificar si hay alguna variante con stock (pero insuficiente)
          const algunaConStock = variantesArr.find((v) => v.stock_actual > 0);
          if (algunaConStock) {
            setError(`Ninguna talla tiene stock suficiente. Disponible total: ${variantesArr.reduce((sum, v) => sum + v.stock_actual, 0)} unidades, Solicitado: ${totalCantidad} unidades.`);
          } else {
            setError('No hay stock disponible para este producto.');
          }
          return;
        }
      }
      
      if (!variante) {
        setError('No se encontraron variantes disponibles para el producto de reemplazo.');
        return;
      }

      // Guardar selección y precio unitario (asumiendo costo_unitario como precio de venta; ajusta si es necesario)
      setCambioSeleccionado({
        tipo_prenda: cambioTipoPrenda || undefined,
        diseno: cambioDiseno || undefined,
        color: cambioColor || null,
        talla: cambioTalla || null,
      });
      setPrecioReemplazoUnitario(variante.costo_unitario ?? 0);
      setError(null);
    } catch (err) {
      console.error('Error seleccionando producto de cambio:', err);
      setError('Error al seleccionar el producto de cambio. Intente nuevamente.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header estilo POS */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white mb-6">
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

      <div className="rounded-3xl p-4 shadow-2xl sm:p-6 lg:p-8">

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
                      <h3 className="text-lg font-semibold text-gray-700">Seleccionar Cantidades</h3>
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

                                <div className="mt-4 pt-4 border-t border-purple-200">
                                  <button
                                    type="button"
                                    onClick={() => setMostrarSelectorDenominaciones(!mostrarSelectorDenominaciones)}
                                    className="w-full bg-purple-600 text-white rounded-lg p-3 text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>💵</span>
                                    {mostrarSelectorDenominaciones ? 'Ocultar selector de billetes' : 'Seleccionar billetes para reintegro'}
                                  </button>
                                </div>

                                {mostrarSelectorDenominaciones && (
                                  <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3">
                                      Selecciona los billetes/monedas a entregar (${montoReintegro.toLocaleString('es-CL')})
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      {Object.keys(denominacionesReintegro).reverse().map((denom) => {
                                        const cantidad = denominacionesReintegro[denom as keyof typeof denominacionesReintegro];
                                        const disponible = denominacionesDisponibles[parseInt(denom)] || 0;
                                        const subtotal = parseInt(denom) * cantidad;
                                        const esMoneda = parseInt(denom) <= 1000;
                                        
                                        return (
                                          <div key={denom} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                              <span className="font-medium text-gray-700">
                                                ${parseInt(denom).toLocaleString('es-CL')}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                (Disponibles: {disponible})
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.max(0, cantidad - 1);
                                                  setDenominacionesReintegro(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad === 0}
                                              >
                                                -
                                              </button>
                                              <span className="w-8 text-center font-medium text-gray-700">
                                                {cantidad}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.min(disponible, cantidad + 1);
                                                  setDenominacionesReintegro(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad >= disponible}
                                              >
                                                +
                                              </button>
                                              <span className="w-16 text-right font-medium text-gray-700">
                                                ${subtotal.toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Total seleccionado:</span>
                                        <div className="text-right">
                                          <div className={`text-lg font-bold ${
                                            totalDenominacionesReintegro >= montoReintegro ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            ${totalDenominacionesReintegro.toLocaleString('es-CL')}
                                          </div>
                                          {totalDenominacionesReintegro < montoReintegro && (
                                            <div className="text-xs text-orange-500">
                                              Faltante: ${(montoReintegro - totalDenominacionesReintegro).toLocaleString('es-CL')}
                                            </div>
                                          )}
                                          {totalDenominacionesReintegro === montoReintegro && (
                                            <div className="text-xs text-green-600">
                                              ✅ Monto exacto
                                            </div>
                                          )}
                                          {totalDenominacionesReintegro > montoReintegro && (
                                            <div className="text-xs text-blue-600">
                                              Vuelto: ${(totalDenominacionesReintegro - montoReintegro).toLocaleString('es-CL')}
                                              <button
                                                type="button"
                                                onClick={() => setMostrarSelectorVuelto(!mostrarSelectorVuelto)}
                                                className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                              >
                                                {mostrarSelectorVuelto ? 'Ocultar' : 'Registrar vuelto'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mostrarSelectorVuelto && totalDenominacionesReintegro > montoReintegro && (
                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h5 className="text-sm font-semibold text-blue-800 mb-3">
                                      🪙 Registrar vuelto entregado (${(totalDenominacionesReintegro - montoReintegro).toLocaleString('es-CL')})
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      {Object.keys(denominacionesVueltoReintegro).reverse().map((denom) => {
                                        const cantidad = denominacionesVueltoReintegro[denom as keyof typeof denominacionesVueltoReintegro];
                                        const subtotal = parseInt(denom) * cantidad;
                                        const esMoneda = parseInt(denom) <= 1000;
                                        
                                        return (
                                          <div key={denom} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                              <span className="font-medium text-gray-700">
                                                ${parseInt(denom).toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.max(0, cantidad - 1);
                                                  setDenominacionesVueltoReintegro(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad === 0}
                                              >
                                                -
                                              </button>
                                              <span className="w-8 text-center font-medium text-gray-700">
                                                {cantidad}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = cantidad + 1;
                                                  setDenominacionesVueltoReintegro(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                              >
                                                +
                                              </button>
                                              <span className="w-16 text-right font-medium text-gray-700">
                                                ${subtotal.toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Total vuelto:</span>
                                        <div className="text-right">
                                          <div className={`text-lg font-bold ${
                                            totalDenominacionesVueltoReintegro === (totalDenominacionesReintegro - montoReintegro) ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            ${totalDenominacionesVueltoReintegro.toLocaleString('es-CL')}
                                          </div>
                                          {totalDenominacionesVueltoReintegro !== (totalDenominacionesReintegro - montoReintegro) && (
                                            <div className="text-xs text-red-500">
                                              Esperado: ${(totalDenominacionesReintegro - montoReintegro).toLocaleString('es-CL')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                                  className={`w-full rounded-lg border p-2.5 text-sm focus:ring-2 focus:outline-none transition ${
                                    errorRUT
                                      ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                      : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
                                  }`}
                                  placeholder="12.345.678-9"
                                  value={datosTransferencia.rut}
                                  onChange={(e) => handleRUTChange(e.target.value)}
                                  maxLength={12}
                                />
                                {errorRUT && (
                                  <p className="mt-1 text-xs text-red-600">{errorRUT}</p>
                                )}
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
                                  Email <span className="text-red-500">*</span>
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
                              <strong>📌 Nota:</strong> Estos datos se utilizarán para realizar la transferencia bancaria al cliente. El correo electrónico es obligatorio y se usará para notificar al cliente sobre la transferencia.
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

                          {/* Panel de selección del producto de cambio */}
                          <div className="md:col-span-2">
                            <div className="mt-3 rounded-lg bg-white border border-gray-200 p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">🔁 Producto de reemplazo</h4>
                              <p className="text-xs text-gray-500 mb-3">Seleccione el tipo de prenda, diseño y color del producto por el que el cliente desea cambiar.</p>

                              <div className="grid gap-3 md:grid-cols-4">
                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-700">Tipo de Prenda</label>
                                  <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={cambioTipoPrenda}
                                    onChange={(e) => setCambioTipoPrenda(e.target.value)}
                                  >
                                    <option value="">Seleccione tipo</option>
                                    {tiposPrenda.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-700">Diseño</label>
                                  <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={cambioDiseno}
                                    onChange={(e) => setCambioDiseno(e.target.value)}
                                    disabled={!cambioTipoPrenda && disenos.length === 0}
                                  >
                                    <option value="">Seleccione diseño</option>
                                    {(cambioTipoPrenda ? (disenosPorTipo[cambioTipoPrenda] || []) : disenos).map((d) => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-700">Color</label>
                                  <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={cambioColor}
                                    onChange={(e) => setCambioColor(e.target.value)}
                                  >
                                    <option value="">Seleccione color</option>
                                    {colores.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-700">Talla</label>
                                  <select
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                                    value={cambioTalla}
                                    onChange={(e) => setCambioTalla(e.target.value)}
                                    disabled={cambioTallas.length === 0}
                                  >
                                    <option value="">Seleccione talla</option>
                                    {cambioTallas.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center gap-3">
                                <button
                                  type="button"
                                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                                  onClick={seleccionarProductoCambio}
                                >
                                  Seleccionar producto de cambio
                                </button>

                                <button
                                  type="button"
                                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                  onClick={() => {
                                    setCambioTipoPrenda('');
                                    setCambioDiseno('');
                                    setCambioColor('');
                                    setCambioTalla('');
                                    setCambioTallas([]);
                                    setCambioSeleccionado(null);
                                    setPrecioReemplazoUnitario(0);
                                  }}
                                >
                                  Limpiar
                                </button>

                                {cambioSeleccionado && (
                                  <div className="ml-auto text-sm text-gray-600">
                                    <div className="font-medium text-gray-800">Cambio seleccionado:</div>
                                    <div className="text-xs text-gray-500">{cambioSeleccionado.tipo_prenda ?? '—'} · {cambioSeleccionado.diseno ?? '—'} · {cambioSeleccionado.color ?? '—'}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            </div>
                          </>)}
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
                                  {metodoPagoDiferencia === 'efectivo' && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                      <button
                                        type="button"
                                        onClick={() => setMostrarSelectorClientePaga(!mostrarSelectorClientePaga)}
                                        className="w-full bg-green-600 text-white rounded-lg p-3 text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                      >
                                        <span>💵</span>
                                        {mostrarSelectorClientePaga ? 'Ocultar selector de billetes' : 'Registrar dinero recibido'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {mostrarSelectorClientePaga && tipoDiferencia === 'cliente_paga' && metodoPagoDiferencia === 'efectivo' && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                              <h5 className="text-sm font-semibold text-gray-700 mb-3">
                                💰 Registrar dinero recibido (${montoDiferencia.toLocaleString('es-CL')})
                              </h5>
                              
                              <div className="space-y-2">
                                {Object.keys(denominacionesClientePaga).reverse().map((denom) => {
                                  const cantidad = denominacionesClientePaga[denom as keyof typeof denominacionesClientePaga];
                                  const subtotal = parseInt(denom) * cantidad;
                                  const esMoneda = parseInt(denom) <= 1000;
                                  
                                  return (
                                    <div key={denom} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                        <span className="font-medium text-gray-700">
                                          ${parseInt(denom).toLocaleString('es-CL')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nuevaCantidad = Math.max(0, cantidad - 1);
                                            setDenominacionesClientePaga(prev => ({
                                              ...prev,
                                              [denom]: nuevaCantidad
                                            }));
                                          }}
                                          className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                          disabled={cantidad === 0}
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center font-medium text-gray-700">
                                          {cantidad}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nuevaCantidad = cantidad + 1;
                                            setDenominacionesClientePaga(prev => ({
                                              ...prev,
                                              [denom]: nuevaCantidad
                                            }));
                                          }}
                                          className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                        >
                                          +
                                        </button>
                                        <span className="w-16 text-right font-medium text-gray-700">
                                          ${subtotal.toLocaleString('es-CL')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">Total recibido:</span>
                                  <div className="text-right">
                                    <div className={`text-lg font-bold ${
                                      totalDenominacionesClientePaga >= montoDiferencia ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ${totalDenominacionesClientePaga.toLocaleString('es-CL')}
                                    </div>
                                    {totalDenominacionesClientePaga < montoDiferencia && (
                                      <div className="text-xs text-orange-500">
                                        Faltante: ${(montoDiferencia - totalDenominacionesClientePaga).toLocaleString('es-CL')}
                                      </div>
                                    )}
                                    {totalDenominacionesClientePaga === montoDiferencia && (
                                      <div className="text-xs text-green-600">
                                        ✅ Monto exacto
                                      </div>
                                    )}
                                    {totalDenominacionesClientePaga > montoDiferencia && (
                                      <div className="text-xs text-blue-600">
                                        Vuelto: ${(totalDenominacionesClientePaga - montoDiferencia).toLocaleString('es-CL')}
                                        <button
                                          type="button"
                                          onClick={() => setMostrarSelectorVueltoClientePaga(!mostrarSelectorVueltoClientePaga)}
                                          className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                        >
                                          {mostrarSelectorVueltoClientePaga ? 'Ocultar' : 'Registrar vuelto'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {mostrarSelectorVueltoClientePaga && totalDenominacionesClientePaga > montoDiferencia && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <h5 className="text-sm font-semibold text-blue-800 mb-3">
                                🪙 Registrar vuelto entregado (${(totalDenominacionesClientePaga - montoDiferencia).toLocaleString('es-CL')})
                              </h5>
                              
                              <div className="space-y-2">
                                {Object.keys(denominacionesVueltoClientePaga).reverse().map((denom) => {
                                  const cantidad = denominacionesVueltoClientePaga[denom as keyof typeof denominacionesVueltoClientePaga];
                                  const subtotal = parseInt(denom) * cantidad;
                                  const esMoneda = parseInt(denom) <= 1000;
                                  
                                  return (
                                    <div key={denom} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                        <span className="font-medium text-gray-700">
                                          ${parseInt(denom).toLocaleString('es-CL')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nuevaCantidad = Math.max(0, cantidad - 1);
                                            setDenominacionesVueltoClientePaga(prev => ({
                                              ...prev,
                                              [denom]: nuevaCantidad
                                            }));
                                          }}
                                          className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                          disabled={cantidad === 0}
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center font-medium text-gray-700">
                                          {cantidad}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nuevaCantidad = cantidad + 1;
                                            setDenominacionesVueltoClientePaga(prev => ({
                                              ...prev,
                                              [denom]: nuevaCantidad
                                            }));
                                          }}
                                          className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                        >
                                          +
                                        </button>
                                        <span className="w-16 text-right font-medium text-gray-700">
                                          ${subtotal.toLocaleString('es-CL')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">Total vuelto:</span>
                                  <div className="text-right">
                                    <div className={`text-lg font-bold ${
                                      totalDenominacionesVueltoClientePaga === (totalDenominacionesClientePaga - montoDiferencia) ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      ${totalDenominacionesVueltoClientePaga.toLocaleString('es-CL')}
                                    </div>
                                    {totalDenominacionesVueltoClientePaga !== (totalDenominacionesClientePaga - montoDiferencia) && (
                                      <div className="text-xs text-red-500">
                                        Esperado: ${(totalDenominacionesClientePaga - montoDiferencia).toLocaleString('es-CL')}
                                      </div>
                                    )}
                                  </div>
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

                                <div className="mt-4 pt-4 border-t border-purple-200">
                                  <button
                                    type="button"
                                    onClick={() => setMostrarSelectorDenominacionesDiferencia(!mostrarSelectorDenominacionesDiferencia)}
                                    className="w-full bg-purple-600 text-white rounded-lg p-3 text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <span>💵</span>
                                    {mostrarSelectorDenominacionesDiferencia ? 'Ocultar selector de billetes' : 'Seleccionar billetes para diferencia'}
                                  </button>
                                </div>

                                {mostrarSelectorDenominacionesDiferencia && (
                                  <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3">
                                      Selecciona los billetes/monedas a entregar (${montoDiferencia.toLocaleString('es-CL')})
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      {Object.keys(denominacionesDiferencia).reverse().map((denom) => {
                                        const cantidad = denominacionesDiferencia[denom as keyof typeof denominacionesDiferencia];
                                        const disponible = denominacionesDisponibles[parseInt(denom)] || 0;
                                        const subtotal = parseInt(denom) * cantidad;
                                        const esMoneda = parseInt(denom) <= 1000;
                                        
                                        return (
                                          <div key={denom} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                              <span className="font-medium text-gray-700">
                                                ${parseInt(denom).toLocaleString('es-CL')}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                (Disponibles: {disponible})
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.max(0, cantidad - 1);
                                                  setDenominacionesDiferencia(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad === 0}
                                              >
                                                -
                                              </button>
                                              <span className="w-8 text-center font-medium text-gray-700">
                                                {cantidad}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.min(disponible, cantidad + 1);
                                                  setDenominacionesDiferencia(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad >= disponible}
                                              >
                                                +
                                              </button>
                                              <span className="w-16 text-right font-medium text-gray-700">
                                                ${subtotal.toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Total seleccionado:</span>
                                        <div className="text-right">
                                          <div className={`text-lg font-bold ${
                                            totalDenominacionesDiferencia >= montoDiferencia ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            ${totalDenominacionesDiferencia.toLocaleString('es-CL')}
                                          </div>
                                          {totalDenominacionesDiferencia < montoDiferencia && (
                                            <div className="text-xs text-orange-500">
                                              Faltante: ${(montoDiferencia - totalDenominacionesDiferencia).toLocaleString('es-CL')}
                                            </div>
                                          )}
                                          {totalDenominacionesDiferencia > montoDiferencia && (
                                            <div className="text-xs text-blue-600">
                                              Vuelto: ${(totalDenominacionesDiferencia - montoDiferencia).toLocaleString('es-CL')}
                                              <button
                                                type="button"
                                                onClick={() => setMostrarSelectorVueltoDiferencia(!mostrarSelectorVueltoDiferencia)}
                                                className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                              >
                                                {mostrarSelectorVueltoDiferencia ? 'Ocultar' : 'Registrar vuelto'}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {mostrarSelectorVueltoDiferencia && totalDenominacionesDiferencia > montoDiferencia && (
                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h5 className="text-sm font-semibold text-blue-800 mb-3">
                                      🪙 Registrar vuelto entregado (${(totalDenominacionesDiferencia - montoDiferencia).toLocaleString('es-CL')})
                                    </h5>
                                    
                                    <div className="space-y-2">
                                      {Object.keys(denominacionesVueltoDiferencia).reverse().map((denom) => {
                                        const cantidad = denominacionesVueltoDiferencia[denom as keyof typeof denominacionesVueltoDiferencia];
                                        const subtotal = parseInt(denom) * cantidad;
                                        const esMoneda = parseInt(denom) <= 1000;
                                        
                                        return (
                                          <div key={denom} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                            <div className="flex items-center gap-2">
                                              <span className="text-lg">{esMoneda ? '🪙' : '💵'}</span>
                                              <span className="font-medium text-gray-700">
                                                ${parseInt(denom).toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = Math.max(0, cantidad - 1);
                                                  setDenominacionesVueltoDiferencia(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center text-sm font-bold"
                                                disabled={cantidad === 0}
                                              >
                                                -
                                              </button>
                                              <span className="w-8 text-center font-medium text-gray-700">
                                                {cantidad}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nuevaCantidad = cantidad + 1;
                                                  setDenominacionesVueltoDiferencia(prev => ({
                                                    ...prev,
                                                    [denom]: nuevaCantidad
                                                  }));
                                                }}
                                                className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center text-sm font-bold"
                                              >
                                                +
                                              </button>
                                              <span className="w-16 text-right font-medium text-gray-700">
                                                ${subtotal.toLocaleString('es-CL')}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-gray-700">Total vuelto:</span>
                                        <div className="text-right">
                                          <div className={`text-lg font-bold ${
                                            totalDenominacionesVueltoDiferencia === (totalDenominacionesDiferencia - montoDiferencia) ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                            ${totalDenominacionesVueltoDiferencia.toLocaleString('es-CL')}
                                          </div>
                                          {totalDenominacionesVueltoDiferencia !== (totalDenominacionesDiferencia - montoDiferencia) && (
                                            <div className="text-xs text-red-500">
                                              Esperado: ${(totalDenominacionesDiferencia - montoDiferencia).toLocaleString('es-CL')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
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
                                      className={`w-full rounded-lg border p-2.5 text-sm focus:ring-2 focus:outline-none transition ${
                                        errorRUT
                                          ? 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                          : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
                                      }`}
                                      placeholder="12.345.678-9"
                                      value={datosTransferencia.rut}
                                      onChange={(e) => handleRUTChange(e.target.value)}
                                      maxLength={12}
                                    />
                                    {errorRUT && (
                                      <p className="mt-1 text-xs text-red-600">{errorRUT}</p>
                                    )}
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
                      <h3 className="text-lg font-semibold text-gray-700">Configuración de la Operación</h3>
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
                                <td className="p-3 font-medium text-gray-900">{p.talla}</td>
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


