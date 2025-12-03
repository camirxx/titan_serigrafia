import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server only
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      );
    }

    // Usar el método estándar de Supabase para enviar email de reseteo
    // Esto generará el enlace y lo enviará automáticamente
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nueva-contrasena`,
    });

    if (error) {
      console.error("Error sending reset email:", error);
      // Fallback: usar el método estándar de Supabase
      const { error: fallbackError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/nueva-contrasena`,
      });

      if (fallbackError) {
        console.error("Error sending fallback reset email:", fallbackError);
        return NextResponse.json(
          { error: "No se pudo enviar el email de reseteo" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Email de reseteo enviado correctamente" },
        { status: 200 }
      );
    }

    // Opcional: intentar enviar nuestro email personalizado como complemento
    // pero sin depender de él para la funcionalidad principal
    // TEMPORALMENTE DESACTIVADO PARA PROBAR SOLO CON SUPABASE
    /*
    try {
      // Generar un enlace base para nuestro email personalizado
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const customResetLink = `${baseUrl}/nueva-contrasena?email=${encodeURIComponent(email)}`;
      
      // Enviar nuestro email personalizado de forma asíncrona (no bloqueante)
      fetch(`${baseUrl}/api/auth/send-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          resetLink: customResetLink
        }),
      }).catch(err => {
        // Ignorar errores del email personalizado ya que el principal ya fue enviado
        console.log("Custom email failed, but main email was sent:", err);
      });
    } catch (customEmailError) {
      // Ignorar errores del email personalizado
      console.log("Custom email error, but main email was sent:", customEmailError);
    }
    */

    return NextResponse.json(
      { message: "Email de reseteo enviado correctamente" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
