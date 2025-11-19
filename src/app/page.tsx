// src/app/(home)/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';
import PrivateAppLayout from '@/components/layout/PrivateAppLayout';
import HomeClient from './HomeClient';

export default async function Home() {
  const session = await getSession();
  
  // Si no hay sesión, redirigir al login
  if (!session?.user) {
    redirect('/login');
  }

  // Obtener datos del usuario
  const supabase = await supabaseServer();
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, nombre')
    .eq('id', session.user.id)
    .single();

  if (!userData?.rol) {
    redirect('/acceso-denegado');
  }

  const role = userData.rol as 'admin' | 'vendedor' | 'desarrollador';

  return (
    <PrivateAppLayout
      role={role}
      user={{
        name: userData.nombre || session.user.email || 'Usuario',
        email: session.user.email ?? '',
        avatarUrl: (session.user.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null,
      }}
    >
      <HomeClient 
        userRole={role} 
      />
    </PrivateAppLayout>
  );
}