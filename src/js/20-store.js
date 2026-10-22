
// ============================ 3. XOTIRA (holat va saqlash) ============================
const S = {
  yozuvlar: [],                                   // {id, sana, tur:"chiqim"|"kirim", kat, daqiqa, izoh, vaqt?, u}
  byudjet: {...VBUDJET},                          // yo'nalish -> kunlik reja (daqiqa)
  shablonlar: SHABLON_STD.map(x => ({...x})),     // tezkor qo'shish
  sozlama: {...SOZLAMA_STD},
  timer: {...TIMER_STD},                          // sekundomer (qurilmalar orasida jonli)
  toifalar: [],                                   // foydalanuvchi toifalari: {nom, guruh, icon?}
  rejaKun: {},                                    // sana -> {guruh: daqiqa}
  jamgarma: [],                                   // yillik maqsadlar: {id, nom, guruh, soat}
  kayfiyat: {},                                   // sana -> 1..5
  yopiqOylar: [],                                 // ["2026-06"]
  nishonBer: [],                                  // ochilgan nishonlar
};
const CFG_DOCS = ["byudjet","shablonlar","sozlama","timer","toifalar","jamgarma","yopiqOylar","nishonBer"];
let tanlangan = null;                             // Asosiy ekranda tanlangan kun

// O'zgarishlar haqida xabar (ekranlar shunga qarab qayta chiziladi)
const Bus = {
  subs: [],
  on(fn){ this.subs.push(fn); },
  emit(src, nima){ for(const f of this.subs){ try{ f(src, nima); }catch(e){ console.error(e); } } }
};

// ---- Sinxron holati: qaysi hisobga bog'langan, qaysi o'zgarishlar hali yuborilmagan ----
let Meta = {uid: null, rev: 0, out: {}};
function metaLoad(){
  const m = jparse(lsGet(SYNC_KEY), null);
  Meta = (m && typeof m === "object") ? {uid: m.uid || null, rev: +m.rev || 0, out: (m.out && typeof m.out === "object") ? m.out : {}} : {uid: null, rev: 0, out: {}};
}
function metaSave(){ lsSet(SYNC_KEY, JSON.stringify(Meta)); }
const metaSaveSoon = debounce(metaSave, 120);
function navbatSoni(){ return Object.keys(Meta.out).length; }
// Yozuv yoki sozlama o'zgardi — bulutga yuborish navbatiga qo'yamiz
function markOut(key, del){
  if(!Meta.uid) return;
  Meta.out[key] = {t: nowTs(), d: del ? 1 : 0};
  metaSaveSoon();
  if(typeof syncKick === "function") syncKick();
}

