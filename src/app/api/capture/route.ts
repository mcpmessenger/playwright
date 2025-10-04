import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = String(body.url || "https://example.com");
    const dark = Boolean(body.dark);
    const browser = String(body.browser || "chromium");
    const concurrency = Number(body.concurrency ?? 2);
    const delay = Number(body.delay ?? 800);
    const out = String(body.out || "session");

    const scriptPath = path.join(process.cwd(), "scripts", "capture-clickables.mjs");

    // Optional: clear existing folder before run
    const screenshotsDir = path.join(process.cwd(), "public", "screenshots", out);
    if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
    if (body.reset === true && fs.existsSync(screenshotsDir)) {
      for (const f of fs.readdirSync(screenshotsDir)) {
        if (f.endsWith(".png")) fs.unlinkSync(path.join(screenshotsDir, f));
      }
    }

    const args = [
      scriptPath,
      `--url=${url}`,
      `--browser=${browser}`,
      `--dark=${dark}`,
      `--concurrency=${concurrency}`,
      `--delay=${delay}`,
      `--out=${out}`,
    ];

    // Fire-and-forget background process so client can poll for images
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    return NextResponse.json({ ok: true, outFolder: out }, { status: 202 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}


