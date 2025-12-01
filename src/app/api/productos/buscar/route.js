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

    console.log('🔍 Buscando producto:', nombre);

    // ✅ CONSULTAR DIRECTAMENTE COMO EL INVENTARIO - IGUAL QUE InventarioClient.tsx
    // 1. Cargar SOLO productos de la TIENDA 1 (Tienda Principal)
    const { data: todosProductos, error: errProductos } = await supabase
      .from("productos")
      .select(`
        id,
        disenos!inner(nombre),
        tipos_prenda!inner(nombre),
        colores(nombre)
      `)
      .eq("activo", true)
      .eq("tienda_id", 1); // ✅ INVENTARIO CENTRAL

    if (errProductos) {
      console.error('❌ Error al obtener productos:', errProductos);
      return NextResponse.json(
        { error: 'Error al buscar productos' },
        { status: 500 }
      );
    }

    console.log(`� Productos encontrados (tienda_id=1): ${todosProductos?.length || 0}`);

    if (!todosProductos || todosProductos.length === 0) {
      return NextResponse.json({
        productos: [],
        total: 0,
        busqueda: nombre,
        mensaje: 'No hay productos en el inventario'
      });
    }

    // Map para acceso rápido y filtrado - IGUAL QUE EL INVENTARIO
    const productosUnicos = new Map();

    todosProductos?.forEach((p) => {
      productosUnicos.set(Number(p.id), {
        diseno: Array.isArray(p.disenos) ? p.disenos[0]?.nombre || "Sin diseño" : p.disenos?.nombre || "Sin diseño",
        tipo_prenda: Array.isArray(p.tipos_prenda) ? p.tipos_prenda[0]?.nombre || "Sin tipo" : p.tipos_prenda?.nombre || "Sin tipo",
        color: Array.isArray(p.colores) ? p.colores[0]?.nombre || "Sin color" : p.colores?.nombre || "Sin color",
      });
    });

    // 2. Cargar TODAS las variantes paginando - IGUAL QUE EL INVENTARIO
    let allVariantes = [];
    let start = 0;
    const batchSize = 1000;

    while (true) {
      const { data: batch, error } = await supabase
        .from("variantes")
        .select("id, producto_id, talla, stock_actual")
        .order("id", { ascending: true })
        .range(start, start + batchSize - 1);

      if (error) throw error;
      if (!batch || batch.length === 0) break;

      allVariantes = allVariantes.concat(batch);
      if (batch.length < batchSize) break;
      start += batchSize;
    }

    // 3. Filtrar variantes que no pertenecen a la tienda 1 - IGUAL QUE EL INVENTARIO
    const variantesFiltradas = allVariantes
      .filter((v) => productosUnicos.has(v.producto_id))
      .map((v) => {
        const info = productosUnicos.get(v.producto_id);
        return {
          variante_id: v.id,
          producto_id: v.producto_id,
          talla: v.talla || "N/A",
          stock_actual: v.stock_actual,
          diseno: info?.diseno || "Sin diseño",
          tipo_prenda: info?.tipo_prenda || "Sin tipo",
          color: info?.color || "Sin color",
          producto_activo: true,
        };
      });

    console.log(`📋 Total variantes en inventario: ${variantesFiltradas.length}`);

    // Filtrar por búsqueda
    const termino = nombre.toLowerCase();
    const variantesFiltradasBusqueda = variantesFiltradas.filter(v => {
      const diseno = (v.diseno || '').toLowerCase();
      const tipo = (v.tipo_prenda || '').toLowerCase();
      const color = (v.color || '').toLowerCase();
      const nombreCompleto = `${diseno} ${tipo} ${color}`;
      
      return diseno.includes(termino) ||
             tipo.includes(termino) ||
             color.includes(termino) ||
             nombreCompleto.includes(termino);
    });

    console.log(`🔍 Variantes que coinciden con "${nombre}": ${variantesFiltradasBusqueda.length}`);

    if (variantesFiltradasBusqueda.length === 0) {
      return NextResponse.json({
        productos: [],
        total: 0,
        busqueda: nombre,
        mensaje: `No se encontraron productos con el nombre "${nombre}"`
      });
    }

    // Agrupar por producto (diseno + tipo_prenda + color)
    const productosMap = new Map();

    variantesFiltradasBusqueda.forEach(v => {
      const key = `${v.producto_id}`;
      
      if (!productosMap.has(key)) {
        productosMap.set(key, {
          id: v.producto_id,
          nombre: `${v.diseno} ${v.tipo_prenda} ${v.color}`.trim(),
          diseno: v.diseno || '',
          tipo_prenda: v.tipo_prenda || '',
          color: v.color || 'Sin color',
          activo: v.producto_activo || false,
          variantes: []
        });
      }
      
      productosMap.get(key).variantes.push({
        variante_id: v.variante_id,
        talla: v.talla || 'N/A',
        stock: v.stock_actual || 0
      });
    });

    // Transformar a formato del chatbot
    const productosFormateados = Array.from(productosMap.values()).map(p => {
      const stockTotal = p.variantes.reduce((sum, v) => sum + v.stock, 0);
      
      console.log(`✅ ${p.nombre} - Stock total: ${stockTotal} - Activo: ${p.activo}`);
      p.variantes.forEach(v => {
        console.log(`   - Talla ${v.talla}: ${v.stock} unidades`);
      });
      
      return {
        id: p.id,
        nombre: p.nombre,
        diseno: p.diseno,
        tipo_prenda: p.tipo_prenda,
        color: p.color,
        activo: p.activo,
        stock_total: stockTotal,
        todas_las_tallas: p.variantes.map(v => ({
          talla: v.talla,
          stock: v.stock
        })),
        tallas_con_stock: p.variantes
          .filter(v => v.stock > 0)
          .map(v => ({
            talla: v.talla,
            stock: v.stock
          })),
        tallas_sin_stock: p.variantes
          .filter(v => v.stock === 0)
          .map(v => v.talla)
      };
    });

    console.log(`🎯 Productos formateados: ${productosFormateados.length}`);

    return NextResponse.json({
      productos: productosFormateados,
      total: productosFormateados.length,
      busqueda: nombre
    });
  } catch (error) {
    console.error('💥 Error en búsqueda de producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}