// ---- Tekshirib tozalash (lokal fayl, import va bulutdan kelgan ma'lumot uchun bir xil) ----
function tozaYozuv(r){
  if(!r || typeof r !== "object" || !isIso(r.sana)) return null;
  const d = Math.round(+r.daqiqa);
  if(!(d > 0)) return null;
  const o = {id: String(r.id || uid()).slice(0, 64), sana: r.sana, tur: r.tur === "kirim" ? "kirim" : "chiqim",
    kat: String(r.kat || "15 Boshqa").slice(0, 120), daqiqa: Math.min(d, KUNLIK), izoh: String(r.izoh || "").slice(0, 500)};
  if(r.vaqt && hmToMin(r.vaqt) != null) o.vaqt = r.vaqt;
  if(+r.u > 0) o.u = +r.u;
  return o;
}
function tozaCfg(name, v){
  const arr = x => Array.isArray(x) ? x : (x && typeof x === "object" ? Object.values(x) : []);
  switch(name){
    case "byudjet": { const o = {...VBUDJET}; if(v && typeof v === "object") for(const g of GURUH_TARTIB){ const n = Math.round(+v[g]); if(n >= 0 && n <= KUNLIK) o[g] = n; } return o; }
    case "shablonlar": return arr(v).filter(s => s && s.kat && +s.daqiqa > 0).map(s => ({nom: String(s.nom || katNom(s.kat)).slice(0, 60), kat: String(s.kat).slice(0, 120), daqiqa: Math.min(Math.round(+s.daqiqa), KUNLIK)})).slice(0, 60);
    case "sozlama": { const o = {...SOZLAMA_STD}; if(v && typeof v === "object"){
        o.eslatma = !!v.eslatma; if(hmToMin(v.vaqt) != null) o.vaqt = v.vaqt; o.som = Math.max(0, Math.round(+v.som) || 0);
        for(const k of ["tovush","vibra","effekt"]) if(typeof v[k] === "boolean") o[k] = v[k];
        o.alifbo = v.alifbo === "kiril" ? "kiril" : "lotin";
        if(["avto","oddiy","navroz","mustaqillik","ramazon"].includes(v.mavsum)) o.mavsum = v.mavsum;
        if(Array.isArray(v.yashirin)) o.yashirin = v.yashirin.filter(x => typeof x === "string").slice(0, 60);
      } return o; }
    case "timer": { const o = {...TIMER_STD}; if(v && typeof v === "object"){ o.ish = !!v.ish; o.start = +v.start || 0; o.baza = Math.max(0, +v.baza || 0); if(v.kat) o.kat = String(v.kat).slice(0, 120); } return o; }
    case "toifalar": return arr(v).filter(t => t && t.nom && GURUH[t.guruh]).map(t => { const o = {nom: String(t.nom).slice(0, 80), guruh: t.guruh}; if(t.icon && /^[a-z0-9-]{2,30}$/.test(t.icon)) o.icon = t.icon; return o; }).slice(0, 200);
    case "jamgarma": return arr(v).filter(j => j && j.nom && GURUH[j.guruh] && +j.soat > 0).map(j => ({id: String(j.id || uid()), nom: String(j.nom).slice(0, 80), guruh: j.guruh, soat: Math.round(+j.soat)})).slice(0, 50);
    case "yopiqOylar": return arr(v).filter(x => /^\d{4}-\d{2}$/.test(x));
    case "nishonBer": return arr(v).filter(x => typeof x === "string").slice(0, 50);
  }
  return v;
}
function tozaReja(o){ const out = {}; if(o && typeof o === "object") for(const g of GURUH_TARTIB){ const n = Math.round(+o[g]); if(n > 0 && n <= KUNLIK) out[g] = n; } return out; }

