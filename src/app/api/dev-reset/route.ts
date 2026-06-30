import { NextResponse } from "next/server";
import { seedDatabase } from "@/modules/dev/seedDatabase";

export async function GET() {
  await seedDatabase();
  return NextResponse.json({ ok: true });
}
