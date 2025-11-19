import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MESSAGE = "⚠️ Alerta de inventario: hay productos con stock bajo.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = body?.message || DEFAULT_MESSAGE;

    return NextResponse.json({
      success: true,
      channel: "whatsapp",
      message,
      sentAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "No se pudo procesar la alerta" },
      { status: 500 }
    );
  }
}
