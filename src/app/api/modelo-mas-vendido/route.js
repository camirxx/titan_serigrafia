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
        precio_unitario,
        producto_id,
        producto_nombre,
        created_at
      `)
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`);

    if (error) {
      console.error('Error al obtener modelo más vendido:', error);
      // Fallback a consulta directa
      const { data: ventasDirect, error: errorDirect } = await supabase
        .from('ventas')
        .select(`
          detalle_ventas (
            cantidad,
            precio_unitario,
            productos (
              id,
              nombre
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

      const productosMap = new Map();

      ventasDirect.forEach(venta => {
        venta.detalle_ventas?.forEach(detalle => {
          const productoId = detalle.productos?.id;
          const productoNombre = detalle.productos?.nombre;
          
          if (productoId && productoNombre) {
            if (!productosMap.has(productoId)) {
              productosMap.set(productoId, {
                nombre: productoNombre,
                cantidad_vendida: 0,
                ingresos_generados: 0
              });
            }
            
            const producto = productosMap.get(productoId);
            producto.cantidad_vendida += detalle.cantidad || 0;
            producto.ingresos_generados += (detalle.cantidad || 0) * (detalle.precio_unitario || 0);
          }
        });
      });

      let masVendido = null;
      let maxCantidad = 0;

      productosMap.forEach(producto => {
        if (producto.cantidad_vendida > maxCantidad) {
          maxCantidad = producto.cantidad_vendida;
          masVendido = producto;
        }
      });

      if (masVendido) {
        return NextResponse.json({
          fecha,
          ...masVendido
        });
      } else {
        return NextResponse.json({
          fecha,
          nombre: null,
          cantidad_vendida: 0,
          ingresos_generados: 0
        });
      }
    }

    const productosMap = new Map();

    ventas.forEach(venta => {
      const productoId = venta.producto_id;
      const productoNombre = venta.producto_nombre;
      
      if (productoId && productoNombre) {
        if (!productosMap.has(productoId)) {
          productosMap.set(productoId, {
            nombre: productoNombre,
            cantidad_vendida: 0,
            ingresos_generados: 0
          });
        }
        
        const producto = productosMap.get(productoId);
        producto.cantidad_vendida += venta.cantidad || 0;
        producto.ingresos_generados += (venta.cantidad || 0) * (venta.precio_unitario || 0);
      }
    });

    let masVendido = null;
    let maxCantidad = 0;

    productosMap.forEach(producto => {
      if (producto.cantidad_vendida > maxCantidad) {
        maxCantidad = producto.cantidad_vendida;
        masVendido = producto;
      }
    });

    if (masVendido) {
      return NextResponse.json({
        fecha,
        ...masVendido
      });
    } else {
      return NextResponse.json({
        fecha,
        nombre: null,
        cantidad_vendida: 0,
        ingresos_generados: 0
      });
    }
  } catch (error) {
    console.error('Error en modelo más vendido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
