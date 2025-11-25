import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando ganancia del día: ${fecha}`);

    // Obtener todas las ventas del día (todos los métodos de pago)
    const { data, error } = await supabase
      .from('ventas')
      .select('total, created_at')
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    if (error) {
      console.error('Error al obtener ganancia del día:', error);
      return NextResponse.json(
        { error: 'Error al obtener datos' },
        { status: 500 }
      );
    }

    console.log('🔍 Datos de ventas:', data);

    // Calcular total simple
    const total_ventas = data.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const cantidad_ventas = data.length;

    console.log(`📊 Total ventas: $${total_ventas}, Cantidad: ${cantidad_ventas}`);

    return NextResponse.json({
      fecha,
      total_ventas,
      cantidad_ventas
    });
  } catch (error) {
    console.error('Error en ganancia del día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
