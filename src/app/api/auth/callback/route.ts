import { NextResponse } from "next/server";
export const runtime = "edge";

export async function GET() {
  return NextResponse.redirect(new URL("/", "http://localhost:3000"));
}
