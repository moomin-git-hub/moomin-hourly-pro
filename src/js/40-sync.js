
// ============================ 5. SINXRON (server bilan aloqa) ============================
// Ishlash tartibi: har bir yozuv va sozlama alohida "element". Lokal o'zgarish navbatga (Meta.out) tushadi,
// serverga yuboriladi; server har o'zgarishga tartib raqami (rev) beradi. Boshqa qurilma o'zgartirsa,
// WebSocket orqali darhol xabar keladi va faqat yangi elementlar olinadi. Internet bo'lmasa — navbat kutadi.
const Sync = {
  token: null, user: null, devId: null,
  tabId: uid(),        // shu oynaning (tab) belgisi: bitta qurilmada bir nechta oyna ochiq bo'lsa, bir-birini yangilab turadi
  holat: "local",      // local | ulanmoqda | sinxron | jonli | onlayn | oflayn | xato | chiqdi
  xato: "", oxirgi: 0, onlayn: 0,
  ws: null, wsOk: false, band: false, yana: false,
};
class ApiXato extends Error { constructor(status, kod, msg){ super(msg); this.status = status; this.kod = kod; } }

function apiBase(){
  const v = (lsGet("vbApi") || VB_SERVER || "").trim();
  if(v) return v.replace(/\/+$/, "");
  return /^https?:$/.test(location.protocol) ? location.origin : "";
}
async function api(method, path, body, opt){
  opt = opt || {};
  const base = apiBase();
  if(!base) throw new ApiXato(0, "server_yoq", "Server manzili kiritilmagan");
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), opt.timeout || 25000);
  const headers = {};
  if(body !== undefined) headers["Content-Type"] = "application/json";
  if(!opt.noAuth && Sync.token) headers.Authorization = "Bearer " + Sync.token;
  let res;
  try{
    res = await fetch(base + path, {method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctl.signal, keepalive: !!opt.keepalive});
  }catch(e){
    throw new ApiXato(0, e && e.name === "AbortError" ? "vaqt" : "tarmoq", e && e.name === "AbortError" ? "Server javob bermadi — birozdan keyin urinib ko'ring" : "Internet yoki server bilan aloqa yo'q");
  }finally{ clearTimeout(tm); }
  let data = null;
  if((res.headers.get("content-type") || "").includes("application/json")){ try{ data = await res.json(); }catch(e){} }
  if(!res.ok){
    if(res.status === 401 && data && data.error === "sessiya_yoq" && !opt.noAuth && Sync.token) sessiyaTugadi();
    // 502/503/504 va javob bizniki emas — server hali uyg'onmagan (Render bepul tarifda uxlab qoladi)
    if(!data && (res.status === 502 || res.status === 503 || res.status === 504)) throw new ApiXato(res.status, "uygonmoqda", "Server uyg'onmoqda — bir daqiqagacha kuting");
    throw new ApiXato(res.status, (data && data.error) || "xato", (data && data.message) || (res.status === 404 || res.status === 405 ? "Bu manzilda Vaqt Banki serveri topilmadi" : `Server xatosi (${res.status})`));
  }
  if(!data) throw new ApiXato(res.status, "format", "Bu manzilda Vaqt Banki serveri topilmadi");
  if(data.now) _clockOff = data.now - Date.now();
  return data;
}
// Server uyg'onayotgan bo'lsa — tayyor bo'lguncha kutib, qayta urinadi (kirish va ro'yxatdan o'tishda)
async function apiSabr(method, path, body, opt){
  for(let i = 0; ; i++){
    try{ return await api(method, path, body, opt); }
    catch(e){ if((e.kod !== "uygonmoqda" && e.kod !== "baza") || i >= 24) throw e; await new Promise(r => setTimeout(r, 4000)); }
  }
}
function qurilmaNomi(){
  const u = navigator.userAgent || "";
  const os = /Android/i.test(u) ? "Android" : /iPhone|iPad|iPod/i.test(u) ? "iPhone" : /Windows/i.test(u) ? "Windows" : /Mac OS X/i.test(u) ? "Mac" : /Linux/i.test(u) ? "Linux" : "Qurilma";
  const br = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /SamsungBrowser/i.test(u) ? "Samsung Internet" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "brauzer";
  return os + " · " + br;
}

