import { NextResponse } from "next/server";

const SAMPLE_SUMMARY_MONTH = {
  mes: new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date()),
  totalVendido: 18450000,
  productosVendidos: 1420,
  ingresosRegistrados: 86,
  salidasRegistradas: 74,
};

export async function GET() {
  return NextResponse.json(SAMPLE_SUMMARY_MONTH);
}
