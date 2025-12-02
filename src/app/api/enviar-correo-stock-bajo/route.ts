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

    // Filtrar productos con stock bajo según umbral
    const productosBajoStock = (productos as ProductoRelaciones[]).flatMap((producto) => {
      const productoVariantes = (variantes as Variante[]).filter(v => v.producto_id === producto.id);
      const stockTotal = productoVariantes.reduce((sum, v) => sum + (v.stock_actual ?? 0), 0);
      const variantesConStockBajo = productoVariantes.filter(v => (v.stock_actual ?? 0) <= umbral);

      if (variantesConStockBajo.length === 0) return [];

      return [{
        id: producto.id,
        nombre: `${getNombre(producto.disenos)} ${getNombre(producto.tipos_prenda)} ${getNombre(producto.colores)}`.trim(),
        diseno: getNombre(producto.disenos),
        tipo_prenda: getNombre(producto.tipos_prenda),
        color: getNombre(producto.colores) || 'Sin color',
        stock_total: stockTotal,
        variantes_bajo: variantesConStockBajo.map(v => ({
          id: v.id,
          talla: v.talla || 'N/A',
          stock_actual: v.stock_actual || 0
        })),
        total_variantes: productoVariantes.length
      }];
    });

    // Preparar Excel si se solicita
    const attachments: { filename: string; content: Buffer }[] = [];
    if (includeExcel && productosBajoStock.length > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stock Crítico');

      sheet.columns = [
        { header: 'Producto', key: 'nombre', width: 30 },
        { header: 'Diseño', key: 'diseno', width: 20 },
        { header: 'Tipo', key: 'tipo_prenda', width: 20 },
        { header: 'Color', key: 'color', width: 15 },
        { header: 'Stock Total', key: 'stock_total', width: 15 },
        { header: 'Tallas con stock bajo', key: 'tallas', width: 30 },
      ];

      productosBajoStock.forEach(p => {
        sheet.addRow({
          nombre: p.nombre,
          diseno: p.diseno,
          tipo_prenda: p.tipo_prenda,
          color: p.color,
          stock_total: p.stock_total,
          tallas: p.variantes_bajo.map(v => `${v.talla}:${v.stock_actual}`).join('; '),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_bajo_${new Date().toISOString().split('T')[0]}.xlsx`,
        content: Buffer.from(buffer)
      });
    }

    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Taller Serigrafía <noreply@titanserigrafia.com>',
      to: [to],
      subject: subject || `🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>🚨 ALERTA DE STOCK CRÍTICO (≤ ${umbral})</h1>
          <p>${message}</p>
          ${productosBajoStock.length > 0 ? `
            <h2>📋 Productos con stock bajo:</h2>
            <ul>
              ${productosBajoStock.map((p, i) => `
                <li>
                  <strong>${i + 1}. ${p.nombre}</strong> — Total: ${p.stock_total}<br/>
                  Tallas críticas: ${p.variantes_bajo.map(v => `${v.talla}:${v.stock_actual}`).join(', ')}
                </li>
              `).join('')}
            </ul>
          ` : '<p>No hay productos con stock bajo.</p>'}
        </div>
      `,
      attachments: attachments.length > 0 ? attachments.map(a => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })) : undefined
    });

    return NextResponse.json({ success: true, message: 'Alerta enviada correctamente', totalProductosCriticos: productosBajoStock.length });

  } catch (err) {
    console.error('Error en endpoint de alerta de stock:', err);
    return NextResponse.json({ success: false, message: (err as Error).message || 'Error desconocido' }, { status: 500 });
  }
}
