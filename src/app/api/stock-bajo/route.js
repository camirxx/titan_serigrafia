import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    // Usar la misma estructura que el inventario
    const { data: productos, error } = await supabase
      .from("productos")
      .select(`
        id,
        disenos!inner(nombre),
        tipos_prenda!inner(nombre),
        colores(nombre),
        activo
      `)
      .eq("activo", true);

    if (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { error: 'Error al obtener productos' },
        { status: 500 }
      );
    }

    // Obtener todas las variantes para estos productos
    const productoIds = productos?.map(p => p.id) || [];
    const { data: variantes, error: errorVariantes } = await supabase
      .from("variantes")
      .select("id, producto_id, talla, stock_actual")
      .in("producto_id", productoIds);

    if (errorVariantes) {
      console.error('Error al obtener variantes:', errorVariantes);
      return NextResponse.json(
        { error: 'Error al obtener variantes' },
        { status: 500 }
      );
    }

    // Filtrar y agrupar productos con stock bajo (<= 5 unidades o stock = 0)
    const productosConStockBajo = [];
    
    productos?.forEach((producto) => {
      const productoVariantes = variantes?.filter(v => v.producto_id === producto.id) || [];
      const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual || 0), 0);
      
      // Buscar variantes con stock bajo
      const variantesConStockBajo = productoVariantes.filter(v => v.stock_actual <= 5);
      
      if (variantesConStockBajo.length > 0) {
        productosConStockBajo.push({
          id: producto.id,
          nombre: `${producto.disenos?.nombre} ${producto.tipos_prenda?.nombre} ${producto.colores?.nombre || ''}`.trim(),
          diseno: producto.disenos?.nombre || '',
          tipo_prenda: producto.tipos_prenda?.nombre || '',
          color: producto.colores?.nombre || 'Sin color',
          stock_total: stockTotal,
          variantes_bajo: variantesConStockBajo.map(v => ({
            id: v.id,
            talla: v.talla || 'N/A',
            stock_actual: v.stock_actual || 0
          })),
          total_variantes: productoVariantes.length
        });
      }
    });

    return NextResponse.json({
      productos: productosConStockBajo,
      total: productosConStockBajo.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en stock bajo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
