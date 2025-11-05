'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import ReportHeader from '@/components/ReportHeader';
import { RotateCcw } from 'lucide-react';
import { exportToCSV, exportToExcel, prepareDataForExport } from '@/lib/exportUtils';

type Devolucion = {
  devolucion_id: number;
  fecha_devolucion: string;
  tipo: string;
  metodo_resolucion: string;
  monto_reintegro: number;
  observacion: string | null;
  venta_id: number;
  fecha_venta_original: string;
  total_venta_original: number;
  metodo_pago_venta: string;
  numero_boleta: string | null;
  usuario_nombre: string;
  tienda_nombre: string;
  cantidad_items: number;
  total_unidades_devueltas: number;
  monto_total_devuelto: number;
  metodo_pago_reintegro: string | null;
  transferencia_rut: string | null;
  transferencia_nombre: string | null;
  transferencia_banco: string | null;
  transferencia_tipo_cuenta: string | null;
  transferencia_numero_cuenta: string | null;
  transferencia_email: string | null;
  transferencia_realizada: boolean | null;
  fecha_transferencia: string | null;
  tipo_diferencia: string | null;
  monto_diferencia: number | null;
  metodo_pago_diferencia: string | null;
};

type DevolucionDetalle = {
  devolucion_id: number;
  fecha_devolucion: string;
  tipo: string;
  diseno: string;
  tipo_prenda: string;
  color: string | null;
  talla: string;
  cantidad_devuelta: number;
  precio_unitario: number;
  subtotal_item: number;
  motivo_descripcion: string | null;
};

function toMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error cargando reporte';
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function ReporteDevolucionesClient() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [metodoFiltro, setMetodoFiltro] = useState('');
  
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [detalles, setDetalles] = useState<DevolucionDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setErrorMsg] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<'resumen' | 'detalle' | 'transferencias'>('resumen');
  const [actualizando, setActualizando] = useState<number | null>(null);

  const buscar = useCallback(async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      // Cargar resumen
      let qResumen = supabase
        .from('reporte_devoluciones_view')
        .select('*');

      if (desde) qResumen = qResumen.gte('fecha_devolucion', desde);
      if (hasta) qResumen = qResumen.lte('fecha_devolucion', hasta);
      if (tipoFiltro) qResumen = qResumen.eq('tipo', tipoFiltro);
      if (metodoFiltro) qResumen = qResumen.eq('metodo_resolucion', metodoFiltro);

      const { data: dataResumen, error: errResumen } = await qResumen
        .order('fecha_devolucion', { ascending: false })
        .limit(200);

      if (errResumen) throw errResumen;

      console.log('📊 [REPORTES] Datos cargados:', {
        totalDevoluciones: dataResumen?.length || 0,
        primeraDevolucion: dataResumen?.[0],
        filtrosAplicados: { desde, hasta, tipoFiltro, metodoFiltro }
      });

      setDevoluciones(dataResumen || []);

      // Cargar detalle
      let qDetalle = supabase
        .from('reporte_devoluciones_detalle_view')
        .select('*');

      if (desde) qDetalle = qDetalle.gte('fecha_devolucion', desde);
      if (hasta) qDetalle = qDetalle.lte('fecha_devolucion', hasta);
      if (tipoFiltro) qDetalle = qDetalle.eq('tipo', tipoFiltro);
      if (metodoFiltro) qDetalle = qDetalle.eq('metodo_resolucion', metodoFiltro);

      const { data: dataDetalle, error: errDetalle } = await qDetalle
        .order('fecha_devolucion', { ascending: false })
        .limit(500);

      if (errDetalle) throw errDetalle;

      setDevoluciones(dataResumen || []);
      setDetalles(dataDetalle || []);
    } catch (e: unknown) {
      setDevoluciones([]);
      setDetalles([]);
      setErrorMsg(toMsg(e));
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, tipoFiltro, metodoFiltro]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Estadísticas
  const totalDevoluciones = devoluciones.length;
  const totalUnidadesDevueltas = devoluciones.reduce((sum, d) => sum + d.total_unidades_devueltas, 0);
  const totalMontoReintegrado = devoluciones.reduce((sum, d) => sum + d.monto_reintegro, 0);
  const totalMontoDevuelto = devoluciones.reduce((sum, d) => sum + d.monto_total_devuelto, 0);

  // Datos para gráficos
  const porTipo = devoluciones.reduce((acc, d) => {
    const tipo = d.tipo === 'devolucion' ? 'Devoluciones' : 'Cambios';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dataTipo = Object.entries(porTipo).map(([name, value]) => ({ name, value }));

  const porMetodo = devoluciones.reduce((acc, d) => {
    const metodo = d.metodo_resolucion === 'reintegro_efectivo' ? 'Reintegro Efectivo' :
                   d.metodo_resolucion === 'nota_credito' ? 'Nota de Crédito' : 'Cambio Producto';
    acc[metodo] = (acc[metodo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dataMetodo = Object.entries(porMetodo).map(([name, value]) => ({ name, value }));

  // Productos más devueltos
  const productosMasDevueltos = detalles.reduce((acc, d) => {
    const key = `${d.diseno} - ${d.tipo_prenda} - ${d.talla}`;
    if (!acc[key]) {
      acc[key] = { producto: key, cantidad: 0, monto: 0 };
    }
    acc[key].cantidad += d.cantidad_devuelta;
    acc[key].monto += d.subtotal_item;
    return acc;
  }, {} as Record<string, { producto: string; cantidad: number; monto: number }>);

  const topProductos = Object.values(productosMasDevueltos)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  // Devoluciones por día
  const porDia = devoluciones.reduce((acc, d) => {
    const fecha = new Date(d.fecha_devolucion).toLocaleDateString('es-CL');
    if (!acc[fecha]) {
      acc[fecha] = { fecha, cantidad: 0, monto: 0 };
    }
    acc[fecha].cantidad += 1;
    acc[fecha].monto += d.monto_reintegro;
    return acc;
  }, {} as Record<string, { fecha: string; cantidad: number; monto: number }>);

  const dataPorDia = Object.values(porDia).sort((a, b) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  // Filtrar transferencias
  const transferenciasPendientes = devoluciones.filter(d => 
    (d.metodo_pago_reintegro === 'transferencia' || 
     (d.tipo_diferencia === 'cliente_recibe' && d.metodo_pago_diferencia === 'transferencia')) &&
    !d.transferencia_realizada
  );

  const transferenciasRealizadas = devoluciones.filter(d => 
    (d.metodo_pago_reintegro === 'transferencia' || 
     (d.tipo_diferencia === 'cliente_recibe' && d.metodo_pago_diferencia === 'transferencia')) &&
    d.transferencia_realizada
  );

  // Función para marcar transferencia
  const marcarTransferencia = async (devolucionId: number, realizada: boolean) => {
    setActualizando(devolucionId);
    try {
      const { error } = await supabase
        .from('devoluciones')
        .update({
          transferencia_realizada: realizada,
          fecha_transferencia: realizada ? new Date().toISOString() : null
        })
        .eq('id', devolucionId);

      if (error) throw error;

      // Recargar datos
      await buscar();
    } catch (err) {
      console.error('Error actualizando transferencia:', err);
      setErrorMsg('Error al actualizar el estado de la transferencia');
    } finally {
      setActualizando(null);
    }
  };

  // Función para verificar base de datos
  const verificarBaseDatos = async () => {
    try {
      const { data, error } = await supabase
        .from('devoluciones')
        .select('id, fecha, tipo, metodo_resolucion')
        .order('fecha', { ascending: false })
        .limit(5);

      if (error) throw error;

      console.log('🔍 [DEBUG] Últimas 5 devoluciones en BD:', data);
      alert(`Encontradas ${data?.length || 0} devoluciones recientes. Ver consola para detalles.`);
    } catch (err) {
      console.error('Error verificando BD:', err);
      alert('Error al verificar la base de datos');
    }
  };

  // Funciones de exportación
  const handleExportCSV = () => {
    const data = vistaActual === 'resumen' ? devoluciones : detalles;
    const columnsMap = vistaActual === 'resumen' ? {
      devolucion_id: 'ID',
      fecha_devolucion: 'Fecha',
      tipo: 'Tipo',
      metodo_resolucion: 'Método',
      monto_reintegro: 'Monto Reintegro',
      venta_id: 'Venta ID',
      numero_boleta: 'Boleta',
      usuario_nombre: 'Usuario',
      tienda_nombre: 'Tienda',
      cantidad_items: 'Items',
      total_unidades_devueltas: 'Unidades',
      monto_total_devuelto: 'Monto Devuelto'
    } : {
      devolucion_id: 'ID Devolución',
      fecha_devolucion: 'Fecha',
      tipo: 'Tipo',
      diseno: 'Diseño',
      tipo_prenda: 'Tipo Prenda',
      color: 'Color',
      talla: 'Talla',
      cantidad_devuelta: 'Cantidad',
      precio_unitario: 'Precio Unit.',
      subtotal_item: 'Subtotal',
      motivo_descripcion: 'Motivo'
    };
    
    const preparedData = prepareDataForExport(data, columnsMap);
    const filename = `devoluciones_${vistaActual}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(preparedData, filename);
  };

  const handleExportExcel = () => {
    const data = vistaActual === 'resumen' ? devoluciones : detalles;
    const columnsMap = vistaActual === 'resumen' ? {
      devolucion_id: 'ID',
      fecha_devolucion: 'Fecha',
      tipo: 'Tipo',
      metodo_resolucion: 'Método',
      monto_reintegro: 'Monto Reintegro',
      venta_id: 'Venta ID',
      numero_boleta: 'Boleta',
      usuario_nombre: 'Usuario',
      tienda_nombre: 'Tienda',
      cantidad_items: 'Items',
      total_unidades_devueltas: 'Unidades',
      monto_total_devuelto: 'Monto Devuelto'
    } : {
      devolucion_id: 'ID Devolución',
      fecha_devolucion: 'Fecha',
      tipo: 'Tipo',
      diseno: 'Diseño',
      tipo_prenda: 'Tipo Prenda',
      color: 'Color',
      talla: 'Talla',
      cantidad_devuelta: 'Cantidad',
      precio_unitario: 'Precio Unit.',
      subtotal_item: 'Subtotal',
      motivo_descripcion: 'Motivo'
    };
    
    const preparedData = prepareDataForExport(data, columnsMap);
    const filename = `devoluciones_${vistaActual}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(preparedData, filename);
  };

  // Export CSV (función antigua, mantener por compatibilidad)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const exportCSV = () => {
    if (vistaActual === 'resumen') {
      const header = ['ID', 'Fecha', 'Tipo', 'Método', 'Monto Reintegro', 'Venta ID', 'Boleta', 'Usuario', 'Tienda', 'Items', 'Unidades', 'Monto Devuelto'];
      const lines = devoluciones.map((d) =>
        [
          d.devolucion_id,
          new Date(d.fecha_devolucion).toLocaleString('es-CL'),
          d.tipo,
          d.metodo_resolucion,
          d.monto_reintegro,
          d.venta_id,
          d.numero_boleta || 'N/A',
          d.usuario_nombre,
          d.tienda_nombre,
          d.cantidad_items,
          d.total_unidades_devueltas,
          d.monto_total_devuelto
        ].join(',')
      );
      const csv = [header.join(','), ...lines].join('\n');
      downloadCSV(csv, 'devoluciones_resumen.csv');
    } else {
      const header = ['ID Dev.', 'Fecha', 'Tipo', 'Diseño', 'Tipo Prenda', 'Color', 'Talla', 'Cantidad', 'Precio Unit.', 'Subtotal', 'Motivo'];
      const lines = detalles.map((d) =>
        [
          d.devolucion_id,
          new Date(d.fecha_devolucion).toLocaleString('es-CL'),
          d.tipo,
          `"${d.diseno}"`,
          d.tipo_prenda,
          d.color || 'N/A',
          d.talla,
          d.cantidad_devuelta,
          d.precio_unitario,
          d.subtotal_item,
          `"${d.motivo_descripcion || 'N/A'}"`
        ].join(',')
      );
      const csv = [header.join(','), ...lines].join('\n');
      downloadCSV(csv, 'devoluciones_detalle.csv');
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header con nuevo formato */}
      <ReportHeader
        title="Devoluciones y Cambios"
        icon={<RotateCcw className="w-8 h-8" />}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        showExport={devoluciones.length > 0}
      />

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
            <select
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="devolucion">Devoluciones</option>
              <option value="cambio">Cambios</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Método</label>
            <select
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="reintegro_efectivo">Reintegro Efectivo</option>
              <option value="nota_credito">Nota de Crédito</option>
              <option value="cambio_producto">Cambio Producto</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={buscar}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Buscar'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={exportCSV}
              className="w-full h-11 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={!devoluciones.length}
            >
              📥 Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">🔍 Información de Debug</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-medium">Total Devoluciones:</span>
            <span className="ml-2 text-blue-700 font-bold">{devoluciones.length}</span>
          </div>
          <div>
            <span className="font-medium">Transferencias:</span>
            <span className="ml-2 text-green-700 font-bold">{transferenciasPendientes.length} pendientes</span>
          </div>
          <div>
            <span className="font-medium">Filtros:</span>
            <span className="ml-2 text-gray-700">
              {tipoFiltro || 'Todos'} | {metodoFiltro || 'Todos'}
            </span>
          </div>
          <div>
            <span className="font-medium">Estado:</span>
            <span className="ml-2 text-gray-700">
              {loading ? 'Cargando...' : 'Listo'}
            </span>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={buscar}
            disabled={loading}
            className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? '⏳...' : '🔄 Recargar Datos'}
          </button>
          <button
            onClick={verificarBaseDatos}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            🔍 Verificar BD
          </button>
        </div>
        {devoluciones.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <strong>Última devolución:</strong> #{devoluciones[0]?.devolucion_id} - {new Date(devoluciones[0]?.fecha_devolucion).toLocaleDateString('es-CL')}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      {devoluciones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Total Devoluciones</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{totalDevoluciones}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Unidades Devueltas</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {totalUnidadesDevueltas.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Monto Reintegrado</div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              ${totalMontoReintegrado.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600">Valor Total Devuelto</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              ${totalMontoDevuelto.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {devoluciones.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Devoluciones por Tipo */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Por Tipo de Operación</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataTipo}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: { name?: string; percent?: number }) => 
                      `${entry.name || ''}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Devoluciones por Método */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Por Método de Resolución</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataMetodo}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: { name?: string; percent?: number }) => 
                      `${entry.name || ''}: ${((entry.percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataMetodo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tendencia por día */}
          {dataPorDia.length > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Diaria</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cantidad" stroke="#8b5cf6" name="Cantidad" />
                    <Line type="monotone" dataKey="monto" stroke="#ec4899" name="Monto ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top productos devueltos */}
          {topProductos.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Devueltos</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProductos}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis 
                      type="category" 
                      dataKey="producto" 
                      width={250} 
                      tick={{ fontSize: 11, fill: '#374151' }} 
                    />
                    <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Unidades']} />
                    <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
                      {topProductos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Vista */}
      {devoluciones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border-2 border-purple-300 overflow-hidden">
              <button
                onClick={() => setVistaActual('resumen')}
                className={`px-6 py-2 font-medium transition-colors ${
                  vistaActual === 'resumen' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📊 Vista Resumen
              </button>
              <button
                onClick={() => setVistaActual('transferencias')}
                className={`px-6 py-2 font-medium transition-colors relative ${
                  vistaActual === 'transferencias' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                🏦 Transferencias
                {transferenciasPendientes.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {transferenciasPendientes.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setVistaActual('detalle')}
                className={`px-6 py-2 font-medium transition-colors ${
                  vistaActual === 'detalle' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📋 Vista Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Resumen */}
      {vistaActual === 'resumen' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Unidades</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reintegro</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Usuario</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devoluciones.map((d) => (
                  <tr key={d.devolucion_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      #{d.devolucion_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        d.tipo === 'devolucion' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {d.tipo === 'devolucion' ? '📦 Devolución' : '🔄 Cambio'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {d.metodo_resolucion === 'reintegro_efectivo' ? '💵 Efectivo' :
                       d.metodo_resolucion === 'nota_credito' ? '📄 Nota' : '🔄 Cambio'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {d.cantidad_items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {d.total_unidades_devueltas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      ${d.monto_reintegro.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {d.usuario_nombre}
                    </td>
                  </tr>
                ))}
                {!devoluciones.length && !loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-4xl mb-2">📊</div>
                      <p className="text-gray-500 font-medium">No hay devoluciones</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Ajusta los filtros para ver resultados
                      </p>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-4xl mb-2 animate-pulse">⏳</div>
                      <p className="text-gray-500 font-medium">Cargando datos...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla Detalle */}
      {vistaActual === 'detalle' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID Dev.</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Talla</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cant.</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detalles.map((d, idx) => (
                  <tr key={`${d.devolucion_id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      #{d.devolucion_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        d.tipo === 'devolucion' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {d.tipo === 'devolucion' ? '📦' : '🔄'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{d.diseno}</div>
                      <div className="text-xs text-gray-500">
                        {d.tipo_prenda} {d.color ? `· ${d.color}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {d.talla}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {d.cantidad_devuelta}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      ${d.precio_unitario.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      ${d.subtotal_item.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {d.motivo_descripcion || 'N/A'}
                    </td>
                  </tr>
                ))}
                {!detalles.length && !loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-4xl mb-2">📋</div>
                      <p className="text-gray-500 font-medium">No hay detalles</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Ajusta los filtros para ver resultados
                      </p>
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-4xl mb-2 animate-pulse">⏳</div>
                      <p className="text-gray-500 font-medium">Cargando datos...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla Transferencias */}
      {vistaActual === 'transferencias' && (
        <div className="space-y-6">
          {/* Transferencias Pendientes */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                ⏳ Transferencias Pendientes
                <span className="bg-white text-red-600 text-sm font-bold px-2 py-1 rounded-full">
                  {transferenciasPendientes.length}
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Banco</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transferenciasPendientes.map((d) => (
                    <tr key={d.devolucion_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        #{d.devolucion_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{d.transferencia_nombre}</div>
                        <div className="text-xs text-gray-500">RUT: {d.transferencia_rut}</div>
                        {d.transferencia_email && (
                          <div className="text-xs text-gray-500">📧 {d.transferencia_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{d.transferencia_banco}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {d.transferencia_tipo_cuenta?.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {d.transferencia_numero_cuenta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        ${(d.monto_reintegro || d.monto_diferencia || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => marcarTransferencia(d.devolucion_id, true)}
                          disabled={actualizando === d.devolucion_id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actualizando === d.devolucion_id ? (
                            <>⏳ Procesando...</>
                          ) : (
                            <>✓ Marcar como Transferido</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transferenciasPendientes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="text-gray-400 text-4xl mb-2">✅</div>
                        <p className="text-gray-500 font-medium">No hay transferencias pendientes</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Todas las transferencias han sido realizadas
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transferencias Realizadas */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                ✅ Transferencias Realizadas
                <span className="bg-white text-green-600 text-sm font-bold px-2 py-1 rounded-full">
                  {transferenciasRealizadas.length}
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha Dev.</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Banco</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Monto</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Fecha Transf.</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transferenciasRealizadas.map((d) => (
                    <tr key={d.devolucion_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        #{d.devolucion_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(d.fecha_devolucion).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{d.transferencia_nombre}</div>
                        <div className="text-xs text-gray-500">RUT: {d.transferencia_rut}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{d.transferencia_banco}</div>
                        <div className="text-xs text-gray-500">{d.transferencia_numero_cuenta}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        ${(d.monto_reintegro || d.monto_diferencia || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {d.fecha_transferencia ? new Date(d.fecha_transferencia).toLocaleDateString('es-CL') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => marcarTransferencia(d.devolucion_id, false)}
                          disabled={actualizando === d.devolucion_id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actualizando === d.devolucion_id ? (
                            <>⏳ Procesando...</>
                          ) : (
                            <>↩️ Marcar como Pendiente</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transferenciasRealizadas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="text-gray-400 text-4xl mb-2">📋</div>
                        <p className="text-gray-500 font-medium">No hay transferencias realizadas</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}