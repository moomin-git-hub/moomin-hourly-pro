// Vaqt Banki — public/index.html ni manbadan (src/) yig'adi. Faqat ishlab chiqish uchun; server ishlashiga kerak emas.
//
//   node src/build.mjs              → public/index.html
//   node src/build.mjs --korgazma   → korgazma/vaqt-banki.html (serversiz ko'rib chiqish nusxasi)
//
// Kerakli kutubxonalar (bir marta):  npm i --no-save lucide-static@1.54.0 chart.js@4.5.1 @fontsource-variable/plus-jakarta-sans
// Boshqa papkada turgan bo'lsa:      VB_TOOLS=/yo'l/node_modules node src/build.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");
const TOOLS = process.env.VB_TOOLS || path.join(ROOT, "node_modules");
const rd = (p) => fs.readFileSync(p, "utf8");

// ---- manbalar ----
const head = rd(path.join(SRC, "head.html"));
const body = rd(path.join(SRC, "body.html"));
const cssFiles = fs.readdirSync(path.join(SRC, "css")).filter((f) => f.endsWith(".css")).sort();
let css = cssFiles.map((f) => rd(path.join(SRC, "css", f))).join("\n");
const jsFiles = fs.readdirSync(path.join(SRC, "js")).filter((f) => f.endsWith(".js")).sort();
let js = jsFiles.map((f) => rd(path.join(SRC, "js", f))).join("\n");
// --korgazma: serversiz ko'rib chiqish nusxasi (namuna ma'lumot bilan ochiladi) — korgazma/vaqt-banki.html
const KORGAZMA = process.argv.includes("--korgazma");
if (KORGAZMA) {
  if (!js.includes("/*KORGAZMA*/false")) throw new Error("KORGAZMA belgisi topilmadi");
  // ko'rgazmada fayl berish boshqacha (src/korgazma.js dagi faylBer) — oddiy yuklab berish kodi olib tashlanadi
  const a0 = js.indexOf("/*FAYL-BER*/"), a1 = js.indexOf("/*FAYL-BER-OXIRI*/");
  if (a0 < 0 || a1 < a0) throw new Error("FAYL-BER belgisi topilmadi");
  js = js.slice(0, a0) + js.slice(a1 + "/*FAYL-BER-OXIRI*/".length);
  js = js.replace("/*KORGAZMA*/false", "true").replace("\n// ============================ 8. ISHGA TUSHIRISH", () => rd(path.join(SRC, "korgazma.js")) + "\n// ============================ 8. ISHGA TUSHIRISH");
}

// ---- SEED: namuna ma'lumot (Profil → Zaxira va ma'lumotlar → «Namuna yuklash») ----
const seedJson = rd(path.join(SRC, "seed.json")).trim();
JSON.parse(seedJson);
js = js.replace("/*SEED*/[]", () => seedJson);

// ---- shrift (base64) ----
const fontB64 = fs.readFileSync(path.join(TOOLS, "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2")).toString("base64");
css = css.replace("/*FONT_SRC*/", `url(data:font/woff2;base64,${fontB64}) format("woff2")`);

