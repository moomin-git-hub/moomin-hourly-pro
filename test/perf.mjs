// Katta hajmli ma'lumot bilan tezlik sinovi:  node test/perf.mjs [kunlar]
import { serve, launch, PHONE } from "./shot.mjs";
import { demoData } from "./demo-data.mjs";
const days = +(process.argv[2] || 1500);
const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/`;
const br = await launch(); const ctx = await br.newContext({ ...PHONE }); const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
const data = demoData(days, new Date());
await page.addInitScript((data) => { if (!localStorage.getItem("vbLocal")) { localStorage.setItem("vaqtBanki2026", JSON.stringify(data)); localStorage.setItem("vbLocal", "1"); localStorage.setItem("vbOnboarded", "1"); } }, data);
// telefon tezligiga yaqinlashtirish: protsessor 4 marta sekinlashtiriladi
const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
const t0 = Date.now(); await page.goto(url); await page.waitForFunction(() => typeof S !== "undefined" && !document.querySelector("#app").hidden && !document.querySelector("#boot"), null, { timeout: 30000 });
const yuk = Date.now() - t0;
const r = await page.evaluate(async () => {
  const out = { yozuv: S.yozuvlar.length, kun: kunlar().length, hajmKB: Math.round(localStorage.getItem("vaqtBanki2026").length / 1024) };
  const olch = (nom, fn) => { const t = performance.now(); fn(); out[nom] = Math.round(performance.now() - t); };
  olch("indeks", () => { invalidateIdx(); idx(); });
  for (const t of ["asosiy", "daftar", "fokus", "reja", "tahlil"]) { curTab = t; for (const k of TABLAR) document.querySelector("#scr-" + k).hidden = k !== t; invalidateIdx(); olch("chiz_" + t, () => renderNow()); }
  tahlilDavr = "hammasi"; olch("chiz_tahlil_hammasi", () => renderNow());
  curTab = "daftar"; daftar.oy = "hammasi"; olch("chiz_daftar_hammasi", () => renderNow());
  daftar.q = "ingliz"; olch("daftar_qidiruv", () => A.dQ({ value: "ingliz" }));
  curTab = "asosiy"; olch("yozuv_qoshish", () => { entryAdd([{ sana: bugunISO(), kat: "05 Kitob o'qishga", daqiqa: 10, izoh: "" }]); renderNow(); });
  olch("saqlash", () => saqlaY());
  return out;
});
console.log(JSON.stringify({ kunlar: days, sahifa_ochilishi_ms: yuk, ...r }, null, 1), errs.length ? "XATO: " + errs.join("; ") : "");
await br.close(); srv.close();
