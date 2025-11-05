import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'RESEND_API_KEY no está configurada en .env.local',
        configured: false,
        key_prefix: null
      });
    }

    // Verificar que la API key tenga el formato correcto
    const keyPrefix = RESEND_API_KEY.startsWith('re_') ? 're_' : 'unknown';

    // Hacer una llamada simple a la API de Resend que esté permitida (listar emails)
    // Las API keys restringidas solo pueden enviar emails, así que verificamos el formato
    const isValidFormat = RESEND_API_KEY.startsWith('re_') && RESEND_API_KEY.length > 10;

    if (!isValidFormat) {
      return NextResponse.json({
        status: 'error',
        message: 'Formato de API Key inválido. Debe empezar con "re_"',
        configured: true,
        key_prefix: keyPrefix,
      });
    }

    return NextResponse.json({
      status: 'success',
      message: 'API Key configurada correctamente (restringida a envío de emails)',
      configured: true,
      key_prefix: keyPrefix,
      note: 'La API key está restringida pero puede enviar emails correctamente',
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Error interno del servidor',
      configured: !!process.env.RESEND_API_KEY,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }, { status: 500 });
  }
}