// ---- Yuklash / saqlash ----
function storeLoad(){
  const raw = jparse(lsGet(KEY), null);
  S.yozuvlar = Array.isArray(raw) ? raw.map(tozaYozuv).filter(Boolean) : [];
  const o = jparse(lsGet(CFG_KEY), null);
  if(o && typeof o === "object"){
    for(const name of CFG_DOCS) if(o[name] !== undefined) S[name] = tozaCfg(name, o[name]);
    if(o.rejaKun && typeof o.rejaKun === "object"){ S.rejaKun = {}; for(const d in o.rejaKun){ if(isIso(d)){ const r = tozaReja(o.rejaKun[d]); if(Object.keys(r).length) S.rejaKun[d] = r; } } }
    if(o.kayfiyat && typeof o.kayfiyat === "object"){ S.kayfiyat = {}; for(const d in o.kayfiyat){ const v = +o.kayfiyat[d]; if(isIso(d) && v >= 1 && v <= 5) S.kayfiyat[d] = v; } }
  }
  metaLoad();
  invalidateIdx();
}
let _quotaAytildi = false;
// Ma'lumot va yuborish navbati doim birga yoziladi: ilova shu zahoti yopilsa ham, yozuv «yuborilmagan» bo'lib qoladi va keyin ketadi
function saqlaY(){
  invalidateIdx();
  const matn = JSON.stringify(S.yozuvlar);
  let ok = lsSet(KEY, matn);
  if(!ok && bkBoshat()) ok = lsSet(KEY, matn);                  // joy yetmasa — eski avto zaxiralar o'chirilib, qayta yoziladi
  if(!ok && !_quotaAytildi && !VB_KORGAZMA){ _quotaAytildi = true; setTimeout(() => toast(`${ic("triangle-alert")}<span>Qurilma xotirasi to'ldi — yangi yozuvlar saqlanmayapti. Profil → Zaxira va ma'lumotlar'dan zaxira oling.</span>`, {ms: 8000}), 50); }
  if(Meta.uid) metaSave();
}
function saqlaC(){
  lsSet(CFG_KEY, JSON.stringify({byudjet: S.byudjet, shablonlar: S.shablonlar, sozlama: S.sozlama, timer: S.timer, toifalar: S.toifalar,
    rejaKun: S.rejaKun, jamgarma: S.jamgarma, kayfiyat: S.kayfiyat, yopiqOylar: S.yopiqOylar, nishonBer: S.nishonBer}));
  if(Meta.uid) metaSave();
}
// Boshqa oyna (tab) xotirani o'zgartirganda: holat qayta o'qiladi, lekin shu oynaning hali yuborilmagan
// o'zgarishlari (navbatdagilari) yo'qolmaydi — ular qayta o'qilgan holat ustiga qo'yiladi va qaytadan saqlanadi.
function storeQaytaYukla(){
  const eski = {y: S.yozuvlar, out: Meta.out, uid: Meta.uid, cfg: {}, reja: S.rejaKun, kayf: S.kayfiyat};
  for(const n of CFG_DOCS) eski.cfg[n] = S[n];
  storeLoad();
  if(!eski.uid || eski.uid !== Meta.uid) return false;            // hisob almashgan yoki hisobsiz rejim — birlashtirilmaydi
  let ozgardi = false, ix = null;
  for(const k in eski.out){
    const m = eski.out[k], b = Meta.out[k];
    if(b && b.t >= m.t) continue;                                 // xotirada shu yoki undan yangi niyat allaqachon bor
    const tur = k.charAt(0), id = k.slice(2);
    if(tur === "y"){
      if(!ix){ ix = new Map(); S.yozuvlar.forEach((r, i) => ix.set(r.id, i)); }
      const i = ix.has(id) ? ix.get(id) : -1;
      if(m.d){ if(i >= 0) S.yozuvlar[i] = null; }
      else { const r = eski.y.find(x => x.id === id); if(!r) continue; if(i >= 0) S.yozuvlar[i] = r; else { S.yozuvlar.push(r); ix.set(id, S.yozuvlar.length - 1); } }
    }
    else if(tur === "c"){ if(!CFG_DOCS.includes(id)) continue; S[id] = eski.cfg[id]; }
    else if(tur === "r"){ if(m.d || !eski.reja[id]) delete S.rejaKun[id]; else S.rejaKun[id] = eski.reja[id]; }
    else if(tur === "k"){ if(m.d || !eski.kayf[id]) delete S.kayfiyat[id]; else S.kayfiyat[id] = eski.kayf[id]; }
    else continue;
    Meta.out[k] = m; ozgardi = true;
  }
  if(ix) S.yozuvlar = S.yozuvlar.filter(Boolean);
  if(ozgardi){ saqlaY(); saqlaC(); }
  return ozgardi;
}
function storeReset(){
  S.yozuvlar = []; S.byudjet = {...VBUDJET}; S.shablonlar = SHABLON_STD.map(x => ({...x})); S.sozlama = {...SOZLAMA_STD}; S.timer = {...TIMER_STD};
  S.toifalar = []; S.rejaKun = {}; S.jamgarma = []; S.kayfiyat = {}; S.yopiqOylar = []; S.nishonBer = [];
  invalidateIdx();
}

// ---- Indeks: kunlar bir marta guruhlanadi (O(N)), qidiruv O(1) ----
let _idx = null;
function reindex(){
  const byDay = Object.create(null), chiq = Object.create(null), kirim = Object.create(null), all = [];
  for(let i = 0; i < S.yozuvlar.length; i++){
    const r = S.yozuvlar[i], s = r.sana;
    if(r.tur === "kirim"){ if(!kirim[s]) kirim[s] = r; continue; }
    (byDay[s] || (byDay[s] = [])).push(r);
    chiq[s] = (chiq[s] || 0) + r.daqiqa;
    all.push(r);
  }
  _idx = {byDay, chiq, kirim, all, days: Object.keys(byDay).sort()};
  return _idx;
}
function idx(){ return _idx || reindex(); }
function invalidateIdx(){ _idx = null; }
function kunlar(){ return idx().days; }                       // yozuvi bor kunlar (o'sish tartibida)
function chiqimlar(){ return idx().all; }                     // barcha sarf yozuvlari
function kunYozuv(s){ return idx().byDay[s] || []; }
function kunChiqim(s){ return idx().chiq[s] || 0; }
function toliqKunmi(s){ return (idx().chiq[s] || 0) >= 1380; }
function yozuvTop(id){ return S.yozuvlar.find(x => x.id === id) || null; }

