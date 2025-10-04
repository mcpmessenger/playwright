import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const { out, filename } = await request.json();
    if (!out || !filename) {
      return NextResponse.json({ ok: false, error: "out and filename required" }, { status: 400 });
    }
    const filePath = path.join(process.cwd(), "public", "screenshots", String(out), String(filename));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}



