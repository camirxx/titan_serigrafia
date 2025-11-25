import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando resumen de caja para fecha: ${fecha}`);

    // 1. Obtener ventas en efectivo del día
    const { data: ventasEfectivo, error: errorVentas } = await supabase
      .from('ventas')
      .select('total')
      .eq('metodo_pago', 'efectivo')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    console.log('🛒 Ventas efectivo:', { ventasEfectivo, errorVentas });

    // 2. Obtener ingresos manuales del día
    console.log('🔍 Buscando ingresos manuales para fecha:', fecha);
    const { data: ingresosManuales, error: errorManuales } = await supabase
      .from('caja_movimientos')
      .select('monto')
      .eq('tipo', 'ingreso')
      .is('venta_id', null) // Solo ingresos manuales
      .not('sesion_id', 'is', null) // Con sesión válida
      .gte('fecha', `${fecha}T00:00:00`)
      .lte('fecha', `${fecha}T23:59:59`);

    console.log('💰 Ingresos manuales encontrados:', { ingresosManuales, errorManuales });

    // 3. Calcular totales simples
    const totalVentasEfectivo = ventasEfectivo?.reduce((sum, venta) => sum + (venta.total || 0), 0) || 0;
    const totalManuales = ingresosManuales?.reduce((sum, ingreso) => sum + (ingreso.monto || 0), 0) || 0;
    const totalEfectivo = totalVentasEfectivo + totalManuales;

    console.log(`💰 Totales calculados: Ventas: $${totalVentasEfectivo}, Manuales: $${totalManuales}, Total: $${totalEfectivo}`);

    return NextResponse.json({
      fecha,
      total_efectivo: totalEfectivo,
      total_ventas_efectivo: totalVentasEfectivo,
      total_ingresos_manuales: totalManuales,
      cantidad_ventas_efectivo: ventasEfectivo?.length || 0,
      cantidad_ingresos_manuales: ingresosManuales?.length || 0
    });
  } catch (error) {
    console.error('❌ Error en resumen de caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { 
        error: 'Error interno del servidor',
        debug: error.message 
      },
      { status: 500 }
    );
  }
}
