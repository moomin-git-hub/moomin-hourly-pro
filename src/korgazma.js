
// ============================ KO'RGAZMA NUSXA (faqat ko'rib chiqish uchun yig'ilgan faylda) ============================
// Namuna ma'lumot: oxirgi uch hafta, bugungi kun hozirgi soatgacha. Tasodifiy ko'rinadi, lekin har safar bir xil chiqadi.
function korgazmaMalumot(kunSoni){
  let urug = 42; const rnd = () => (urug = (urug * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const now = new Date(), out = []; let n = 0;
  for(let i = kunSoni; i >= 0; i--){
    const d = new Date(now); d.setDate(d.getDate() - i); const s = isoOf(d);
    if(i > 0 && rnd() < .12) continue;                                   // ba'zi kunlar yozilmagan
    const dam = d.getDay() === 0;
    const reja = [
      ["01. Uyquga", 380 + Math.round(rnd() * 110), 0, ""],
      ["27 Tahoratga", 10, 395, ""],
      ["07 Sura yodlashga", 20 + Math.round(rnd() * 25), 410, ""],
      ["02. Saharlikka", 20, 450, "nonushta"],
      ["04 Yo'lga", 25, 480, "ishga"],
      [dam ? "13 Uborkaga" : "08 Ishga - Karimbek", dam ? 90 : 420 + Math.round(rnd() * 120), 510, dam ? "" : (rnd() < .4 ? "hisobot #ish" : "")],
      ["03 Iftorlikka", 35, 780, "tushlik"],
      ["06 Dars qilishga", 50 + Math.round(rnd() * 70), 1080, rnd() < .5 ? "ingliz tili #til" : "diplom ishi #diplom"],
      ["09 Yugurishga", rnd() < .55 ? 30 : 0, 1170, ""],
      ["05 Kitob o'qishga", rnd() < .7 ? 25 + Math.round(rnd() * 30) : 0, 1260, "kitob"],
      ["24 Suhbatga", rnd() < .5 ? 30 + Math.round(rnd() * 40) : 0, 1200, ""],
      ["32 BEHUDA O'TGAN VAQT", rnd() < .75 ? 20 + Math.round(rnd() * 95) : 0, 1300, "telefon"],
      ["18. Kiyinish/Yechinishga", 15, 465, ""],
      ["04 Yo'lga", 25, 1020, "uyga"],
    ];
    let qator = reja.filter(p => p[1] > 0);
    if(i === 0){ const lim = hozirDaqiqa(); qator = qator.filter(p => p[2] + p[1] <= lim || p[0].startsWith("01")); }
    else if(rnd() < .8){                                                 // ko'p kunlar to'liq (1440) yozilgan
      let qoldi = KUNLIK - qator.reduce((a, p) => a + p[1], 0);
      if(qoldi > 0){ const b = Math.min(qoldi, 60 + Math.round(rnd() * 60)); qator.push(["15 Boshqa", b, 0, ""]); qoldi -= b; }
      if(qoldi > 30){ const b = Math.min(qoldi, 40); qator.push(["21 Cho'milishga", b, 0, ""]); qoldi -= b; }
      if(qoldi > 0 && rnd() < .85) qator[0][1] += qoldi;
    }
    for(const p of qator){ const r = {id: "n" + (++n).toString(36), sana: s, tur: "chiqim", kat: p[0], daqiqa: p[1], izoh: p[3]}; if(p[2] > 0 && (i === 0 || rnd() < .6)) r.vaqt = hhmm(p[2]); out.push(r); }
  }
  return out;
}
// Birinchi ochilishda namuna bilan to'ldiradi (yozuv bo'lmasa)
function korgazmaBoshla(){
  korgazmaMavzu(); faylXizmati();
  if(lsGet("vbLocal") === "1" || S.yozuvlar.length) return;
  S.yozuvlar = korgazmaMalumot(21).map(tozaYozuv).filter(Boolean); invalidateIdx();
  kunlar().forEach((d, i) => { S.kayfiyat[d] = 2 + ((i * 7) % 4); });
  S.jamgarma = [{id: "n1", nom: "Kitob yili", guruh: "rivoj", soat: 300}, {id: "n2", nom: "Sport", guruh: "soglik", soat: 60}];
  S.rejaKun[bugunISO()] = {uyqu: 450, ish: 480, rivoj: 120, soglik: 40};
  saqlaY(); saqlaC();
  lsSet("vbLocal", "1"); lsSet("vbOnboarded", "1"); namunaBelgi(true);
}
// Fayl berish: ko'rgazma sahifasi faylni o'zi yuklab bera olmaydi — uni ko'rsatayotgan muhitdan so'raydi
// (foydalanuvchiga tasdiqlash oynasi chiqadi). Muhit bunga ruxsat bermasa — ochiq aytiladi.
let _faylP = null;
function faylXizmati(){
  if(!_faylP) _faylP = (window.claude && typeof window.claude.use === "function") ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
  return _faylP;
}
async function faylBer(nom, data){
  const xizmat = await faylXizmati();
  if(!xizmat){ toast(`${ic("info")}<span>Bu yerda fayl saqlab bo'lmaydi — Render'dagi ilovada ishlaydi</span>`, {ms: 4200}); return false; }
  try{ await xizmat.save({filename: nom, data}); return true; }
  catch(e){
    const kod = e && e.code;
    if(kod === "declined") return false;                                // foydalanuvchi o'zi rad etdi — xabar shart emas
    toast(kod === "rate_limited" ? "Bir oz kutib, qayta urinib ko'ring" : "Faylni saqlab bo'lmadi");
    return false;
  }
}

// Tashqi muhit (sahifa ichida ochilgan joy) mavzuni almashtirsa — ilova ham ergashadi
function korgazmaMavzu(){
  try{
    _mavzuOz = 0;
    new MutationObserver(list => {
      const oz = Math.min(_mavzuOz, list.length); _mavzuOz -= oz;
      if(list.length <= oz) return;                                   // hammasi o'zimizning yozuvlar
      const a = document.documentElement.getAttribute("data-theme");
      window.__vbTashqiMavzu = (a === "dark" || a === "light") ? a : null;
      applyTheme(); render();
    }).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
  }catch(e){}
}
// Bu nusxada nima ishlaydi, nima yo'q
A.korgazmaHaqida = () => {
  openSheet({title: "Ko'rgazma nusxa", sub: "Yangi Vaqt Banki bilan tanishing",
    body: `<div class="adv">
      <div class="adv-r"><span class="tile-ic sm blue">${ic("flask-conical")}</span><div><h3>Namuna ma'lumot bilan to'ldirilgan</h3><p>Ekranlar qanday ishlashini ko'rishingiz uchun oxirgi uch haftaga misol yozuvlar qo'yilgan. Bemalol qo'shing, o'zgartiring, o'chiring — bu faqat shu brauzerda turadi.</p></div></div>
      <div class="adv-r"><span class="tile-ic sm warn">${ic("cloud-off")}</span><div><h3>Kirish va sinxron bu yerda ishlamaydi</h3><p>Ular serverga muhtoj. Ilovani Render'ga joylaganingizdan keyin email bilan kirish, bulut va jonli sinxron yoqiladi.</p></div></div>
      <div class="adv-r"><span class="tile-ic sm violet">${ic("sparkles")}</span><div><h3>AI yordamchi ham keyin</h3><p>U Render'dagi ilovada, o'z Anthropic API kalitingiz bilan ishlaydi. Zaxira va CSV'ni esa shu yerda ham saqlab olsa bo'ladi — saqlashdan oldin tasdiq so'raladi.</p></div></div>
    </div>`,
    foot: `<button class="btn grad" data-act="ovClose">Tushunarli</button>`});
};
