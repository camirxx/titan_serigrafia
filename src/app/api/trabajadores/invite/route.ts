// invitar usuario 

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, nombre, rol, tienda_id } = await req.json()
    if (!email || !rol) throw new Error('email y rol requeridos')

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // server only
    )

    const { data: created, error: e1 } = await supa.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { nombre, rol, tienda_id }
    })
    if (e1 || !created?.user) throw e1 ?? new Error('No se pudo crear el usuario')

    const uid = created.user.id
    const { error: e2 } = await supa
      .from('usuarios')
      .upsert({ id: uid, nombre: nombre ?? null, rol, tienda_id: tienda_id ?? null }, { onConflict: 'id' })
    if (e2) throw e2

    return NextResponse.json({ ok: true, user_id: uid })
  } catch (e: unknown) {
    const message = typeof e === 'object' && e !== null && 'message' in e ? (e as { message: string }).message : String(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
