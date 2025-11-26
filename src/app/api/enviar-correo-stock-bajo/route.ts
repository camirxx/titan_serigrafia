import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface Producto {
  id: string;
  nombre: string | null;
  stock: number | null;
  codigo: string | null;
  precio: number | null;
}

interface EmailAttachment {
  filename: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { to, subject, message, includeExcel } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos (destinatario y mensaje)" },
        { status: 400 }
      );
    }

    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener productos con stock bajo (stock < 10)
    const { data: productosBajoStock, error } = await supabase
      .from('productos')
      .select('*')
      .lt('stock', 10)
      .order('stock', { ascending: true });

    if (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { success: false, message: "Error al obtener productos de stock bajo" },
        { status: 500 }
      );
    }

    // Enviar email real con Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Preparar datos para el archivo Excel si se solicita
    const attachments: EmailAttachment[] = [];
    
    if (includeExcel && productosBajoStock && productosBajoStock.length > 0) {
      // Crear contenido CSV simple
      const csvContent = [
        ['Producto', 'Stock Actual', 'Código', 'Precio'],
        ...productosBajoStock.map((producto: Producto) => [
          producto.nombre || 'N/A',
          producto.stock?.toString() || '0',
          producto.codigo || 'N/A',
          producto.precio?.toString() || '0'
        ])
      ].map(row => row.join(',')).join('\n');

      attachments.push({
        filename: `stock_bajo_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
      });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'Taller Serigrafía <noreply@titan-serigrafia.cl>',
        to: [to],
        subject: subject || '🚨 ALERTA DE STOCK CRÍTICO - Taller',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 ALERTA DE STOCK CRÍTICO</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Productos que necesitan reposición urgente</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; white-space: pre-line; line-height: 1.6;">${message}</p>
              </div>

              ${productosBajoStock && productosBajoStock.length > 0 ? `
                <h2 style="color: #dc3545; margin-bottom: 15px;">📋 Productos con Stock Bajo:</h2>
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  ${productosBajoStock.map((producto: Producto, index: number) => `
                    <div style="border-bottom: ${index < productosBajoStock.length - 1 ? '1px solid #ffeaa7' : 'none'}; padding: ${index < productosBajoStock.length - 1 ? '15px 0' : '15px 0 0'};">
                      <h3 style="margin: 0 0 10px 0; color: #856404;">
                        ${index + 1}. ${producto.nombre || 'Sin nombre'}
                      </h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        <div><strong>Stock actual:</strong> <span style="color: #dc3545; font-weight: bold;">${producto.stock || 0} unidades</span></div>
                        <div><strong>Código:</strong> ${producto.codigo || 'N/A'}</div>
                        <div><strong>Precio:</strong> $${producto.precio || 'N/A'}</div>
                      </div>
                    </div>
                  `).join('')}
                  
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ffeaa7;">
                    <strong style="color: #dc3545; font-size: 18px;">
                      📊 Total de productos críticos: ${productosBajoStock.length}
                    </strong>
                  </div>
                </div>
              ` : `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #155724;">✅ No se encontraron productos con stock bajo en este momento.</p>
                </div>
              `}

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  Enviado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}
                </p>
                <p style="color: #6c757d; font-size: 12px; margin: 5px 0 0 0;">
                  Sistema de Gestión - Taller Serigrafía
                </p>
              </div>
            </div>
          </div>
        `,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (error) {
        console.error('Error al enviar email con Resend:', error);
        return NextResponse.json(
          { success: false, message: "Error al enviar el email: " + error.message },
          { status: 500 }
        );
      }

      console.log("✅ Email enviado exitosamente:", data);

      return NextResponse.json({
        success: true,
        message: "Alerta de stock enviada correctamente por email",
        data: {
          to,
          subject,
          productosCriticos: productosBajoStock?.length || 0,
          includeExcel,
          emailId: data?.id,
          sentAt: new Date().toISOString(),
        }
      });

    } catch (emailError) {
      console.error('Error en el servicio de email:', emailError);
      return NextResponse.json(
        { success: false, message: "Error en el servicio de envío de email" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error en endpoint de alerta de stock:', error);
    return NextResponse.json(
      { success: false, message: "No se pudo procesar la alerta" },
      { status: 500 }
    );
  }
}
