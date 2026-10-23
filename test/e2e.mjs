// Brauzer sinovi: haqiqiy server + PostgreSQL bilan kirish, sinxron, oflayn navbat, ko'chirish.
import fs from "node:fs";
import { launch, serve, PHONE, DESK } from "./shot.mjs";
import { ROOT, SHOTS } from "./_env.mjs";
const BASE = process.env.BASE || "http://127.0.0.1:4311";
let pass = 0, fail = 0; const xatolar = [];
const t = (nom, shart, izoh) => { if (shart) { pass++; console.log("  ✓", nom); } else { fail++; console.log("  ✗", nom, izoh !== undefined ? "→ " + JSON.stringify(izoh) : ""); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const br = await launch();
async function qurilma(nom, opt = {}) {
  const ctx = await br.newContext({ ...(opt.desk ? DESK : PHONE), colorScheme: opt.dark ? "dark" : "light", locale: "uz-UZ", timezoneId: "Asia/Tashkent" });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|WebSocket connection/.test(m.text())) xatolar.push(`[${nom}] ${m.text()}`); });
  page.on("pageerror", (e) => xatolar.push(`[${nom}] PAGEERROR ${e.message}`));
  if (opt.ls) await page.addInitScript((ls) => { if (!sessionStorage.getItem("_seeded")) { for (const k in ls) localStorage.setItem(k, ls[k]); sessionStorage.setItem("_seeded", "1"); } }, opt.ls);
  await page.goto(BASE + "/"); await page.waitForTimeout(500);
  return { ctx, page, nom };
}
const kut = async (page, fn, arg, ms = 6000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (e) { return false; } };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const holat = (page) => ev(page, () => ({ sync: Sync.holat, n: chiqimlar().length, out: navbatSoni(), uid: Meta.uid, rev: Meta.rev, token: !!Sync.token }));
const shot = (page, nom) => page.screenshot({ path: `${SHOTS}/${nom}.png` });
async function royxat(q, ism, email, parol) {
  await q.page.click('[data-act="authMode"][data-m="royxat"]'); await q.page.fill("#aIsm", ism); await q.page.fill("#aEmail", email); await q.page.fill("#aParol", parol);
  await q.page.click("#authBtn"); return kut(q.page, () => !document.querySelector("#app").hidden && Sync.holat === "jonli", null, 9000);
}
async function kir(q, email, parol) {
  await q.page.fill("#aEmail", email); await q.page.fill("#aParol", parol); await q.page.click("#authBtn");
  return kut(q.page, () => !document.querySelector("#app").hidden, null, 9000);
}
const yopSheet = async (page) => { await page.keyboard.press("Escape"); await page.waitForTimeout(420); };

