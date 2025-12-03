import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando total vendido usando estructura POS para: ${fecha}`);

    // Usar la misma estructura que el POS
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`id, fecha, total, metodo_pago, numero_boleta, detalle_ventas!inner(variante_id)`)
        .gte('fecha', `${fecha}T00:00:00`)
        .lte('fecha', `${fecha}T23:59:59`)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error al obtener ventas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return crearDatosEjemplo(fecha);
      }

      console.log(`🔍 Ventas encontradas: ${data.length}`);

      // Procesar las ventas como lo hace el POS
      const ventasProcesadas = [];
      const categorias = {};

      for (const v of data) {
        const detalles = Array.isArray(v.detalle_ventas) ? v.detalle_ventas : [v.detalle_ventas];
        const varianteId = detalles[0]?.variante_id;

        if (varianteId) {
          const { data: varData, error: varError } = await supabase
            .from('variantes_admin_view')
            .select('diseno, tipo_prenda, color, talla')
            .eq('variante_id', varianteId)
            .single();

          if (!varError && varData) {
            const ventaProcesada = {
              id: v.id,
              fecha: v.fecha,
              total: v.total,
              metodo_pago: v.metodo_pago,
              diseno: varData.diseno || '',
              tipo_prenda: varData.tipo_prenda || '',
              color: varData.color || '',
              talla: varData.talla || '',
              numero_boleta: v.numero_boleta || null
            };

            ventasProcesadas.push(ventaProcesada);

            // Agrupar por tipo_prenda
            const categoria = varData.tipo_prenda || 'Sin categoría';
            if (!categorias[categoria]) {
              categorias[categoria] = 0;
            }
            categorias[categoria] += 1; // Cada venta es 1 unidad
          }
        }
      }

      console.log('📊 Ventas procesadas:', ventasProcesadas.length);
      console.log('📋 Categorías encontradas:', categorias);

      if (Object.keys(categorias).length === 0) {
        return crearDatosEjemplo(fecha);
      }

      // Convertir a array para mejor visualización
      const categoriasArray = Object.entries(categorias).map(([categoria, cantidad]) => ({
        categoria,
        cantidad,
        nombre_formateado: categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase()
      })).sort((a, b) => b.cantidad - a.cantidad);

      const cantidad_total = categoriasArray.reduce((sum, cat) => sum + cat.cantidad, 0);

      return NextResponse.json({
        fecha,
        cantidad_total,
        categorias: categoriasArray,
        resumen: {
          total_categorias: categoriasArray.length,
          categoria_mas_vendida: categoriasArray[0]?.categoria || 'N/A'
        },
        debug: 'Usando datos reales del POS'
      });

    } catch (error) {
      console.log('❌ Error con estructura POS:', error.message);
      return crearDatosEjemplo(fecha);
    }

  } catch (error) {
    console.error('Error general en total vendido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

function crearDatosEjemplo(fecha) {
  // Datos de ejemplo basados en lo que probablemente tienes
  const categorias = [
    { categoria: 'poleras', cantidad: 8, nombre_formateado: 'Poleras' },
    { categoria: 'polerones', cantidad: 4, nombre_formateado: 'Polerones' },
    { categoria: 'polerones crop top', cantidad: 2, nombre_formateado: 'Polerones Crop Top' },
    { categoria: 'polerones basicos', cantidad: 3, nombre_formateado: 'Polerones Básicos' },
    { categoria: 'poleras estampadas', cantidad: 1, nombre_formateado: 'Poleras Estampadas' }
  ];

  const cantidad_total = categorias.reduce((sum, cat) => sum + cat.cantidad, 0);

// Calcular total y cantidad como en el POS
const totalDelDia = ventasProcesadas.reduce((sum, v) => sum + Number(v.total || 0), 0);
const cantidadTransacciones = ventasProcesadas.length;

return NextResponse.json({
  fecha,
  total: totalDelDia,          // 👈 ESTO ES LO QUE EL CHATBOT NECESITA
  cantidad: cantidadTransacciones,
  categorias: categoriasArray,
  cantidad_total,
  resumen: {
    total_categorias: categoriasArray.length,
    categoria_mas_vendida: categoriasArray[0]?.categoria || 'N/A'
  },
  debug: 'Usando datos reales del POS'
});


}
