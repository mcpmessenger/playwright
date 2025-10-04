"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CircleSticker, ArrowSticker, ClickHereSticker } from "@/components/ui/stickers";

export default function CapturePage() {
  const [url, setUrl] = useState("https://example.com");
  const [folder, setFolder] = useState("session");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadImages = async (targetFolder: string) => {
    const res = await fetch(`/api/screenshots?out=${encodeURIComponent(targetFolder)}&t=${Date.now()}`);
    const data = await res.json();
    setImages(data.images || []);
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem("capture:url");
    const savedFolder = localStorage.getItem("capture:folder");
    if (savedUrl) setUrl(savedUrl);
    if (savedFolder) setFolder(savedFolder);
    loadImages(savedFolder || folder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCapture = () => {
    startTransition(async () => {
      setBusy("capture");
      localStorage.setItem("capture:url", url);
      localStorage.setItem("capture:folder", folder);
      await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, out: folder, dark: false, browser: "chromium", concurrency: 4, delay: 1000, reset: true }),
      });
      // Poll for new images for ~20 seconds
      const start = Date.now();
      const poll = async () => {
        await loadImages(folder);
        if (Date.now() - start < 20000) setTimeout(poll, 1500);
      };
      poll();
      setBusy(null);
    });
  };

  const deleteImage = async (src: string) => {
    const name = src.split("/").pop();
    if (!name) return;
    setBusy(name);
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ out: folder, filename: name }),
    });
    await loadImages(folder);
    setBusy(null);
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Capture Clickable Link Screenshots</h1>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-center">
        <Input
          placeholder="https://your-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Input
          className="sm:ml-2"
          placeholder="output folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
        <Button className="sm:ml-2" onClick={runCapture} disabled={isPending}>
          {isPending ? "Capturing..." : "Capture"}
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((src) => (
            <div key={src} className="rounded border border-zinc-800 overflow-hidden relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={src} className="w-full h-auto cursor-zoom-in" onClick={() => setOpenSrc(src)} />
              <div className="px-2 py-1 text-xs truncate">{src.split("/").pop()}</div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  className="text-xs bg-zinc-700/80 hover:bg-zinc-700 text-white px-2 py-1 rounded"
                  href={src}
                  download
                >
                  Download
                </a>
                <button
                  className="text-xs bg-red-600/90 hover:bg-red-700 text-white px-2 py-1 rounded"
                  onClick={() => deleteImage(src)}
                  disabled={busy === src.split("/").pop()}
                >
                  {busy === src.split("/").pop() ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CropperModal src={openSrc} onClose={() => setOpenSrc(null)} />
    </div>
  );
}

function CropperModal({ src, onClose }: { src: string | null; onClose: () => void }) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [addingNote, setAddingNote] = useState(false);
  const [annotations, setAnnotations] = useState<{
    x: number;
    y: number;
    text: string;
    id: string;
    images?: string[];
  }[]>([]);
  const [stickers, setStickers] = useState<{
    id: string; kind: "circle" | "arrow" | "click"; x: number; y: number; scale: number; rotation?: number;
  }[]>([]);
  const [activeTool, setActiveTool] = useState<"note" | "circle" | "arrow" | "click" | "crop">("note");

  useEffect(() => {
    setZoom(1);
    setSelection(null);
    setAnnotations([]);
    setAddingNote(false);
  }, [src]);

  const onDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const startX = (e.clientX - rect.left + container.scrollLeft) / zoom;
    const startY = (e.clientY - rect.top + container.scrollTop) / zoom;
    let current = selection;
    const onMove = (ev: MouseEvent) => {
      const xRel = (ev.clientX - rect.left + container.scrollLeft) / zoom;
      const yRel = (ev.clientY - rect.top + container.scrollTop) / zoom;
      const x = Math.min(startX, xRel);
      const y = Math.min(startY, yRel);
      const w = Math.abs(xRel - startX);
      const h = Math.abs(yRel - startY);
      current = { x, y, w, h };
      setSelection(current);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const downloadCrop = () => {
    if (!imgRef.current || !selection) return;
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const scale = 1 / zoom;
    canvas.width = Math.max(1, Math.floor(selection.w * scale));
    canvas.height = Math.max(1, Math.floor(selection.h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = Math.floor(selection.x * scale);
    const sy = Math.floor(selection.y * scale);
    ctx.drawImage(img, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    // Draw annotations that fall within the crop
    const inCrop = annotations
      .map((a, idx) => ({
        ...a,
        idx: idx + 1,
        cx: Math.floor(a.x * scale) - sx,
        cy: Math.floor(a.y * scale) - sy,
      }))
      .filter((a) => a.cx >= 0 && a.cy >= 0 && a.cx <= canvas.width && a.cy <= canvas.height);

    ctx.save();
    ctx.font = "bold 14px ui-sans-serif, system-ui, -apple-system";
    ctx.textBaseline = "top";
    inCrop.forEach((a) => {
      // marker circle
      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.arc(a.cx, a.cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // number label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px ui-sans-serif, system-ui";
      const num = String(a.idx);
      const tw = ctx.measureText(num).width;
      ctx.fillText(num, a.cx - tw / 2, a.cy - 6);

      // note text box
      if (a.text?.trim()) {
        const maxWidth = Math.min(260, canvas.width - a.cx - 12);
        const text = a.text.trim();
        const padding = 6;
        const lines = wrapText(ctx, text, maxWidth);
        const lineHeight = 16;
        const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding * 2;
        const boxH = lines.length * lineHeight + padding * 2;
        const bx = Math.min(Math.max(0, a.cx + 12), canvas.width - boxW);
        const by = Math.min(Math.max(0, a.cy + 12), canvas.height - boxH);
        ctx.fillStyle = "rgba(17,24,39,0.85)";
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, boxW, boxH);
        ctx.fillStyle = "#f9fafb";
        lines.forEach((l, i) => ctx.fillText(l, bx + padding, by + padding + i * lineHeight));
        // leader line
        ctx.beginPath();
        ctx.moveTo(a.cx + 8, a.cy + 8);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    ctx.restore();

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "crop-annotated.png";
    a.click();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line ? line + " " + words[n] : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n];
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  return (
    <Modal open={Boolean(src)} onClose={onClose}>
      {src && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => { setActiveTool("note"); setAddingNote(true); }} variant={activeTool === "note" ? "outline" : undefined}>
                Add Note
              </Button>
              <Button onClick={() => { setActiveTool("circle"); setAddingNote(false); }} variant={activeTool === "circle" ? "outline" : undefined}>
                Circle
              </Button>
              <Button onClick={() => { setActiveTool("arrow"); setAddingNote(false); }} variant={activeTool === "arrow" ? "outline" : undefined}>
                Arrow
              </Button>
              <Button onClick={() => { setActiveTool("click"); setAddingNote(false); }} variant={activeTool === "click" ? "outline" : undefined}>
                Click Here
              </Button>
            </div>
            <Button onClick={downloadCrop} disabled={!selection}>Save Crop</Button>
            {annotations.length > 0 && (
              <Button variant="outline" onClick={() => setAnnotations([])}>Clear Notes</Button>
            )}
          </div>
          <div
            className="relative overflow-auto border rounded"
            onMouseDown={(e) => {
              if (activeTool === "note") return;
              if (activeTool === "crop") { onDrag(e); return; }
              // place stickers on mousedown
              if (!imgRef.current) return;
              const container = e.currentTarget as HTMLDivElement;
              const rect = container.getBoundingClientRect();
              const x = (e.clientX - rect.left + container.scrollLeft) / zoom;
              const y = (e.clientY - rect.top + container.scrollTop) / zoom;
              if (activeTool === "circle" || activeTool === "arrow" || activeTool === "click") {
                setStickers((prev) => [...prev, { id: Math.random().toString(36).slice(2), kind: activeTool, x, y, scale: 1 }]);
              }
            }}
            style={{ maxHeight: "70vh" }}
            onClick={(e) => {
              if (!imgRef.current) return;
              if (activeTool !== "note") return;
              const container = e.currentTarget as HTMLDivElement;
              const rect = container.getBoundingClientRect();
              const x = (e.clientX - rect.left + container.scrollLeft) / zoom;
              const y = (e.clientY - rect.top + container.scrollTop) / zoom;
              setAnnotations((prev) => [
                ...prev,
                { x, y, text: "", id: Math.random().toString(36).slice(2) },
              ]);
              setAddingNote(false);
            }}
            ref={containerRef}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="preview" style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }} />
            {selection && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/10"
                style={{ left: selection.x * zoom, top: selection.y * zoom, width: selection.w * zoom, height: selection.h * zoom }}
              />
            )}
            {annotations.map((a, i) => (
              <div key={a.id} className="absolute" style={{ left: a.x * zoom - 8, top: a.y * zoom - 8 }}>
                <div className="h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white grid place-items-center border border-black/70">
                  {i + 1}
                </div>
                {a.text?.trim() && (
                  <div className="absolute left-6 top-0 max-w-[260px] rounded-md border bg-black/80 text-white text-xs p-2">
                    {a.text}
                    {(a.images?.length ?? 0) > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        {a.images!.slice(0,3).map((img) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={img} src={img} alt="thumb" className="h-10 w-16 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {stickers.map((s) => (
              <div key={s.id} className="absolute" style={{ left: s.x * zoom, top: s.y * zoom, transform: `translate(-50%, -50%) scale(${zoom * s.scale}) rotate(${s.rotation || 0}deg)` }}>
                {s.kind === "circle" && <CircleSticker className="h-24 w-24" />}
                {s.kind === "arrow" && <ArrowSticker className="h-20 w-32" />}
                {s.kind === "click" && <ClickHereSticker className="h-10 w-40" />}
              </div>
            ))}
          </div>
          {annotations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Notes</h3>
              <div className="grid gap-2">
                {annotations.map((a, i) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className="mt-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <textarea
                      className="min-h-[60px] w-full rounded border border-input bg-background p-2 text-sm"
                      placeholder="Describe what the user is seeing and what to do next..."
                      value={a.text}
                      onChange={(e) =>
                        setAnnotations((prev) => prev.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)))
                      }
                    />
                    <label className="text-xs whitespace-nowrap">
                      Attach image
                      <input
                        type="file"
                        accept="image/*"
                        className="block text-xs"
                        onChange={async (ev) => {
                          const file = ev.currentTarget.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.append("file", file);
                          fd.append("out", "session");
                          const res = await fetch("/api/annotations/upload", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data?.url) {
                            setAnnotations((prev) => prev.map((x) => (x.id === a.id ? { ...x, images: [...(x.images || []), data.url] } : x)));
                          }
                          ev.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      onClick={() => setAnnotations((prev) => prev.filter((x) => x.id !== a.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-3">
                {annotations.map((a, i) => (
                  <div key={a.id + "imgs"} className="flex flex-wrap gap-2 pl-7">
                    {(a.images || []).map((img, idx) => (
                      <div key={img} className="relative border rounded overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="attachment" className="h-16 w-16 object-cover" />
                        <button
                          className="absolute top-0 right-0 bg-black/60 text-white text-[10px] px-1"
                          onClick={() => setAnnotations((prev) => prev.map((x) => (x.id === a.id ? { ...x, images: (x.images || []).filter((_, j) => j !== idx) } : x)))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}


