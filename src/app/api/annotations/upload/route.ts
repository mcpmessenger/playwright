import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const out = String(form.get("out") || "session");
    if (!file) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const attachmentsDir = path.join(process.cwd(), "public", "screenshots", out, "attachments");
    if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });
    const base = Date.now() + "-" + (file.name || "upload");
    const safe = base.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = path.join(attachmentsDir, safe);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = path.posix.join("/screenshots", out, "attachments", safe);
    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}



