import { NextResponse } from "next/server";

const SAMPLE_LOW_STOCK = [
  {
    id: "TUV-1023",
    name: "Tinta UV Azul",
    stock: 8,
    minimum: 15,
    category: "Tintas y Químicos",
  },
  {
    id: "POL-NG-210",
    name: "Polera Premium Negra Talla M",
    stock: 5,
    minimum: 12,
    category: "Textiles y Prendas",
  },
  {
    id: "TRF-BL-441",
    name: "Transfer Textil Blanco",
    stock: 10,
    minimum: 25,
    category: "Insumos de Transferencia",
  },
];

export async function GET() {
  return NextResponse.json({
    items: SAMPLE_LOW_STOCK,
    generatedAt: new Date().toISOString(),
  });
}
