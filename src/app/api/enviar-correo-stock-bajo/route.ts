// src/app/api/enviar-correo-stock-bajo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import ExcelJS from 'exceljs';

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
    const { to, subject, message, includeExcel, umbral } = body as {
      to: string;
      subject?: string;
      message: string;
      includeExcel: boolean;
      umbral: number;
    };

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos (destinatario y mensaje)" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener productos activos
    const { data: productos, error: errorProductos } = await supabase
      .from("productos")
      .select(`
        id,
        disenos!inner(nombre),
        tipos_prenda!inner(nombre),
        colores(nombre),
        activo
      `)
      .eq("activo", true);

    if (errorProductos) throw new Error(errorProductos.message);

    const productoIds = productos?.map((p: ProductoRelaciones) => p.id) || [];
    const { data: variantes, error: errorVariantes } = await supabase
      .from("variantes")
      .select("id, producto_id, talla, stock_actual")
      .in("producto_id", productoIds);

    if (errorVariantes) throw new Error(errorVariantes.message);

    // Filtrar productos que tengan AL MENOS UNA talla con stock <= umbral
    const productosBajoStock = (productos as ProductoRelaciones[])
      .map((producto) => {
        const productoVariantes = (variantes as Variante[]).filter(v => v.producto_id === producto.id);
        const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual ?? 0), 0);
        
        // Verificar si tiene al menos una variante con stock bajo
        const tieneStockBajo = productoVariantes.some(v => (v.stock_actual ?? 0) <= umbral);
        
        if (!tieneStockBajo) return null;

        // Ordenar tallas por el orden estándar
        const ordenTallas = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        const variantesOrdenadas = productoVariantes
          .map(v => ({
            id: v.id,
            talla: v.talla || 'N/A',
            stock_actual: v.stock_actual || 0,
            es_critico: (v.stock_actual ?? 0) <= umbral
          }))
          .sort((a, b) => {
            const indexA = ordenTallas.indexOf(a.talla);
            const indexB = ordenTallas.indexOf(b.talla);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });

        return {
          id: producto.id,
          nombre: `${getNombre(producto.disenos)} ${getNombre(producto.tipos_prenda)} ${getNombre(producto.colores)}`.trim(),
          diseno: getNombre(producto.disenos),
          tipo_prenda: getNombre(producto.tipos_prenda),
          color: getNombre(producto.colores) || 'Sin color',
          stock_total: stockTotal,
          todas_variantes: variantesOrdenadas,
          total_variantes: productoVariantes.length
        };
      })
      .filter(p => p !== null);

    // Preparar Excel si se solicita
    const attachments: { filename: string; content: Buffer }[] = [];
    if (includeExcel && productosBajoStock.length > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stock Crítico');

      sheet.columns = [
        { header: 'Producto', key: 'nombre', width: 35 },
        { header: 'Diseño', key: 'diseno', width: 20 },
        { header: 'Tipo', key: 'tipo_prenda', width: 20 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Stock Total', key: 'stock_total', width: 12 },
        { header: 'S', key: 's', width: 8 },
        { header: 'M', key: 'm', width: 8 },
        { header: 'L', key: 'l', width: 8 },
        { header: 'XL', key: 'xl', width: 8 },
        { header: 'XXL', key: 'xxl', width: 8 },
        { header: 'XXXL', key: 'xxxl', width: 8 },
      ];

      // Estilo para header
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' }
      };

      productosBajoStock.forEach(p => {
        const tallasMap: Record<string, number> = {};
        p.todas_variantes.forEach(v => {
          tallasMap[v.talla.toUpperCase()] = v.stock_actual;
        });

        const row = sheet.addRow({
          nombre: p.nombre,
          diseno: p.diseno,
          tipo_prenda: p.tipo_prenda,
          color: p.color,
          stock_total: p.stock_total,
          s: tallasMap['S'] ?? '-',
          m: tallasMap['M'] ?? '-',
          l: tallasMap['L'] ?? '-',
          xl: tallasMap['XL'] ?? '-',
          xxl: tallasMap['XXL'] ?? '-',
          xxxl: tallasMap['XXXL'] ?? '-',
        });

        // Aplicar color rojo a las celdas con stock crítico
        ['s', 'm', 'l', 'xl', 'xxl', 'xxxl'].forEach((key, index) => {
          const cellIndex = index + 6; // Columnas S-XXXL empiezan en la columna 6
          const cell = row.getCell(cellIndex);
          const value = cell.value as number | string;
          if (typeof value === 'number' && value <= umbral) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFECACA' }
            };
            cell.font = { bold: true, color: { argb: 'FFDC2626' } };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_critico_${new Date().toISOString().split('T')[0]}.xlsx`,
        content: Buffer.from(buffer)
      });
    }

    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Generar HTML del correo
    const generarHtmlCorreo = () => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #ffffff; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚨 ALERTA DE STOCK CRÍTICO</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Umbral: ≤ ${umbral} unidades</p>
          </div>
          
          <div style="padding: 30px; background: #F9FAFB;">
            ${message ? `<div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #7C3AED;">
              <p style="margin: 0; color: #374151;">${message}</p>
            </div>` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1F2937; margin-top: 0;">📊 Resumen</h2>
              <p style="font-size: 18px; color: #374151;">
                <strong style="color: #DC2626; font-size: 24px;">${productosBajoStock.length}</strong> productos con stock crítico detectados
              </p>
            </div>

            ${productosBajoStock.length > 0 ? `
              <div style="background: white; padding: 20px; border-radius: 8px;">
                <h2 style="color: #1F2937; margin-top: 0;">📋 Detalle de Productos</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #F3F4F6; border-bottom: 2px solid #E5E7EB;">
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #6B7280;">#</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #6B7280;">Producto</th>
                      <th style="padding: 12px; text-align: center; font-size: 14px; color: #6B7280;">Stock Total</th>
                      <th style="padding: 12px; text-align: left; font-size: 14px; color: #6B7280;">Tallas</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productosBajoStock.map((p, i) => `
                      <tr style="border-bottom: 1px solid #E5E7EB;">
                        <td style="padding: 12px; color: #6B7280;">${i + 1}</td>
                        <td style="padding: 12px;">
                          <div style="font-weight: 600; color: #1F2937;">${p.nombre}</div>
                          <div style="font-size: 12px; color: #6B7280;">${p.tipo_prenda}</div>
                        </td>
                        <td style="padding: 12px; text-align: center; font-weight: 600; color: #1F2937;">${p.stock_total}</td>
                        <td style="padding: 12px;">
                          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${p.todas_variantes.map(v => `
                              <span style="
                                display: inline-block;
                                padding: 4px 10px;
                                border-radius: 6px;
                                font-size: 13px;
                                font-weight: 500;
                                ${v.es_critico 
                                  ? 'background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5;' 
                                  : 'background: #E0E7FF; color: #4338CA; border: 1px solid #C7D2FE;'}
                              ">
                                ${v.talla}: ${v.stock_actual}
                              </span>
                            `).join('')}
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div style="background: white; padding: 20px; border-radius: 8px; text-align: center; color: #6B7280;">No hay productos con stock bajo.</div>'}
            
            <div style="margin-top: 20px; padding: 15px; background: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>⚠️ Nota:</strong> Los productos marcados en rojo tienen tallas con stock igual o menor a ${umbral} unidades.
              </p>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0;">Taller Serigrafía - Sistema de Gestión de Inventario</p>
            <p style="margin: 5px 0 0 0;">Correo generado automáticamente el ${new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      `;
      return html;
    };

    await resend.emails.send({
      from: 'Taller Serigrafía <noreply@titanserigrafia.com>',
      to: [to],
      subject: subject || `🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral}) - ${productosBajoStock.length} productos`,
      html: generarHtmlCorreo(),
      attachments: attachments.length > 0 ? attachments.map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })) : undefined
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Alerta enviada correctamente', 
      totalProductosCriticos: productosBajoStock.length 
    });

  } catch (err) {
    console.error('Error en endpoint de alerta de stock:', err);
    return NextResponse.json({ 
      success: false, 
      message: (err as Error).message || 'Error desconocido' 
    }, { status: 500 });
  }
}