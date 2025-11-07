import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { monto, motivo, usuario } = body;

    console.log('💸 [SEND-CAJA-EGRESO-EMAIL] Enviando notificación de egreso:', { monto, motivo, usuario });

    // Validar datos requeridos
    if (!monto || !motivo) {
      console.log('❌ [SEND-CAJA-EGRESO-EMAIL] Datos faltantes:', { monto: !!monto, motivo: !!motivo });
      return NextResponse.json(
        { error: 'Faltan datos requeridos para el envío de notificación de egreso' },
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
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .data-row { margin: 10px 0; padding: 15px; background: white; border-radius: 4px; border-left: 4px solid #dc3545; }
            .label { font-weight: bold; color: #dc3545; }
            .value { margin-left: 10px; font-size: 16px; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>💸 EGRESO DE CAJA REGISTRADO</h2>
              <p>Notificación automática del sistema Titan Serigrafía</p>
            </div>

            <div class="content">
              <div class="warning">
                <strong>⚠️ ATENCIÓN:</strong> Se ha registrado un egreso de efectivo en el sistema de caja.
              </div>

              <h3>📋 Detalles del Egreso</h3>
              <div class="data-row">
                <span class="label">Monto:</span>
                <span class="value" style="color: #dc3545; font-weight: bold; font-size: 18px;">$${monto.toLocaleString('es-CL')}</span>
              </div>
              <div class="data-row">
                <span class="label">Motivo:</span>
                <span class="value">${motivo}</span>
              </div>
              <div class="data-row">
                <span class="label">Usuario:</span>
                <span class="value">${usuario || 'Sistema'}</span>
              </div>
              <div class="data-row">
                <span class="label">Fecha y Hora:</span>
                <span class="value">${new Date().toLocaleString('es-CL')}</span>
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
                <p style="margin: 0;"><strong>📊 Sistema:</strong> Este egreso ha sido registrado automáticamente en el sistema de caja.</p>
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

    // Usar Resend para enviar el correo
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.log('❌ [SEND-CAJA-EGRESO-EMAIL] RESEND_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'RESEND_API_KEY no está configurada' },
        { status: 500 }
      );
    }

    console.log('✅ [SEND-CAJA-EGRESO-EMAIL] API Key configurada correctamente');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Titan Serigrafía <delivered@resend.dev>',
        to: ['dy.soto04@gmail.com'],
        subject: `💸 Egreso de Caja Registrado - $${monto.toLocaleString('es-CL')} - Titan Serigrafía`,
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [SEND-CAJA-EGRESO-EMAIL] Error al enviar correo:', errorData);
      return NextResponse.json({
        success: false,
        message: 'Error al enviar correo de notificación de egreso'
      });
    }

    const responseData = await response.json();
    console.log('✅ [SEND-CAJA-EGRESO-EMAIL] Correo enviado exitosamente - ID Email:', responseData.id);

    return NextResponse.json({
      success: true,
      message: 'Correo de notificación de egreso enviado exitosamente'
    });

  } catch (error) {
    console.error('Error en send-caja-egreso-email:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
