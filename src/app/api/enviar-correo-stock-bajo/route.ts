// src/app/api/enviar-correo-stock-bajo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from 'resend';
import ExcelJS from 'exceljs';



export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, includeExcel } = await request.json();

    if (!to || !message) {
        return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 });
    }
    
 // Extraer cantidad de productos y umbral del mensaje
    const totalMatch = message.match(/Se detectaron (\d+) productos/);
    const umbralMatch = message.match(/≤ (\d+)\)/);
    const totalProductos = totalMatch ? parseInt(totalMatch[1]) : 0;
    const umbral = umbralMatch ? parseInt(umbralMatch[1]) : 1;
   
   // === GENERAR EXCEL PERFECTO (como tu foto) ===
    const attachments: { filename: string; content: string }[] = [];

   if (includeExcel && totalProductos > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Stock Crítico', {
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      sheet.columns = [   { 
        
        header: 'Producto', key: 'producto', width: 40 },
        { header: 'Diseño', key: 'diseno', width: 22 },
        { header: 'Tipo', key: 'tipo', width: 18 },
        { header: 'Color', key: 'color', width: 14 },
        { header: 'Stock Total', key: 'total', width: 12 },
        { header: 'S', key: 'S', width: 8 },
        { header: 'M', key: 'M', width: 8 },
        { header: 'L', key: 'L', width: 8 },
        { header: 'XL', key: 'XL', width: 8 },
        { header: 'XXL', key: 'XXL', width: 9 },
        { header: 'XXXL', key: 'XXXL', width: 9 },
      
      ];  
     
 // Header violeta
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

 const lineas = message.split('\n');
      let productoCompleto = '';
      let diseno = '';
      let tipo = '';
      let color = '';
      let stockTotal = 0;
      let tallas: Record<string, number> = {}; // ← ahora se reinicia bien

      for (const linea of lineas) {
        const trimmed = linea.trim();

        // Nuevo producto: "1. TRUENO NEGRO - poleron canguro (NEGRO)"
        if (/^\d+\.\s/.test(linea)) {

           // Guardar fila anterior si existe
          if (productoCompleto) {
            const row = sheet.addRow({
              producto: productoCompleto,
              diseno,
              tipo,
              color,
              total: stockTotal,
              S: tallas['S'] ?? '',
              M: tallas['M'] ?? '',
              L: tallas['L'] ?? '',
              XL: tallas['XL'] ?? '',
              XXL: tallas['XXL'] ?? '',
              XXXL: tallas['XXXL'] ?? '',
            });

            // Pintar celdas críticas de rojo
            (['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const).forEach((t) => {
              const cell = row.getCell(t);
              const valor = tallas[t];
              if (valor !== undefined && valor <= umbral) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFECACA' }
                };
                cell.font = { bold: true, color: { argb: 'FFDC2626' } };
              }
            });
          }

          // Reiniciar para nuevo producto
          const texto = linea.replace(/^\d+\.\s*/, '').trim();
          const match = texto.match(/^(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/);
          if (match) {
            diseno = match[1].trim();
            tipo = match[2].trim();
            color = match[3].trim();
          }

      productoCompleto = texto;
          stockTotal = 0;
          tallas = {}; // ← reiniciado correctamente
        }

        // Stock total
        else if (trimmed.startsWith('Stock total:')) {
          stockTotal = parseInt(trimmed.match(/(\d+)/)?.[1] || '0');
        }

        // Tallas: "S: 1, M: 2, L: 1"
        else if (trimmed.startsWith('Tallas:')) {
          const parteTallas = trimmed.replace('Tallas:', '').trim();
          parteTallas.split(',').forEach((item: string) => {
            const parts = item.trim().split(':').map((s: string) => s.trim());
            const talla = parts[0];
            const stockStr = parts[1] || '';
            const stock = parseInt(stockStr.replace(/[^\d]/g, '')) || 0;
            if (talla) {
              tallas[talla.toUpperCase()] = stock;
            }
          });
        }
      }


       // Última fila
      if (productoCompleto) {
        const row = sheet.addRow({
          producto: productoCompleto,
          diseno, tipo, color, total: stockTotal,
          S: tallas['S'] ?? '',
          M: tallas['M'] ?? '',
          L: tallas['L'] ?? '',
          XL: tallas['XL'] ?? '',
          XXL: tallas['XXL'] ?? '',
          XXXL: tallas['XXXL'] ?? '',
        });

        (['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const).forEach((t) => {
          const cell = row.getCell(t);
          const valor = tallas[t];
          if (valor !== undefined && valor <= umbral) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            cell.font = { bold: true, color: { argb: 'FFDC2626' } };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_critico_${new Date().toISOString().slice(0,10)}.xlsx`,
        content: Buffer.from(buffer).toString('base64'),
      });
    }

     // === EMAIL (hermoso como siempre) ===
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">
        <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); color: white; padding: 35px; text-align: center;">
          <h1 style="margin:0; font-size:32px; font-weight:bold;">Notificación de Stock Crítico</h1>
          <p style="margin:10px 0 0; font-size:18px; opacity:0.9;">Productos con bajo inventario</p>
        </div>

 <div style="padding: 35px; background: #fafaff;">
          <div style="text-align:center; margin-bottom:35px;">


<div style="font-size:64px; font-weight:900; color:#DC2626;">${totalProductos}</div>
            <div style="font-size:22px; color:#374151; font-weight:600;">productos con stock crítico</div>
          </div>
            <div style="background:white; padding:30px; border-radius:14px; border:1px solid #e2e8f0;">
            <pre style="margin:0; font-size:15.5px; line-height:2; color:#1f2937; white-space:pre-wrap; font-family: 'Courier New', monospace;">
${message.trim()}
            </pre>
          </div>
             <div style="margin-top:30px; padding:18px; background:#FFFBEB; border-left:6px solid #F59E0B; border-radius:10px;">
               <p style="margin:0; color:#92400E; font-size:15px;">
              <strong>Nota:</strong> Las tallas marcadas con advertencia tienen stock igual o menor al umbral seleccionado.
            </p>
          </div>
        </div>
         <div style="text-align:center; padding:25px; background:#f1f5f9; color:#64748b; font-size:13px;">
          <p style="margin:0;">Taller Serigrafía • Sistema de Gestión de Inventario</p>
          <p style="margin:8px 0 0;">${new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'Taller Serigrafía <noreply@titanserigrafia.com>',
      to: [to],
      subject: subject || `ALERTA STOCK CRÍTICO - ${totalProductos} productos`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
       return NextResponse.json({ success: true, totalProductosCriticos: totalProductos });

  } catch (err) {
    console.error('Error enviando alerta:', err);
      return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}