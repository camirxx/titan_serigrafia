import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Obtener la URL base del request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  return NextResponse.redirect(new URL("/", baseUrl));
}