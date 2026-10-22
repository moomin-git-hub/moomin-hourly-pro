
// ============================ 4. HISOB ============================
function guruhJami(rows){
  const o = {}; for(const g of GURUH_TARTIB) o[g] = 0;
  for(const r of rows){ if(r.tur !== "kirim") o[katGuruh(r.kat)] += r.daqiqa; }
  return o;
}
// Bir kunning yo'nalishlar bo'yicha jami (indeksda keshlanadi)
function kunGuruh(s){
  const ix = idx(); if(!ix.gj) ix.gj = Object.create(null);
  return ix.gj[s] || (ix.gj[s] = guruhJami(ix.byDay[s] || []));
}
function bucketJami(gj){
  let foydali = 0, zarur = 0, behuda = 0;
  for(const g of GURUH_TARTIB){ const b = GURUH[g].bucket; if(b === "foydali") foydali += gj[g]; else if(b === "behuda") behuda += gj[g]; else zarur += gj[g]; }
  return {foydali, zarur, behuda};
}
// Davr: "7" | "30" | "yil" | "hammasi" -> shu davrdagi yozilgan kunlar
function davrKunlar(davr){
  const all = kunlar(), t = bugunISO();
  if(davr === "7" || davr === "30"){ const from = addDays(t, -(+davr - 1)); return all.filter(d => d >= from && d <= t); }
  if(davr === "yil"){ const y = t.slice(0, 4); return all.filter(d => d.slice(0, 4) === y); }
  return all.slice();
}
function davrNomi(davr){ return davr === "7" ? "oxirgi 7 kun" : davr === "30" ? "oxirgi 30 kun" : davr === "yil" ? new Date().getFullYear() + "-yil" : "butun davr"; }
// Kunlar to'plami bo'yicha umumiy ko'rsatkichlar
function statHisob(days){
  const full = days.filter(toliqKunmi);
  const g = {}, gf = {}; for(const x of GURUH_TARTIB){ g[x] = 0; gf[x] = 0; }
  let jami = 0;
  for(const d of days){ const gj = kunGuruh(d); for(const x of GURUH_TARTIB) g[x] += gj[x]; jami += kunChiqim(d); }
  for(const d of full){ const gj = kunGuruh(d); for(const x of GURUH_TARTIB) gf[x] += gj[x]; }
  const b = bucketJami(g);
  return {days, full, g, gf, jami, foydali: b.foydali, zarur: b.zarur, behuda: b.behuda,
    ort: x => full.length ? gf[x] / full.length : 0};
}
function guruhOrtacha(g){ const dd = kunlar().filter(toliqKunmi); if(!dd.length) return 0; let s = 0; for(const d of dd) s += kunGuruh(d)[g]; return s / dd.length; }
function uyquQarz(){ let q = 0; for(const d of kunlar()) if(toliqKunmi(d)) q += (S.byudjet.uyqu - kunGuruh(d).uyqu); return q; }
function ishOrtiq(){ let q = 0; for(const d of kunlar()) if(toliqKunmi(d)) q += (kunGuruh(d).ish - S.byudjet.ish); return q; }
// Behuda limitidan oshgan vaqt "qarz" bo'lib yig'iladi, tejalgan kunlar hisobiga to'lanadi
function tangaQarz(){
  const lim = S.byudjet.behuda || 0; let bal = 0, yigildi = 0, tolandi = 0;
  for(const d of kunlar()){ if(!toliqKunmi(d)) continue;
    const b = kunGuruh(d).behuda || 0;
    if(b > lim){ bal += b - lim; yigildi += b - lim; }
    else { const t = Math.min(bal, lim - b); bal -= t; tolandi += t; }
  }
  return {lim, bal, yigildi, tolandi};
}

