import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, resetLink } = await request.json();

    if (!email || !resetLink) {
      return NextResponse.json(
        { error: "Email y enlace de reseteo son requeridos" },
        { status: 400 }
      );
    }

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña - Titan Serigrafía</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .title {
            color: #374151;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: #1f2937;
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .button:hover {
            background: #374151;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .security-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #92400e;
        }
        .expiry-notice {
            color: #6b7280;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎨 Titan Serigrafía</div>
            <h1 class="title">Recuperación de Contraseña</h1>
        </div>
        
        <div class="content">
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Titan Serigrafía.</p>
            
            <div class="security-notice">
                <strong>🔒 Por tu seguridad:</strong> Si no solicitaste este cambio, puedes ignorar este email. Tu cuenta seguirá siendo segura.
            </div>
            
            <p>Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
            
            <a href="${resetLink}" class="button">
                Restablecer Contraseña
            </a>
            
            <p class="expiry-notice">
                ⏰ Este enlace expirará en 24 horas por razones de seguridad.
            </p>
            
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #1f2937; background: #f9fafb; padding: 10px; border-radius: 6px;">
                ${resetLink}
            </p>
        </div>
        
        <div class="footer">
            <p><strong>¿Necesitas ayuda?</strong></p>
            <p>Si tienes problemas para acceder a tu cuenta, contáctanos:</p>
            <p>Email: soporte@titan-serigrafia.cl</p>
            <p>Teléfono: +56 9 1234 5678</p>
            <br>
            <p style="font-size: 12px; color: #9ca3af;">
                Este es un email automático de Titan Serigrafía. Por favor no respondas a este mensaje.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Titan Serigrafía <noreply@titan-serigrafia.cl>',
      to: [email],
      subject: '🔐 Recupera tu contraseña - Titan Serigrafía',
      html: emailContent,
    });

    if (error) {
      console.error("Error sending custom reset email:", error);
      return NextResponse.json(
        { error: "No se pudo enviar el email de reseteo" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: "Email de reseteo enviado correctamente",
        messageId: data?.id 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Send reset email error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
