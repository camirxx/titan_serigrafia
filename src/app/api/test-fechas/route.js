import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`🔍 Test de fechas - Fecha solicitada: ${fecha}`);

    // 1. Verificar ventas de hoy
    const { data: ventasHoy, error: errorVentas } = await supabase
      .from('ventas')
      .select('id, total, created_at')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    console.log('🛒 Ventas hoy:', { ventasHoy, errorVentas });

    // 2. Verificar movimientos de hoy
    const { data: movimientosHoy, error: errorMovimientos } = await supabase
      .from('caja_movimientos')
      .select('id, tipo, monto, concepto, fecha')
      .gte('fecha', `${fecha}T00:00:00`)
      .lte('fecha', `${fecha}T23:59:59`);

    console.log('💰 Movimientos hoy:', { movimientosHoy, errorMovimientos });

    // 3. Verificar todos los movimientos (sin filtro)
    const { data: todosMovimientos, error: errorTodos } = await supabase
      .from('caja_movimientos')
      .select('id, tipo, monto, concepto, fecha')
      .order('fecha', { ascending: false })
      .limit(10);

    console.log('📋 Todos los movimientos:', { todosMovimientos, errorTodos });

    // 4. Verificar fecha actual del servidor
    const serverDate = new Date().toISOString().split('T')[0];
    const serverTime = new Date().toISOString();

    return NextResponse.json({
      fecha_solicitada: fecha,
      fecha_servidor: serverDate,
      hora_servidor: serverTime,
      ventas_hoy: {
        cantidad: ventasHoy?.length || 0,
        total: ventasHoy?.reduce((sum, v) => sum + (v.total || 0), 0) || 0,
        datos: ventasHoy,
        error: errorVentas?.message
      },
      movimientos_hoy: {
        cantidad: movimientosHoy?.length || 0,
        ingresos: movimientosHoy?.filter(m => m.tipo === 'ingreso').length || 0,
        retiros: movimientosHoy?.filter(m => m.tipo === 'egreso').length || 0,
        datos: movimientosHoy,
        error: errorMovimientos?.message
      },
      ultimos_movimientos: {
        datos: todosMovimientos,
        error: errorTodos?.message
      }
    });
  } catch (error) {
    console.error('❌ Error en test de fechas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