function isoHafta(iso){
  const t = dOf(iso); t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const w1 = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return t.getFullYear() + "-H" + String(week).padStart(2, "0");
}
function pearson(xs, ys){
  const n = xs.length; if(n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sx = 0, sy = 0;
  for(let k = 0; k < n; k++){ const a = xs[k] - mx, b = ys[k] - my; sxy += a * b; sx += a * a; sy += b * b; }
  if(sx === 0 || sy === 0) return null; return sxy / Math.sqrt(sx * sy);
}

// ---- Maqsadlar va ketma-ketlik ----
function maqsadlar(){
  const b = S.byudjet, behLim = b.behuda || 30;
  return [
    {key:"uyqu", icon:"moon",      g:"uyqu",   nom:`Uyqu kamida ${soat(b.uyqu)}`,          ok:d => kunGuruh(d).uyqu >= b.uyqu},
    {key:"ish",  icon:"briefcase", g:"ish",    nom:`Ish ${soat(b.ish)} dan oshmasin`,      ok:d => kunGuruh(d).ish <= b.ish},
    {key:"beh",  icon:"hourglass", g:"behuda", nom:`Behuda ${behLim} tangadan oshmasin`,   ok:d => kunGuruh(d).behuda <= behLim},
    {key:"riv",  icon:"sprout",    g:"rivoj",  nom:`Rivojlanish kamida ${soat(b.rivoj)}`,  ok:d => kunGuruh(d).rivoj >= b.rivoj},
  ];
}
function streak(okFn){
  const dd = kunlar().filter(toliqKunmi);
  let best = 0, run = 0;
  for(const d of dd){ if(okFn(d)){ run++; if(run > best) best = run; } else run = 0; }
  let cur = 0;
  for(let k = dd.length - 1; k >= 0; k--){ if(okFn(dd[k])) cur++; else break; }
  return {cur, best, total: dd.length};
}
// To'liq kunlarning eng uzun uzluksiz zanjiri (kunma-kun)
function fullStreakEng(dd){
  let best = 0, cur = 0, prev = null;
  for(const d of dd){ if(prev && addDays(prev, 1) === d) cur++; else cur = 1; if(cur > best) best = cur; prev = d; }
  return best;
}
// Bugungacha davom etayotgan to'liq kunlar zanjiri
function joriyZanjir(){
  const t = bugunISO(); let d = toliqKunmi(t) ? t : addDays(t, -1), n = 0;
  while(toliqKunmi(d)){ n++; d = addDays(d, -1); }
  return n;
}

// ---- Nishonlar ----
const NISHON = [
  {id:"sarrof",   icon:"medal",        nom:"Sarrof",       t:"7 to'liq kun",     f:s => s.full >= 7},
  {id:"xazina",   icon:"award",        nom:"Xazinachi",    t:"30 to'liq kun",    f:s => s.full >= 30},
  {id:"sulton",   icon:"crown",        nom:"Vaqt sultoni", t:"100 to'liq kun",   f:s => s.full >= 100},
  {id:"zanjir7",  icon:"flame",        nom:"Zanjir-7",     t:"7 kun ketma-ket",  f:s => s.streak >= 7},
  {id:"yuzkun",   icon:"notebook-text",nom:"Yuz varaq",    t:"100 kun yozilgan", f:s => s.days >= 100},
  {id:"tejamkor", icon:"shield-check", nom:"Tejamkor",     t:"7 kun limitda",    f:s => s.behuda7},
];
function nishonStat(){
  const dd = kunlar(), fullD = dd.filter(toliqKunmi), lim = S.byudjet.behuda || 0;
  let b7 = 0, beh7 = false;
  for(const d of fullD){ if((kunGuruh(d).behuda || 0) <= lim){ b7++; if(b7 >= 7){ beh7 = true; break; } } else b7 = 0; }
  return {days: dd.length, full: fullD.length, streak: fullStreakEng(fullD), behuda7: beh7};
}

// ---- Vaqt jamg'armasi (yillik maqsadlar) ----
function yilGuruhSum(g, yil){ let s = 0; const y = String(yil); for(const d of kunlar()) if(d.slice(0, 4) === y) s += kunGuruh(d)[g]; return s; }
function jamgarmaHolat(j){
  const yil = new Date().getFullYear();
  const kunO = Math.max(1, Math.ceil((Date.now() - new Date(yil, 0, 1)) / 86400000));
  const qoldKun = Math.max(1, Math.ceil((new Date(yil, 11, 31) - Date.now()) / 86400000));
  const done = yilGuruhSum(j.guruh, yil) / 60;
  const pct = Math.min(done / j.soat * 100, 100);
  const sur = done / kunO, kerak = Math.max(0, j.soat - done);
  const haft = (kerak / qoldKun * 7).toFixed(1);
  const prog = sur > 0 ? new Date(Date.now() + kerak / sur * 86400000) : null;
  const matn = kerak <= 0 ? "Maqsadga yetdingiz"
    : (prog && prog.getFullYear() === yil ? `shu sur'atda ${prog.getDate()}-${OYLAR[prog.getMonth()]}da yetasiz` : `haftasiga ${haft} soat kerak`);
  return {done, pct, kerak, matn, tugadi: kerak <= 0};
}

// ---- Hafta kunlari bo'yicha naqsh ----
function haftaKunStat(days){
  const map = {};
  for(const d of days){ if(!toliqKunmi(d)) continue;
    const wd = (dOf(d).getDay() + 6) % 7, g = kunGuruh(d);
    if(!map[wd]) map[wd] = {n: 0, uyqu: 0, ish: 0, behuda: 0};
    map[wd].n++; map[wd].uyqu += g.uyqu; map[wd].ish += g.ish; map[wd].behuda += g.behuda;
  }
  return map;
}

// ---- #Teglar ----
function tegStat(days){
  const set = new Set(days), map = {};
  for(const r of chiqimlar()){ if(!r.izoh || !set.has(r.sana)) continue;
    const mm = r.izoh.match(/#[\p{L}\d_]+/gu); if(!mm) continue;
    for(const t of mm){ const k = t.toLowerCase(); (map[k] = map[k] || {min: 0, n: 0}); map[k].min += r.daqiqa; map[k].n++; } }
  return Object.entries(map).sort((a, b) => b[1].min - a[1].min).slice(0, 10);
}

// ---- Aqlli tavsiyalar ----
function tavsiyalar(days){
  const out = [], st = statHisob(days), som = S.sozlama.som || 0;
  const u = st.ort("uyqu"), i = st.ort("ish"), behuda = st.behuda;
  if(u > 0){
    if(u < 420) out.push({cl:"warn", icon:"bed", h:"Uyqu me'yordan kam",
      p:`Kuniga o'rtacha <b>${soat(u)}</b> uxlayapsiz. Sog'lik uchun <b>7–8 soat</b> tavsiya etiladi — kuniga yana <b class="num">${tanga(450 - u)}</b> tangani uyquga ajratsangiz, kunduzgi unumdorlik sezilarli oshadi.`});
    else if(u > 540) out.push({cl:"info", icon:"bed-double", h:"Uyqu yetarli, hatto ko'proq",
      p:`O'rtacha <b>${soat(u)}</b> — bu yaxshi. Charchoq sezsangiz, sifat muhim: yotish vaqtini barqaror tuting.`});
    else out.push({cl:"ok", icon:"moon", h:"Uyqu muvozanatda", p:`O'rtacha <b>${soat(u)}</b> — sog'lom oraliqda. Shu ritmni saqlang.`});
  }
  if(i > 720) out.push({cl:"bad", icon:"flame", h:"Ish yuki juda yuqori",
    p:`Kuniga o'rtacha <b>${soat(i)}</b> ishlayapsiz. Bu sur'at uzoq muddatda charchatadi. Kuniga hech bo'lmasa <b>30–60 daqiqa</b>ni dam va sog'liqqa ajrating.`});
  else if(i > 600) out.push({cl:"warn", icon:"briefcase", h:"Ish ulushi katta",
    p:`O'rtacha <b>${soat(i)}</b> ish. Maqsadli bo'lsa yaxshi, ammo tanaffuslarni rejalashtiring.`});
  if(behuda > 0){
    const kunlik = behuda / Math.max(1, days.length);
    const pul = som > 0 ? ` Pul hisobida bu <b class="num">${somF(behuda * som)}</b>.` : "";
    out.push({cl:"bad", icon:"hourglass", h:`${tanga(behuda)} tanga behuda ketdi`,
      p:`Jami <b>${soat(behuda)}</b> behuda o'tgan.${pul} Buni <b>yarmiga</b> qisqartirsangiz, oyiga taxminan <b class="num">${soat(kunlik / 2 * 30)}</b> qaytarib olasiz.`});
  } else if(days.length){
    out.push({cl:"ok", icon:"target", h:"Behuda vaqt nazoratda", p:`Bu davrda behuda yo'qotish yo'q. Bu kuchli intizom belgisi.`});
  }
  const eng = GURUH_TARTIB.filter(g => g !== "ish" && g !== "uyqu").sort((a, b) => st.g[b] - st.g[a])[0];
  if(st.g[eng] > 0) out.push({cl:"info", icon:"chart-pie", h:"Ish va uyqudan keyingi eng katta sarf",
    p:`Ish va uyqu hisobga olinmasa, eng ko'p vaqt <b>«${GURUH[eng].nom}»</b> yo'nalishiga ketadi — jami <b class="num">${soat(st.g[eng])}</b>. Shu yo'nalishni tartibga solsangiz, eng ko'p tanga bo'shaydi.`});
  { // eng qimmat odat (izohlar bo'yicha)
    const set = new Set(days), hab = {};
    for(const r of chiqimlar()){ if(!r.izoh || !set.has(r.sana)) continue;
      const k = r.izoh.trim().toLowerCase(); if(k.length < 3) continue;
      (hab[k] = hab[k] || {min: 0, n: 0}); hab[k].min += r.daqiqa; hab[k].n++; }
    const top = Object.entries(hab).filter(x => x[1].n >= 3).sort((a, b) => b[1].min - a[1].min)[0];
    if(top) out.push({cl:"warn", icon:"repeat", h:"Eng qimmat odat",
      p:`«${esc(top[0])}» — ${top[1].n} marta takrorlangan, jami <b class="num">${soat(top[1].min)}</b>${som > 0 ? ` (${somF(top[1].min * som)})` : ""}. Shu bitta odatni boshqarsangiz, eng katta tejov shu yerda.`});
  }
  { // kayfiyat bog'liqligi
    const md = days.filter(d => S.kayfiyat[d] && toliqKunmi(d));
    if(md.length >= 7){
      const moods = md.map(d => S.kayfiyat[d]);
      const cu = pearson(moods, md.map(d => kunGuruh(d).uyqu / 60)), cb = pearson(moods, md.map(d => kunGuruh(d).behuda / 60));
      if(cu !== null && Math.abs(cu) >= 0.4) out.push({cl: cu > 0 ? "ok" : "warn", icon:"smile", h:"Uyqu va kayfiyat",
        p:`Kayfiyat baholaringiz uyqu bilan ${cu > 0 ? "ijobiy" : "salbiy"} bog'langan (r = ${cu.toFixed(2)}). ${cu > 0 ? "Yaxshi uxlagan kunlaringizda kayfiyat sezilarli baland." : ""}`});
      if(cb !== null && cb <= -0.4) out.push({cl:"warn", icon:"smartphone", h:"Behuda vaqt kayfiyatni tushiradi",
        p:`Behuda vaqt ko'p bo'lgan kunlarda kayfiyatingiz pastroq (r = ${cb.toFixed(2)}). Telefonni cheklash — kayfiyatga sarmoya.`});
    }
  }
  if(st.full.length >= 1) out.push({cl:"info", icon:"clipboard-check", h:"Hisob aniqligi",
    p:`<b>${st.full.length}</b> kun to'liq (1440 tanga) yozilgan. Qancha ko'p kun yozsangiz, tavsiyalar shuncha aniq bo'ladi.`});
  return out;
}

// ---- Haftalik hisobot: oxirgi 7 kun (A) va undan oldingi 7 kun (B) ----
function haftaHisob(){
  const t = bugunISO();
  const rng = off => { const a = []; for(let k = 6; k >= 0; k--) a.push(addDays(t, -k - off)); return a; };
  const sum = days => { const o = {days, ch: 0, full: 0, n: 0, g: {}}; GURUH_TARTIB.forEach(g => o.g[g] = 0);
    for(const d of days){ const sp = kunChiqim(d); o.ch += sp; if(sp > 0) o.n++; if(toliqKunmi(d)) o.full++; const gj = kunGuruh(d); GURUH_TARTIB.forEach(g => o.g[g] += gj[g]); }
    return o; };
  const A = sum(rng(0)), B = sum(rng(7));
  return {A, B, eng: GURUH_TARTIB.slice().sort((a, b) => A.g[b] - A.g[a])[0]};
}
// Matn ko'rinishi (nusxalash va AI uchun)
function haftaText(){
  const {A, B, eng} = haftaHisob();
  const df = (a, b) => { const d = Math.round((a - b) / 60 * 10) / 10; return d === 0 ? "o'zgarishsiz" : (d > 0 ? `+${d}s` : `${d}s`); };
  let s = `HAFTALIK HISOBOT (${sanaQisqa(A.days[0])} – ${sanaQisqa(A.days[6])})\n`;
  s += `Yozilgan: ${soat(A.ch)} · ${A.full} to'liq kun · o'tgan haftaga nisbatan ${df(A.ch, B.ch)}\n`;
  s += `Eng katta yo'nalish: ${GURUH[eng].nom} — ${soat(A.g[eng])}\n`;
  s += `Uyqu: ${soat(A.g.uyqu)} (${df(A.g.uyqu, B.g.uyqu)}) · Ish: ${soat(A.g.ish)} (${df(A.g.ish, B.g.ish)})\n`;
  s += `Rivojlanish: ${soat(A.g.rivoj)} (${df(A.g.rivoj, B.g.rivoj)}) · Behuda: ${soat(A.g.behuda)} (${df(A.g.behuda, B.g.behuda)})`;
  if(S.sozlama.som > 0 && A.g.behuda > 0) s += ` ≈ ${somF(A.g.behuda * S.sozlama.som)}`;
  return s;
}

// ---- Yil xulosasi ----
function wrapStats(yil){
  const dd = kunlar().filter(d => d.slice(0, 4) === String(yil)), full = dd.filter(toliqKunmi);
  let ch = 0; const g = {}; GURUH_TARTIB.forEach(x => g[x] = 0); const oy = {};
  for(const d of dd){ ch += kunChiqim(d); const gj = kunGuruh(d); GURUH_TARTIB.forEach(x => g[x] += gj[x]); const m = +d.slice(5, 7); oy[m] = (oy[m] || 0) + gj.ish + gj.rivoj; }
  const topG = dd.length ? GURUH_TARTIB.slice().sort((a, b) => g[b] - g[a])[0] : null;
  const bestOy = Object.entries(oy).sort((a, b) => b[1] - a[1])[0];
  return {dd, full, ch, g, topG, bestOy, streak: fullStreakEng(full)};
}

// ---- Asosiy ekran uchun: bitta eng muhim kuzatuv ----
function bugunKuzatuv(){
  const t = tanlangan || bugunISO(), gj = kunGuruh(t), b = S.byudjet, spent = kunChiqim(t);
  if(!kunlar().length) return {icon:"lightbulb", cl:"info", h:"Bir kun — 1440 tanga", p:"Har bir daqiqa bitta tanga. Kun davomida nimaga sarflaganingizni yozib boring — kechqurun kuningiz qayerga ketgani ko'rinadi."};
  if(gj.behuda > Math.max(b.behuda, 30)) return {icon:"hourglass", cl:"bad", h:"Behuda vaqt limitdan oshdi", p:`Bu kunda <b>${soat(gj.behuda)}</b> behuda ketgan — limit ${b.behuda || 30} tanga.${S.sozlama.som > 0 ? ` Bu <b>${somF(gj.behuda * S.sozlama.som)}</b>ga teng.` : ""}`};
  if(spent >= 1380 && gj.uyqu < b.uyqu - 30) return {icon:"bed", cl:"warn", h:"Uyqu rejadan kam", p:`Bu kunda <b>${soat(gj.uyqu)}</b> uxlagansiz — reja ${soat(b.uyqu)}. Yetishmagan uyqu qarz bo'lib yig'iladi.`};
  if(spent >= 1380) return {icon:"circle-check", cl:"ok", h:"Kun to'liq hisobga olindi", p:`1440 tangadan <b>${tanga(spent)}</b> tasi yozilgan. Foydali vaqt ulushi — <b>${foiz(bucketJami(gj).foydali, spent)}%</b>.`};
  const z = joriyZanjir();
  if(z >= 2) return {icon:"flame", cl:"warn", h:`${z} kun ketma-ket to'liq`, p:"Zanjir uzilmasin — bugungi kunni ham 1440 tangagacha yozib chiqing."};
  const q = uyquQarz();
  if(q > 120) return {icon:"bed", cl:"warn", h:"Uyqu qarzi yig'ilgan", p:`To'liq kunlar bo'yicha <b>${soat(q)}</b> uyqu yetishmagan. Reja bo'limida batafsil ko'rasiz.`};
  return {icon:"lightbulb", cl:"info", h:"Kunni oxirigacha yozing", p:"Kun 1380 tangadan oshsa «to'liq» hisoblanadi — o'rtachalar, zanjir va tavsiyalar faqat to'liq kunlar bo'yicha chiqadi."};
}
