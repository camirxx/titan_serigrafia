// src/app/api/enviar-correo-stock-bajo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, includeExcel } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ success: false, message: "Faltan datos" }, { status: 400 });
    }

    // Detecta cualquier cantidad: 0, 1, 5, 10, 100...
    const totalMatch = message.match(/Se detectaron\s+(\d+)\s+productos/i);
    const totalProductos = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    // Detecta el umbral (≤ 0, ≤ 1, ≤ 2, etc.)
    const umbralMatch = message.match(/\(≤\s*(\d+)\)/);
    const umbral = umbralMatch ? parseInt(umbralMatch[1], 10) : 1;

    const attachments: { filename: string; content: string }[] = [];

    // GENERAR EXCEL SI HAY PRODUCTOS
    if (includeExcel && totalProductos > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Stock Crítico");

      sheet.columns = [
        { header: "#", key: "num", width: 6 },
        { header: "Producto", key: "nombre", width: 50 },
        { header: "Stock Total", key: "stock", width: 14 },
        { header: "Tallas", key: "tallas", width: 70 },
      ];

      // Header violeta
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };

      const lineas = message.split("\n");
      let num = 1;
      let producto = "";
      let stock = "";
      let tallas = "";

      for (const linea of lineas) {
        const trimmed = linea.trim();

        if (/^\d+\.\s/.test(linea)) {
          if (producto) {
            sheet.addRow({
              num: num - 1,
              nombre: producto,
              stock: stock || "0",
              tallas: tallas || "Sin tallas",
            });
          }
          producto = linea.replace(/^\d+\.\s*/, "").trim();
          stock = "";
          tallas = "";
          num++;
        }
        else if (trimmed.startsWith("Stock total:")) {
          stock = trimmed.replace("Stock total:", "").trim();
        }
        else if (trimmed.startsWith("Tallas:")) {
          tallas = trimmed.replace("Tallas:", "").trim();
        }
      }

      // Último producto
      if (producto) {
        sheet.addRow({
          num: num - 1,
          nombre: producto,
          stock: stock || "0",
          tallas: tallas || "Sin tallas",
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_critico_${new Date().toISOString().slice(0, 10)}.xlsx`,
        content: Buffer.from(buffer).toString("base64"),
      });
    }

    // EMAIL HERMOSO
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15);">
        <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); color: white; padding: 35px; text-align: center;">
          <h1 style="margin:0; font-size:32px; font-weight:bold;">ALERTA STOCK CRÍTICO</h1>
          <p style="margin:10px 0 0; font-size:18px; opacity:0.9;">Umbral configurado: ≤ ${umbral} unidad${umbral === 1 ? '' : 'es'}</p>
        </div>
        <div style="padding: 35px; background: #fafaff;">
          <div style="text-align:center; margin-bottom:35px;">
            <div style="font-size:72px; font-weight:900; color:#DC2626;">${totalProductos}</div>
            <div style="font-size:24px; color:#374151; font-weight:600;">producto${totalProductos === 1 ? '' : 's'} con stock crítico</div>
          </div>
          <div style="background:white; padding:30px; border-radius:14px; border:1px solid #e2e8f0;">
            <pre style="margin:0; font-size:15px; line-height:2; color:#1f2937; white-space:pre-wrap; font-family: 'Courier New', monospace;">
${message.trim()}
            </pre>
          </div>
          <div style="margin-top:30px; padding:20px; background:#FFFBEB; border-left:6px solid #F59E0B; border-radius:10px;">
            <p style="margin:0; color:#92400E; font-size:15px;">
              <strong>Advertencia:</strong> Se incluyen productos con al menos una talla ≤ ${umbral}.
            </p>
          </div>
        </div>
        <div style="text-align:center; padding:25px; background:#f1f5f9; color:#64748b; font-size:13px;">
          <p style="margin:0;">Taller Serigrafía • Sistema de Gestión de Inventario</p>
          <p style="margin:8px 0 0;">${new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "Taller Serigrafía <noreply@titanserigrafia.com>",
      to: [to],
      subject: subject || `STOCK CRÍTICO ≤ ${umbral} → ${totalProductos} productos`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({
      success: true,
      totalProductosCriticos: totalProductos,
    });
  } catch (err) {
    console.error("Error enviando alerta:", err);
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 }
    );
  }
}