function setHolat(h, xato){
  Sync.holat = h; Sync.xato = xato || "";
  holatYangila();
}
function holatYangila(){
  const b = $("#syncBtn"); if(b) b.outerHTML = syncBtnHTML();
  for(const o of Ov) if(o.type === "page" && o.sync && o.render) o.render();
  const sh = $("#syncHolat"); if(sh) sh.innerHTML = syncHolatHTML();
}
function syncMeta(){
  const n = navbatSoni();
  switch(Sync.holat){
    case "jonli":     return {cl:"live",  icon:"cloud-check",  nom:"Jonli sinxron", izoh:"O'zgarishlar barcha qurilmalarda darhol ko'rinadi"};
    case "onlayn":    return {cl:"live",  icon:"cloud",        nom:"Sinxronlangan", izoh:"Jonli aloqa tiklanmoqda — har 30 soniyada tekshiriladi"};
    case "sinxron":   return {cl:"busy",  icon:"refresh-cw",   nom:"Sinxronlanmoqda", izoh:"Ma'lumot bulut bilan solishtirilmoqda"};
    case "ulanmoqda": return {cl:"busy",  icon:"refresh-cw",   nom:"Ulanmoqda", izoh:"Server yoki baza uxlab qolgan bo'lsa, uyg'onishi bir daqiqagacha vaqt oladi"};
    case "tinch":     return {cl:"live",  icon:"cloud",        nom:"Sinxronlangan", izoh:"Ilova tinch turgani uchun jonli aloqa to'xtatildi — ekranga tegishingiz bilan tiklanadi"};
    case "oflayn":    return {cl:"off",   icon:"cloud-off",    nom:"Oflayn", izoh: n ? `${n} ta o'zgarish internet paydo bo'lishini kutyapti` : "Internet yo'q — o'zgarishlar shu qurilmada saqlanadi"};
    case "xato":      return {cl:"err",   icon:"cloud-alert",  nom:"Sinxron xatosi", izoh: esc(Sync.xato) || "Serverga ulanib bo'lmadi — qayta uriniladi"};
    case "chiqdi":    return {cl:"err",   icon:"cloud-alert",  nom:"Qayta kirish kerak", izoh:"Sessiya tugagan. O'zgarishlar shu qurilmada saqlanib turibdi"};
    default:          return {cl:"local", icon:"cloud-off",    nom:"Faqat shu qurilmada", izoh: VB_KORGAZMA ? "Ko'rgazma nusxa — yozuvlar faqat shu brauzerda turadi" : "Hisobga kirsangiz, ma'lumot bulutda saqlanadi va qurilmalar orasida jonli sinxronlanadi"};
  }
}
function syncBtnHTML(){
  const m = syncMeta(), n = navbatSoni();
  return `<button class="ibtn sync-b ${m.cl}" id="syncBtn" data-act="syncSheet" aria-label="Sinxron: ${m.nom}">${ic(m.icon)}${n && Sync.holat !== "sinxron" && Sync.holat !== "local" ? `<span class="cnt num">${n > 99 ? "99+" : n}</span>` : ""}</button>`;
}

// ---- Ishga tushirish ----
function syncInit(){
  let d = lsGet("vbDev"); if(!d){ d = uid() + uid(); lsSet("vbDev", d); } Sync.devId = d;
  Sync.token = lsGet("vbTok"); Sync.user = jparse(lsGet("vbUser"), null);
  if(Sync.token && Sync.user){
    if(Meta.uid === Sync.user.id){ setHolat("ulanmoqda"); syncStart(); }
    else hisobBogla().catch(e => { console.error(e); setHolat("xato", e.message); });
  } else { Sync.token = null; setHolat(Meta.uid ? "chiqdi" : "local"); }
}
function syncStart(){ wsUla(); syncNow(); }
const syncKick = debounce(() => syncNow(), 450);

