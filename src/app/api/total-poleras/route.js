import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    // Usar la vista de detalles de ventas si existe
    const { data: ventas, error } = await supabase
      .from('detalle_ventas_view')
      .select(`
        cantidad,
        producto_nombre,
        producto_categoria,
        created_at
      `)
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    if (error) {
      console.error('Error al obtener poleras:', error);
      // Fallback a consulta directa
      const { data: ventasDirect, error: errorDirect } = await supabase
        .from('ventas')
        .select(`
          detalle_ventas (
            cantidad,
            productos (
              nombre,
              categoria
            )
          )
        `)
        .gte('created_at', `${fecha}T00:00:00`)
        .lte('created_at', `${fecha}T23:59:59`);

      if (errorDirect) {
        return NextResponse.json(
          { error: 'Error al obtener datos' },
          { status: 500 }
        );
      }

      let cantidad_poleras = 0;
      const modelos = new Set();

      ventasDirect.forEach(venta => {
        venta.detalle_ventas?.forEach(detalle => {
          if (detalle.productos?.categoria?.toLowerCase().includes('polera') ||
              detalle.productos?.nombre?.toLowerCase().includes('polera')) {
            cantidad_poleras += detalle.cantidad || 0;
            modelos.add(detalle.productos?.nombre);
          }
        });
      });

      return NextResponse.json({
        fecha,
        cantidad_poleras,
        modelos: Array.from(modelos)
      });
    }

    let cantidad_poleras = 0;
    const modelos = new Set();

    ventas.forEach(venta => {
      if (venta.producto_categoria?.toLowerCase().includes('polera') ||
          venta.producto_nombre?.toLowerCase().includes('polera')) {
        cantidad_poleras += venta.cantidad || 0;
        modelos.add(venta.producto_nombre);
      }
    });

    return NextResponse.json({
      fecha,
      cantidad_poleras,
      modelos: Array.from(modelos)
    });
  } catch (error) {
    console.error('Error en total poleras:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
