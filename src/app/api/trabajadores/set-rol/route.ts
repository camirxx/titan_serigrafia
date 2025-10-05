import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const { user_id, rol } = await req.json()
    if (!user_id || !rol) throw new Error('user_id y rol requeridos')
    if (!['admin','vendedor','desarrollador'].includes(rol)) throw new Error('Rol inválido')
    const supa = supabaseAdmin()
    const { error } = await supa.rpc('set_usuario_rol', { p_user: user_id, p_rol: rol })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

//cambiar rol