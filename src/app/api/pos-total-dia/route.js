import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseApi";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha") || new Date().toISOString().split("T")[0];

  try {
    // 1. Obtener ventas como lo hace el POS
    const { data: ventas, error } = await supabase
      .from("ventas")
      .select(`
        id,
        total,
        fecha,
        detalle_ventas!inner(variante_id)
      `)
      .gte("fecha", `${fecha}T00:00:00`)
      .lte("fecha", `${fecha}T23:59:59`);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: true });
    }

    if (!ventas || ventas.length === 0) {
      return NextResponse.json({
        fecha,
        total: 0,
        cantidad: 0,
        categorias: [],
        cantidad_total: 0,
        debug: "Sin ventas reales"
      });
    }

    // 2. Calcular total (como el POS)
    const total = ventas.reduce((sum, v) => sum + Number(v.total || 0), 0);

    // 3. Procesar categorías igual que tu API original
    const categorias = {};
    const ventasProcesadas = [];

    for (const v of ventas) {
      const varianteId = v.detalle_ventas?.[0]?.variante_id;

      if (!varianteId) continue;

      const { data: varData } = await supabase
        .from("variantes_admin_view")
        .select("tipo_prenda")
        .eq("variante_id", varianteId)
        .single();

      const tipo = varData?.tipo_prenda || "Sin categoría";

      if (!categorias[tipo]) categorias[tipo] = 0;
      categorias[tipo] += 1;

      ventasProcesadas.push({
        id: v.id,
        fecha: v.fecha,
        total: v.total,
        tipo_prenda: tipo,
      });
    }

    // Convertir categorías a array como antes
    const categoriasArray = Object.entries(categorias).map(([categoria, cantidad]) => ({
      categoria,
      cantidad,
      nombre_formateado: categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase()
    }));

    return NextResponse.json({
      fecha,
      total,                     // 👈 TOTAL REAL DEL POS
      cantidad: ventas.length,   // 👈 CANTIDAD TRANSACCIONES
      categorias: categoriasArray,
      cantidad_total: categoriasArray.reduce((s, c) => s + c.cantidad, 0),
      debug: "Total del POS + Categorías incluidas"
    });

  } catch (err) {
    console.error("Error en pos-total-dia:", err);
    return NextResponse.json({ error: true });
  }
}
