import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Playwright Click Capture</h1>
        <p className="text-sm text-muted-foreground">Go to the capture UI</p>
        <a className="underline" href="/capture">/capture</a>
      </div>
    </div>
  );
}