// ---- Yuborish va olish (bitta so'rovda) ----
// Navbatdagi niyatdan serverga boradigan amal yasaydi. O'chirish faqat aniq «o'chirildi» deb belgilangan bo'lsa yuboriladi:
// yozuv shunchaki topilmasa (kutilmagan holat) — hech narsa yuborilmaydi, bulutdagi nusxaga tegilmaydi.
function opYasash(key, o){
  const k = key.charAt(0), id = key.slice(2);
  if(k === "c") return CFG_DOCS.includes(id) ? {k, id, d: S[id], ts: o.t} : null;
  if(k !== "y" && k !== "r" && k !== "k") return null;
  if(o.d) return {k, id, del: 1, ts: o.t};
  const v = k === "y" ? yozuvTop(id) : k === "r" ? S.rejaKun[id] : S.kayfiyat[id];
  return v ? {k, id, d: v, ts: o.t} : null;
}
let _retryT = null, _retryN = 0, _kutN = 0;
async function syncNow(){
  if(!Sync.token || !Meta.uid) return;
  if(Sync.band){ Sync.yana = true; return; }
  clearTimeout(_retryT);
  if(navigator.onLine === false){ setHolat("oflayn"); return; }
  Sync.band = true;
  const bandT = setTimeout(() => { if(Sync.band && Sync.holat !== "ulanmoqda") setHolat("sinxron"); }, 650);
  try{
    for(let guard = 0; guard < 800; guard++){
      const keys = Object.keys(Meta.out).slice(0, 300), sent = {}, ops = [];
      for(const k of keys){ sent[k] = Meta.out[k].t; const op = opYasash(k, Meta.out[k]); if(op) ops.push(op); else delete Meta.out[k]; }
      const res = await api("POST", "/api/sync", {since: Meta.rev, ops, dev: Sync.devId, tab: Sync.tabId}, {timeout: 75000});
      const n = remoteApply(res.items || []);
      for(const k of keys){ if(Meta.out[k] && Meta.out[k].t === sent[k]) delete Meta.out[k]; }
      Meta.rev = res.more ? res.next : res.rev;
      metaSave();
      if(n) remoteSaqla();
      if(!res.more && !Object.keys(Meta.out).length) break;
    }
    Sync.oxirgi = Date.now(); _retryN = 0; _kutN = 0;
    setHolat(_tinch ? "tinch" : Sync.wsOk ? "jonli" : "onlayn");
  }catch(e){
    if(Sync.token){
      // server uyg'onmoqda yoki javob kechikdi — xato deb ko'rsatmay, sabr bilan qayta urinamiz
      const kut = navigator.onLine !== false && (e.kod === "uygonmoqda" || e.kod === "baza" || e.kod === "vaqt" || (e.kod === "format" && Meta.rev > 0));
      if(kut && _kutN++ < 30){ setHolat("ulanmoqda"); _retryT = setTimeout(syncNow, 4000); }
      else {
        setHolat(navigator.onLine === false || e.kod === "tarmoq" ? "oflayn" : "xato", e.message);
        _retryT = setTimeout(syncNow, Math.min(60000, 2500 * Math.pow(2, _retryN++)));
      }
    }
  }finally{
    clearTimeout(bandT);
    Sync.band = false;
    if(Sync.yana){ Sync.yana = false; syncNow(); }
  }
}
// Bulutdan kelgan elementlarni lokal holatga qo'llash. Lokalda yangiroq (hali yuborilmagan) o'zgarish bo'lsa — tegilmaydi.
function remoteApply(items){
  let n = 0; const nima = Sync._nima || (Sync._nima = new Set());
  let ix = null;
  if(items.length > 40){ ix = new Map(); S.yozuvlar.forEach((r, i) => ix.set(r.id, i)); }
  const topIdx = id => ix ? (ix.has(id) ? ix.get(id) : -1) : S.yozuvlar.findIndex(r => r.id === id);
  const ochir = [];
  for(const it of items){
    if(!it || !it.k) continue;
    const key = it.k + ":" + it.id, p = Meta.out[key];
    if(p && p.t >= it.ts) continue;
    if(p) delete Meta.out[key];
    if(it.k === "y"){
      const i = topIdx(it.id);
      if(it.del){ if(i >= 0){ ochir.push(it.id); n++; nima.add("yozuv"); } }
      else { const rec = tozaYozuv({...(it.d || {}), id: it.id});
        if(rec){ rec.u = it.ts; if(i >= 0) S.yozuvlar[i] = rec; else { S.yozuvlar.push(rec); if(ix) ix.set(rec.id, S.yozuvlar.length - 1); } n++; nima.add("yozuv"); } }
    } else if(it.k === "c"){
      if(CFG_DOCS.includes(it.id) && !it.del){ const kirEdi = it.id === "sozlama" && S.sozlama.alifbo === "kiril";
        S[it.id] = tozaCfg(it.id, it.d); n++; nima.add(it.id);
        if(kirEdi && S.sozlama.alifbo !== "kiril") Sync._lotinga = true; }
    } else if(it.k === "r"){
      if(isIso(it.id)){ const r = it.del ? {} : tozaReja(it.d); if(Object.keys(r).length) S.rejaKun[it.id] = r; else delete S.rejaKun[it.id]; n++; nima.add("rejaKun"); }
    } else if(it.k === "k"){
      if(isIso(it.id)){ const v = +it.d; if(it.del || !(v >= 1 && v <= 5)) delete S.kayfiyat[it.id]; else S.kayfiyat[it.id] = v; n++; nima.add("kayfiyat"); }
    }
  }
  if(ochir.length){ const set = new Set(ochir); S.yozuvlar = S.yozuvlar.filter(r => !set.has(r.id)); }
  return n;
}
function remoteSaqla(){
  const nima = Sync._nima || new Set(); Sync._nima = null;
  saqlaY(); saqlaC();
  if(Sync._lotinga){ Sync._lotinga = false; metaSave(); location.reload(); return; }      // kirillga o'girilgan matn faqat qayta yuklash bilan lotinga qaytadi
  if(nima.has("sozlama")){ applyMavsum(); if(typeof eslatmaQur === "function") eslatmaQur(); }
  if(nima.has("timer") && typeof timerTashqi === "function") timerTashqi();
  Bus.emit("remote", nima);
}
async function pullAll(){
  const items = []; let since = 0, rev = 0;
  for(let i = 0; i < 2000; i++){
    const r = await api("GET", "/api/sync?since=" + since, undefined, {timeout: 75000});
    for(const it of (r.items || [])) items.push(it);
    rev = r.rev;
    if(!r.more) break;
    since = r.next;
  }
  return {items, rev};
}

