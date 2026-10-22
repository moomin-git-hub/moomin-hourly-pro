// Ko'rgazma nusxani sinash: sahifa tayyor qobiq ichida (tashqi so'rovlar taqiqlangan holda) ochiladi.
//   node src/build.mjs --korgazma && node test/korgazma.mjs
import http from "node:http"; import fs from "node:fs";
import { launch, PHONE, DESK } from "./shot.mjs";
import { ROOT, SHOTS } from "./_env.mjs";
const frag = fs.readFileSync(ROOT + "/korgazma/vaqt-banki.html", "utf8");
// claude: "ok" — muhit fayl saqlashga ruxsat beradi; "rad" — foydalanuvchi rad etadi; yo'q — xizmat mavjud emas
const stub = (claude) => !claude ? "" : `<script>window.claude = { use: async (n) => n === "downloads" ? { save: async (r) => { if (${JSON.stringify(claude)} === "rad") throw { code: "declined", message: "rad etildi" };
  (window.__saqlangan = window.__saqlangan || []).push({ nom: r.filename, tur: typeof r.data === "string" ? "matn" : (r.data instanceof Blob ? "blob" : "boshqa"), hajm: typeof r.data === "string" ? r.data.length : r.data.size, bosh: typeof r.data === "string" ? r.data.slice(0, 40) : "" }); return { status: "saved" }; } } : null };</script>`;
