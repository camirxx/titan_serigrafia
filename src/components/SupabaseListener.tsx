// src/components/SupabaseListener.tsx
"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function SupabaseListener() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const firing = useRef(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Debounce para evitar loops si el estado emite eventos sucesivos
      if (firing.current) return;
      firing.current = true;
      router.refresh();           // 🔁 refresca datos server sin recargar toda la página
      setTimeout(() => (firing.current = false), 500);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase, router]);

  return null;
}
