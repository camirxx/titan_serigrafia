import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      devolucionId,
      banco,
      tipoCuenta,
      numeroCuenta,
      email,
      monto,
      tipo,
    } = body;

    console.log('🚀 [SEND-CONFIRMATION-EMAIL] Recibida solicitud para confirmar devolución:', devolucionId);

    // Validar datos requeridos
    if (!email || !monto) {
      console.log('❌ [SEND-CONFIRMATION-EMAIL] Datos faltantes:', { email: !!email, monto: !!monto });
      return NextResponse.json(
        { error: 'Faltan datos requeridos para el envío de confirmación' },
        { status: 400 }
      );
    }

    // Construir el contenido del correo
    const emailContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .data-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #28a745; }
            .value { margin-left: 10px; }
            .highlight { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Reembolso Realizado - Devolución #${devolucionId}</h2>
              <p>Su ${tipo === 'devolucion' ? 'devolución' : 'cambio'} ha sido procesado exitosamente</p>
            </div>

            <div class="content">
              <div class="highlight">
                <strong>🎉 ¡Buenas noticias!</strong> Hemos realizado la transferencia bancaria correspondiente a su reembolso.
              </div>

              <h3>📋 Detalles de la Operación</h3>
              <div class="data-row">
                <span class="label">ID Devolución:</span>
                <span class="value">#${devolucionId}</span>
              </div>
              <div class="data-row">
                <span class="label">Tipo:</span>
                <span class="value">${tipo === 'devolucion' ? '📦 Devolución' : '🔄 Cambio'}</span>
              </div>
              <div class="data-row">
                <span class="label">Monto Reembolsado:</span>
                <span class="value" style="font-size: 18px; color: #28a745; font-weight: bold;">$${monto.toLocaleString('es-CL')}</span>
              </div>

              <h3>🏦 Datos Bancarios</h3>
              <div class="data-row">
                <span class="label">Banco:</span>
                <span class="value">${banco}</span>
              </div>
              <div class="data-row">
                <span class="label">Tipo de Cuenta:</span>
                <span class="value">${tipoCuenta === 'corriente' ? 'Cuenta Corriente' : tipoCuenta === 'vista' ? 'Cuenta Vista' : 'Cuenta de Ahorro'}</span>
              </div>
              <div class="data-row">
                <span class="label">Número de Cuenta:</span>
                <span class="value" style="font-weight: bold; font-size: 16px;">${numeroCuenta}</span>
              </div>

              <div class="warning">
                <p style="margin: 0;"><strong>⚠️ Importante:</strong> Por favor revise su cuenta bancaria para verificar que el depósito haya sido acreditado correctamente.</p>
                <p style="margin: 10px 0 0 0;">Si no ve el depósito en las próximas 24-48 horas hábiles, o si tiene alguna duda, por favor contáctenos al correo: <strong>contacto@titanserigrafia.com</strong></p>
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
                <p style="margin: 0;"><strong>📞 Soporte:</strong> Si necesita asistencia adicional, no dude en contactarnos.</p>
              </div>
            </div>

            <div class="footer">
              <p>Este es un correo automático generado por el sistema de gestión Titan Serigrafía</p>
              <p>Fecha: ${new Date().toLocaleString('es-CL')}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Aquí usaremos Resend para enviar el correo
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.log('❌ [SEND-CONFIRMATION-EMAIL] RESEND_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'RESEND_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    // Verificar formato de API key
    if (!RESEND_API_KEY.startsWith('re_')) {
      console.log('❌ [SEND-CONFIRMATION-EMAIL] Formato de API key inválido');
      return NextResponse.json(
        { error: 'Formato de API key inválido' },
        { status: 500 }
      );
    }

    console.log('✅ [SEND-CONFIRMATION-EMAIL] API Key configurada correctamente');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },

body: JSON.stringify({
  from: 'Titan Serigrafía <noreply@titanserigrafia.com>', // Tu nuevo dominio
  to: [email], // Email del cliente
  subject: `✅ Reembolso Realizado - Devolución #${devolucionId} - Titan Serigrafía`,
  html: emailContent,
}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [SEND-CONFIRMATION-EMAIL] Error al enviar correo:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Error al enviar correo de confirmación'
      });
    }

    const responseData = await response.json();
    console.log('✅ [SEND-CONFIRMATION-EMAIL] Correo enviado exitosamente para devolución:', devolucionId, '- ID Email:', responseData.id);

    return NextResponse.json({
      success: true,
      message: 'Correo de confirmación enviado exitosamente'
    });

  } catch (error) {
    console.error('Error en send-confirmation-email:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
