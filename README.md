Playwright Clickable Link Screenshot App
=======================================

This app crawls a given URL, clicks through all clickable elements (links, buttons, `[role="button"]`, etc.), and saves full-page screenshots for visual QA. It also provides a UI to review, crop, annotate, and manage screenshots.

Features
-
- Capture screenshots after clicking every clickable element
- Dark/light mode via Playwright colorScheme
- UI gallery at `/capture` with delete, download
- Cropper with zoom and annotation notes, chat bubbles, stickers (circle, arrow, click-here)
- API endpoints for running capture, listing screenshots, deleting images, saving annotation assets

Getting Started
-
Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install --with-deps
```

Start dev server (Turbopack):

```bash
npm run dev
```

Open:

- Home: http://localhost:3000 (or 3001 if 3000 is busy)
- Capture UI: http://localhost:3000/capture

Capture from CLI:

```bash
npm run capture -- --url=https://example.com --browser=chromium --dark=false --concurrency=2 --delay=800 --out=session
```

Screenshots are saved under `public/screenshots/<out>/` and served by the app.

PRD Summary
-
- Automate visual audit: click all links/buttons, take full-page screenshots
- Dark mode support: `colorScheme: 'dark'`
- Configurable options: browser, viewport, concurrency, delay
- Organized file naming and gallery for review

Tech
-
- Next.js App Router, TypeScript, Tailwind v4, shadcn-style components
- Playwright automation (`scripts/capture-clickables.mjs`)
