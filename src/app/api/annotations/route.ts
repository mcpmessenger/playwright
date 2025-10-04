import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

type Note = {
  x: number;
  y: number;
  text: string;
  id: string;
  images?: string[];
};

type Sticker = {
  id: string;
  kind: "circle" | "arrow" | "click";
  x: number;
  y: number;
  scale: number;
  rotation?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const out = url.searchParams.get("out") || "session";
  const file = url.searchParams.get("file");
  if (!file) return NextResponse.json({ annotations: [] });
  const storeDir = path.join(process.cwd(), "public", "screenshots", out);
  const jsonPath = path.join(storeDir, `${file}.json`);
  try {
    if (!fs.existsSync(jsonPath)) return NextResponse.json({ annotations: [] });
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    // Back-compat: support old {annotations: []}
    const notes: Note[] = data.notes || data.annotations || [];
    const stickers: Sticker[] = data.stickers || [];
    return NextResponse.json({ notes, stickers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ annotations: [], error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { out: string; file: string; notes: Note[]; stickers?: Sticker[] };
    const out = body.out || "session";
    const file = body.file;
    if (!file) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    const storeDir = path.join(process.cwd(), "public", "screenshots", out);
    if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });
    const jsonPath = path.join(storeDir, `${file}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ notes: body.notes || [], stickers: body.stickers || [] }, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


