import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const { user_id, tienda_id } = await req.json()
    if (!user_id) throw new Error('user_id requerido')
    const supa = supabaseAdmin()
    const { error } = await supa.rpc('set_usuario_tienda', { p_user: user_id, p_tienda: tienda_id ?? null })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

//cambiar tienda 