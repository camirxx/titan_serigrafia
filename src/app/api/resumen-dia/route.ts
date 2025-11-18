import { NextResponse } from "next/server";

const SAMPLE_SUMMARY_DAY = {
  fecha: new Date().toISOString().split("T")[0],
  totalVendido: 1250000,
  productosVendidos: 82,
  ingresosRegistrados: 5,
  salidasRegistradas: 4,
};

export async function GET() {
  return NextResponse.json(SAMPLE_SUMMARY_DAY);
}
