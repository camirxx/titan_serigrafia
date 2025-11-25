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

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .ilike('nombre', `%${nombre}%`)
      .limit(10);

    if (error) {
      console.error('Error al buscar producto:', error);
      return NextResponse.json(
        { error: 'Error al buscar productos' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en búsqueda de producto:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
