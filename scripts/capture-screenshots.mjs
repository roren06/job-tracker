/**
 * Capture portfolio screenshots from the running dev app.
 * Prerequisites: client on :5173, server on :4000
 * Run: node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "screenshots");
const baseUrl = process.env.APP_URL || "http://localhost:5173";

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

await context.addInitScript(() => {
  localStorage.setItem("jobtracker_theme", "dark");
});

const page = await context.newPage();

async function shot(name, options = {}) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, type: "png", ...options });
  console.log("Saved", file);
}

console.log("Capturing from", baseUrl);

// 1. Landing
await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await shot("landing.png");

// 2. Board (demo)
await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
await page.waitForSelector(".boardCard", { timeout: 20000 });
await page.waitForTimeout(800);
await shot("board.png");

// 3. Analytics
await page.goto(`${baseUrl}/analytics`, { waitUntil: "networkidle" });
await page.waitForSelector(".analyticsGrid", { timeout: 20000 });
await page.waitForTimeout(800);
await shot("analytics.png");

// 4. Drawer (double-click card)
await page.goto(`${baseUrl}/board`, { waitUntil: "networkidle" });
await page.waitForSelector(".boardCard", { timeout: 20000 });
await page.locator(".boardCard").first().dblclick();
await page.waitForSelector(".drawerPanel", { timeout: 10000 });
await page.waitForTimeout(600);
await page.locator(".drawerPanel").screenshot({ path: path.join(outDir, "drawer.png"), type: "png" });
console.log("Saved", path.join(outDir, "drawer.png"));

// 5. Drawer with AI expanded (scroll to bottom)
await page.locator(".drawerSectionHeader").click();
await page.waitForSelector(".drawerSectionBody", { timeout: 5000 });
await page.waitForTimeout(400);
await page.locator(".drawerPanel").evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(400);
await page.locator(".drawerPanel").screenshot({ path: path.join(outDir, "ai-drawer.png"), type: "png" });
console.log("Saved", path.join(outDir, "ai-drawer.png"));

await browser.close();
console.log("Done.");