// ---- Toifalar ----
function katGuruh(kat){
  const k = String(kat).trim();
  const c = S.toifalar.find(t => t.nom === k);
  if(c && GURUH[c.guruh]) return c.guruh;
  const m = k.match(/^(\d{2})/);
  if(m && RAQAM_GURUH[m[1]]) return RAQAM_GURUH[m[1]];
  return "yol";
}
function katIcon(kat){
  const k = String(kat).trim();
  const c = S.toifalar.find(t => t.nom === k);
  if(c && c.icon) return c.icon;
  if(!c){ const m = k.match(/^(\d{2})/); if(m && RAQAM_ICON[m[1]]) return RAQAM_ICON[m[1]]; }
  return GURUH[katGuruh(k)].icon;
}
function yashirinlar(){ return S.sozlama.yashirin || []; }
function barchaKategoriyalar(){ return KATEGORIYALAR.concat(S.toifalar.map(t => t.nom)); }
function faolKategoriyalar(){ const y = yashirinlar(); return barchaKategoriyalar().filter(k => !y.includes(k)); }

// ---- Namuna ma'lumot belgisi (yozuvlar misol uchun yuklangan bo'lsa) ----
let _namuna = null;
function namunami(){ if(_namuna === null) _namuna = lsGet("vbDemo") === "1"; return _namuna; }
function namunaBelgi(ha){ _namuna = !!ha; if(ha) lsSet("vbDemo", "1"); else lsDel("vbDemo"); }

// ---- Oy yopish ----
function isYopiq(sana){ return S.yopiqOylar.includes(oyKey(sana)); }
function guardYopiq(sana){ if(isYopiq(sana)){ toast(`${ic("lock")}<span>${oyNomi(oyKey(sana))} yopilgan — o'zgartirish uchun Profil → Ma'lumotlar bo'limidan oching</span>`); return true; } return false; }

// ---- Yozuvlar bilan amallar ----
function entryAdd(list){
  const ids = []; let blok = 0;
  for(const e of list){
    const d = Math.round(+e.daqiqa);
    if(!isIso(e.sana) || !e.kat || !(d > 0)) continue;
    if(isYopiq(e.sana)){ blok++; continue; }
    const rec = {id: uid(), sana: e.sana, tur: "chiqim", kat: String(e.kat), daqiqa: Math.min(d, KUNLIK), izoh: String(e.izoh || "").trim().slice(0, 500), u: nowTs()};
    if(e.vaqt && hmToMin(e.vaqt) != null) rec.vaqt = e.vaqt;
    S.yozuvlar.push(rec); ids.push(rec.id); markOut("y:" + rec.id);
  }
  if(ids.length){ saqlaY(); Bus.emit("local", "yozuv"); }
  return {ids, blok};
}
function entryUpdate(id, patch){
  const r = yozuvTop(id); if(!r) return false;
  if(isYopiq(r.sana) || (patch.sana && isYopiq(patch.sana))) return false;
  if(patch.sana && isIso(patch.sana)) r.sana = patch.sana;
  if(patch.kat) r.kat = String(patch.kat);
  if(+patch.daqiqa > 0) r.daqiqa = Math.min(Math.round(+patch.daqiqa), KUNLIK);
  if(patch.izoh !== undefined) r.izoh = String(patch.izoh || "").trim().slice(0, 500);
  if(patch.vaqt !== undefined){ if(patch.vaqt && hmToMin(patch.vaqt) != null) r.vaqt = patch.vaqt; else delete r.vaqt; }
  r.u = nowTs();
  markOut("y:" + r.id); saqlaY(); Bus.emit("local", "yozuv");
  return true;
}
function entryRemove(ids){
  const set = new Set(ids), out = [];
  S.yozuvlar = S.yozuvlar.filter(r => { if(set.has(r.id)){ out.push(r); markOut("y:" + r.id, true); return false; } return true; });
  if(out.length){ saqlaY(); Bus.emit("local", "yozuv"); }
  return out;
}
function entryRestore(recs){
  for(const r of recs){ if(yozuvTop(r.id)) continue; r.u = nowTs(); S.yozuvlar.push(r); markOut("y:" + r.id); }
  saqlaY(); Bus.emit("local", "yozuv");
}
// Barcha yozuvlarni yangisiga almashtirish (import / tozalash): farqini hisoblab, navbatga qo'yadi
function entriesReplace(arr){
  const eski = new Map(S.yozuvlar.map(r => [r.id, r]));
  const yangi = arr.map(tozaYozuv).filter(Boolean);
  const idlar = new Set();
  for(const r of yangi){ if(idlar.has(r.id)) r.id = uid(); idlar.add(r.id); r.u = nowTs(); markOut("y:" + r.id); }
  for(const id of eski.keys()) if(!idlar.has(id)) markOut("y:" + id, true);
  S.yozuvlar = yangi; saqlaY(); Bus.emit("local", "yozuv");
}

