#!/usr/bin/env node
// Playwright script to capture screenshots after clicking each clickable element
// Usage: npm run capture -- --url=https://example.com --dark=false --concurrency=2 --delay=800 --browser=chromium

import { chromium, firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

function getArg(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return fallback;
  const [, value] = match.split("=");
  return value;
}

async function run() {
  const url = getArg("url", "https://example.com");
  const browserName = getArg("browser", "chromium");
  const dark = getArg("dark", "false") === "true";
  const viewport = getArg("viewport", "1280x800");
  const concurrency = parseInt(getArg("concurrency", "2"), 10);
  const delayMs = parseInt(getArg("delay", "800"), 10);
  const outFolder = getArg("out", "");
  const publicDir = path.join(process.cwd(), "public");
  const screenshotsRoot = path.join(publicDir, "screenshots");
  const outDir = outFolder
    ? path.join(screenshotsRoot, outFolder)
    : screenshotsRoot;

  const [vw, vh] = viewport.split("x").map((v) => parseInt(v, 10));
  const browserType = { chromium, firefox, webkit }[browserName] || chromium;

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: vw || 1280, height: vh || 800 },
    colorScheme: dark ? "dark" : "light",
  });
  const page = await context.newPage();
  // Normalize and collect stable snapshot of clickables (hrefs/buttons) with unique selectors
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const handles = await page.$$('[href], button, [role="button"], a, [onclick]');
  console.log(`Found ${handles.length} clickable elements`);

  // Iterate sequentially for reliability across navigations/popups
  for (let index = 0; index < handles.length; index++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const clickable = page.locator('[href], button, [role="button"], a, [onclick]').nth(index);

      // Prefer aria-label, text, or href for naming
      const textCandidates = await Promise.all([
        clickable.getAttribute('aria-label').catch(() => null),
        clickable.textContent().catch(() => null),
        clickable.getAttribute('href').catch(() => null),
        clickable.getAttribute('id').catch(() => null),
      ]);
      const raw = textCandidates.filter(Boolean)[0] || `element-${index}`;
      const label = String(raw).trim();

      await clickable.scrollIntoViewIfNeeded();

      // Handle new tabs/popups
      const popupPromise = page.context().waitForEvent('page').catch(() => null);
      const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 }).catch(() => null);
      await clickable.click({ timeout: 3000 }).catch(() => {});

      const popup = await popupPromise;
      const navigated = await navPromise;

      if (popup) {
        try {
          await popup.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          await popup.waitForTimeout(delayMs);
          const filename = `${index.toString().padStart(3, "0")}-${label
            .slice(0, 60)
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_\-]/g, "")}-${dark ? "dark" : "light"}.png`;
          await popup.screenshot({ path: path.join(outDir, filename), fullPage: true }).catch(() => {});
          console.log(`Saved (popup) ${filename}`);
          await popup.close().catch(() => {});
        } catch (e) {
          console.warn(`Popup capture failed at index ${index}:`, e?.message || e);
        }
      } else {
        // Same tab
        await page.waitForTimeout(delayMs);
        const filename = `${index.toString().padStart(3, "0")}-${label
          .slice(0, 60)
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_\-]/g, "")}-${dark ? "dark" : "light"}.png`;
        await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
        console.log(`Saved ${filename}`);
      }
    } catch (e) {
      console.warn(`Failed at index ${index}:`, e?.message || e);
    }
  }
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


