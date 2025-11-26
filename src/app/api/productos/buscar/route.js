import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre');

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    // Usar la misma estructura que el inventario (la que funcionaba antes)
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
      console.error('Error al buscar productos:', error);
      return NextResponse.json(
        { error: 'Error al buscar productos' },
        { status: 500 }
      );
    }

    console.log(`📦 Productos base encontrados: ${productos?.length || 0}`);

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

    console.log(`📋 Variantes encontradas: ${variantes?.length || 0}`);
    console.log(`🔍 IDs de productos buscados: [${productoIds.join(', ')}]`);
    
    // Mostrar algunas variantes de ejemplo
    if (variantes && variantes.length > 0) {
      console.log(`📊 Ejemplos de variantes:`);
      variantes.slice(0, 3).forEach(v => {
        console.log(`   - Producto ${v.producto_id}, Talla ${v.talla}, Stock ${v.stock_actual}`);
      });
    }

    // Transformar datos al formato que espera el chatbot
    const productosFormateados = [];
    
    productos?.forEach((producto) => {
      const productoVariantes = variantes?.filter(v => v.producto_id === producto.id) || [];
      const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual || 0), 0);
      
      // Logging para depuración
      console.log(`🔍 Producto: ${producto.disenos?.nombre} ${producto.tipos_prenda?.nombre} ${producto.colores?.nombre}`);
      console.log(`📊 Variantes encontradas: ${productoVariantes.length}`);
      console.log(`💰 Stock calculado: ${stockTotal}`);
      productoVariantes.forEach(v => {
        console.log(`   - Talla ${v.talla}: ${v.stock_actual} unidades`);
      });
      
      // Filtrar por búsqueda (case-insensitive) - MEJORADO
      const termino = nombre.toLowerCase();
      const diseno = producto.disenos?.nombre || '';
      const tipo = producto.tipos_prenda?.nombre || '';
      const color = producto.colores?.nombre || '';
      const nombreCompleto = `${diseno} ${tipo} ${color}`.toLowerCase();
      
      const coincideBusqueda = 
        diseno.toLowerCase().includes(termino) ||
        tipo.toLowerCase().includes(termino) ||
        color.toLowerCase().includes(termino) ||
        nombreCompleto.includes(termino);
      
      if (coincideBusqueda) {
        productosFormateados.push({
          id: producto.id,
          nombre: `${diseno} ${tipo} ${color}`.trim(),
          diseno: diseno,
          tipo_prenda: tipo,
          color: color || 'Sin color',
          stock_total: stockTotal,
          todas_las_tallas: productoVariantes.map(v => ({
            talla: v.talla || 'N/A',
            stock: v.stock_actual || 0
          })),
          tallas_con_stock: productoVariantes
            .filter(v => v.stock_actual > 0)
            .map(v => ({
              talla: v.talla || 'N/A',
              stock: v.stock_actual || 0
            })),
          tallas_sin_stock: productoVariantes
            .filter(v => v.stock_actual === 0)
            .map(v => v.talla || 'N/A')
        });
      }
    });

    console.log(`🔍 Búsqueda: "${nombre}" - Productos encontrados: ${productosFormateados.length}`);

    if (productosFormateados.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos' },
        { status: 404 }
      );
    }

    // Devolver siempre la lista de productos (múltiples o uno solo)
    return NextResponse.json({
      productos: productosFormateados,
      total: productosFormateados.length,
      busqueda: nombre
    });
  } catch (error) {
    console.error('Error en búsqueda de producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
