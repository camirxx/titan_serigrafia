import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando retiros para fecha: ${fecha}`);

    // 1. Verificar retiros del día
    const { data: retirosDia, error: errorDia } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('tipo', 'egreso')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .limit(5);

    console.log('💸 Test retiros día:', { retirosDia, errorDia });

    // 2. Verificar retiros acumulados
    const { data: retirosAnteriores, error: errorAnteriores } = await supabase
      .from('caja_movimientos')
      .select('monto')
      .eq('tipo', 'egreso')
      .lt('created_at', `${fecha}T00:00:00`)
      .limit(10);

    console.log('📊 Test retiros anteriores:', { retirosAnteriores, errorAnteriores });

    let totalDia = 0;
    let totalAcumulado = 0;

    if (!errorDia && retirosDia) {
      totalDia = retirosDia.reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
      console.log(`💸 Retiros del día: ${retirosDia.length}, total: $${totalDia}`);
    }

    if (!errorAnteriores && retirosAnteriores) {
      totalAcumulado = retirosAnteriores.reduce((sum, retiro) => sum + (retiro.monto || 0), 0);
      console.log(`📊 Retiros acumulados: $${totalAcumulado}`);
    }

    const retirosFormateados = (retirosDia || []).map(retiro => ({
      monto: retiro.monto,
      motivo: retiro.concepto || 'No especificado',
      hora: new Date(retiro.created_at).toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));

    return NextResponse.json({
      fecha,
      retiros_dia: retirosFormateados,
      total_dia: totalDia,
      total_acumulado_anterior: totalAcumulado,
      cantidad_retiros_dia: retirosDia?.length || 0,
      debug: {
        retiros_encontrados: retirosDia?.length || 0,
        acumulados_encontrados: retirosAnteriores?.length || 0,
        error_dia: errorDia?.message,
        error_anteriores: errorAnteriores?.message
      }
    });
  } catch (error) {
    console.error('❌ Error general en retiros de caja:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        debug: error.message 
      },
      { status: 500 }
    );
  }
}
