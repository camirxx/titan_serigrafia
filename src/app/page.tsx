// src/app/(home)/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';
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

  return (
    <HomeClient 
      userRole={userData.rol} 
      userName={userData.nombre || session.user.email || 'Usuario'} 
    />
  );
}