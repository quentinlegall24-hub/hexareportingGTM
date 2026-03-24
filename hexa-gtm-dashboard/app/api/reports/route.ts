import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "data.json");
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    // If file can't be read (e.g. on Vercel), return empty array
    return NextResponse.json([]);
  }
}
