import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface ProductoConStockBajo {
  id: string;
  nombre: string;
  diseno: string;
  tipo_prenda: string;
  color: string;
  stock_total: number;
  variantes_bajo: Array<{
    id: string;
    talla: string;
    stock_actual: number;
  }>;
  total_variantes: number;
}

interface Variante {
  id: string;
  producto_id: string;
  talla: string | null;
  stock_actual: number | null;
}

interface ProductoRelaciones {
  id: string;
  disenos: Array<{ nombre: string }> | { nombre: string } | null;
  tipos_prenda: Array<{ nombre: string }> | { nombre: string } | null;
  colores: Array<{ nombre: string }> | { nombre: string } | null;
  activo: boolean;
}

interface EmailAttachment {
  filename: string;
  content: string;
}

// Helper para obtener nombre de relación (puede ser array o objeto)
function getNombre(relacion: Array<{ nombre: string }> | { nombre: string } | null): string {
  if (!relacion) return '';
  if (Array.isArray(relacion)) {
    return relacion[0]?.nombre || '';
  }
  return relacion.nombre || '';
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

    // Obtener productos activos con sus relaciones
    const { data: productos, error } = await supabase
      .from("productos")
      .select(`
        id,
        disenos!inner(nombre),
        tipos_prenda!inner(nombre),
        colores(nombre),
        activo
      `)
      .eq("activo", true);

    if (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { success: false, message: "Error al obtener productos de stock bajo" },
        { status: 500 }
      );
    }

    // Obtener todas las variantes para estos productos
    const productoIds = productos?.map((p: Record<string, unknown>) => p.id) || [];
    const { data: variantes, error: errorVariantes } = await supabase
      .from("variantes")
      .select("id, producto_id, talla, stock_actual")
      .in("producto_id", productoIds);

    if (errorVariantes) {
      console.error('Error al obtener variantes:', errorVariantes);
      return NextResponse.json(
        { success: false, message: "Error al obtener variantes de productos" },
        { status: 500 }
      );
    }

    // Filtrar productos con stock bajo (<= 5 unidades)
    const productosBajoStock: ProductoConStockBajo[] = [];
    
    (productos as ProductoRelaciones[])?.forEach((producto) => {
      const productoVariantes = (variantes as Variante[])?.filter(v => v.producto_id === producto.id) || [];
      const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual ?? 0), 0);
      
      // Buscar variantes con stock bajo
      const variantesConStockBajo = productoVariantes.filter(v => (v.stock_actual ?? 0) <= 5);
      
      if (variantesConStockBajo.length > 0) {
        const diseno = getNombre(producto.disenos);
        const tipo = getNombre(producto.tipos_prenda);
        const color = getNombre(producto.colores);
        
        productosBajoStock.push({
          id: producto.id,
          nombre: `${diseno} ${tipo} ${color || ''}`.trim(),
          diseno: diseno || '',
          tipo_prenda: tipo || '',
          color: color || 'Sin color',
          stock_total: stockTotal,
          variantes_bajo: variantesConStockBajo.map(v => ({
            id: v.id,
            talla: v.talla || 'N/A',
            stock_actual: v.stock_actual || 0
          })),
          total_variantes: productoVariantes.length
        });
      }
    });

    // Enviar email real con Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY no está configurada');
      return NextResponse.json(
        { success: false, message: "Error de configuración: RESEND_API_KEY no está configurada. Por favor, configura la variable de entorno." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Preparar datos para el archivo Excel si se solicita
    const attachments: EmailAttachment[] = [];
    
    if (includeExcel && productosBajoStock && productosBajoStock.length > 0) {
      // Crear contenido CSV simple
      const csvContent = [
        ['Producto', 'Diseño', 'Tipo', 'Color', 'Stock Total', 'Tallas Bajo Stock'],
        ...productosBajoStock.map((producto) => [
          producto.nombre || 'N/A',
          producto.diseno || 'N/A',
          producto.tipo_prenda || 'N/A',
          producto.color || 'N/A',
          producto.stock_total.toString(),
          producto.variantes_bajo.map(v => `${v.talla}:${v.stock_actual}`).join('; ')
        ])
      ].map(row => row.join(',')).join('\n');

      attachments.push({
        filename: `stock_bajo_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
      });
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'Taller Serigrafía <noreply@titanserigrafia.cl>',
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
                  ${productosBajoStock.map((producto, index) => `
                    <div style="border-bottom: ${index < productosBajoStock.length - 1 ? '1px solid #ffeaa7' : 'none'}; padding: ${index < productosBajoStock.length - 1 ? '15px 0' : '15px 0 0'};">
                      <h3 style="margin: 0 0 10px 0; color: #856404;">
                        ${index + 1}. ${producto.nombre || 'Sin nombre'}
                      </h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                        <div><strong>Diseño:</strong> ${producto.diseno || 'N/A'}</div>
                        <div><strong>Tipo:</strong> ${producto.tipo_prenda || 'N/A'}</div>
                        <div><strong>Color:</strong> ${producto.color || 'N/A'}</div>
                        <div><strong>Stock Total:</strong> <span style="color: #dc3545; font-weight: bold;">${producto.stock_total} unidades</span></div>
                      </div>
                      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ffeaa7;">
                        <strong style="color: #856404;">Tallas con stock bajo:</strong>
                        <ul style="margin: 5px 0 0 20px; padding: 0;">
                          ${producto.variantes_bajo.map(v => `<li>${v.talla}: ${v.stock_actual} unidades</li>`).join('')}
                        </ul>
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