// ---- ikonkalar sprite ----
const extra = rd(path.join(SRC, "icons.txt")).split(/\s+/).filter(Boolean);
const used = new Set(extra);
const all = head + body + js;
for (const m of all.matchAll(/\bic\(\s*["']([a-z0-9-]+)["']/g)) used.add(m[1]);
// shartli tanlanadigan ikonkalar: ic(shart ? "a" : "b") — ichidagi har bir nom (ikonka fayli bor bo'lsa) qo'shiladi
for (const m of all.matchAll(/\bic\(([^)]*)\)/g)) for (const q of m[1].matchAll(/["']([a-z][a-z0-9-]+)["']/g)) if (fs.existsSync(path.join(TOOLS, "lucide-static/icons", q[1] + ".svg"))) used.add(q[1]);
for (const m of all.matchAll(/href="#i-([a-z0-9-]+)"/g)) used.add(m[1]);
for (const m of all.matchAll(/\b(?:icon|ic|em)\s*:\s*["']([a-z][a-z0-9-]+)["']/g)) used.add(m[1]);
const iconDir = path.join(TOOLS, "lucide-static/icons");
let sprite = "";
const missing = [];
for (const name of [...used].sort()) {
  const f = path.join(iconDir, name + ".svg");
  if (!fs.existsSync(f)) { missing.push(name); continue; }
  const inner = rd(f).replace(/<!--[\s\S]*?-->/g, "").replace(/<svg[\s\S]*?>/, "").replace(/<\/svg>/, "").replace(/\s*\n\s*/g, "").replace(/\s+\/>/g, "/>").trim();
  sprite += `<symbol id="i-${name}" viewBox="0 0 24 24">${inner}</symbol>`;
}
if (missing.length) throw new Error("Ikonka topilmadi: " + missing.join(", "));

// ---- Chart.js ----
const chart = rd(path.join(TOOLS, "chart.js/dist/chart.umd.min.js")).replace(/\/\/# sourceMappingURL=.*$/m, "");

// ---- JS sintaksis tekshiruvi ----
const tmp = path.join(os.tmpdir(), "vaqt-banki-app.check.js");
fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" }); }
catch (e) { console.error(String(e.stderr || e)); process.exit(1); }
finally { try { fs.unlinkSync(tmp); } catch (e) {} }

// ---- yig'ish ----
const spriteSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${sprite}</defs></svg>`;
const chartTag = `<script>\n/*! Chart.js v4 — (c) Chart.js Contributors — MIT License */\n${chart}\n</script>`;
if (KORGAZMA) {
  // Sahifa tayyor qobiq ichiga qo'yiladi, shuning uchun <html>/<head>/<body> teglarisiz: sarlavha, uslub, mavzu, tana, skriptlar
  const mavzu = head.match(/<script>[\s\S]*?<\/script>/)[0];
  const out = [
    "<title>Vaqt Banki</title>",
    `<style>\n${css}\n</style>`,
    mavzu,
    body.replace(/^<body>\s*/, "").replace("<!--SPRITE-->", () => spriteSvg),
    chartTag,
    `<script>\n${js}\n</script>`,
    "",
  ].join("\n");
  fs.mkdirSync(path.join(ROOT, "korgazma"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "korgazma", "vaqt-banki.html"), out);
  console.log(`OK  korgazma/vaqt-banki.html ${(out.length / 1024).toFixed(0)} KB`);
} else {
  const out = [
    head.replace("/*CSS*/", () => css),
    body.replace("<!--SPRITE-->", () => spriteSvg),
    chartTag,
    `<script>\n${js}\n</script>`,
    `<script>
/* Oflayn ishlash va tez ochilish (PWA) — faqat HTTPS yoki localhost'da. Batafsil: sw.js */
if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  navigator.serviceWorker.addEventListener("message",e=>{
    if(!e.data || e.data.t!=="yangi-versiya") return;
    // ilova endigina ochilgan va hech narsa yozilmayotgan bo'lsa — yangi versiyaga darhol o'tiladi
    if(performance.now()<15000 && !document.querySelector("#overlays .ov") && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))){ location.reload(); return; }
    if(typeof toast==="function")
      toast(ic("download")+"<span>Yangi versiya tayyor</span>",{ms:15000,amal:{matn:"Yangilash",fn:()=>location.reload()}});
  });
}
</script>`,
    "</body>\n</html>\n",
  ].join("\n");
  fs.writeFileSync(path.join(ROOT, "public", "index.html"), out);
  console.log(`OK  index.html ${(out.length / 1024).toFixed(0)} KB · css ${(css.length / 1024).toFixed(0)} KB · js ${(js.length / 1024).toFixed(0)} KB · ikonkalar ${used.size} (${(sprite.length / 1024).toFixed(0)} KB)`);
}
