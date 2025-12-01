import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET() {
  try {
    console.log('🔍 Consultando productos con stock bajo (tienda_id=1)...');

    // ✅ FILTRAR POR TIENDA_ID = 1 (Inventario Central)
    const { data: productos, error } = await supabase
      .from("productos")
      .select(`
        id,
        disenos!inner(nombre),
        tipos_prenda!inner(nombre),
        colores(nombre),
        activo,
        tienda_id
      `)
      .eq("activo", true)
      .eq("tienda_id", 1); // ✅ INVENTARIO CENTRAL

    if (error) {
      console.error('❌ Error al obtener productos:', error);
      return NextResponse.json(
        { error: 'Error al obtener productos' },
        { status: 500 }
      );
    }

    console.log(`📦 Productos encontrados (tienda_id=1): ${productos?.length || 0}`);

    if (!productos || productos.length === 0) {
      return NextResponse.json({
        productos: [],
        total: 0,
        mensaje: 'No hay productos en el inventario'
      });
    }

    // Obtener todas las variantes para estos productos
    const productoIds = productos.map(p => p.id);
    const { data: variantes, error: errorVariantes } = await supabase
      .from("variantes")
      .select("id, producto_id, talla, stock_actual")
      .in("producto_id", productoIds)
      .order("producto_id")
      .order("talla");

    if (errorVariantes) {
      console.error('❌ Error al obtener variantes:', errorVariantes);
      return NextResponse.json(
        { error: 'Error al obtener variantes' },
        { status: 500 }
      );
    }

    console.log(`📋 Variantes encontradas: ${variantes?.length || 0}`);

    // Filtrar y agrupar productos con stock bajo (<= 5 unidades o stock = 0)
    const productosConStockBajo = [];
    
    productos.forEach((producto) => {
      // Extraer nombres (pueden ser arrays o objetos)
      const diseno = Array.isArray(producto.disenos)
        ? producto.disenos[0]?.nombre
        : producto.disenos?.nombre || '';
      const tipo = Array.isArray(producto.tipos_prenda)
        ? producto.tipos_prenda[0]?.nombre
        : producto.tipos_prenda?.nombre || '';
      const color = Array.isArray(producto.colores)
        ? producto.colores[0]?.nombre
        : producto.colores?.nombre || 'Sin color';

      const productoVariantes = variantes?.filter(v => v.producto_id === producto.id) || [];
      const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual || 0), 0);
      
      // Buscar variantes con stock bajo (≤ 5 unidades)
      const variantesConStockBajo = productoVariantes.filter(v => (v.stock_actual || 0) <= 5);
      
      if (variantesConStockBajo.length > 0) {
        console.log(`⚠️ ${diseno} ${tipo} ${color} - Stock total: ${stockTotal}`);
        variantesConStockBajo.forEach(v => {
          console.log(`   - Talla ${v.talla}: ${v.stock_actual} unidades (BAJO)`);
        });

        productosConStockBajo.push({
          id: producto.id,
          nombre: `${diseno} ${tipo} ${color}`.trim(),
          diseno: diseno,
          tipo_prenda: tipo,
          color: color,
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

    console.log(`✅ Productos con stock bajo: ${productosConStockBajo.length}`);

    return NextResponse.json({
      productos: productosConStockBajo,
      total: productosConStockBajo.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error en stock bajo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}