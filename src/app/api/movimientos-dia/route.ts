import { NextResponse } from "next/server";

const SAMPLE_MOVEMENTS_DAY = {
  fecha: new Date().toISOString().split("T")[0],
  resumen: {
    ingresosRegistrados: 5,
    salidasRegistradas: 4,
  },
  ingresos: [
    { producto: "Tinta UV Azul", cantidad: 20, hora: "09:15" },
    { producto: "Polera Premium Negra Talla M", cantidad: 15, hora: "10:42" },
    { producto: "Transfer Textil Blanco", cantidad: 50, hora: "11:30" },
    { producto: "Bolso Promocional EcoFlex", cantidad: 25, hora: "13:10" },
    { producto: "Vinilo Adhesivo Brillo", cantidad: 40, hora: "16:55" },
  ],
  salidas: [
    { producto: "Polera Premium Negra Talla M", cantidad: 12, hora: "10:05" },
    { producto: "Tinta UV Azul", cantidad: 8, hora: "12:20" },
    { producto: "Bolso Promocional EcoFlex", cantidad: 15, hora: "14:40" },
    { producto: "Transfer Textil Blanco", cantidad: 30, hora: "17:25" },
  ],
};

export async function GET() {
  return NextResponse.json(SAMPLE_MOVEMENTS_DAY);
}
