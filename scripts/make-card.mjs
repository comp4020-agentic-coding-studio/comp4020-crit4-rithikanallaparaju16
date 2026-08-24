// Renders public/card.png -- the 1200x630 image a shared link shows -- from
// the instrument itself, so the card can never drift from what the page
// actually looks like. Posed in a played state (keys struck, loop armed)
// because a card of the untouched surface reads as an empty dark rectangle.
//
// Playwright isn't a dependency of this repo -- the card only needs
// regenerating when the visual design changes -- so install it ad hoc. Node
// resolves imports from the script's own directory, so run the copy that sits
// next to node_modules, not this one:
//
//   pnpm dev --port 5182
//   mkdir -p /tmp/pw && cd /tmp/pw
//   npm i playwright && npx playwright install chromium
//   cp <repo>/scripts/make-card.mjs . && node make-card.mjs \
//     http://localhost:5182/ <repo>/public/card.png

import { chromium } from "playwright";

const [url = "http://localhost:5173/", out = "public/card.png"] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2, // 2400x1260 -- crisp on retina and when feeds downscale
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("#instrument");

await page.evaluate(() => {
  // The card should show the instrument, not the layer that explains it.
  document.querySelector('[data-testid="intro-overlay"]')?.classList.add("is-dismissed");
  document.querySelector('[data-testid="help"]')?.setAttribute("hidden", "");

  const key = (band, column) =>
    document.querySelector(`[data-band-container="${band}"] [data-column="${column}"]`);

  for (const [band, column] of [
    ["bells", 2],
    ["bells", 5],
    ["marimba", 1],
    ["marimba", 3],
    ["marimba", 6],
    ["bass", 0],
    ["bass", 4],
  ]) {
    key(band, column)?.classList.add("is-armed");
  }

  key("marimba", 3)?.classList.add("is-active");
  key("bells", 5)?.classList.add("is-active");
  key("marimba", 6)?.classList.add("is-echo");
  key("bass", 0)?.classList.add("is-echo");

  const pulse = document.querySelector('[data-testid="loop-pulse"]');
  pulse?.classList.add("is-running");
  const fill = document.querySelector(".pulse-fill");
  if (fill) fill.style.transform = "scaleX(0.58)";

  // the fallback hint is a desktop-only artefact, not part of the instrument
  document.querySelector('[data-testid="tilt-hint"]')?.setAttribute("hidden", "");
  // a little roll, so the attitude indicator reads as live rather than decorative
  document
    .querySelector('[data-testid="horizon-line"]')
    ?.setAttribute("transform", "rotate(-7 50 20) translate(0 -2.5)");
});

await page.waitForTimeout(400); // let the armed-dot animation settle
await page.screenshot({ path: out });
await browser.close();

console.log(`wrote ${out}`);
