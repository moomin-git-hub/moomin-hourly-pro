// Statik ko'rinish sinovi: public/ ni oddiy server bilan ochib, skrinshot oladi
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { demoData } from "./demo-data.mjs";
import { ROOT, SHOTS, toolsRequire } from "./_env.mjs";
const { chromium } = toolsRequire("playwright");
const PUB = path.join(ROOT, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
export function serve(port = 0) {
  return new Promise((res) => { const s = http.createServer((req, rsp) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const f = path.join(PUB, p);
      if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end("yo'q"); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(rsp); });
    s.listen(port, "127.0.0.1", () => res(s)); });
}
// GPU (SwiftShader) yoqilgan: aks holda backdrop-filter (liquid glass xiraligi) skrinshotda chizilmaydi
export async function launch() { return chromium.launch({ executablePath: process.env.CHROME || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-gpu"] }); }
export const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const DESK = { viewport: { width: 1320, height: 860 }, deviceScaleFactor: 1 };

if (process.argv[1].endsWith("shot.mjs")) {
  const [, , name = "home", theme = "light", dev = "phone", tab = "asosiy"] = process.argv;
  const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/`;
  const br = await launch(); const ctx = await br.newContext({ ...(dev === "desk" ? DESK : PHONE), colorScheme: theme === "dark" ? "dark" : "light", locale: "uz-UZ", timezoneId: "Asia/Tashkent" });
  const page = await ctx.newPage(); const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
  const NOW = new Date(process.env.TIME || "2026-10-10T21:40:00+05:00");
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(({ data, theme }) => { if (!localStorage.getItem("vbLocal")) { localStorage.setItem("vaqtBanki2026", JSON.stringify(data)); localStorage.setItem("vbLocal", "1"); localStorage.setItem("vbTheme", theme); } }, { data: demoData(24, new Date(NOW.getTime() + 5 * 3600e3 + new Date().getTimezoneOffset() * 60e3)), theme });
  await page.goto(url); await page.waitForTimeout(700);
  if (tab !== "asosiy") { await page.click(`.nav-b[data-tab="${tab}"]`); await page.waitForTimeout(500); }
  const steps = process.env.STEPS ? JSON.parse(process.env.STEPS) : [];
  for (const s of steps) { if (s.click) await page.click(s.click); if (s.fill) await page.fill(s.fill[0], s.fill[1]); if (s.eval) await page.evaluate(s.eval); await page.waitForTimeout(s.wait || 450); }
  const out = `${SHOTS}/${name}.png`;
  await page.screenshot({ path: out, fullPage: process.env.FULL === "1" });
  console.log("saved", out, errs.length ? "\nERRORS:\n" + errs.join("\n") : "· no console errors");
  await br.close(); srv.close();
}
