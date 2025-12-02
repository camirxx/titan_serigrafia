import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

interface VarianteProducto {
  talla: string;
  stock_actual: number;
  es_critico: boolean;
}

interface Producto {
  nombre: string;
  tipo_prenda: string;
  color: string;
  stock_total: number;
  todas_variantes: VarianteProducto[];
}

// ------------------------------------------------------
// FUNCIÓN PARA GENERAR TEXTO PLANO
// ------------------------------------------------------
function generarMensajeTextoPlano(productos: Producto[], umbral: number): string {
  let txt = `Se detectaron ${productos.length} productos con stock igual o menor a ${umbral}.\n\n`;

  productos.forEach((p: Producto, i: number) => {
    txt += `${i + 1}. ${p.nombre}\n`;
    txt += `Tipo: ${p.tipo_prenda} | Color: ${p.color}\n`;
    txt += `Stock total: ${p.stock_total}\n`;
    txt += `Tallas:\n`;

    p.todas_variantes.forEach((v: VarianteProducto) => {
      txt += `  - ${v.talla}: ${v.stock_actual}${v.es_critico ? " ⚠️" : ""}\n`;
    });

    txt += `\n`;
  });

  return txt.trim();
}

// ------------------------------------------------------
// POST — ENVÍO DE CORREO
// ------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productosBajoStock, correoDestino, correoCopia, umbral } = body;

    if (!productosBajoStock || productosBajoStock.length === 0) {
      return NextResponse.json({ error: "No hay productos para enviar." }, { status: 400 });
    }

    if (!correoDestino) {
      return NextResponse.json({ error: "Correo de destino requerido." }, { status: 400 });
    }

    // Crear mensaje de texto (igual que el formulario)
    const mensajeGenerado = generarMensajeTextoPlano(productosBajoStock, umbral);

<<<<<<< HEAD
    // Crear HTML del detalle
    const htmlProductos = productosBajoStock
      .map(
        (p: Producto) => `
        <div style="border:1px solid #ddd;padding:16px;margin-bottom:16px;border-radius:8px;">
          <h3 style="margin:0 0 10px 0;">${p.nombre}</h3>
          <p><strong>Tipo:</strong> ${p.tipo_prenda}</p>
          <p><strong>Color:</strong> ${p.color}</p>
          <p><strong>Stock total:</strong> ${p.stock_total}</p>

          <strong>Tallas:</strong>
          <ul style="margin-top:8px;">
            ${p.todas_variantes
              .map(
                (v: VarianteProducto) => `
              <li style="color:${v.es_critico ? "red" : "#111"};">
                ${v.talla}: ${v.stock_actual} ${v.es_critico ? "⚠️" : ""}
              </li>
            `
              )
              .join("")}
          </ul>
=======
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
>>>>>>> parent of 6f7d2d9 (prueba 5)
        </div>
      `
      )
      .join("");

    // Configurar transporte
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.NEXT_PUBLIC_EMAIL_USER,
        pass: process.env.NEXT_PUBLIC_EMAIL_PASS,
      },
    });

    // Enviar correo
    await transporter.sendMail({
      from: `"Sistema de Stock" <${process.env.NEXT_PUBLIC_EMAIL_USER}>`,
      to: correoDestino,
      cc: correoCopia || "",
      subject: `Productos con stock bajo (≤ ${umbral})`,
      text: mensajeGenerado,
      html: `
        <div style="font-family:Arial;padding:20px;background:#f3f3f3;">
          <h2>Productos con stock crítico</h2>
          <p>Se encontraron <strong>${productosBajoStock.length}</strong> productos con stock crítico.</p>

          <pre style="white-space:pre-wrap;background:#fff;padding:16px;border-radius:6px;">
${mensajeGenerado}
          </pre>

          <hr style="margin:20px 0;">

          <h3>Detalle de productos</h3>
          ${htmlProductos}
        </div>
      `,
    });

    return NextResponse.json({ ok: true, mensaje: "Correo enviado correctamente." });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al enviar el correo';
    return NextResponse.json({ error: "Error al enviar correo", detalle: errorMessage }, { status: 500 });
  }
}
