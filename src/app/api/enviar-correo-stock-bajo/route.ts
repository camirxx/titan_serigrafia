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

interface ProductoFiltradoFrontend {
  diseno: string;
  tipo_prenda: string;
  color: string;
  stock_actual: number;
  tallas: Map<string, number>;
}

interface EmailAttachment {
  filename: string;
  content: string;
}

// Helper para obtener el nombre desde relaciones que vienen como objeto o arreglo
function getNombre(relacion: Array<{ nombre: string }> | { nombre: string } | null): string {
  if (!relacion) return '';
  if (Array.isArray(relacion)) return relacion[0]?.nombre ?? '';
  return relacion.nombre ?? '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const {
      to,
      subject,
      message,
      includeExcel,
      productosFiltrados,
      umbral
    }: {
      to: string;
      subject: string;
      message: string;
      includeExcel: boolean;
      productosFiltrados?: ProductoFiltradoFrontend[];
      umbral?: number;
    } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos (destinatario y mensaje)" },
        { status: 400 }
      );
    }

    const umbralFinal = Number(umbral) || 5;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let productosBajoStock: ProductoConStockBajo[] = [];

    // ===================================================
    //  🔥 1) USAR PRODUCTOS FILTRADOS DESDE EL FRONTEND
    // ===================================================
    if (Array.isArray(productosFiltrados) && productosFiltrados.length > 0) {
      productosBajoStock = productosFiltrados.map((p) => {
        const tallasEntries = Array.from(p.tallas.entries()) as Array<[string, number]>;

        const variantesBajo = tallasEntries
          .filter((entry) => entry[1] <= umbralFinal)
          .map(([talla, stock]) => ({
            id: `${p.diseno}-${talla}`,
            talla,
            stock_actual: stock,
          }));

        return {
          id: p.diseno,
          nombre: `${p.diseno} ${p.tipo_prenda} ${p.color}`,
          diseno: p.diseno,
          tipo_prenda: p.tipo_prenda,
          color: p.color,
          stock_total: p.stock_actual,
          variantes_bajo: variantesBajo,
          total_variantes: tallasEntries.length,
        };
      });
    } else {
      // ===================================================
      // 🔥 2) Si no hay productos en frontend → fallback Supabase
      // ===================================================
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
        console.error("Error obteniendo productos:", error);
        return NextResponse.json(
          { success: false, message: "Error al obtener productos" },
          { status: 500 }
        );
      }

      const productoIds = (productos ?? []).map((p) => p.id);

      const { data: variantes } = await supabase
        .from("variantes")
        .select("id, producto_id, talla, stock_actual")
        .in("producto_id", productoIds);

      productosBajoStock = [];

      (productos as ProductoRelaciones[])?.forEach((producto) => {
        const productoVariantes = (variantes ?? []).filter(
          (v: Variante) => v.producto_id === producto.id
        );

        const stockTotal = productoVariantes.reduce(
          (sum, v) => sum + (v.stock_actual ?? 0),
          0
        );

        const variantesConStockBajo = productoVariantes.filter(
          (v) => (v.stock_actual ?? 0) <= umbralFinal
        );

        if (variantesConStockBajo.length > 0) {
          const diseno = getNombre(producto.disenos);
          const tipo = getNombre(producto.tipos_prenda);
          const color = getNombre(producto.colores);

          productosBajoStock.push({
            id: producto.id,
            nombre: `${diseno} ${tipo} ${color ?? ''}`.trim(),
            diseno,
            tipo_prenda: tipo,
            color: color ?? 'Sin color',
            stock_total: stockTotal,
            variantes_bajo: variantesConStockBajo.map((v) => ({
              id: v.id,
              talla: v.talla ?? 'N/A',
              stock_actual: v.stock_actual ?? 0,
            })),
            total_variantes: productoVariantes.length,
          });
        }
      });
    }

    // ==================================
    //  📎 Crear archivo CSV si aplica
    // ==================================
    const attachments: EmailAttachment[] = [];

    if (includeExcel && productosBajoStock.length > 0) {
      const csvContent = [
        ['Producto', 'Diseño', 'Tipo', 'Color', 'Stock Total', 'Tallas Bajo Stock'],
        ...productosBajoStock.map((p) => [
          p.nombre,
          p.diseno,
          p.tipo_prenda,
          p.color,
          p.stock_total.toString(),
          p.variantes_bajo.map((v) => `${v.talla}:${v.stock_actual}`).join('; ')
        ])
      ]
        .map((row) => row.join(','))
        .join('\n');

      attachments.push({
        filename: `stock_bajo_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
      });
    }

    // ======================
    //  📧 ENVIAR EMAIL
    // ======================
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, message: "Falta RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const sendResult = await resend.emails.send({
      from: "Taller Serigrafía <noreply@titanserigrafia.com>",
      to: [to],
      subject: subject || `🚨 ALERTA DE STOCK CRÍTICO`,
      html: `
        <h2>⚠ Productos Críticos ≤ ${umbralFinal}</h2>
        <p>${message}</p>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (sendResult.error) {
      console.error(sendResult.error);
      return NextResponse.json(
        { success: false, message: sendResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alerta enviada correctamente",
      cantidad: productosBajoStock.length,
    });

  } catch (err) {
    console.error("Error interno:", err);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
