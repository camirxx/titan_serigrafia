// src/app/api/trabajadores/create/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { requireRole } from '@/lib/guards';

export async function POST(request: Request) {
  try {
    // Verificar que sea admin
    const gate = await requireRole('admin');
    if (!gate.ok) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, nombre, rol, tienda_id } = body;

    // Validaciones
    if (!email || !nombre || !rol) {
      return NextResponse.json(
        { success: false, message: 'Email, nombre y rol son obligatorios' },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // 1. Crear usuario en auth.users (Supabase Admin API)
    // Nota: Esto requiere la Service Role Key en el servidor
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        nombre
      }
    });

    if (authError) {
      console.error('Error creando auth user:', authError);
      return NextResponse.json(
        { success: false, message: `Error de autenticación: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, message: 'No se pudo crear el usuario' },
        { status: 500 }
      );
    }

    // 2. Insertar en tabla usuarios
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nombre,
        rol,
        tienda_id: tienda_id ? Number(tienda_id) : null,
        activo: true
      });

    if (dbError) {
      console.error('Error insertando en DB:', dbError);
      
      // Rollback: eliminar usuario de auth si falla la inserción en DB
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { success: false, message: `Error en base de datos: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 3. Enviar email de invitación (opcional)
    // await supabase.auth.admin.inviteUserByEmail(email);

    return NextResponse.json({
      success: true,
      message: 'Trabajador creado exitosamente',
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Error en create trabajador:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}