// ---- Hisobni shu qurilmaga bog'lash (kirgandan keyin birinchi sinxron) ----
async function hisobBogla(){
  const user = Sync.user; if(!user) return;
  if(Meta.uid === user.id){ syncStart(); return; }
  setHolat("ulanmoqda");
  const lokalSoni = chiqimlar().length, namuna = namunami();
  let birlashtir = lokalSoni > 0 && !namuna && !Meta.uid;      // Meta.uid boshqa hisobniki bo'lsa — begona kesh, qo'shilmaydi
  const all = await pullAll();
  const serverda = all.items.filter(it => it.k === "y" && !it.del && it.d && it.d.tur !== "kirim").length;
  if(birlashtir && serverda > 0){
    birlashtir = !!(await confirmDlg({icon: "layers", title: "Bu qurilmadagi yozuvlar",
      text: `Bu qurilmada hisobga bog'lanmagan <b>${tanga(lokalSoni)}</b> ta yozuv bor. Ularni hisobingizdagi ${tanga(serverda)} ta yozuvga qo'shaymi? Takrorlanganlari qo'shilmaydi.`,
      ok: "Ha, qo'shilsin", cancel: "Yo'q, faqat hisobdagisi qolsin"}));
  }
  const lokal = birlashtir ? JSON.parse(JSON.stringify({yozuvlar: S.yozuvlar, byudjet: S.byudjet, shablonlar: S.shablonlar, sozlama: S.sozlama, toifalar: S.toifalar,
    jamgarma: S.jamgarma, yopiqOylar: S.yopiqOylar, nishonBer: S.nishonBer, rejaKun: S.rejaKun, kayfiyat: S.kayfiyat})) : null;
  storeReset();
  Meta = {uid: user.id, rev: 0, out: {}};
  Sync._nima = null;
  remoteApply(all.items); Meta.rev = all.rev;
  let qoshildi = 0;
  if(lokal) qoshildi = lokalniQosh(lokal, all.items);
  namunaBelgi(false); lsDel("vbLocal");
  Sync._nima = null;
  saqlaY(); saqlaC(); metaSave();
  applyMavsum();
  if(!kunlar().includes(tanlangan)) tanlangan = bugunISO();
  Bus.emit("remote", new Set(["yozuv"]));
  if(Sync._lotinga){ Sync._lotinga = false; location.reload(); return; }
  if(qoshildi) toast(`${ic("cloud-upload")}<span><b>${tanga(qoshildi)}</b> ta yozuv hisobingizga yuklanmoqda</span>`);
  syncStart();
}
function lokalniQosh(lokal, items){
  const serverIds = new Set(items.filter(it => it.k === "y").map(it => it.id));
  const sig = r => [r.sana, r.tur, r.kat, r.daqiqa, r.izoh || "", r.vaqt || ""].join("|");
  const bor = new Map(); for(const r of S.yozuvlar){ const k = sig(r); bor.set(k, (bor.get(k) || 0) + 1); }
  let n = 0;
  for(const raw of lokal.yozuvlar){
    const r = tozaYozuv(raw); if(!r || serverIds.has(r.id)) continue;
    const k = sig(r), c = bor.get(k) || 0;
    if(c > 0){ bor.set(k, c - 1); continue; }                 // xuddi shunday yozuv hisobda bor — takrorlanmaydi
    r.u = r.u || nowTs(); S.yozuvlar.push(r); markOut("y:" + r.id); if(r.tur !== "kirim") n++;
  }
  const serverCfg = new Set(items.filter(it => it.k === "c" && !it.del).map(it => it.id));
  for(const name of CFG_DOCS){ if(name === "timer" || serverCfg.has(name) || lokal[name] === undefined) continue; S[name] = tozaCfg(name, lokal[name]); markOut("c:" + name); }
  for(const d in (lokal.rejaKun || {})){ if(isIso(d) && !S.rejaKun[d]){ const r = tozaReja(lokal.rejaKun[d]); if(Object.keys(r).length){ S.rejaKun[d] = r; markOut("r:" + d); } } }
  for(const d in (lokal.kayfiyat || {})){ const v = +lokal.kayfiyat[d]; if(isIso(d) && !S.kayfiyat[d] && v >= 1 && v <= 5){ S.kayfiyat[d] = v; markOut("k:" + d); } }
  invalidateIdx();
  return n;
}

