// Ko'rinish sinovi: bitta brauzerda barcha ekran va oynalarni aylanib, skrinshot oladi.
//   node test/tour.mjs <light|dark> <phone|desk> [kiril] [faqat,nomlar]
import { serve, launch, PHONE, DESK } from "./shot.mjs";
import { demoData } from "./demo-data.mjs";
import { SHOTS } from "./_env.mjs";
const [, , theme = "light", dev = "phone", alifbo = "lotin", faqat = ""] = process.argv;
const only = faqat ? new Set(faqat.split(",")) : null;
const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/`;
const br = await launch();
const ctx = await br.newContext({ ...(dev === "desk" ? DESK : PHONE), colorScheme: theme === "dark" ? "dark" : "light", locale: "uz-UZ", timezoneId: "Asia/Tashkent" });
const page = await ctx.newPage(); const errs = [];
page.setDefaultTimeout(5000);
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
const NOW = new Date(process.env.TIME || "2026-10-10T21:40:00+05:00");
// OQIM=1 — soat belgilangan vaqtdan boshlab oqadi (animatsiyalarni tekshirish uchun); aks holda qotirilgan
if (process.env.OQIM) await page.clock.install({ time: NOW }); else await page.clock.setFixedTime(NOW);
const data = demoData(+(process.env.DAYS || 24), new Date(NOW.getTime() + 5 * 3600e3 + new Date().getTimezoneOffset() * 60e3));
await page.addInitScript(({ data, theme, alifbo }) => {
  if (!localStorage.getItem("vbLocal")) {
    localStorage.setItem("vaqtBanki2026", JSON.stringify(data)); localStorage.setItem("vbLocal", "1"); localStorage.setItem("vbTheme", theme); localStorage.setItem("vbOnboarded", "1");
    const days = [...new Set(data.map((r) => r.sana))].sort(); const kayf = {}; days.forEach((d, i) => { kayf[d] = 2 + ((i * 7) % 4); });
    localStorage.setItem("vaqtBankiCfg2026", JSON.stringify({ sozlama: { eslatma: true, vaqt: "21:00", som: 350, tovush: false, vibra: false, effekt: false, alifbo: alifbo === "kiril" ? "kiril" : "lotin", mavsum: "oddiy" },
      toifalar: [{ nom: "33 Ingliz tili", guruh: "rivoj", icon: "languages" }, { nom: "34 Velosiped", guruh: "soglik", icon: "bike" }],
      jamgarma: [{ id: "j1", nom: "Kitob yili", guruh: "rivoj", soat: 400 }, { id: "j2", nom: "Sport", guruh: "soglik", soat: 20 }],
      rejaKun: { [days[days.length - 1]]: { uyqu: 450, ish: 480, rivoj: 120, soglik: 40 } }, kayfiyat: kayf, nishonBer: [] }));
  }
}, { data, theme, alifbo });
await page.goto(url); await page.waitForTimeout(800);
const tag = `${theme}-${dev}${alifbo === "kiril" ? "-kiril" : ""}`;
const w = (ms = 450) => page.waitForTimeout(ms);
let n = 0, t_vaqt = null; const yoqIkon = new Set();
const ikonTekshir = async () => { for (const h of await page.evaluate(() => { const bor = new Set(Array.from(document.querySelectorAll("symbol"), (s) => s.id)); const out = new Set(); document.querySelectorAll("use").forEach((u) => { const h = (u.getAttribute("href") || "").slice(1); if (h && !bor.has(h)) out.add(h); }); return [...out]; })) yoqIkon.add(h); };
async function shot(nom, opt = {}) {
  await ikonTekshir();
  if (only && !only.has(nom)) return;
  await page.screenshot({ path: `${SHOTS}/t-${tag}-${nom}.png`, fullPage: !!opt.full }); n++;
}
const tozaToast = () => page.evaluate(() => { document.querySelector("#toasts").innerHTML = ""; });      // sinov xabarchalari keyingi skrinshotga tushmasin
const esc = async () => { await page.keyboard.press("Escape"); await w(420); };
const tab = async (t) => { await page.click(`.nav-b[data-tab="${t}"]`); await w(600); };
const scrollTo = async (y) => { await page.evaluate((y) => window.scrollTo(0, y), y); await w(250); };
const act = async (sel) => { await page.click(sel); await w(480); };
async function step(nom, fn) { const t0 = Date.now(); try { await fn(); } catch (e) { errs.push(`[${nom}] ${String(e.message).split("\n")[0]}`); for (let i = 0; i < 8 && (await page.evaluate(() => Ov.length)); i++) await esc(); }
  if (process.env.LOG) console.log("  ·", nom, Date.now() - t0, "ms"); }

await step("home", async () => { await shot("01-home"); await shot("01-home-full", { full: true }); });
await step("entry", async () => { await act(".fab-add"); await page.fill("#eAmt", "45"); await w(200); await shot("02-entry"); await page.evaluate(() => { const b = document.querySelector(".sheet-b"); b.scrollTop = 9999; }); await w(200); await shot("02-entry-b");
  await act("#eKat"); await shot("03-katpick"); await page.fill(".kat-sheet input[type=search]", "ki"); await w(250); await shot("03-katpick-q"); await esc();
  await act("#eSana"); await shot("04-datepick"); await esc();
  await act("#eVaqtB"); await shot("04-vaqt-soat"); await act('.vt-k[data-h="9"]'); await shot("04-vaqt-daq"); await act('.vt-k[data-m="30"]'); await act(".vt-sheet [data-ok]");
  t_vaqt = await page.evaluate(() => [document.querySelector("#eVaqt").value, document.querySelector("#eTug").value]); await shot("04-vaqt-tanlandi"); await esc(); });
await step("edit", async () => { await page.click('#scr-asosiy [data-act="entryEdit"]'); await w(480); await shot("05-entry-edit"); await esc(); });
await step("tpl", async () => { await act('#scr-asosiy [data-act="shablonlar"]'); await shot("06-shablonlar"); await esc(); });
await step("menu", async () => { await act('[data-act="homeMenu"]'); await shot("07-home-menu"); await esc(); });
await step("hafta", async () => { await page.evaluate(() => { A.haftaSheet(); }); await w(500); await shot("08-hafta"); await page.evaluate(() => { document.querySelector(".sheet-b").scrollTop = 9999; }); await w(200); await shot("08-hafta-b"); await esc(); });
await step("wrap", async () => { await page.evaluate(() => { A.wrapSheet(); }); await w(500); await shot("09-wrap"); await esc(); });
await step("ai", async () => { await page.evaluate(() => { A.aiOpen(); }); await w(500); await shot("10-ai"); await esc(); });
await step("sync", async () => { await act("#syncBtn"); await shot("11-sync"); await esc(); });
await step("toast", async () => { await page.click('#scr-asosiy [data-act="tplAdd"]'); await w(500); await shot("12-toast"); await page.click(".toast button"); await w(300);
  await page.evaluate(() => { A.shablonlar(); }); await w(450); await page.evaluate(() => toast(ic("check") + "<span>Shablon qo'shildi</span>")); await w(400); await shot("13-toast-sheet"); await esc(); await tozaToast(); });
await step("daftar", async () => { await tab("daftar"); await shot("20-daftar"); await shot("20-daftar-full", { full: true }); await page.fill("#daftarQ", "ingliz"); await w(350); await shot("21-daftar-q"); await page.fill("#daftarQ", ""); await w(200);
  await act('[data-act="dMenu"]'); await shot("22-daftar-menu"); await esc(); });
await step("fokus", async () => { await tab("fokus"); await shot("30-fokus"); await page.click('[data-act="fToggle"]'); await page.evaluate(() => { S.timer.start = nowTs() - 23 * 60000 - 14000; }); await w(600); await shot("31-fokus-run");
  await tab("asosiy"); await shot("32-mini"); await page.evaluate(() => toast(ic("check") + "<span><b>15 tanga</b> · Saharlik</span>", { undo() {} })); await w(400); await shot("32-mini-toast"); await tozaToast(); await tab("fokus"); await page.click('[data-act="fToggle"]'); await w(300); await page.evaluate(() => timerReset()); await w(300);
  await page.click('[data-act="fMode"][data-m="fokus"]'); await w(400); await shot("33-pomo"); await page.click('[data-act="fMode"][data-m="oddiy"]'); await w(300); });
await step("reja", async () => { await tab("reja"); await shot("40-reja"); await shot("40-reja-full", { full: true });
  await act('[data-act="budEdit"][data-g="uyqu"]'); await shot("41-bud-edit"); await esc();
  await act('[data-act="kunRejaEdit"]'); await shot("42-kunreja"); await esc();
  await page.click('[data-act="rTab"][data-t="maqsad"]'); await w(450); await shot("43-maqsad"); await shot("43-maqsad-full", { full: true });
  await act('[data-act="jmEdit"]'); await shot("44-jm-edit"); await act("#jG"); await shot("45-pickoption"); await esc(); await esc();
  await page.click('[data-act="rTab"][data-t="qarz"]'); await w(450); await shot("46-qarz"); await page.click('[data-act="rTab"][data-t="byudjet"]'); await w(300); });
await step("tahlil", async () => { await tab("tahlil"); await w(700); await shot("50-tahlil"); await shot("50-tahlil-full", { full: true });
  await page.click('[data-act="chJadval"][data-id="taqs"]'); await w(400); const y = await page.evaluate(() => document.querySelector("#ck-taqs").getBoundingClientRect().top + scrollY - 90); await scrollTo(y); await shot("51-tahlil-jadval"); await page.click('[data-act="chJadval"][data-id="taqs"]'); await w(300);
  await page.click('[data-act="tDavr"][data-d="7"]'); await w(700); await scrollTo(0); await shot("52-tahlil-7", { full: true }); await page.click('[data-act="tDavr"][data-d="30"]'); await w(400); });
await step("profil", async () => { await tab("asosiy"); await act(".avatar"); await shot("60-profil"); await page.evaluate(() => { document.querySelector(".page").scrollTop = 700; }); await w(250); await shot("60-profil-b"); await page.evaluate(() => { document.querySelector(".page").scrollTop = 99999; }); await w(250); await shot("60-profil-c");
  await page.evaluate(() => { A.toifalarPage(); }); await w(500); await shot("61-toifalar"); await page.click(".page:last-child [data-yangi]"); await w(480); await page.fill("#tNom", "Dasturlash"); await shot("62-toifa-yangi"); await esc(); await esc();
  await page.evaluate(() => { A.malumotPage(); }); await w(500); await shot("63-malumot"); await page.evaluate(() => { const p = document.querySelectorAll(".page"); p[p.length - 1].scrollTop = 99999; }); await w(250); await shot("63-malumot-b"); await esc();
  await page.evaluate(() => { A.yangiliklarPage(); }); await w(500); await shot("64-yangiliklar"); await esc();
  await page.evaluate(() => { A.somEdit(); }); await w(480); await shot("65-som"); await esc();
  await page.evaluate(() => { A.aiKalit(); }); await w(480); await shot("66-aikalit"); await esc();
  await page.evaluate(() => { A.pMavzu(); }); await w(480); await shot("67-mavzu"); await esc();
  await page.evaluate(() => { confirmDlg({ danger: true, icon: "trash-2", title: "Barcha yozuvlar o'chirilsinmi?", text: "<b>312</b> ta yozuv butunlay o'chadi. Avval zaxira olib qo'yishingiz mumkin.", ok: "Hammasini o'chirish", alt: "Avval zaxira olish" }); }); await w(450); await shot("68-confirm"); await esc(); await esc(); });
await step("auth", async () => { await page.evaluate(() => { authKor("kir"); }); await w(900); await shot("70-auth"); await page.click('[data-act="authMode"][data-m="royxat"]'); await w(300); await shot("71-auth-royxat");
  await page.click('[data-act="authMode"][data-m="kir"]'); await w(200); await page.click('[data-act="authMode"][data-m="tikla"]'); await w(300); await shot("72-auth-tikla"); await page.click('[data-act="authSkip"]'); await w(500); });
await step("lock", async () => { await page.evaluate(async () => { localStorage.setItem("vbPin", "4:" + await vbHash("pin:1234")); Sync.user = { id: "u", email: "normomin@example.uz", name: "Normo'min" }; lockKor(); }); await w(400); await page.click('.pin-pad [data-n="1"]'); await page.click('.pin-pad [data-n="2"]'); await w(200); await shot("73-lock");
  await page.click('.pin-pad [data-n="3"]'); await page.click('.pin-pad [data-n="4"]'); await w(400); await page.evaluate(() => { localStorage.removeItem("vbPin"); Sync.user = null; render(); }); });
await ikonTekshir(); const yoq = [...yoqIkon];
// gorizontal toshish tekshiruvi
const tosh = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth - innerWidth : 0);
if (t_vaqt) console.log("vaqt tanlandi:", t_vaqt.join(" → "));
console.log(`${tag}: ${n} ta skrinshot` + (yoq.length ? ` · YO'Q IKONKALAR: ${yoq.join(", ")}` : "") + (tosh ? ` · GORIZONTAL TOSHISH ${tosh}px` : "") + (errs.length ? "\nXATOLAR:\n" + errs.join("\n") : " · xatosiz"));
await br.close(); srv.close();
