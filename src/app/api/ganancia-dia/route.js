import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // Obtener el total de TODAS las ventas del día (efectivo + tarjeta + transferencia)
    const { data, error } = await supabase
      .from('ventas')
      .select('total')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    if (error) {
      console.error('Error al obtener ganancia del día:', error);
      return NextResponse.json(
        { error: 'Error al obtener datos' },
        { status: 500 }
      );
    }

    const total_ventas = data.reduce((sum, venta) => sum + (venta.total || 0), 0);

    return NextResponse.json({
      fecha,
      total_ventas,
      cantidad_ventas: data.length
    });
  } catch (error) {
    console.error('Error en ganancia del día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
