import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando retiros para fecha: ${fecha}`);

    // 1. Obtener retiros del día específico
    console.log('🔍 Buscando retiros para fecha:', fecha);
    const { data: retirosDia, error: errorDia } = await supabase
      .from('caja_movimientos')
      .select('monto, concepto, fecha')
      .eq('tipo', 'egreso')
      .gte('fecha', `${fecha}T00:00:00`)
      .lte('fecha', `${fecha}T23:59:59`);

    console.log('💸 Retiros del día encontrados:', { retirosDia, errorDia });

    // 2. Calcular total del día
    const totalDia = retirosDia?.reduce((sum, retiro) => sum + (retiro.monto || 0), 0) || 0;

    console.log(`💸 Total retiros del día: $${totalDia}`);

    // 3. Formatear detalle simple de retiros
    const retirosFormateados = (retirosDia || []).map(retiro => ({
      monto: retiro.monto,
      motivo: retiro.concepto || 'Retiro de caja',
      hora: new Date(retiro.fecha).toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));

    return NextResponse.json({
      fecha,
      total_dia: totalDia,
      cantidad_retiros_dia: retirosDia?.length || 0,
      retiros_dia: retirosFormateados
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
