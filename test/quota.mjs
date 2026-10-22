// Brauzer xotirasi to'lganda: avto zaxiralar bo'shatilib, yozuv baribir saqlanishini tekshiradi.
import { serve, launch, PHONE } from "./shot.mjs";
import { demoData } from "./demo-data.mjs";
const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/`;
const br = await launch(); const ctx = await br.newContext({ ...PHONE }); const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.addInitScript((data) => { if (!localStorage.getItem("vbLocal")) { localStorage.setItem("vaqtBanki2026", JSON.stringify(data)); localStorage.setItem("vbLocal", "1"); localStorage.setItem("vbOnboarded", "1"); } }, demoData(300, new Date()));
await page.goto(url); await page.waitForTimeout(900);
let pass = 0, fail = 0; const t = (nom, ok, izoh) => { if (ok) { pass++; console.log("  ✓", nom); } else { fail++; console.log("  ✗", nom, izoh !== undefined ? "→ " + JSON.stringify(izoh) : ""); } };
// xotirani eski "zaxiralar" bilan to'ldiramiz (kvota tugaguncha)
const tol = await page.evaluate(() => { const blok = "x".repeat(400000); let n = 0; try { for (let i = 0; i < 60; i++) { localStorage.setItem("vbBk:2025-" + String(i + 10), blok); n++; } } catch (e) {} let qoldi = 0; try { localStorage.setItem("vbBk:2025-99", "y".repeat(200000)); qoldi = 1; } catch (e) {} return { n, qoldi, jami: Object.keys(localStorage).reduce((a, k) => a + localStorage.getItem(k).length, 0) }; });
t("xotira to'ldirildi", tol.n > 5, tol);
const oldin = await page.evaluate(() => chiqimlar().length);
// katta yozuvlar to'plami qo'shiladi — bo'sh joyga sig'maydi
const natija = await page.evaluate(() => { const list = []; for (let i = 0; i < 3000; i++) list.push({ sana: "2024-01-" + String(1 + (i % 28)).padStart(2, "0"), kat: "05 Kitob o'qishga", daqiqa: 5, izoh: "kvota sinovi " + i + " " + "z".repeat(60) }); const r = entryAdd(list); return { qoshildi: r.ids.length, xotirada: JSON.parse(localStorage.getItem("vaqtBanki2026")).length, zaxira: Object.keys(localStorage).filter((k) => k.startsWith("vbBk:")).length }; });
t("joy yetmaganda avto zaxiralar bo'shatildi", natija.zaxira === 0, natija);
t("yozuvlar xotiraga to'liq saqlandi", natija.xotirada === oldin + 3000 && natija.qoshildi === 3000, natija);
await page.reload(); await page.waitForTimeout(900);
t("qayta ochilganda hammasi joyida", (await page.evaluate(() => chiqimlar().length)) === oldin + 3000);
// zaxira soni hajmga qarab
const bk = await page.evaluate(() => { bkSnap(); return { hajm: localStorage.getItem("vaqtBanki2026").length, nechta: bkNechta(), bor: bkList().length }; });
t("zaxiralar soni hajmga mos (kichik daftar — 3 tagacha, katta — kamroq)", bk.bor <= bk.nechta && bk.bor >= (bk.nechta ? 1 : 0), bk);
console.log(`\n${pass} o'tdi, ${fail} o'tmadi` + (errs.length ? "\nXATO: " + errs.join("; ") : ""));
await br.close(); srv.close(); process.exit(fail || errs.length ? 1 : 0);
