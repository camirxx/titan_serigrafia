import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function POST(request) {
  try {
    const body = await request.json();
    const { monto, concepto, usuario_id } = body;

    console.log('💰 Registrando ingreso manual:', { monto, concepto, usuario_id });

    // Validar datos requeridos
    if (!monto || monto <= 0) {
      return NextResponse.json(
        { error: 'El monto es requerido y debe ser mayor a 0' },
        { status: 400 }
      );
    }

    if (!concepto) {
      return NextResponse.json(
        { error: 'El concepto es requerido' },
        { status: 400 }
      );
    }

    // Obtener una sesión de caja abierta o crear una por defecto
    let { data: sesion, error: errorSesion } = await supabase
      .from('caja_sesiones')
      .select('id, usuario_id, tienda_id')
      .eq('abierta', true)
      .limit(1)
      .single();

    let sesionId = sesion?.id;
    let usuarioSesionId = sesion?.usuario_id;
    let tiendaId = sesion?.tienda_id || 1;

    // Si no hay sesión abierta, crear una
    if (!sesionId || errorSesion) {
      console.log('📋 Creando nueva sesión de caja para ingreso');
      
      // Usar un usuario_id por defecto (deberías reemplazar con un usuario real)
      const usuarioIdPorDefecto = '00000000-0000-0000-0000-000000000001';
      
      const { data: nuevaSesion, error: errorNueva } = await supabase
        .from('caja_sesiones')
        .insert({
          tienda_id: 1, // tienda por defecto
          usuario_id: usuarioIdPorDefecto,
          saldo_inicial: 50000,
          abierta: true
        })
        .select('id, usuario_id, tienda_id')
        .single();

      if (errorNueva) {
        console.error('❌ Error al crear sesión:', errorNueva);
        return NextResponse.json(
          { error: 'No se pudo crear una sesión de caja', details: errorNueva.message },
          { status: 500 }
        );
      }

      sesionId = nuevaSesion.id;
      usuarioSesionId = nuevaSesion.usuario_id;
      tiendaId = nuevaSesion.tienda_id;
      console.log('✅ Sesión creada:', sesionId);
    } else {
      console.log('✅ Usando sesión existente:', sesionId);
    }

    // Registrar el ingreso manual en caja_movimientos
    const { data: ingreso, error } = await supabase
      .from('caja_movimientos')
      .insert({
        sesion_id: sesionId,
        tipo: 'ingreso',
        concepto: concepto || 'Ingreso manual',
        monto: monto,
        usuario_id: usuario_id || usuarioSesionId || null
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error al registrar ingreso manual:', error);
      return NextResponse.json(
        { error: 'Error al registrar el ingreso', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Ingreso manual registrado exitosamente:', ingreso);

    return NextResponse.json({
      success: true,
      message: 'Ingreso manual registrado exitosamente',
      ingreso: {
        id: ingreso.id,
        monto: ingreso.monto,
        concepto: ingreso.concepto,
        hora: new Date(ingreso.fecha).toLocaleTimeString('es-CL', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    });

  } catch (error) {
    console.error('❌ Error general en registro de ingreso manual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
