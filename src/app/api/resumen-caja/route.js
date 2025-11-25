import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando ingresos para fecha: ${fecha}`);

    // 1. Primero verificar si existe la tabla ventas y tiene metodo_pago
    const { data: testVentas, error: testVentasError } = await supabase
      .from('ventas')
      .select('id, total, metodo_pago, created_at')
      .eq('metodo_pago', 'efectivo')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .limit(5);

    console.log('🛒 Test ventas efectivo:', { testVentas, testVentasError });

    // 2. Verificar caja_movimientos
    const { data: testCaja, error: testCajaError } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('tipo', 'ingreso')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .limit(5);

    console.log('💰 Test caja movimientos:', { testCaja, testCajaError });

    // 3. Si hay error, intentar consulta más simple
    let totalEfectivo = 0;
    let totalVentasEfectivo = 0;
    let totalManuales = 0;

    if (!testVentasError && testVentas) {
      totalVentasEfectivo = testVentas.reduce((sum, venta) => sum + (venta.total || 0), 0);
      console.log(`💰 Ventas efectivo encontradas: ${testVentas.length}, total: $${totalVentasEfectivo}`);
    }

    if (!testCajaError && testCaja) {
      totalManuales = testCaja.reduce((sum, mov) => sum + (mov.monto || 0), 0);
      console.log(`📝 Ingresos manuales encontrados: ${testCaja.length}, total: $${totalManuales}`);
    }

    totalEfectivo = totalVentasEfectivo + totalManuales;

    return NextResponse.json({
      fecha,
      total_efectivo: totalEfectivo,
      total_ventas_efectivo: totalVentasEfectivo,
      total_ingresos_manuales: totalManuales,
      cantidad_ventas_efectivo: testVentas?.length || 0,
      cantidad_ingresos_manuales: testCaja?.length || 0,
      debug: {
        ventas_encontradas: testVentas?.length || 0,
        ingresos_manuales_encontrados: testCaja?.length || 0,
        error_ventas: testVentasError?.message,
        error_caja: testCajaError?.message
      }
    });
  } catch (error) {
    console.error('❌ Error general en ingresos de caja:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        debug: error.message 
      },
      { status: 500 }
    );
  }
}
