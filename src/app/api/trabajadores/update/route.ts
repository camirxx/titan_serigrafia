import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const { id, nombre, email, rol, tienda_id } = await req.json()
    
    if (!id) throw new Error('ID de usuario requerido')
    
    const supa = supabaseAdmin()
    
    // Build update object dynamically
    const updateData: {
      nombre?: string;
      email?: string;
      rol?: string;
      tienda_id?: number | null;
    } = {};
    if (nombre !== undefined) updateData.nombre = nombre
    if (email !== undefined) updateData.email = email
    if (rol !== undefined) updateData.rol = rol
    if (tienda_id !== undefined) updateData.tienda_id = tienda_id
    
    const { error } = await supa
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true, message: 'Usuario actualizado correctamente' })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
  }
}
