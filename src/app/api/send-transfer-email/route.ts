import { NextRequest, NextResponse } from 'next/server';
import { formatearFechaHoraChile } from '@/lib/fechaUtils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      devolucionId,
      rut,
      nombre,
      banco,
      tipoCuenta,
      numeroCuenta,
      email,
      monto,
      tipo,
    } = body;

    // Validar datos requeridos
    if (!rut || !nombre || !banco || !numeroCuenta || !monto) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos para la transferencia' },
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
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .data-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #667eea; }
            .value { margin-left: 10px; }
            .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🏦 Nueva Solicitud de Transferencia - Devolución</h2>
              <p>Se ha registrado una ${tipo === 'devolucion' ? 'devolución' : 'cambio'} que requiere transferencia bancaria</p>
            </div>
            
            <div class="content">
              <div class="highlight">
                <strong>⚠️ Acción Requerida:</strong> Realizar transferencia bancaria al cliente
              </div>

              <h3>📋 Datos de la Operación</h3>
              <div class="data-row">
                <span class="label">ID Devolución:</span>
                <span class="value">#${devolucionId}</span>
              </div>
              <div class="data-row">
                <span class="label">Tipo:</span>
                <span class="value">${tipo === 'devolucion' ? '📦 Devolución' : '🔄 Cambio'}</span>
              </div>
              <div class="data-row">
                <span class="label">Monto a Transferir:</span>
                <span class="value" style="font-size: 18px; color: #28a745; font-weight: bold;">$${monto.toLocaleString('es-CL')}</span>
              </div>

              <h3>👤 Datos del Cliente</h3>
              <div class="data-row">
                <span class="label">RUT:</span>
                <span class="value">${rut}</span>
              </div>
              <div class="data-row">
                <span class="label">Nombre:</span>
                <span class="value">${nombre}</span>
              </div>
              ${email ? `
              <div class="data-row">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              ` : ''}

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

              <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-radius: 4px;">
                <p style="margin: 0;"><strong>📝 Nota:</strong> Una vez realizada la transferencia, marca la devolución como "Transferido" en el sistema.</p>
              </div>
            </div>

            <div class="footer">
              <p>Este es un correo automático generado por el sistema de gestión Titan Serigrafía</p>
              <p>Fecha: ${formatearFechaHoraChile(new Date())}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Aquí usaremos Resend para enviar el correo
    // Necesitarás instalar: npm install resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY no está configurada');
      // Por ahora, solo logueamos el error pero no fallamos la operación
      return NextResponse.json({ 
        success: true, 
        message: 'Devolución registrada (correo pendiente de configuración)' 
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Titan Serigrafía <onboarding@resend.dev>',
        to: ['dy.soto04@gmail.com'],
        subject: `🏦 Nueva Transferencia Pendiente - Devolución #${devolucionId}`,
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al enviar correo:', errorData);
      return NextResponse.json({ 
        success: true, 
        message: 'Devolución registrada (error al enviar correo)' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Correo enviado exitosamente' 
    });

  } catch (error) {
    console.error('Error en send-transfer-email:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
