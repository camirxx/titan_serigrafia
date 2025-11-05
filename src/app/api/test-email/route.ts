import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simular envío de correo de prueba
    const testData = {
      devolucionId: 999,
      rut: '12.345.678-9',
      nombre: 'Usuario de Prueba',
      banco: 'Banco Estado',
      tipoCuenta: 'corriente',
      numeroCuenta: '12345678',
      email: 'test@example.com',
      monto: 50000,
      tipo: 'devolucion',
    };

    const emailContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🧪 CORREO DE PRUEBA - Titan Serigrafía</h2>
              <p>Esta es una prueba del sistema de envío de correos</p>
            </div>

            <div class="content">
              <div class="highlight">
                <strong>✅ Prueba Exitosa:</strong> El sistema de envío de correos está funcionando correctamente
              </div>

              <h3>📋 Datos de Prueba</h3>
              <p><strong>ID Devolución:</strong> #${testData.devolucionId}</p>
              <p><strong>Cliente:</strong> ${testData.nombre}</p>
              <p><strong>RUT:</strong> ${testData.rut}</p>
              <p><strong>Banco:</strong> ${testData.banco}</p>
              <p><strong>Monto:</strong> $${testData.monto.toLocaleString('es-CL')}</p>

              <p style="margin-top: 30px; color: #666;">
                Este correo fue enviado desde la aplicación real de Titan Serigrafía.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.log('❌ [TEST-EMAIL] RESEND_API_KEY no está configurada');
      return NextResponse.json({
        error: 'RESEND_API_KEY no está configurada',
        status: 'error'
      }, { status: 500 });
    }

    // Verificar formato de API key
    if (!RESEND_API_KEY.startsWith('re_')) {
      console.log('❌ [TEST-EMAIL] Formato de API key inválido');
      return NextResponse.json({
        error: 'Formato de API key inválido',
        status: 'error'
      }, { status: 500 });
    }

    console.log('✅ [TEST-EMAIL] API Key configurada correctamente');

    console.log('🧪 [TEST-EMAIL] Enviando correo de prueba...');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Titan Serigrafía <delivered@resend.dev>',
        to: ['dy.soto04@gmail.com'],
        subject: `🧪 TEST - Sistema de Correos Titan Serigrafía`,
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [TEST-EMAIL] Error:', errorData);
      return NextResponse.json({
        error: 'Error al enviar correo de prueba',
        details: errorData,
        status: 'error'
      }, { status: 500 });
    }

    const responseData = await response.json();
    console.log('✅ [TEST-EMAIL] Correo de prueba enviado:', responseData.id);

    return NextResponse.json({
      success: true,
      message: 'Correo de prueba enviado exitosamente',
      emailId: responseData.id,
      status: 'success'
    });

  } catch (error) {
    console.error('Error en test-email:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        status: 'error'
      },
      { status: 500 }
    );
  }
}