try {
  // ============================================================
  console.log("A. Yangi foydalanuvchi");
  const A = await qurilma("A");
  t("birinchi ochilishda kirish ekrani", await ev(A.page, () => !document.querySelector("#auth").hidden && document.querySelector("#app").hidden));
  t("server holati: tayyor", await kut(A.page, () => document.querySelector("#aSrvH").textContent.includes("tayyor")));
  await shot(A.page, "e2e-auth");
  await A.page.fill("#aEmail", "xato"); await A.page.fill("#aParol", "123456"); await A.page.click("#authBtn"); await A.page.waitForTimeout(200);
  t("noto'g'ri email: xabar chiqadi", (await A.page.textContent("#authErr")).includes("Email"));
  await A.page.fill("#aEmail", "yoq@test.uz"); await A.page.click("#authBtn");
  t("yo'q hisob: server xabari ko'rsatiladi", await kut(A.page, () => document.querySelector("#authErr").textContent.includes("noto'g'ri")));
  t("ro'yxatdan o'tish → ilova ochiladi, jonli sinxron", await royxat(A, "Normo'min", "mumin@test.uz", "sir-parol-1"), await holat(A.page).catch(() => null));
  t("tanishtiruv oynasi chiqadi", await kut(A.page, () => !!document.querySelector(".sheet") && document.querySelector(".sheet h3").textContent.includes("xush kelibsiz")));
  await shot(A.page, "e2e-welcome"); await yopSheet(A.page);
  t("sarlavhada ism", (await A.page.textContent(".hello b")) === "Normo'min");
  // yozuv qo'shish
  await A.page.click(".fab-add"); await A.page.waitForTimeout(450);
  await A.page.fill("#eAmt", "45");
  const vaqtTanla = async (btn, h, m) => { await A.page.click(btn); await A.page.waitForTimeout(400); await A.page.click(`.vt-k[data-h="${h}"]`); await A.page.click(`.vt-k[data-m="${m}"]`); await A.page.click(".vt-sheet [data-ok]"); await A.page.waitForTimeout(400); };
  await vaqtTanla("#eVaqtB", 9, 0);
  t("tugash vaqti o'zi hisoblanadi", (await A.page.inputValue("#eTug")) === "09:45" && (await A.page.textContent("#eVaqtB")).includes("09:00"));
  await vaqtTanla("#eTugB", 10, 30);
  t("boshlanish+tugash → miqdor 90", (await A.page.inputValue("#eAmt")) === "90");
  await A.page.fill("#eIzoh", "birinchi yozuv #sinov"); await shot(A.page, "e2e-entry-sheet");
  await A.page.click('[data-save="1"]');
  const saqlandi = await kut(A.page, () => chiqimlar().length === 1 && document.querySelector("#heroNum").textContent.replace(/\s/g, "") === "1350", null, 3000);
  let h = await holat(A.page);
  t("yozuv saqlandi", saqlandi, h);
  t("bulutga yuborildi (navbat bo'sh)", await kut(A.page, () => navbatSoni() === 0 && Meta.rev >= 1));

  // ============================================================
  console.log("B. Ikkinchi qurilma — jonli sinxron");
  const B = await qurilma("B", { dark: true });
  t("B: kirish", await kir(B, "mumin@test.uz", "sir-parol-1"));
  t("B: bulutdagi yozuv keldi", await kut(B.page, () => chiqimlar().length === 1 && Sync.holat === "jonli"), await holat(B.page));
  t("B: tanishtiruv ko'rsatilmaydi (ma'lumot bor)", !(await ev(B.page, () => !!document.querySelector(".sheet"))));
  await A.page.click('[data-act="tplAdd"][data-i="0"]');
  t("A shablondan qo'shdi → B da ~2 soniyada ko'rinadi", await kut(B.page, () => chiqimlar().length === 2, null, 4000), await holat(B.page));
  t("B: ekran o'zi yangilandi", await kut(B.page, (v) => document.querySelector("#heroNum").textContent.replace(/\s/g, "") === v, String(1440 - 90 - 15), 3000), await B.page.textContent("#heroNum"));
  // B tahrirlaydi
  await B.page.click('.rows [data-act="entryEdit"]'); await B.page.waitForTimeout(450);
  const eskiAmt = await B.page.inputValue("#eAmt"); await B.page.fill("#eAmt", "120"); await B.page.click('[data-save="1"]');
  t("B tahrirladi → A da yangilandi", await kut(A.page, () => chiqimlar().some((r) => r.daqiqa === 120), null, 4000), eskiAmt);
  // B o'chiradi, keyin qaytaradi
  await B.page.waitForTimeout(500); await B.page.click('.rows [data-act="entryEdit"]'); await B.page.waitForTimeout(450); await B.page.click("#eDel");
  t("B o'chirdi → A da ham o'chdi", await kut(A.page, () => chiqimlar().length === 1, null, 4000));
  await B.page.click(".toast button");
  t("B «Qaytarish» → A da qaytdi", await kut(A.page, () => chiqimlar().length === 2, null, 4000));
  // sozlama va sekundomer
  await ev(A.page, () => { S.byudjet.uyqu = 480; cfgTouch("byudjet"); });
  t("byudjet o'zgarishi B ga yetdi", await kut(B.page, () => S.byudjet.uyqu === 480, null, 4000));
  await A.page.click('.nav-b[data-tab="fokus"]'); await A.page.waitForTimeout(300); await A.page.click('[data-act="fToggle"]');
  t("A sekundomerni boshladi → B da ishlayotgani ko'rinadi", await kut(B.page, () => S.timer.ish === true && !document.querySelector("#mini").hidden, null, 4000));
  await B.page.waitForTimeout(1300);
  t("B: kichik sekundomer yuryapti", /^00:0[1-9]/.test(await B.page.textContent("#miniT")), await B.page.textContent("#miniT"));
  await shot(A.page, "e2e-fokus-live");
  await B.page.click("#mini"); await B.page.waitForTimeout(300); await B.page.click('[data-act="fToggle"]');
  t("B to'xtatdi → A da to'xtadi", await kut(A.page, () => S.timer.ish === false && S.timer.baza > 0, null, 4000));
  await ev(A.page, () => timerReset()); await A.page.click('.nav-b[data-tab="asosiy"]'); await B.page.click('.nav-b[data-tab="asosiy"]');
  await ev(A.page, () => kayfiyatSet(bugunISO(), 4)); await ev(A.page, () => rejaKunSet(bugunISO(), { ish: 480, uyqu: 450 }));
  t("kayfiyat va kun rejasi B ga yetdi", await kut(B.page, () => S.kayfiyat[bugunISO()] === 4 && (S.rejaKun[bugunISO()] || {}).ish === 480, null, 4000));

  // ============================================================
  console.log("C. Oflayn navbat");
  await A.ctx.setOffline(true); await A.page.waitForTimeout(200);
  await A.page.click('[data-act="tplAdd"][data-i="1"]'); await A.page.waitForTimeout(250); await A.page.click('[data-act="tplAdd"][data-i="2"]');
  t("A oflayn: holat «oflayn», 2 ta navbatda", await kut(A.page, () => Sync.holat === "oflayn" && navbatSoni() === 2, null, 5000), await holat(A.page));
  t("A oflayn: belgi ko'rsatiladi", await kut(A.page, () => { const c = document.querySelector("#syncBtn .cnt"); return !!c && c.textContent === "2" && document.querySelector("#syncBtn").classList.contains("off"); }, null, 3000));
  await shot(A.page, "e2e-offline");
  t("B hali ko'rmagan", (await holat(B.page)).n === 2);
  await A.ctx.setOffline(false); await A.page.reload(); await A.page.waitForTimeout(400);   // ilova yopilib, internet bilan qayta ochildi
  t("A qayta ochildi: sessiya va navbat saqlangan → o'zi yuborildi", await kut(A.page, () => Sync.holat === "jonli" && navbatSoni() === 0 && chiqimlar().length === 4, null, 8000), await holat(A.page));
  t("B oflayn yozuvlarni oldi", await kut(B.page, () => chiqimlar().length === 4, null, 5000));

  // bir vaqtda ikki tomonda tahrir (oxirgi yozgan yutadi)
  const id = await ev(A.page, () => chiqimlar()[0].id);
  await B.ctx.setOffline(true);
  await ev(B.page, (id) => entryUpdate(id, { daqiqa: 77 }), id); await sleep(60);
  await ev(A.page, (id) => entryUpdate(id, { daqiqa: 88 }), id);
  await kut(A.page, () => navbatSoni() === 0); await B.ctx.setOffline(false); await ev(B.page, () => { wsUla(); syncNow(); });
  t("to'qnashuv: ikkala qurilma bir xil (oxirgi yozilgan 88) holatga keladi", (await kut(B.page, (id) => yozuvTop(id).daqiqa === 88 && navbatSoni() === 0, id, 6000)) && (await ev(A.page, (id) => yozuvTop(id).daqiqa, id)) === 88);

  // ============================================================
  console.log("D. Chiqish va qayta kirish");
  await B.page.click(".avatar"); await B.page.waitForTimeout(500); await shot(B.page, "e2e-profil-dark");
  await B.page.click('[data-act="chiqish"]'); await B.page.waitForTimeout(350); await B.page.click(".dlg [data-yes]");
  t("B chiqdi: kirish ekrani, lokal nusxa tozalangan", (await kut(B.page, () => !document.querySelector("#auth").hidden)) && (await ev(B.page, () => !localStorage.getItem("vaqtBanki2026") && !localStorage.getItem("vbTok") && chiqimlar().length === 0)));
  t("A da 1 qurilma qoldi", await kut(A.page, () => Sync.onlayn === 1, null, 4000));
  t("B qayta kirdi: hammasi bulutdan qaytdi", (await kir(B, "mumin@test.uz", "sir-parol-1")) && (await kut(B.page, () => chiqimlar().length === 4 && S.byudjet.uyqu === 480 && S.kayfiyat[bugunISO()] === 4)), await holat(B.page));
  // sessiyani boshqa qurilmadan yopish
  await A.page.click(".avatar"); await A.page.waitForTimeout(450); await A.page.click('[data-act="qurilmalarPage"]');
  t("A: qurilmalar ro'yxati (2 ta)", await kut(A.page, () => document.querySelectorAll("[data-sid]").length === 1, null, 5000));
  await shot(A.page, "e2e-qurilmalar"); await A.page.click("[data-sid]");
  t("A «Chiqarish» bosdi → B hisobdan chiqarildi", await kut(B.page, () => !document.querySelector("#auth").hidden && Sync.holat === "chiqdi", null, 5000), await holat(B.page));
  t("B: lokal ma'lumot saqlanib turibdi (qayta kirish uchun)", (await holat(B.page)).n === 4);
  await yopSheet(A.page); await yopSheet(A.page);

  // ============================================================
  console.log("E. Eski versiyadan ko'chirish (joyida yangilash)");
  const eskiY = [
    { id: "o1", sana: "2026-03-21", tur: "kirim", kat: "00 Yaratgandan", daqiqa: 1440, izoh: "" },
    { id: "o2", sana: "2026-03-21", tur: "chiqim", kat: "01. Uyquga", daqiqa: 443, izoh: "" },
    { id: "o3", sana: "2026-03-21", tur: "chiqim", kat: "08 Ishga - Karimbek", daqiqa: 840, izoh: "" },
    { id: "o4", sana: "2026-03-21", tur: "chiqim", kat: "04 Yo'lga", daqiqa: 14, izoh: "" },
    { id: "o5", sana: "2026-03-21", tur: "chiqim", kat: "04 Yo'lga", daqiqa: 14, izoh: "" },
    { id: "o6", sana: "2026-03-22", tur: "chiqim", kat: "33 Ingliz tili", daqiqa: 60, izoh: "dars #til", vaqt: "20:00" },
    { sana: "2026-03-22", tur: "chiqim", kat: "32 BEHUDA O'TGAN VAQT", daqiqa: 120, izoh: "Telefon scrolga ketdi" },
  ];
  const eskiC = { byudjet: { uyqu: 470, ish: 500, rivoj: 120, soglik: 45, asosiy: 120, yumush: 90, ijtimoiy: 45, yol: 50, behuda: 0 }, shablonlar: [{ nom: "Uyqu", kat: "01. Uyquga", daqiqa: 450 }],
    sozlama: { eslatma: true, vaqt: "22:15", som: 500, tovush: false, vibra: true, effekt: true, alifbo: "lotin", mavsum: "avto" }, timer: { ish: false, start: 0, baza: 0, kat: "06 Dars qilishga" },
    toifalar: [{ nom: "33 Ingliz tili", guruh: "rivoj" }], rejaKun: { "2026-03-22": { rivoj: 120 } }, jamgarma: [{ id: "j1", nom: "Kitob yili", guruh: "rivoj", soat: 200 }], kayfiyat: { "2026-03-21": 5 }, yopiqOylar: [], nishonBer: [] };
  const C = await qurilma("C", { ls: { vaqtBanki2026: JSON.stringify(eskiY), vaqtBankiCfg2026: JSON.stringify(eskiC), vbFbCfg: '{"apiKey":"x"}', vbTheme: "dark", vbTab: "tahlil", vbOnboarded: "1" } });
  const infoC = await ev(C.page, () => Array.from(document.querySelectorAll(".auth .info:not([hidden])"), (x) => x.textContent).join(" | "));
  t("eski ma'lumot bilan: kirish ekrani + «N ta yozuv saqlanib turibdi»", infoC.includes("6") && infoC.includes("saqlanib turibdi") && !infoC.includes("server ulanmagan"), infoC);
  t("eski ma'lumot yuklangan (6 sarf, o'z toifasi, sozlamalar)", await ev(C.page, () => chiqimlar().length === 6 && katGuruh("33 Ingliz tili") === "rivoj" && S.sozlama.som === 500 && S.byudjet.uyqu === 470 && S.timer.kat === "06 Dars qilishga"));
  await shot(C.page, "e2e-migrate-auth");
  t("C ro'yxatdan o'tdi", await royxat(C, "", "eski@test.uz", "eski-parol"));
  t("C: hammasi bulutga yuklandi", await kut(C.page, () => navbatSoni() === 0 && Meta.rev > 0 && chiqimlar().length === 6, null, 8000), await holat(C.page));
  const D = await qurilma("D");
  await kir(D, "eski@test.uz", "eski-parol");
  t("D (toza qurilma): eski yozuvlar, toifa, reja, kayfiyat, jamg'arma keldi", await kut(D.page, () => chiqimlar().length === 6 && idx().kirim["2026-03-21"] && S.toifalar.length === 1 && S.byudjet.uyqu === 470 && S.kayfiyat["2026-03-21"] === 5 && (S.rejaKun["2026-03-22"] || {}).rivoj === 120 && S.jamgarma.length === 1 && S.sozlama.som === 500 && S.shablonlar.length === 1, null, 8000), await ev(D.page, () => ({ n: chiqimlar().length, t: S.toifalar, b: S.byudjet.uyqu, s: S.sozlama.som })));
  t("D: bir xil ikki yozuv (Yo'lga 14) ikkalasi ham saqlangan", await ev(D.page, () => kunYozuv("2026-03-21").filter((r) => r.kat === "04 Yo'lga" && r.daqiqa === 14).length === 2));
  // boshqa lokal ma'lumotli qurilma shu hisobga kiradi → birlashtirish so'raladi
  const E = await qurilma("E", { ls: { vaqtBanki2026: JSON.stringify([eskiY[1], eskiY[3], { id: "n1", sana: "2026-05-01", tur: "chiqim", kat: "05 Kitob o'qishga", daqiqa: 40, izoh: "yangi" }].map((r, i) => ({ ...r, id: "x" + i }))), vbLocal: "1" } });
  t("E hisobsiz rejimda ochildi (3 yozuv)", await ev(E.page, () => !document.querySelector("#app").hidden && chiqimlar().length === 3 && Sync.holat === "local"));
  await E.page.click("#syncBtn"); await E.page.waitForTimeout(400); await shot(E.page, "e2e-sync-sheet-local"); await E.page.click('[data-act="authOch"]'); await E.page.waitForTimeout(300);
  await E.page.fill("#aEmail", "eski@test.uz"); await E.page.fill("#aParol", "eski-parol"); await E.page.click("#authBtn");
  t("E: birlashtirish so'raladi", await kut(E.page, () => !!document.querySelector(".dlg") && document.querySelector(".dlg h3").textContent.includes("Bu qurilmadagi"), null, 8000));
  await shot(E.page, "e2e-merge-dialog"); await E.page.click(".dlg [data-yes]");
  t("E: takrorlar tashlab yuborildi, faqat yangisi qo'shildi (6 + 1)", await kut(E.page, () => chiqimlar().length === 7 && navbatSoni() === 0, null, 8000), await holat(E.page));
  t("D: E qo'shgan yozuv jonli keldi", await kut(D.page, () => chiqimlar().length === 7, null, 5000));

  // ============================================================
  console.log("F. Hisobsiz rejim");
  const F = await qurilma("F");
  await F.page.click('[data-act="authSkip"]'); await F.page.waitForTimeout(700);
  t("hisobsiz: ilova ochildi, tanishtiruv chiqdi", await ev(F.page, () => !document.querySelector("#app").hidden && !!document.querySelector(".sheet")));
  await F.page.click('[data-act="namunaKor"]'); await F.page.waitForTimeout(600);
  t("namuna ma'lumot yuklandi", (await holat(F.page)).n > 40);
  await F.page.reload(); await F.page.waitForTimeout(500);
  t("qayta ochilganda saqlangan, kirish so'ralmaydi", await ev(F.page, () => !document.querySelector("#app").hidden && chiqimlar().length > 40 && Sync.holat === "local"));

  // ============================================================
  console.log("G. Tejamkor rejim (ilova tinch tursa, jonli aloqa uziladi)");
  await kut(D.page, () => Sync.holat === "jonli", null, 6000);
  const onlaynOldin = await ev(E.page, () => Sync.onlayn);          // C, D va E — uchta qurilma
  await ev(D.page, () => { TINCH_MS = 0; _faolT = Date.now() - 1000; aloqaTik(); });
  t("D tinch: jonli aloqa uzildi, holat «tinch»", await ev(D.page, () => Sync.ws === null && Sync.holat === "tinch"), await holat(D.page));
  t("D uzilgani serverga yetdi (onlayn qurilmalar bittaga kamaydi)", onlaynOldin === 3 && (await kut(E.page, () => Sync.onlayn === 2, null, 4000)), [onlaynOldin, await ev(E.page, () => Sync.onlayn)]);
  await ev(E.page, () => entryAdd([{ sana: "2026-05-02", kat: "09 Yugurishga", daqiqa: 33, izoh: "tinch sinovi" }]));
  await kut(E.page, () => navbatSoni() === 0, null, 4000); await sleep(1200);
  t("D tinch turganda yangi yozuvni olmaydi (server bezovta qilinmaydi)", (await holat(D.page)).n === 7, await holat(D.page));
  await ev(D.page, () => { TINCH_MS = 12 * 60000; }); await D.page.mouse.click(8, 8);
  t("D ekranga tegildi → aloqa tiklandi, yozuv keldi", await kut(D.page, () => chiqimlar().length === 8 && Sync.holat === "jonli" && !!Sync.ws, null, 6000), await holat(D.page));
  // tinch holatda lokal o'zgarish baribir yuboriladi
  await ev(D.page, () => { TINCH_MS = 0; _faolT = Date.now() - 1000; aloqaTik(); });
  await ev(D.page, () => entryAdd([{ sana: "2026-05-02", kat: "05 Kitob o'qishga", daqiqa: 25, izoh: "fokus tugadi" }]));
  t("D tinch holatda o'zi yozuv qo'shsa — bulutga ketadi", await kut(D.page, () => navbatSoni() === 0 && Sync.holat === "tinch", null, 5000), await holat(D.page));
  t("…va E ga jonli yetadi", await kut(E.page, () => chiqimlar().length === 9, null, 5000));
  await ev(D.page, () => { TINCH_MS = 12 * 60000; }); await D.page.mouse.click(8, 8); await kut(D.page, () => Sync.holat === "jonli", null, 5000);

  // ============================================================
  console.log("H. Server uyg'onayotganda (502/503) — xato emas, sabr bilan kutiladi");
  let uxlaydi = true, urinish = 0;
  await D.page.route("**/api/sync", (r) => { if (uxlaydi) { urinish++; r.fulfill({ status: 503, contentType: "text/html", body: "<html><body>Service waking up</body></html>" }); } else r.continue(); });
  await ev(D.page, () => entryAdd([{ sana: "2026-05-03", kat: "13 Uborkaga", daqiqa: 20, izoh: "" }]));
  t("503 kelganda holat «ulanmoqda» (xato emas), yozuv navbatda", await kut(D.page, () => Sync.holat === "ulanmoqda" && navbatSoni() === 1, null, 4000), await holat(D.page));
  await sleep(4600);
  t("o'zi qayta urinadi", urinish >= 2, urinish);
  uxlaydi = false;
  t("server uyg'ongach yozuv o'zi ketdi", await kut(D.page, () => navbatSoni() === 0 && Sync.holat === "jonli", null, 9000), await holat(D.page));
  await D.page.unroute("**/api/sync");
  // baza vaqtincha javob bermasa (Neon'da uyg'onish, ulanish uzilishi): server 503 «baza» qaytaradi — ilova sabr bilan kutadi
  let bazaYoq = true;
  await D.page.route("**/api/sync", (r) => { if (bazaYoq) r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "baza", message: "Baza hozircha javob bermayapti — birozdan keyin o'zi qayta uriniladi." }) }); else r.continue(); });
  await ev(D.page, () => entryAdd([{ sana: "2026-05-03", kat: "20 Kir yuvishga", daqiqa: 15, izoh: "" }]));
  t("baza javob bermasa: «ulanmoqda» (xato emas), yozuv navbatda", await kut(D.page, () => Sync.holat === "ulanmoqda" && navbatSoni() === 1, null, 4000), await holat(D.page));
  bazaYoq = false;
  t("baza qaytgach yozuv o'zi ketdi", await kut(D.page, () => navbatSoni() === 0 && Sync.holat === "jonli", null, 9000), await holat(D.page));
  await D.page.unroute("**/api/sync");
  // bazaning oylik limiti tugagan bo'lsa: sababi aniq ko'rsatiladi, yozuv qurilmada qoladi
  await D.page.route("**/api/sync", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "baza_limit", message: "Bazaning oylik bepul limiti tugagan — keyingi oy boshida o'zi tiklanadi. Yozuvlaringiz shu qurilmada saqlanib turadi." }) }));
  await ev(D.page, () => entryAdd([{ sana: "2026-05-03", kat: "21 Cho'milishga", daqiqa: 20, izoh: "" }]));
  t("baza limiti tugagan: holat «xato», sababi yozilgan, yozuv navbatda", await kut(D.page, () => Sync.holat === "xato" && Sync.xato.includes("limiti tugagan") && navbatSoni() === 1 && chiqimlar().some((r) => r.kat === "21 Cho'milishga"), null, 5000), await holat(D.page));
  await D.page.click("#syncBtn"); await D.page.waitForTimeout(400);
  t("…sinxron oynasida sabab ko'rinadi", await ev(D.page, () => document.querySelector("#syncHolat").textContent.includes("limiti tugagan")));
  await shot(D.page, "e2e-baza-limit"); await yopSheet(D.page);
  await D.page.unroute("**/api/sync"); await ev(D.page, () => syncNow());
  t("limit tiklangach yozuv o'zi ketdi", await kut(D.page, () => navbatSoni() === 0 && Sync.holat === "jonli", null, 9000), await holat(D.page));
  const G = await qurilma("G");
  let birinchi = true;
  await G.page.route("**/api/auth/login", (r) => { if (birinchi) { birinchi = false; r.fulfill({ status: 502, contentType: "text/html", body: "Bad Gateway" }); } else r.continue(); });
  await G.page.fill("#aEmail", "eski@test.uz"); await G.page.fill("#aParol", "eski-parol"); await G.page.click("#authBtn");
  t("kirishda 502: «Server uyg'onmoqda» ko'rsatiladi", await kut(G.page, () => !document.querySelector("#authWake").hidden && !document.querySelector("#authErr").textContent, null, 5000));
  t("…va o'zi qayta urinib kiradi", await kut(G.page, () => !document.querySelector("#app").hidden && chiqimlar().length === 12, null, 12000), await holat(G.page));
  // begona server 401 qaytarsa, hisobdan chiqarib yuborilmaydi
  await G.page.route("**/api/sync", (r) => r.fulfill({ status: 401, contentType: "text/html", body: "Unauthorized" }));
  await ev(G.page, () => syncNow()); await sleep(700);
  t("begona 401 javob sessiyani tugatmaydi", await ev(G.page, () => !!Sync.token && document.querySelector("#auth").hidden));
  await G.page.unroute("**/api/sync");

  // ============================================================
  console.log("I. Serversiz ochilganda (fayl yoki oddiy hosting)");
  const st = await serve(); const stUrl = `http://127.0.0.1:${st.address().port}/`;
  const ctxI = await br.newContext({ ...PHONE, locale: "uz-UZ", timezoneId: "Asia/Tashkent" }); const pI = await ctxI.newPage();
  pI.on("pageerror", (e) => xatolar.push(`[I] PAGEERROR ${e.message}`));
  await pI.goto(stUrl);
  t("server topilmasa: tushuntirish chiqadi", await kut(pI, () => { const i = document.querySelector("#aSrvInfo"); return !!i && !i.hidden && document.querySelector("#aSrvH").textContent.includes("topilmadi"); }, null, 6000));
  await pI.screenshot({ path: SHOTS + "/e2e-noserver.png" });
  await pI.fill("#aEmail", "a@b.uz"); await pI.fill("#aParol", "123456"); await pI.click("#authBtn");
  t("serversiz kirishga urinish: tushunarli xabar", await kut(pI, () => document.querySelector("#authErr").textContent.includes("server"), null, 5000), await pI.textContent("#authErr"));
  await pI.click('[data-act="authSkip"]');
  t("«Hisobsiz davom etish» → ilova ochiladi", await kut(pI, () => !document.querySelector("#app").hidden && Sync.holat === "local", null, 3000));
  await ctxI.close(); st.close();

  // ============================================================
  console.log("J. Oflayn ochilish va yangilanish (service worker)");
  const LH = BASE.replace("127.0.0.1", "localhost");
  const ctxJ = await br.newContext({ ...PHONE, locale: "uz-UZ", timezoneId: "Asia/Tashkent" }); const pJ = await ctxJ.newPage();
  pJ.on("pageerror", (e) => xatolar.push(`[J] PAGEERROR ${e.message}`));
  await pJ.goto(LH + "/");
  t("service worker o'rnatildi", await kut(pJ, async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, 8000));
  await pJ.fill("#aEmail", "eski@test.uz"); await pJ.fill("#aParol", "eski-parol"); await pJ.click("#authBtn");
  await kut(pJ, () => !document.querySelector("#app").hidden && chiqimlar().length === 12 && Sync.holat === "jonli", null, 9000);
  await pJ.reload(); await kut(pJ, () => !!navigator.serviceWorker.controller, null, 5000);
  t("sahifa service worker nazoratida", await ev(pJ, () => !!navigator.serviceWorker.controller));
  await ctxJ.setOffline(true);
  let ochildi = true; try { await pJ.reload({ timeout: 8000 }); } catch (e) { ochildi = false; }
  t("internetsiz qayta ochiladi (keshdan)", ochildi && (await kut(pJ, () => typeof APP_VER === "string" && !document.querySelector("#app").hidden && chiqimlar().length === 12, null, 5000)));
  t("…holat «oflayn», ma'lumot joyida", await kut(pJ, () => Sync.holat === "oflayn", null, 4000), await holat(pJ));
  await pJ.goto(LH + "/?a=yoz").catch(() => {});
  t("oflayn: yorliq (?a=yoz) ham ishlaydi — yozuv oynasi ochiladi", await kut(pJ, () => !!document.querySelector("#eAmt"), null, 5000));
  await ctxJ.setOffline(false);
  // yangi versiya: fayl o'zgaradi → eski nusxa darhol ochiladi, «Yangi versiya tayyor» chiqadi → Yangilash
  const IDX = ROOT + "/public/index.html", asl = fs.readFileSync(IDX, "utf8");
  try {
    fs.writeFileSync(IDX, asl.replace("</body>", '<i id="yangi-nusxa" hidden></i></body>'));
    await pJ.goto(LH + "/");
    t("yangi versiya chiqqanda: avval keshdagi nusxa ochiladi", await ev(pJ, () => !document.querySelector("#yangi-nusxa")));
    t("…ilova endigina ochilgan bo'lsa, yangi nusxaga o'zi o'tadi", await kut(pJ, () => !!document.querySelector("#yangi-nusxa"), null, 10000));
    // ilova ishlatilayotgan paytda (oyna ochiq) yangi versiya kelsa — o'zi qayta yuklanmaydi, «Yangilash» taklif qilinadi
    fs.writeFileSync(IDX, asl.replace("</body>", '<i id="yangi-nusxa-2" hidden></i></body>'));
    await pJ.goto(LH + "/"); await kut(pJ, () => typeof A === "object" && !document.querySelector("#app").hidden, null, 5000);
    await ev(pJ, () => A.entryNew());
    t("…ish paytida: «Yangi versiya tayyor» xabari chiqadi", await kut(pJ, () => Array.from(document.querySelectorAll(".toast")).some((x) => x.textContent.includes("Yangi versiya")), null, 10000));
    await pJ.click(".toast button"); await pJ.waitForLoadState("load");
    t("…«Yangilash» bosilgach yangi nusxa ochiladi", await kut(pJ, () => !!document.querySelector("#yangi-nusxa-2"), null, 6000));
    // server "uyg'onish sahifasi" qaytarsa — keshga tushmaydi
    fs.writeFileSync(IDX, "<!doctype html><title>Service waking up</title><p>Please wait…</p>");
    await pJ.goto(LH + "/"); await sleep(1500); await pJ.goto(LH + "/");
    t("begona sahifa keshni buzmaydi (ilova baribir ochiladi)", await kut(pJ, () => typeof APP_VER === "string" && !!document.querySelector("#scr-asosiy"), null, 5000));
  } finally { fs.writeFileSync(IDX, asl); }
  await ctxJ.close();

  // ============================================================
  console.log("K. Hisob amallari: PIN, tiklash kodi, parol, alifbo");
  const H = await qurilma("H");
  t("H ro'yxatdan o'tdi", await royxat(H, "Sinov", "sinov@test.uz", "parol-123"));
  await kut(H.page, () => !!document.querySelector(".sheet"), null, 3000); await yopSheet(H.page);
  await H.page.click(".fab-add"); await H.page.waitForTimeout(450); await H.page.fill("#eAmt", "30"); await H.page.click('.sheet-f [data-save="1"]');
  t("H: «+» orqali yozuv qo'shildi va bulutga ketdi", await kut(H.page, () => chiqimlar().length === 1 && navbatSoni() === 0, null, 5000), await holat(H.page));
  // PIN
  await H.page.click(".avatar"); await H.page.waitForTimeout(450); await H.page.click('[data-act="pinEdit"]'); await H.page.waitForTimeout(400);
  await H.page.fill("#pinIn", "1234"); await H.page.fill("#pinIn2", "1235"); await H.page.click("#pinSave");
  t("PIN: mos kelmasa xabar", (await H.page.textContent("#pinErr")).includes("mos kelmadi"));
  await H.page.fill("#pinIn2", "1234"); await H.page.click("#pinSave"); await H.page.waitForTimeout(400);
  t("PIN saqlandi (ochiq holda emas)", await ev(H.page, () => { const v = localStorage.getItem("vbPin"); return !!v && !v.includes("1234") && v.startsWith("4:"); }));
  await H.page.reload(); await H.page.waitForTimeout(600);
  t("qayta ochilganda PIN so'raladi", await ev(H.page, () => !document.querySelector("#lock").hidden));
  for (const n of "9999") await H.page.click(`.pin-pad [data-n="${n}"]`);
  t("noto'g'ri PIN: ochilmaydi", (await kut(H.page, () => document.querySelector("#lockM").textContent.includes("noto'g'ri"), null, 3000)) && (await ev(H.page, () => !document.querySelector("#lock").hidden)));
  for (const n of "1234") await H.page.click(`.pin-pad [data-n="${n}"]`);
  t("to'g'ri PIN: ilova ochiladi", await kut(H.page, () => document.querySelector("#lock").hidden && !document.querySelector("#app").hidden, null, 3000));
  // tiklash kodi
  await H.page.click(".avatar"); await H.page.waitForTimeout(450); await H.page.click('[data-act="tiklashKod"]'); await H.page.waitForTimeout(400); await H.page.click("#tkYar");
  t("tiklash kodi yaratildi", await kut(H.page, () => { const b = document.querySelector("#tkKod b"); return !!b && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(b.textContent); }, null, 5000));
  const kod = await H.page.textContent("#tkKod b"); await yopSheet(H.page);
  // parol almashtirish
  await H.page.click('[data-act="parolEdit"]'); await H.page.waitForTimeout(400); await H.page.fill("#pwJ", "xato-parol"); await H.page.fill("#pwY", "yangi-parol-1"); await H.page.click("#pwSave");
  t("parol: joriy parol xato bo'lsa — xabar", await kut(H.page, () => document.querySelector("#pwErr").textContent.includes("noto'g'ri"), null, 5000));
  await H.page.fill("#pwJ", "parol-123"); await H.page.click("#pwSave");
  t("parol yangilandi", await kut(H.page, () => !document.querySelector("#pwSave"), null, 5000));
  // chiqish va kod bilan tiklash
  await H.page.click('[data-act="chiqish"]'); await H.page.waitForTimeout(350); await H.page.click(".dlg [data-yes]");
  await kut(H.page, () => !document.querySelector("#auth").hidden); 
  t("chiqishda PIN ham o'chadi", await ev(H.page, () => !localStorage.getItem("vbPin")));
  await H.page.click('[data-act="authMode"][data-m="tikla"]'); await H.page.waitForTimeout(250);
  await H.page.fill("#aEmail", "sinov@test.uz"); await H.page.fill("#aKod", "AAAA-BBBB-CCCC"); await H.page.fill("#aParol", "tiklangan-1"); await H.page.click("#authBtn");
  t("noto'g'ri kod: rad etiladi", await kut(H.page, () => document.querySelector("#authErr").textContent.includes("kod"), null, 5000));
  await H.page.fill("#aKod", kod.toLowerCase().replace(/-/g, " ")); await H.page.click("#authBtn");
  t("to'g'ri kod (kichik harf, bo'shliq bilan): yangi parol o'rnatildi, ma'lumot qaytdi", await kut(H.page, () => !document.querySelector("#app").hidden && chiqimlar().length === 1 && Sync.holat === "jonli", null, 9000), await holat(H.page));
  const H2 = await qurilma("H2");
  t("eski parol endi ishlamaydi", !(await kir(H2, "sinov@test.uz", "yangi-parol-1").then((ok) => ok && ev(H2.page, () => !!Sync.token))));
  await H2.page.fill("#aParol", "tiklangan-1"); await H2.page.click("#authBtn");
  t("H2 yangi parol bilan kirdi", await kut(H2.page, () => !document.querySelector("#app").hidden && chiqimlar().length === 1 && Sync.holat === "jonli", null, 9000), await holat(H2.page));
  // alifbo: bir qurilmada o'zgarsa, ikkinchisida ham
  await ev(H.page, () => { S.sozlama.alifbo = "kiril"; cfgTouch("sozlama"); });
  t("alifbo kirillga o'tdi → H2 da ham (panel yozuvlari bilan)", await kut(H2.page, () => document.querySelector('.nav-b[data-tab="asosiy"]').textContent.includes("Асосий") && document.querySelector("#scr-asosiy").textContent.includes("қолдиқ"), null, 6000), await ev(H2.page, () => document.querySelector('.nav-b[data-tab="asosiy"]').textContent));
  await ev(H.page, () => { S.sozlama.alifbo = "lotin"; cfgTouch("sozlama"); });
  t("lotinga qaytdi → H2 o'zi yangilanib, lotinda ochildi", await kut(H2.page, () => typeof S !== "undefined" && S.sozlama.alifbo === "lotin" && document.querySelector('.nav-b[data-tab="asosiy"]').textContent.includes("Asosiy") && document.querySelector("#scr-asosiy").textContent.includes("qoldiq"), null, 8000));

  // ============================================================
  console.log("L. Zaxira, import, oyni yopish, tezkor amallar");
  const zaxira = await ev(D.page, () => JSON.stringify(toliqZaxira()));
  const L = await qurilma("L"); await L.page.click('[data-act="authSkip"]'); await kut(L.page, () => !!document.querySelector(".sheet"), null, 3000); await yopSheet(L.page);
  await ev(L.page, (z) => { importQil(z); }, zaxira);
  t("to'liq zaxira yangi qurilmaga tiklandi (yozuv, toifa)", await kut(L.page, (n) => chiqimlar().length === n && S.toifalar.some((x) => x.nom === "33 Ingliz tili"), await ev(D.page, () => chiqimlar().length), 5000), await holat(L.page));
  const nL = (await holat(L.page)).n;
  await ev(L.page, (z) => { importQil(z); }, zaxira); await L.page.waitForTimeout(450); await L.page.click(".dlg [data-yes]"); await L.page.waitForTimeout(500);
  t("o'sha zaxira yana yuklansa — takrorlanmaydi", (await holat(L.page)).n === nL, await holat(L.page));
  await ev(L.page, () => { importQil(JSON.stringify([{ sana: "2026-01-05", tur: "chiqim", kat: "05 Kitob o'qishga", daqiqa: 30, izoh: "eski format" }, { sana: "2026-01-05", tur: "kirim", kat: "00 Yaratgandan", daqiqa: 1440 }, { sana: "noto'g'ri", daqiqa: 5 }])); });
  await L.page.waitForTimeout(450); await L.page.click(".dlg [data-yes]");
  t("eski format (oddiy ro'yxat) ham ochiladi, yaroqsiz qator tashlanadi", await kut(L.page, (n) => chiqimlar().length === n + 1 && kunYozuv("2026-01-05").length === 1, nL, 4000), await holat(L.page));
  await ev(L.page, () => { S.yopiqOylar.push("2026-01"); cfgTouch("yopiqOylar"); });
  t("yopilgan oyga yozuv qo'shilmaydi va o'zgarmaydi", await ev(L.page, () => { const r = entryAdd([{ sana: "2026-01-06", kat: "15 Boshqa", daqiqa: 10 }]); const id = kunYozuv("2026-01-05")[0].id; return r.ids.length === 0 && r.blok === 1 && entryUpdate(id, { daqiqa: 99 }) === false && yozuvTop(id).daqiqa === 30; }));
  await ev(L.page, () => { tanlangan = "2026-02-10"; switchTab("asosiy"); A.odatiyKun(); }); await L.page.waitForTimeout(450); await L.page.click(".dlg [data-yes]");
  t("«Odatiy kun»: shablonlar tanlangan kunga yozildi", await kut(L.page, () => kunYozuv("2026-02-10").length === S.shablonlar.length && S.shablonlar.length > 0, null, 4000));
  await L.page.click(".toast button");
  t("«Qaytarish» hammasini bekor qiladi", await kut(L.page, () => kunYozuv("2026-02-10").length === 0, null, 3000));
  const csv = await ev(L.page, async () => { let out = ""; const asl = window.faylBer; window.faylBer = (n, m) => { out = m; return Promise.resolve(true); }; await eksportCsv(); window.faylBer = asl; return out; });
  t("CSV eksport: sarlavha va qatorlar", csv.includes("Sana") && csv.split("\n").length === nL + 2, csv.split("\n").length);
  // haqiqiy yuklab olish: brauzer faylni oladi (zaxira JSON — yozuvlar va sozlamalar bilan)
  const [dl] = await Promise.all([L.page.waitForEvent("download", { timeout: 6000 }), ev(L.page, () => { eksportJson(); })]);
  const dlMatn = fs.readFileSync(await dl.path(), "utf8"); let dlJ = null; try { dlJ = JSON.parse(dlMatn); } catch (e) {}
  t("zaxira fayli haqiqatan yuklab olinadi va to'liq", /^vaqt-banki-zaxira-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()) && !!dlJ && dlJ.ilova === "vaqt-banki" && dlJ.yozuvlar.length >= nL + 1 && Array.isArray(dlJ.toifalar), dl.suggestedFilename());
  const [dl2] = await Promise.all([L.page.waitForEvent("download", { timeout: 6000 }), ev(L.page, () => { heatYil = 2026; A.wrapPng(); })]);
  const png = fs.readFileSync(await dl2.path());
  t("yil xulosasi rasmi (PNG) yuklab olinadi", dl2.suggestedFilename() === "vaqt-banki-2026.png" && png.length > 20000 && png.slice(1, 4).toString() === "PNG", [dl2.suggestedFilename(), png.length]);

  // ============================================================
  console.log("M. Bitta qurilmada ikki oyna");
  const H3 = await H.ctx.newPage(); H3.on("pageerror", (e) => xatolar.push(`[H3] PAGEERROR ${e.message}`));
  await H3.goto(BASE + "/");
  t("ikkinchi oyna: kirish so'ralmaydi, ma'lumot joyida", await kut(H3, () => !document.querySelector("#app").hidden && chiqimlar().length === 1 && Sync.holat === "jonli", null, 8000));
  await ev(H.page, () => entryAdd([{ sana: bugunISO(), kat: "09 Yugurishga", daqiqa: 21, izoh: "1-oyna" }]));
  t("1-oynada qo'shilgan yozuv 2-oynada darhol ko'rinadi", await kut(H3, () => chiqimlar().length === 2 && document.querySelector("#scr-asosiy").textContent.includes("Yugurishga"), null, 3000));
  await kut(H.page, () => navbatSoni() === 0, null, 5000);
  await H.ctx.setOffline(true); await sleep(200);
  // ikkala oynada deyarli bir vaqtda (bir-birining o'zgarishini ko'rib ulgurmasdan) yozuv qo'shiladi
  await Promise.all([ev(H3, () => entryAdd([{ sana: bugunISO(), kat: "05 Kitob o'qishga", daqiqa: 17, izoh: "2-oyna, oflayn" }])), ev(H.page, () => entryAdd([{ sana: bugunISO(), kat: "13 Uborkaga", daqiqa: 9, izoh: "1-oyna, oflayn" }]))]);
  t("oflayn, bir vaqtda: ikkala oynada ikkala yozuv ham bor, navbatda 2 ta", (await kut(H.page, () => chiqimlar().length === 4 && navbatSoni() === 2, null, 4000)) && (await kut(H3, () => chiqimlar().length === 4 && navbatSoni() === 2, null, 4000)), [await holat(H.page), await holat(H3)]);
  t("…xotirada ham ikkalasi saqlangan", await kut(H.page, () => JSON.parse(localStorage.getItem("vaqtBanki2026")).length === 4 && Object.keys(JSON.parse(localStorage.getItem("vbSync")).out).length === 2, null, 3000));
  await H3.close(); await H.ctx.setOffline(false);
  t("2-oyna yopilgan bo'lsa ham, internet qaytgach ikkala yozuv bulutga ketadi", await kut(H.page, () => navbatSoni() === 0 && Sync.holat === "jonli", null, 9000), await holat(H.page));
  t("…va boshqa qurilmaga yetadi", await kut(H2.page, () => chiqimlar().length === 4, null, 6000), await holat(H2.page));
  const H4 = await H.ctx.newPage(); await H4.goto(BASE + "/"); await kut(H4, () => !document.querySelector("#app").hidden && Sync.holat === "jonli", null, 8000);
  await ev(H2.page, () => entryAdd([{ sana: bugunISO(), kat: "24 Suhbatga", daqiqa: 12, izoh: "boshqa qurilma" }]));
  t("boshqa qurilmadagi yozuv ikkala oynaga ham keladi", (await kut(H.page, () => chiqimlar().length === 5, null, 5000)) && (await kut(H4, () => chiqimlar().length === 5, null, 5000)));
  await H.page.click(".avatar"); await H.page.waitForTimeout(450); await H.page.click('[data-act="chiqish"]'); await H.page.waitForTimeout(350); await H.page.click(".dlg [data-yes]");
  t("bir oynada chiqilsa, ikkinchisi ham kirish ekraniga o'tadi", await kut(H4, () => typeof Sync !== "undefined" && !Sync.token && !document.querySelector("#auth").hidden, null, 6000));

  // ============================================================
  console.log("N. Hozir nima qilyapsiz — ishdan ishga o'tish va kun chizig'i");
  const N = await qurilma("N");
  await N.page.click('[data-act="authSkip"]'); await N.page.waitForTimeout(700); await yopSheet(N.page);
  await ev(N.page, () => { entryAdd([{ sana: bugunISO(), kat: "08 Ishga - Karimbek", daqiqa: 30, izoh: "", vaqt: "00:10" }, { sana: bugunISO(), kat: "05 Kitob o'qishga", daqiqa: 20, izoh: "" }]); });
  t("hozir kartasi chiqadi", await kut(N.page, () => !!document.querySelector("#hozirK [data-act=hzOt][data-kat]")));
  const k1 = await ev(N.page, () => document.querySelector("#hozirK [data-act=hzOt][data-kat]").dataset.kat);
  await N.page.click("#hozirK [data-act=hzOt][data-kat]"); await N.page.waitForTimeout(300);
  t("bir bosishda ish boshlandi", await ev(N.page, (k) => S.timer.ish && S.timer.kat === k && !!document.querySelector("#hozirT"), k1));
  await ev(N.page, () => { S.timer.start -= 7 * 60000; });
  const k2 = await ev(N.page, (k) => Array.from(document.querySelectorAll("#hozirK [data-act=hzOt][data-kat]")).map((b) => b.dataset.kat).find((x) => x !== k), k1);
  const oldin = await ev(N.page, () => chiqimlar().length);
  await N.page.click(`#hozirK [data-kat="${k2}"]`); await N.page.waitForTimeout(300);
  t("keyingi ishga o'tganda oldingisi vaqti bilan yoziladi", await ev(N.page, ([k1, k2, n]) => chiqimlar().length === n + 1 && chiqimlar().some((r) => r.kat === k1 && r.daqiqa === 7 && /^\d\d:\d\d$/.test(r.vaqt)) && S.timer.kat === k2 && S.timer.ish, [k1, k2, oldin]));
  t("kun chizig'ida vaqtli yozuvlar va bo'shliq (qo'shish tugmasi) bor", await ev(N.page, () => document.querySelectorAll(".tl2-it").length >= 2 && !!document.querySelector(".tl2-gap[data-vaqt]")));
  await N.page.click(".tl2-gap[data-vaqt]"); await N.page.waitForTimeout(450);
  t("bo'shliqqa bosilsa — o'sha vaqt bilan yozuv oynasi", await ev(N.page, () => /^\d\d:\d\d$/.test(document.querySelector("#eVaqt").value) && +document.querySelector("#eAmt").value > 0));
  await yopSheet(N.page);
  await N.page.click('[data-act="hzTugat"]'); await N.page.waitForTimeout(300);
  t("tugatish: sekundomer to'xtaydi", await ev(N.page, () => !S.timer.ish && timerMs() === 0));
  await N.ctx.close();
} catch (e) { fail++; console.log("  ✗ SINOV TO'XTADI:", e.stack || e); }
console.log(`\n${pass} o'tdi, ${fail} o'tmadi`);
if (xatolar.length) console.log("KONSOL XATOLARI:\n" + xatolar.slice(0, 20).join("\n"));
await br.close();
process.exit(fail || xatolar.length ? 1 : 0);