// ---- Jonli aloqa (WebSocket) ----
let _wsN = 0, _wsT = null, _wsSeen = 0;
function wsUla(){
  if(!Sync.token || Sync.ws || _tinch || navigator.onLine === false) return;
  const base = apiBase(); if(!base) return;
  let ws; try{ ws = new WebSocket(base.replace(/^http/, "ws") + "/ws"); }catch(e){ wsQayta(); return; }
  Sync.ws = ws;
  ws.onopen = () => { try{ ws.send(JSON.stringify({t: "auth", token: Sync.token, dev: Sync.devId})); }catch(e){} };
  ws.onmessage = ev => {
    let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
    _wsSeen = Date.now();
    if(m.t === "ready"){ Sync.wsOk = true; _wsN = 0; Sync.onlayn = m.online || 1; if(m.now) _clockOff = m.now - Date.now();
      if(m.rev > Meta.rev || navbatSoni()) syncNow(); else if(!Sync.band){ Sync.oxirgi = Sync.oxirgi || Date.now(); setHolat("jonli"); } }
    else if(m.t === "rev"){ if(m.tab !== Sync.tabId && m.rev > Meta.rev) syncNow(); }
    else if(m.t === "online"){ Sync.onlayn = m.n; holatYangila(); }
    else if(m.t === "bye"){ sessiyaTugadi(); }
  };
  ws.onclose = () => {
    if(Sync.ws !== ws) return;
    Sync.ws = null; Sync.wsOk = false;
    if(Sync.token){ if(Sync.holat === "jonli") setHolat(navigator.onLine === false ? "oflayn" : "onlayn"); wsQayta(); }
  };
  ws.onerror = () => { try{ ws.close(); }catch(e){} };
}
function wsQayta(){ clearTimeout(_wsT); if(!Sync.token) return; _wsT = setTimeout(wsUla, [1000, 2000, 5000, 10000, 20000, 30000][Math.min(_wsN++, 5)]); }
function wsUz(){ clearTimeout(_wsT); const w = Sync.ws; Sync.ws = null; Sync.wsOk = false; if(w){ w.onclose = null; try{ w.close(); }catch(e){} } }
// ---- Tejamkor rejim ----
// Ilova ishlatilmay tursa, jonli aloqa uziladi: server behuda uyg'oq turmaydi (Render bepul tarifida oylik soat cheklangan).
// Ekranga tegilishi yoki ilovaga qaytilishi bilan aloqa darhol tiklanadi va o'zgarishlar olinadi.
let TINCH_MS = 12 * 60000, YASHIRIN_MS = 3 * 60000;
let _faolT = Date.now(), _yashT = 0, _tinch = false;
function tinchmi(){
  return document.visibilityState === "visible" ? Date.now() - _faolT > TINCH_MS : (_yashT > 0 && Date.now() - _yashT > YASHIRIN_MS);
}
function uygot(){
  _faolT = Date.now();
  if(!_tinch) return;
  _tinch = false;
  if(Sync.token){ _wsN = 0; wsUla(); syncNow(); }
}
for(const h of ["pointerdown", "keydown", "wheel", "touchstart"]) window.addEventListener(h, uygot, {passive: true, capture: true});
function aloqaTik(){
  if(!Sync.token) return;
  if(!_tinch && tinchmi() && !navbatSoni() && !Sync.band){
    _tinch = true; wsUz(); clearTimeout(_retryT);
    if(Sync.holat === "jonli" || Sync.holat === "onlayn") setHolat("tinch");
    return;
  }
  if(_tinch) return;
  if(Sync.ws && Sync.wsOk){
    if(Date.now() - _wsSeen > 70000){ wsUz(); wsUla(); return; }
    try{ Sync.ws.send('{"t":"ping"}'); }catch(e){}
  } else if(document.visibilityState === "visible"){ if(!Sync.ws) wsUla(); syncNow(); }
}
setInterval(aloqaTik, 25000);
window.addEventListener("online", () => { if(Sync.token && !_tinch){ _wsN = 0; wsUla(); syncNow(); } });
window.addEventListener("offline", () => { if(Sync.token) setHolat("oflayn"); });
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    _yashT = 0;
    const tinchEdi = _tinch; uygot();
    if(Sync.token && !tinchEdi){ if(!Sync.ws) wsUla(); syncNow(); }
  } else {
    _yashT = Date.now();
    if(Sync.token && navbatSoni() && !Sync.band){ metaSave(); syncNow(); }
  }
});

