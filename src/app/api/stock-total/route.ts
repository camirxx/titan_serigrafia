import { NextResponse } from "next/server";

const SAMPLE_STOCK = [
  {
    id: "TUV-1023",
    name: "Tinta UV Azul",
    stock: 48,
    category: "Tintas y Químicos",
    location: "Bodega Principal - Estante A3",
  },
  {
    id: "POL-NG-210",
    name: "Polera Premium Negra Talla M",
    stock: 32,
    category: "Textiles y Prendas",
    location: "Bodega Textil - Rack 5",
  },
  {
    id: "TRF-BL-441",
    name: "Transfer Textil Blanco",
    stock: 110,
    category: "Insumos de Transferencia",
    location: "Bodega Insumos - Estante C1",
  },
  {
    id: "MCH-UV-550",
    name: "Máquina Curadora UV 550",
    stock: 4,
    category: "Maquinaria",
    location: "Área de Maquinaria",
  },
];

export async function GET() {
  return NextResponse.json({
    totalProducts: SAMPLE_STOCK.length,
    items: SAMPLE_STOCK,
    updatedAt: new Date().toISOString(),
  });
}
