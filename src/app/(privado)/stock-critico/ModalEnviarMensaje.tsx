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

    const totalMatch = message.match(/Se detectaron (\d+) productos/);
    const umbralMatch = message.match(/≤ (\d+)\)/);
    const totalProductos = totalMatch ? parseInt(totalMatch[1]) : 0;
    const umbral = umbralMatch ? parseInt(umbralMatch[1]) : 1;

    const attachments: { filename: string; content: string }[] = [];

    if (includeExcel && totalProductos > 0) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Stock Crítico", {
        pageSetup: { orientation: "landscape", fitToPage: true },
      });

      // Columnas exactas como querés
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

      // Header violeta bonito
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7C3AED" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      const lineas = message.split("\n");

      let productoCompleto = "";
      let diseno = "";
      let tipo = "";
      let color = "";
      let stockTotal = 0;
      let tallas: Record<string, number> = {};

      for (const linea of lineas) {
        const trimmed = linea.trim();

        // Nuevo producto → "1. TRUENO NEGRO - poleron canguro (NEGRO)"
        if (/^\d+\.\s/.test(linea)) {
          if (productoCompleto) {
            // Guardar fila anterior
            const row = sheet.addRow({
              producto: productoCompleto,
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

            // Colorear celdas críticas
            ["S", "M", "L", "XL", "XXL", "XXXL"].forEach((t) => {
              const cell = row.getCell(t);
              const val = tallas[t];
              if (val !== undefined && val <= umbral) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "FFFECACA" },
                };
                cell.font = { bold: true, color: { argb: "FFDC2626" } };
              }
            });
          }

          // Extraer datos del nuevo producto
          const texto = linea.replace(/^\d+\.\s*/, "").trim();
          const match = texto.match(/^(.*?) - (.*?) \((.*?)\)$/);
          if (match) {
            diseno = match[1].trim();
            tipo = match[2].trim();
            color = match[3].trim();
          } else {
            // Fallback por si el formato es raro
            diseno = texto;
            tipo = "";
            color = "";
          }
          productoCompleto = texto;
          stockTotal = 0;
          tallas = {};
        }

        // Stock total
        else if (trimmed.startsWith("Stock total:")) {
          stockTotal = parseInt(trimmed.match(/:\s*(\d+)/)?.[1] || "0", 10);
        }

        // Tallas
        else if (trimmed.startsWith("Tallas:")) {
          const tallasTexto = trimmed.replace("Tallas:", "").trim();
          tallasTexto.split(",").forEach((item: string) => {
            const [tallaRaw, stockStr] = item.split(":").map((s: string) => s.trim());
            const talla = tallaRaw.toUpperCase();
            const stock = parseInt(stockStr.replace(/[^\d]/g, ""), 10) || 0;
            if (talla) tallas[talla] = stock;
          });
        }
      }

      // Última fila
      if (productoCompleto) {
        const row = sheet.addRow({
          producto: productoCompleto,
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

        ["S", "M", "L", "XL", "XXL", "XXXL"].forEach((t) => {
          const cell = row.getCell(t);
          const val = tallas[t];
          if (val !== undefined && val <= umbral) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
            cell.font = { bold: true, color: { argb: "FFDC2626" } };
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      attachments.push({
        filename: `stock_critico_${new Date().toISOString().slice(0, 10)}.xlsx`,
        content: Buffer.from(buffer).toString("base64"),
      });
    }

    // EMAIL (el mismo de siempre)
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const html = `...`; // (el HTML bonito que ya tenías)

    await resend.emails.send({
      from: "Taller Serigrafía <noreply@titanserigrafia.com>",
      to: [to],
      subject: subject || `ALERTA STOCK CRÍTICO - ${totalProductos} productos`,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    return NextResponse.json({ success: true, totalProductosCriticos: totalProductos });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}