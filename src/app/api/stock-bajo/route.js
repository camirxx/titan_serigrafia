import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseApi';

export async function GET(request) {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, stock, precio_venta, umbral_bajo_stock, categoria')
      .or('stock.lte.umbral_bajo_stock,stock.eq.0')
      .order('stock', { ascending: true });

    if (error) {
      console.error('Error al obtener stock bajo:', error);
      
      // Si hay error, devolver datos de ejemplo como fallback
      const SAMPLE_LOW_STOCK = [
        {
          id: "TUV-1023",
          name: "Tinta UV Azul",
          stock: 8,
          minimum: 15,
          category: "Tintas y Químicos",
          precio_venta: 15000
        },
        {
          id: "POL-NG-210",
          name: "Polera Premium Negra Talla M",
          stock: 5,
          minimum: 12,
          category: "Textiles y Prendas",
          precio_venta: 25000
        },
        {
          id: "TRF-BL-441",
          name: "Transfer Textil Blanco",
          stock: 10,
          minimum: 25,
          category: "Insumos de Transferencia",
          precio_venta: 8000
        },
      ];

      return NextResponse.json({
        items: SAMPLE_LOW_STOCK,
        generatedAt: new Date().toISOString(),
        fallback: true
      });
    }

    const productosConNivel = data.map(producto => ({
      id: producto.id,
      name: producto.nombre,
      stock: producto.stock,
      minimum: producto.umbral_bajo_stock,
      category: producto.categoria || 'Sin categoría',
      precio_venta: producto.precio_venta,
      nivel: producto.stock === 0 ? 'critico' : 'bajo'
    }));

    return NextResponse.json({
      items: productosConNivel,
      generatedAt: new Date().toISOString(),
      fallback: false
    });
  } catch (error) {
    console.error('Error en stock bajo:', error);
    
    // Datos de ejemplo como fallback en caso de error
    const SAMPLE_LOW_STOCK = [
      {
        id: "TUV-1023",
        name: "Tinta UV Azul",
        stock: 8,
        minimum: 15,
        category: "Tintas y Químicos",
        precio_venta: 15000
      },
      {
        id: "POL-NG-210",
        name: "Polera Premium Negra Talla M",
        stock: 5,
        minimum: 12,
        category: "Textiles y Prendas",
        precio_venta: 25000
      },
      {
        id: "TRF-BL-441",
        name: "Transfer Textil Blanco",
        stock: 10,
        minimum: 25,
        category: "Insumos de Transferencia",
        precio_venta: 8000
      },
    ];

    return NextResponse.json({
      items: SAMPLE_LOW_STOCK,
      generatedAt: new Date().toISOString(),
      fallback: true,
      error: true
    });
  }
}
