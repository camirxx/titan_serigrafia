import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request, { params }) {
  try {
    const productoId = params.id;
    
    console.log(`🔍 Obteniendo variantes del producto ${productoId}...`);

    // Obtener todas las variantes del producto
    const { data: variantes, error } = await supabase
      .from("variantes")
      .select("id, talla, stock_actual")
      .eq("producto_id", productoId)
      .order("talla");

    if (error) {
      console.error('❌ Error al obtener variantes:', error);
      return NextResponse.json(
        { error: 'Error al obtener variantes del producto' },
        { status: 500 }
      );
    }

    console.log(`📋 Variantes encontradas: ${variantes?.length || 0}`);

    return NextResponse.json({
      variantes: variantes || [],
      total: variantes?.length || 0,
      producto_id: productoId
    });
  } catch (error) {
    console.error('💥 Error obteniendo variantes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
