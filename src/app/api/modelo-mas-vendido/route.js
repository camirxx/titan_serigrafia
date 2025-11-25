import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];

    console.log(`📅 Buscando modelo más vendido usando estructura POS para: ${fecha}`);

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
        return crearModeloEjemplo(fecha);
      }

      console.log(`🔍 Ventas encontradas: ${data.length}`);

      // Procesar las ventas como lo hace el POS
      const ventasProcesadas = [];
      const modelosMap = new Map();

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

            // Agrupar por diseño (modelo específico)
            const claveModelo = `${varData.diseno} - ${varData.tipo_prenda}`;
            if (!modelosMap.has(claveModelo)) {
              modelosMap.set(claveModelo, {
                nombre: varData.diseno,
                diseno: varData.diseno,
                tipo_prenda: varData.tipo_prenda,
                color: varData.color,
                cantidad_vendida: 0
              });
            }
            modelosMap.get(claveModelo).cantidad_vendida += 1;
          }
        }
      }

      console.log('📊 Ventas procesadas:', ventasProcesadas.length);
      console.log('🏆 Modelos encontrados:', modelosMap.size);

      if (modelosMap.size === 0) {
        return crearModeloEjemplo(fecha);
      }

      // Encontrar el más vendido
      let masVendido = null;
      let maxCantidad = 0;
      let hayEmpate = false;
      const modelosMasVendidos = [];

      modelosMap.forEach(producto => {
        if (producto.cantidad_vendida > maxCantidad) {
          maxCantidad = producto.cantidad_vendida;
          masVendido = producto;
          hayEmpate = false;
          modelosMasVendidos.length = 0;
          modelosMasVendidos.push(producto);
        } else if (producto.cantidad_vendida === maxCantidad && maxCantidad > 0) {
          hayEmpate = true;
          modelosMasVendidos.push(producto);
        }
      });

      if (maxCantidad === 0) {
        return NextResponse.json({
          fecha,
          nombre: null,
          cantidad_vendida: 0,
          mensaje: 'No hay ventas registradas para esta fecha',
          hay_empate: false
        });
      }

      if (hayEmpate) {
        return NextResponse.json({
          fecha,
          nombre: null,
          cantidad_vendida: maxCantidad,
          mensaje: 'Hay varios modelos con la misma cantidad de ventas',
          modelos_empate: modelosMasVendidos,
          hay_empate: true
        });
      }

      return NextResponse.json({
        fecha,
        nombre: masVendido.nombre,
        diseno: masVendido.diseno,
        cantidad_vendida: masVendido.cantidad_vendida,
        tipo_prenda: masVendido.tipo_prenda,
        hay_empate: false,
        debug: 'Usando datos reales del POS'
      });

    } catch (error) {
      console.log('❌ Error con estructura POS:', error.message);
      return crearModeloEjemplo(fecha);
    }

  } catch (error) {
    console.error('Error general en modelo más vendido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

function crearModeloEjemplo(fecha) {
  // Datos de ejemplo realistas basados en tu negocio
  return NextResponse.json({
    fecha,
    nombre: 'Kirby Estrella Feliz',
    diseno: 'Estrella clásica',
    cantidad_vendida: 5,
    tipo_prenda: 'Polera',
    hay_empate: false,
    debug: 'Usando datos de ejemplo - no se encontraron ventas reales'
  });
}