// ---- Sessiya ----
function sessiyaOch(r){
  Sync.token = r.token; Sync.user = r.user;
  lsSet("vbTok", r.token); lsSet("vbUser", JSON.stringify(r.user));
  try{ if(navigator.storage && navigator.storage.persist){ const p = navigator.storage.persist(); if(p && p.catch) p.catch(() => {}); } }catch(e){}
}
function sessiyaTugadi(){
  if(!Sync.token) return;
  Sync.token = null; lsDel("vbTok"); wsUz(); clearTimeout(_retryT);
  setHolat("chiqdi");
  if(typeof authKor === "function") authKor("kir", "Sessiya tugadi — qayta kiring. Bu qurilmadagi o'zgarishlar saqlanib turibdi.");
}
// Hisobdan chiqish: lokal nusxa tozalanadi (ma'lumot bulutda qoladi)
function lokalTozalash(){
  wsUz(); clearTimeout(_retryT); _tinch = false; _kutN = 0;
  Sync.token = null; Sync.user = null; Sync.oxirgi = 0; Sync.onlayn = 0;
  lsDel("vbTok"); lsDel("vbUser"); lsDel(KEY); lsDel(CFG_KEY); lsDel(SYNC_KEY); lsDel("vbPin"); namunaBelgi(false); lsDel("vbLocal");
  storeReset(); Meta = {uid: null, rev: 0, out: {}};
  tanlangan = bugunISO();
  setHolat("local");
}