// ---- Sozlamalar bilan amallar ----
function cfgTouch(name, jim){ markOut("c:" + name); saqlaC(); if(!jim) Bus.emit("local", name); }
function rejaKunSet(sana, obj){
  const o = tozaReja(obj);
  if(Object.keys(o).length){ S.rejaKun[sana] = o; markOut("r:" + sana); } else { delete S.rejaKun[sana]; markOut("r:" + sana, true); }
  saqlaC(); Bus.emit("local", "rejaKun");
}
function kayfiyatSet(sana, v){
  if(v >= 1 && v <= 5 && S.kayfiyat[sana] !== v){ S.kayfiyat[sana] = v; markOut("k:" + sana); } else { delete S.kayfiyat[sana]; markOut("k:" + sana, true); }
  saqlaC(); Bus.emit("local", "kayfiyat");
}

// ---- Oylik avto zaxira (shu qurilmada) ----
// Brauzer xotirasi cheklangan (taxminan 5 MB), shuning uchun zaxiralar soni ma'lumot hajmiga qarab kamayadi:
// kichik daftar — oxirgi 3 oy, katta — 1 oy, juda katta — saqlanmaydi (bulut va JSON eksport qoladi).
function bkPrefix(){ return "vbBk:" + (Meta.uid ? Meta.uid.slice(0, 8) + ":" : ""); }
function bkNechta(){ const h = (lsGet(KEY) || "").length; return h > 2400000 ? 0 : h > 1100000 ? 1 : 3; }
function bkSnap(){
  try{
    if(!S.yozuvlar.length) return;
    const p = bkPrefix(), k = p + oyKey(bugunISO()), nechta = bkNechta();
    let ks = bkKalitlar(p);
    if(nechta && !lsGet(k)){
      while(ks.length >= nechta) lsDel(ks.shift());             // avval joy bo'shatiladi
      lsSet(k, JSON.stringify(toliqZaxira()));
      ks = bkKalitlar(p);
    }
    while(ks.length > nechta) lsDel(ks.shift());
  }catch(e){}
}
// Joy bo'shatish: barcha avto zaxiralar o'chiriladi. Biror narsa o'chgan bo'lsa true.
function bkBoshat(){
  try{ const ks = Object.keys(localStorage).filter(x => x.indexOf("vbBk:") === 0); ks.forEach(lsDel); return ks.length > 0; }catch(e){ return false; }
}
// Faqat shu hisobning zaxiralari (prefiksdan keyin aynan YYYY-MM turadi)
function bkKalitlar(p){ return Object.keys(localStorage).filter(x => x.indexOf(p) === 0 && /^\d{4}-\d{2}$/.test(x.slice(p.length))).sort(); }
function bkList(){ try{ return bkKalitlar(bkPrefix()).reverse(); }catch(e){ return []; } }
function toliqZaxira(){
  return {ilova: "vaqt-banki", versiya: 2, sana: new Date().toISOString(), yozuvlar: S.yozuvlar,
    byudjet: S.byudjet, shablonlar: S.shablonlar, sozlama: S.sozlama, toifalar: S.toifalar, rejaKun: S.rejaKun,
    jamgarma: S.jamgarma, kayfiyat: S.kayfiyat, yopiqOylar: S.yopiqOylar, nishonBer: S.nishonBer};
}