const page0 = (tema, claude) => `<!doctype html><html${tema ? ` data-theme="${tema}"` : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob:; connect-src 'self'; worker-src 'none'">
<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>${stub(claude)}</head><body>
${frag}</body></html>`;
const srv = http.createServer((req, res) => { const u = new URL(req.url, "http://x"); if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(page0(u.searchParams.get("tema"), u.searchParams.get("claude"))); } else { res.writeHead(404); res.end("yo'q"); } });
await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const url = `http://127.0.0.1:${srv.address().port}/`;
let pass = 0, fail = 0; const t = (nom, ok, izoh) => { if (ok) { pass++; console.log("  ✓", nom); } else { fail++; console.log("  ✗", nom, izoh !== undefined ? "→ " + JSON.stringify(izoh) : ""); } };
const br = await launch(); const xato = [];
async function och(opt = {}) {
  const ctx = await br.newContext({ ...(opt.desk ? DESK : PHONE), colorScheme: opt.dark ? "dark" : "light", locale: "uz-UZ", timezoneId: "Asia/Tashkent" });
  const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  page.on("console", (m) => { if (m.type() === "error") xato.push(m.text()); }); page.on("pageerror", (e) => xato.push("PAGEERROR " + e.message));
  const q = new URLSearchParams(); if (opt.tema) q.set("tema", opt.tema); if (opt.claude) q.set("claude", opt.claude);
  await page.goto(url + (String(q) ? "?" + q : "")); await page.waitForTimeout(1300);
  return page;
}
const kut = async (page, fn, arg, ms = 5000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
const shot = (page, nom) => page.screenshot({ path: `${SHOTS}/kz-${nom}.png` });

const p = await och();
t("darhol ilova ochiladi (kirish ekrani ham, oyna ham yo'q)", await p.evaluate(() => !document.querySelector("#app").hidden && document.querySelector("#auth").hidden && !document.querySelector(".sheet")));
t("namuna ma'lumot bor va «Ko'rgazma nusxa» deb belgilangan", await p.evaluate(() => chiqimlar().length > 100 && namunami() && document.querySelector(".demo-b").textContent.includes("Ko'rgazma nusxa")));
t("bugungi kun hozirgi soatgacha to'ldirilgan", await p.evaluate(() => kunChiqim(bugunISO()) > 0 && kunChiqim(bugunISO()) <= 1440));
await shot(p, "home-light");
await p.click('[data-act="korgazmaHaqida"]');
t("tasma bosilsa — tushuntirish oynasi", await kut(p, () => !!document.querySelector(".sheet") && document.querySelector(".sheet h3").textContent.includes("Ko'rgazma")));
await shot(p, "haqida"); await p.click('.sheet [data-act="ovClose"]'); await p.waitForTimeout(450);
for (const tab of ["daftar", "fokus", "reja", "tahlil"]) { await p.click(`.nav-b[data-tab="${tab}"]`); await p.waitForTimeout(700); if (tab === "tahlil") await shot(p, "tahlil-light"); }
t("grafiklar chizildi", await p.evaluate(() => !!charts.taqs && !!charts.din && document.querySelector("#ch-taqs").width > 0));
await p.click('.nav-b[data-tab="asosiy"]'); await p.waitForTimeout(400);
// yozuv qo'shish ishlaydi
const n0 = await p.evaluate(() => chiqimlar().length);
await p.click(".fab-add"); await p.waitForTimeout(450); await p.fill("#eAmt", "20"); await p.click('.sheet-f [data-save="1"]');
t("yozuv qo'shish ishlaydi", await kut(p, (n) => chiqimlar().length === n + 1, n0));
await p.evaluate(() => { document.querySelector("#toasts").innerHTML = ""; });
// fayl saqlash xizmati yo'q muhitda — yolg'on xabar chiqmaydi
await p.evaluate(() => { eksportJson(); }); await p.waitForTimeout(400);
t("eksport (xizmat yo'q): «bu yerda saqlab bo'lmaydi» xabari, «yuklab olindi» chiqmaydi", await p.evaluate(() => Array.from(document.querySelectorAll(".toast")).some((x) => x.textContent.includes("fayl saqlab bo'lmaydi")) && !Array.from(document.querySelectorAll(".toast")).some((x) => x.textContent.includes("yuklab olindi"))));
await p.evaluate(() => { document.querySelector("#toasts").innerHTML = ""; });
// profil: kirish tugmasi o'rniga tushuntirish
await p.click(".avatar"); await p.waitForTimeout(500);
t("profil: ko'rgazma izohi, kirish tugmasi yo'q", await p.evaluate(() => document.querySelector(".acc").textContent.includes("ko'rgazma nusxa") && !document.querySelector('.acc [data-act="authOch"]')));
await shot(p, "profil"); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// sinxron oynasi: kirish tugmasi yo'q, izoh bor
await p.click("#syncBtn"); await p.waitForTimeout(400);
t("sinxron oynasi: izoh bor, kirish tugmasi yo'q", await p.evaluate(() => document.querySelector(".sheet").textContent.includes("ko'rgazma nusxada server yo'q") && !document.querySelector('.sheet [data-act="authOch"]')));
await shot(p, "sync"); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
t("kirish ekraniga hech qayerdan o'tilmaydi", await p.evaluate(() => !document.querySelector('[data-act="authOch"]') && document.querySelector("#auth").hidden));
// AI
await p.click(".fab-ai"); await p.waitForTimeout(450); await p.fill("#aiIn", "Salom"); await p.click("#aiSend"); await p.waitForTimeout(300);
t("AI: ko'rgazmada ishlamasligi aytiladi", await p.evaluate(() => document.querySelector("#aiMsgs").textContent.includes("Ko'rgazma sahifasida AI")));
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// nusxalash: muvaffaqiyatsiz bo'lsa ham xato chiqmaydi, yolg'on xabar bermaydi
t("nusxalash yordamchisi true/false qaytaradi (xatosiz)", typeof (await p.evaluate(() => nusxala("sinov"))) === "boolean");
// «orqaga» tuzog'i o'chirilgan
t("tarix yozuvlari qo'shilmaydi (tashqi sahifaning «orqaga» tugmasiga aralashmaydi)", (await p.evaluate(() => history.length)) <= 2, await p.evaluate(() => history.length));
// namunani olib tashlash
await p.click('[data-act="namunaToza"]'); await p.waitForTimeout(400); await p.click(".dlg [data-yes]");
t("«Namunani olib tashlash»: daftar bo'shaydi, tasma qoladi (tugmasiz)", await kut(p, () => chiqimlar().length === 0 && !namunami() && !!document.querySelector(".demo-b") && !document.querySelector('[data-act="namunaToza"]')));
await p.reload(); await p.waitForTimeout(1200);
t("qayta ochilganda namuna qaytib kelmaydi", await p.evaluate(() => chiqimlar().length === 0 && !document.querySelector(".sheet")));
// mavzu: tizim qorong'u bo'lsa qorong'u; muhit «light» desa — yorug'
const d = await och({ dark: true });
t("tizim qorong'u → sahifa qorong'u", await d.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"));
await shot(d, "home-dark");
const l = await och({ dark: true, tema: "light" });
t("muhit yorug' mavzuni tanlagan → sahifa yorug' (tizim qorong'u bo'lsa ham)", await l.evaluate(() => document.documentElement.getAttribute("data-theme") !== "dark"));
const k = await och({ tema: "dark" });
t("muhit qorong'u mavzuni tanlagan → sahifa qorong'u", await k.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"));
// muhit mavzuni sahifa ochiq turganda almashtiradi
const m = await och();
await m.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
t("ochiq turganda muhit «dark» qildi → ilova ergashdi", await kut(m, () => window.__vbTashqiMavzu === "dark" && document.documentElement.getAttribute("data-theme") === "dark" && document.querySelector('[data-act="themeCycle"] use').getAttribute("href") === "#i-sun-moon", null, 3000));
await m.evaluate(() => document.documentElement.removeAttribute("data-theme"));
t("muhit «tizimga qarab»ga qaytdi → ilova tizimga (yorug') qaytdi", await kut(m, () => window.__vbTashqiMavzu === null && document.documentElement.getAttribute("data-theme") === "light", null, 3000));
await m.click('[data-act="themeCycle"]'); await m.waitForTimeout(300);
await m.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await m.waitForTimeout(400);
t("ilovaning o'zida aniq tanlangan mavzu (yorug') ustun turadi", await m.evaluate(() => themeMode() === "light" && document.documentElement.getAttribute("data-theme") === "light"));
// fayl saqlash: muhit ruxsat bersa — zaxira, CSV va rasm shu xizmat orqali beriladi
const f = await och({ claude: "ok" });
await f.evaluate(() => eksportJson()); await f.evaluate(() => eksportCsv()); await f.evaluate(() => { heatYil = new Date().getFullYear(); A.wrapPng(); }); await f.waitForTimeout(900);
const sq = await f.evaluate(() => window.__saqlangan || []);
t("zaxira (JSON) muhit xizmati orqali saqlanadi", sq.some((x) => /^vaqt-banki-zaxira-.*\.json$/.test(x.nom) && x.tur === "matn" && x.bosh.includes("vaqt-banki")), sq);
t("jadval (CSV) va yil rasmi (PNG) ham", sq.some((x) => /\.csv$/.test(x.nom) && x.tur === "matn") && sq.some((x) => /\.png$/.test(x.nom) && x.tur === "blob" && x.hajm > 20000), sq.map((x) => [x.nom, x.tur, x.hajm]));
t("saqlangach «yuklab olindi» xabari", await f.evaluate(() => Array.from(document.querySelectorAll(".toast")).some((x) => x.textContent.includes("yuklab olindi"))));
const r = await och({ claude: "rad" });
await r.evaluate(() => eksportJson()); await r.waitForTimeout(400);
t("foydalanuvchi rad etsa — hech qanday xabar chiqmaydi", await r.evaluate(() => document.querySelectorAll(".toast").length === 0));
const w = await och({ desk: true }); await shot(w, "home-desk");
t("gorizontal toshish yo'q (telefon)", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
const begona = xato.filter((x) => !/Failed to load resource|Content Security Policy|manifest|sw\.js/i.test(x));
console.log(`\n${pass} o'tdi, ${fail} o'tmadi` + (begona.length ? "\nKONSOL XATOLARI:\n" + begona.join("\n") : "") + (xato.length - begona.length ? `\n(${xato.length - begona.length} ta kutilgan tarmoq/CSP xabari)` : ""));
if (xato.length - begona.length) console.log(xato.filter((x) => !begona.includes(x)).slice(0, 6).join("\n"));
await br.close(); srv.close(); process.exit(fail || begona.length ? 1 : 0);
