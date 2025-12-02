// src/app/api/enviar-correo-stock-bajo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, includeExcel } = body as {
      to: string;
      subject: string;
      message: string;
      includeExcel: boolean;
    };

    if (!to || !message) {
      return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 });
    }

<<<<<<< HEAD
    const totalMatch = message.match(/Se detectaron (\d+) productos/);
    const umbralMatch = message.match(/≤ (\d+)\)/);
    const totalProductos = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    const umbral = umbralMatch ? parseInt(umbralMatch[1], 10) : 1;

    const attachments: { filename: string; content: string }[] = [];
=======
    // Extraer correctamente la cantidad (más flexible con espacios)
    const totalMatch = message.match(/Se detectaron\s+(\d+)\s+productos?/i);
    const umbralMatch = message.match(/≤\s*(\d+)\)/);
    const totalProductos = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    const umbral = umbralMatch ? parseInt(umbralMatch[1], 10) : 1;

    // Debug opcional (puedes borrarlo después)
    console.log("Productos detectados:", totalProductos, "| Umbral:", umbral);
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)

    const attachments: { filename: string; content: string }[] = [];

    // === GENERAR EXCEL PERFECTO ===
    if (includeExcel && totalProductos > 0) {
      const workbook = new ExcelJS.Workbook();
<<<<<<< HEAD
      const sheet = workbook.addWorksheet('Stock Crítico', {
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      sheet.columns = [
        { header: 'Producto', key: 'producto', width: 45 },
        { header: 'Diseño', key: 'diseno', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 18 },
        { header: 'Color', key: 'color', width: 12 },
        { header: 'Stock Total', key: 'total', width: 12 },
        { header: 'S', key: 'S', width: 8 },
        { header: 'M', key: 'M', width: 8 },
        { header: 'L', key: 'L', width: 8 },
        { header: 'XL', key: 'XL', width: 8 },
        { header: 'XXL', key: 'XXL', width: 9 },
        { header: 'XXXL', key: 'XXXL', width: 9 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      const lineas = message.split('\n');
      let productoCompleto = '';
      let diseno = '';
      let tipo = '';
      let color = '';
=======
      const sheet = workbook.addWorksheet("Stock Crítico", {
        pageSetup: { orientation: "landscape", fitToPage: true },
      });

      sheet.columns = [
        { header: "Producto", key: "producto", width: 45 },
        { header: "Diseño", key: "diseno", width: 20 },
        { header: "Tipo", key: "tipo", width: 18 },
        { header: "Color", key: "color", width: 12 },
        { header: "Stock Total", key: "total", width: 12 },
        { header: "S", key: "S", width: 8 },
        { header: "M", key: "M", width: 8 },
        { header: "L", key: "L", width: 8 },
        { header: "XL", key: "XL", width: 8 },
        { header: "XXL", key: "XXL", width: 9 },
        { header: "XXXL", key: "XXXL", width: 9 },
      ];

      // Header violeta hermoso
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      const lineas = message.split("\n");

      let productoCompleto = "";
      let diseno = "";
      let tipo = "";
      let color = "";
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
      let stockTotal = 0;
      let tallas: Record<string, number> = {};

      for (const linea of lineas) {
        const trimmed = linea.trim();

<<<<<<< HEAD
=======
        // Nuevo producto: "1. TRUENO NEGRO - poleron canguro (NEGRO)"
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
        if (/^\d+\.\s/.test(linea)) {
          if (productoCompleto) {
            const row = sheet.addRow({
              producto: productoCompleto,
<<<<<<< HEAD
              diseno, tipo, color, total: stockTotal,
              S: tallas['S'] ?? '', M: tallas['M'] ?? '', L: tallas['L'] ?? '',
              XL: tallas['XL'] ?? '', XXL: tallas['XXL'] ?? '', XXXL: tallas['XXXL'] ?? '',
            });

            ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].forEach(t => {
              const val = tallas[t];
              if (val !== undefined && val <= umbral) {
                const cell = row.getCell(t);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
                cell.font = { bold: true, color: { argb: 'FFDC2626' } };
=======
              diseno,
              tipo,
              color,
              total: stockTotal,
              S: tallas["S"] ?? "",
              M: tallas["M"] ?? "",
              L: tallas["L"] ?? "",
              XL: tallas["XL"] ?? "",
              XXL: tallas["XXL"] ?? "",
              XXXL: tallas["XXXL"] ?? "",
            });

            (["S", "M", "L", "XL", "XXL", "XXXL"] as const).forEach((t) => {
              const cell = row.getCell(t);
              const val = tallas[t];
              if (val !== undefined && val <= umbral) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
                cell.font = { bold: true, color: { argb: "FFDC2626" } };
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
              }
            });
          }

<<<<<<< HEAD
          const texto = linea.replace(/^\d+\.\s*/, '').trim();
=======
          const texto = linea.replace(/^\d+\.\s*/, "").trim();
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
          const match = texto.match(/^(.*?) - (.*?) \((.*?)\)$/);
          if (match) {
            diseno = match[1].trim();
            tipo = match[2].trim();
            color = match[3].trim();
          } else {
            diseno = texto;
<<<<<<< HEAD
            tipo = '';
            color = '';
=======
            tipo = "";
            color = "";
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
          }
          productoCompleto = texto;
          stockTotal = 0;
          tallas = {};
        }

<<<<<<< HEAD
        else if (trimmed.startsWith('Stock total:')) {
          stockTotal = parseInt(trimmed.match(/:\s*(\d+)/)?.[1] || '0', 10);
        }

        else if (trimmed.startsWith('Tallas:')) {
          const tallasTexto = trimmed.replace('Tallas:', '').trim();
          tallasTexto.split(',').forEach((item: string) => {
            const [tallaRaw = '', stockStr = ''] = item.split(':').map((s: string) => s.trim());
            const talla = tallaRaw.toUpperCase();
            const stock = parseInt(stockStr.replace(/[^\d]/g, ''), 10) || 0;
=======
        // Stock total
        else if (trimmed.startsWith("Stock total:")) {
          const match = trimmed.match(/:\s*(\d+)/);
          stockTotal = match ? parseInt(match[1], 10) : 0;
        }

        // Tallas
        else if (trimmed.startsWith("Tallas:")) {
          const tallasTexto = trimmed.replace("Tallas:", "").trim();
          tallasTexto.split(",").forEach((item: string) => {
            const parts = item.split(":").map((s: string) => s.trim());
            const tallaRaw = parts[0];
            const stockStr = parts[1] || "";
            const talla = tallaRaw.toUpperCase();
            const stock = parseInt(stockStr.replace(/[^\d]/g, ""), 10) || 0;
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
            if (talla) tallas[talla] = stock;
          });
        }
      }

      // Última fila
      if (productoCompleto) {
        const row = sheet.addRow({
          producto: productoCompleto,
<<<<<<< HEAD
          diseno, tipo, color, total: stockTotal,
          S: tallas['S'] ?? '', M: tallas['M'] ?? '', L: tallas['L'] ?? '',
          XL: tallas['XL'] ?? '', XXL: tallas['XXL'] ?? '', XXXL: tallas['XXXL'] ?? '',
        });
        ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].forEach(t => {
          const val = tallas[t];
          if (val !== undefined && val <= umbral) {
            const cell = row.getCell(t);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            cell.font = { bold: true, color: { argb: 'FFDC2626' } };
=======
          diseno,
          tipo,
          color,
          total: stockTotal,
          S: tallas["S"] ?? "",
          M: tallas["M"] ?? "",
          L: tallas["L"] ?? "",
          XL: tallas["XL"] ?? "",
          XXL: tallas["XXL"] ?? "",
          XXXL: tallas["XXXL"] ?? "",
        });

        (["S", "M", "L", "XL", "XXL", "XXXL"] as const).forEach((t) => {
          const cell = row.getCell(t);
          const val = tallas[t];
          if (val !== undefined && val <= umbral) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
            cell.font = { bold: true, color: { argb: "FFDC2626" } };
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_critico_${new Date().toISOString().slice(0, 10)}.xlsx`,
<<<<<<< HEAD
        content: Buffer.from(buffer).toString('base64'),
      });
    }

    // EMAIL (el mismo hermoso de siempre)
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const html = `...`; // tu HTML bonito
=======
        content: Buffer.from(buffer).toString("base64"),
      });
    }

    // === EMAIL HERMOSO ===
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
          <p style="margin:8px 0 0;">${new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}</p>
        </div>
      </div>
    `;
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)

    await resend.emails.send({
      from: "Taller Serigrafía <noreply@titanserigrafia.com>",
      to: [to],
      subject: subject || `ALERTA STOCK CRÍTICO - ${totalProductos} productos`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ success: true, totalProductosCriticos: totalProductos });
<<<<<<< HEAD

  } catch (err) {
    console.error('Error enviando alerta:', err);
=======
  } catch (err) {
    console.error("Error enviando correo:", err);
>>>>>>> parent of 5c7819e (este api funciona con excel corrido)
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}