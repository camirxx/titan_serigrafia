import { NextResponse } from "next/server";

const SAMPLE_MOVEMENTS_MONTH = {
  mes: new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date()),
  ingresosTotales: 1350,
  salidasTotales: 1280,
  destacados: [
    { producto: "Polera Premium Negra Talla M", movimientos: 140 },
    { producto: "Tinta UV Azul", movimientos: 95 },
    { producto: "Transfer Textil Blanco", movimientos: 210 },
  ],
};

export async function GET() {
  return NextResponse.json(SAMPLE_MOVEMENTS_MONTH);
}
