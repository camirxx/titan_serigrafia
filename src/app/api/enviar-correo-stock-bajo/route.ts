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
