import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // Primero intentar con la vista de ventas diarias
    const { data: vistaData, error: vistaError } = await supabase
      .from('ventas_diarias_view')
      .select('*')
      .eq('fecha', fecha)
      .single();

    if (!vistaError && vistaData) {
      // Obtener detalles de productos vendidos desde la vista de detalles
      const { data: detalles, error: detallesError } = await supabase
        .from('detalle_ventas_view')
        .select('cantidad')
        .gte('created_at', `${fecha}T00:00:00`)
        .lte('created_at', `${fecha}T23:59:59`);

      let cantidad_productos = 0;
      if (!detallesError && detalles) {
        cantidad_productos = detalles.reduce((sum, d) => sum + (d.cantidad || 0), 0);
      }

      return NextResponse.json({
        fecha,
        cantidad_productos,
        monto_total: vistaData.total_vendido || 0
      });
    }

    // Fallback a consulta directa si la vista no funciona
    const { data: ventas, error: errorVentas } = await supabase
      .from('ventas')
      .select(`
        total,
        detalle_ventas (
          cantidad
        )
      `)
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    if (errorVentas) {
      console.error('Error al obtener ventas:', errorVentas);
      return NextResponse.json(
        { error: 'Error al obtener datos' },
        { status: 500 }
      );
    }

    let monto_total = 0;
    let cantidad_productos = 0;

    ventas.forEach(venta => {
      monto_total += venta.total || 0;
      venta.detalle_ventas?.forEach(detalle => {
        cantidad_productos += detalle.cantidad || 0;
      });
    });

    return NextResponse.json({
      fecha,
      cantidad_productos,
      monto_total
    });
  } catch (error) {
    console.error('Error en total vendido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
