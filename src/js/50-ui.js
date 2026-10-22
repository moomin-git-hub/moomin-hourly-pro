
// ============================ 6. UI KIT ============================
const A = {};            // amallar: data-act="nom" -> A.nom(el, hodisa)
const Screens = {};      // asosiy ekranlar: Screens.asosiy = {render(el)}
const TABLAR = ["asosiy","daftar","fokus","reja","tahlil"];
let curTab = "asosiy";
const Ov = [];           // ochiq oynalar (sheet, dialog, menyu, sahifa) steki

// ---- Mavzu ----
function themeMode(){ return lsGet("vbTheme") || "auto"; }
function themeHal(mode){
  if(mode !== "auto") return mode;
  const tashqi = window.__vbTashqiMavzu;                 // sahifa boshqa muhit ichida ochilgan bo'lsa (masalan Claude), o'sha muhit tanlovi
  if(tashqi === "dark" || tashqi === "light") return tashqi;
  return (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
let _mavzuOz = 0;       // ko'rgazma nusxada: o'zimiz yozgan data-theme o'zgarishlari soni (tashqi muhitnikidan ajratish uchun)
function applyTheme(){
  const hal = themeHal(themeMode());
  if(VB_KORGAZMA){ _mavzuOz++; document.documentElement.setAttribute("data-theme", hal); }
  else if(hal === "dark") document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme");
  const m = $("#themeColor"); if(m) m.content = hal === "dark" ? "#04051a" : "#eef1fa";
}
function themeIcon(){ const m = themeMode(); return m === "auto" ? "sun-moon" : (m === "dark" ? "moon" : "sun"); }
function themeSet(mode){ lsSet("vbTheme", mode); applyTheme(); render(); }
A.themeCycle = () => {
  const tartib = ["light","dark","auto"], next = tartib[(tartib.indexOf(themeMode()) + 1) % 3];
  themeSet(next);
  toast(`${ic(themeIcon())}<span>${next === "auto" ? "Mavzu tizimga ergashadi" : next === "dark" ? "Qorong'u mavzu" : "Yorug' mavzu"}</span>`);
};
try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if(themeMode() === "auto"){ applyTheme(); render(); } }); }catch(e){}

function applyMavsum(){
  let m = S.sozlama.mavsum || "avto";
  if(m === "avto"){ const d = new Date(), mo = d.getMonth() + 1, dt = d.getDate();
    m = (mo === 3 && dt >= 15 && dt <= 25) ? "navroz" : (mo === 9 && dt <= 7) ? "mustaqillik" : "oddiy"; }
  if(m === "oddiy") document.documentElement.removeAttribute("data-mavsum"); else document.documentElement.setAttribute("data-mavsum", m);
}

// ---- Xabarcha (toast) ----
// opt.undo — «Qaytarish» tugmasi; opt.amal = {matn, fn} — boshqa amal tugmasi; opt.ms — ko'rinib turish vaqti
function toast(html, opt){
  opt = opt || {};
  const host = $("#toasts"); if(!host) return;
  while(host.children.length > 1) host.firstChild.remove();
  const amal = opt.amal || (opt.undo ? {matn: "Qaytarish", fn: opt.undo} : null);
  const t = document.createElement("div"); t.className = "toast";
  t.innerHTML = `<span style="display:contents">${html}</span>` + (amal ? `<button type="button">${amal.matn}</button>` : "");
  cyrPass(t);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  let done = false;
  const close = () => { if(done) return; done = true; t.classList.remove("in"); setTimeout(() => t.remove(), 300); };
  if(amal) t.querySelector("button").addEventListener("click", () => { close(); amal.fn(); });
  setTimeout(close, opt.ms || (amal ? 5200 : 2800));
}

// ---- Effektlar: tovush, titrash, tanga yomg'iri ----
let _actx = null;
function blip(){
  if(!S.sozlama.tovush) return;
  try{
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
    if(_actx.state === "suspended") _actx.resume();
    const o = _actx.createOscillator(), g = _actx.createGain(), t = _actx.currentTime;
    o.type = "triangle"; o.frequency.setValueAtTime(1240, t); o.frequency.exponentialRampToValueAtTime(1860, t + .07);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .16);
    o.connect(g); g.connect(_actx.destination); o.start(); o.stop(t + .18);
  }catch(e){}
}
function vibra(ms){ if(!S.sozlama.vibra) return; try{ navigator.vibrate && navigator.vibrate(ms || 12); }catch(e){} }
function fxCoins(){
  if(!S.sozlama.effekt || reduceMotion) return;
  const fx = $("#fx"); if(!fx) return;
  const n = MOBIL ? 14 : 22, frag = document.createDocumentFragment();
  for(let i = 0; i < n; i++){ const c = document.createElement("i");
    c.style.left = (4 + Math.random() * 92) + "vw"; c.style.animationDuration = (1.5 + Math.random() * 1.4) + "s"; c.style.animationDelay = (Math.random() * .5) + "s";
    const s = 8 + Math.random() * 8; c.style.width = s + "px"; c.style.height = s + "px"; frag.appendChild(c); }
  fx.appendChild(frag); setTimeout(() => { fx.innerHTML = ""; }, 3600); vibra(30);
}
function animateNum(el, from, to){
  if(!el) return;
  if(reduceMotion || from === to || from == null){ el.textContent = tanga(to); return; }
  const dur = 520, t0 = performance.now();
  (function step(t){ const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = tanga(Math.round(from + (to - from) * e)); if(k < 1 && el.isConnected) requestAnimationFrame(step); })(t0);
  setTimeout(() => { if(el.isConnected) el.textContent = tanga(to); }, dur + 150);      // kadrlar sekinlashsa ham (orqa fondagi oyna) oxirgi qiymat aniq turadi
}

// ---- Oynalar steki ----
function ovOf(el){ for(let i = Ov.length - 1; i >= 0; i--) if(Ov[i].el.contains(el)) return Ov[i]; return null; }
function ovSync(){
  document.body.style.overflow = Ov.length ? "hidden" : "";
  // xabarchalar joyi uchun: oyna (sheet/dialog) ochiqmi yoki faqat ichki sahifami
  document.body.classList.toggle("ov-open", Ov.some(o => o.type === "sheet" || o.type === "dlg"));
  document.body.classList.toggle("page-open", Ov.some(o => o.type === "page"));
}
function ovPush(o){
  Ov.push(o); ovSync();
  o.close = res => ovClose(o, res);
  requestAnimationFrame(() => requestAnimationFrame(() => o.el.classList.add("in")));
  return o;
}
function ovClose(o, res){
  if(!o || o.closed) return; o.closed = true;
  const i = Ov.indexOf(o); if(i >= 0) Ov.splice(i, 1);
  o.el.classList.remove("in"); ovSync();
  setTimeout(() => o.el.remove(), 360);
  if(o.onClose){ try{ o.onClose(res); }catch(e){ console.error(e); } }
}
function ovCloseAll(){ while(Ov.length) ovClose(Ov[Ov.length - 1]); }
A.ovClose = el => ovClose(ovOf(el));

// Pastdan chiqadigan oyna (kompyuterda — o'rtada)
function openSheet(opt){
  const ov = document.createElement("div"); ov.className = "ov" + (opt.cls ? " " + opt.cls : "");
  ov.innerHTML = `<div class="scrim" data-act="ovClose"></div>
    <section class="sheet${opt.full ? " full" : ""}" role="dialog" aria-modal="true" aria-label="${esc(opt.aria || opt.title || "")}">
      <div class="grab"></div>
      <header class="sheet-h"><h3>${opt.title || ""}${opt.sub ? `<small>${opt.sub}</small>` : ""}</h3><button class="ibtn plain" data-act="ovClose" aria-label="Yopish">${ic("x")}</button></header>
      <div class="sheet-b">${opt.body || ""}</div>
      ${opt.foot ? `<footer class="sheet-f">${opt.foot}</footer>` : ""}
    </section>`;
  $("#overlays").appendChild(ov);
  const o = ovPush({el: ov, type: "sheet", onClose: opt.onClose});
  o.body = $(".sheet-b", ov); o.sheet = $(".sheet", ov);
  sheetDrag(o); cyrPass(ov);
  return o;
}
// Oynani pastga tortib yopish
function sheetDrag(o){
  const sh = o.sheet; let y0 = 0, dy = 0, t0 = 0, on = false;
  const start = e => { if(e.target.closest("button")) return; on = true; y0 = e.clientY; dy = 0; t0 = Date.now(); sh.classList.add("drag"); try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){} };
  const move = e => { if(!on) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = `translateY(${dy}px)`; };
  const end = () => { if(!on) return; on = false; sh.classList.remove("drag"); sh.style.transform = "";
    if(dy > 120 || (dy > 40 && dy / Math.max(1, Date.now() - t0) > .55)) ovClose(o); };
  for(const h of [$(".grab", sh), $(".sheet-h", sh)]){ if(!h) continue;
    h.addEventListener("pointerdown", start); h.addEventListener("pointermove", move); h.addEventListener("pointerup", end); h.addEventListener("pointercancel", end); }
}
// Tasdiqlash oynasi -> Promise<boolean>
function confirmDlg(opt){
  return new Promise(resolve => {
    const ov = document.createElement("div"); ov.className = "ov center";
    ov.innerHTML = `<div class="scrim" data-act="ovClose"></div>
      <div class="dlg" role="alertdialog" aria-modal="true">
        <div class="tile-ic ${opt.danger ? "bad" : "blue"}">${ic(opt.icon || (opt.danger ? "triangle-alert" : "circle-help"))}</div>
        <h3>${opt.title}</h3>${opt.text ? `<p>${opt.text}</p>` : ""}
        <div class="btn-row">
          <button class="btn ${opt.danger ? "danger" : "blue"}" data-yes>${opt.ok || "Ha"}</button>
          ${opt.alt ? `<button class="btn soft" data-alt>${opt.alt}</button>` : ""}
          ${opt.cancel === false ? "" : `<button class="btn ghost" data-act="ovClose">${opt.cancel || "Bekor qilish"}</button>`}
        </div>
      </div>`;
    $("#overlays").appendChild(ov);
    const o = ovPush({el: ov, type: "dlg", onClose: r => resolve(r || false)});
    $("[data-yes]", ov).addEventListener("click", () => ovClose(o, true));
    const alt = $("[data-alt]", ov); if(alt) alt.addEventListener("click", () => ovClose(o, "alt"));
    cyrPass(ov);
  });
}
// Kichik menyu (⋮)
function openMenu(anchor, items){
  const ov = document.createElement("div"); ov.className = "ov pop";
  ov.innerHTML = `<div class="scrim" data-act="ovClose"></div><div class="menu" role="menu">${items.filter(Boolean).map((it, i) =>
    `<button role="menuitem" data-i="${i}" class="${it.danger ? "danger" : ""}">${ic(it.icon)}<span>${it.label}</span></button>`).join("")}</div>`;
  $("#overlays").appendChild(ov);
  const menu = $(".menu", ov), r = anchor.getBoundingClientRect();
  const o = ovPush({el: ov, type: "menu"});
  const list = items.filter(Boolean);
  requestAnimationFrame(() => {
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = Math.min(Math.max(12, r.right - mw), innerWidth - mw - 12), top = r.bottom + 8;
    if(top + mh > innerHeight - 12) top = Math.max(12, r.top - mh - 8);
    menu.style.left = left + "px"; menu.style.top = top + "px";
  });
  menu.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if(!b) return; const it = list[+b.dataset.i]; ovClose(o); if(it && it.fn) setTimeout(it.fn, 60); });
  cyrPass(ov);
}
// Ichki sahifa (Profil va bo'limlari)
function openPage(opt){
  const el = document.createElement("div"); el.className = "page";
  el.innerHTML = `<div class="page-in"><div class="page-top"><button class="back" data-act="ovClose" aria-label="Orqaga">${ic("arrow-left")}</button><h1>${opt.title}</h1>${opt.right || ""}</div><div class="page-b stack-v"></div></div>`;
  $("#pages").appendChild(el);
  el.addEventListener("click", e => { if(e.target === el) ovClose(o); });
  const o = ovPush({el, type: "page", onClose: opt.onClose});
  o.body = $(".page-b", el);
  o.render = () => { try{ opt.render(o.body, o); }catch(e){ console.error(e); o.body.innerHTML = xatoKarta(e); } cyrPass(el); };
  o.render();
  return o;
}
function xatoKarta(e){ return `<div class="card"><div class="empty"><div class="art">${ic("triangle-alert")}</div><p>Bu bo'limni chizishda xato chiqdi. Sahifani yangilab ko'ring.</p><p class="note">${esc((e && e.message) || e)}</p></div></div>`; }

// ---- Tanlagichlar ----
// Ro'yxatdan bittasini tanlash -> Promise<qiymat|null>
function pickOption(opt){
  return new Promise(resolve => {
    const o = openSheet({title: opt.title, sub: opt.sub, body: `<div class="rows">${opt.options.map((x, i) =>
      `<button class="row" data-i="${i}">${x.icon ? `<span class="tile-ic sm ${x.g ? "g-" + x.g : "blue"}">${ic(x.icon)}</span>` : (x.g ? `<span class="gdot g-${x.g}"></span>` : "")}
        <span class="row-main"><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</span>${x.value === opt.value ? ic("check", "ok-t") : ""}</button>`).join("")}</div>`,
      onClose: r => resolve(r === undefined ? null : r)});
    o.body.addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if(b) ovClose(o, opt.options[+b.dataset.i].value); });
  });
}
// Vaqt tanlash (telefonning o'z soat maydoni o'rniga) -> Promise<"HH:MM" | "" (tozalandi) | null (bekor)>
// opt: {title, value, tavsiya: [{label, value}]}
function pickVaqt(opt){
  return new Promise(resolve => {
    const v0 = hmToMin(opt.value);
    let min = v0 != null ? v0 : Math.round(hozirDaqiqa() / 5) * 5 % 1440, qism = "s";
    const tav = (opt.tavsiya || []).filter(x => x && hmToMin(x.value) != null);
    const chiz = () => {
      const h = Math.floor(min / 60), m = min % 60;
      const panjara = qism === "s"
        ? Array.from({length: 24}, (_, i) => `<button type="button" class="vt-k num${i === h ? " on" : ""}" data-h="${i}">${String(i).padStart(2, "0")}</button>`).join("")
        : Array.from({length: 12}, (_, i) => i * 5).map(x => `<button type="button" class="vt-k num${x === m ? " on" : (m % 5 && Math.floor(m / 5) * 5 === x ? " yaqin" : "")}" data-m="${x}">:${String(x).padStart(2, "0")}</button>`).join("");
      return `<div class="vt-top">
          <button type="button" class="amt-b" data-st="-5" aria-label="5 daqiqa oldin">${ic("minus")}</button>
          <div class="vt-disp num"><button type="button" class="${qism === "s" ? "on" : ""}" data-q="s" aria-label="Soat">${String(h).padStart(2, "0")}</button><i>:</i><button type="button" class="${qism === "m" ? "on" : ""}" data-q="m" aria-label="Daqiqa">${String(m).padStart(2, "0")}</button></div>
          <button type="button" class="amt-b" data-st="5" aria-label="5 daqiqa keyin">${ic("plus")}</button>
        </div>
        <div class="vt-hint">${qism === "s" ? "Soatni tanlang" : "Daqiqani tanlang · ±1 uchun pastdagi tugmalar"}</div>
        <div class="vt-grid ${qism === "s" ? "s" : "m"}">${panjara}</div>
        ${qism === "m" ? `<div class="chips" style="justify-content:center;margin-top:10px"><button type="button" class="chip sm num" data-st="-1">−1 daq</button><button type="button" class="chip sm num" data-st="1">+1 daq</button></div>` : ""}
        ${tav.length ? `<div class="chips scroll vt-tav">${tav.map((x, i) => `<button type="button" class="chip sm" data-t="${i}">${ic("clock")}${esc(x.label)} <b class="num">${x.value}</b></button>`).join("")}</div>` : ""}`;
    };
    const o = openSheet({title: opt.title || "Vaqt", cls: "vt-sheet", body: `<div id="vtB">${chiz()}</div>`,
      foot: `${opt.tozalash ? `<button class="btn ghost" data-tozala style="flex:0 0 auto">Tozalash</button>` : ""}<button class="btn blue" data-ok>Tayyor</button>`,
      onClose: r => resolve(r === undefined ? null : r)});
    const yangila = () => { $("#vtB", o.el).innerHTML = chiz(); cyrPass($("#vtB", o.el)); };
    o.el.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.dataset.h != null){ min = (+b.dataset.h) * 60 + min % 60; qism = "m"; vibra(6); yangila(); }
      else if(b.dataset.m != null){ min = Math.floor(min / 60) * 60 + (+b.dataset.m); vibra(6); yangila(); }
      else if(b.dataset.st){ min = ((min + (+b.dataset.st)) % 1440 + 1440) % 1440; vibra(4); yangila(); }
      else if(b.dataset.q){ qism = b.dataset.q; yangila(); }
      else if(b.dataset.t != null){ ovClose(o, tav[+b.dataset.t].value); }
      else if(b.dataset.ok !== undefined) ovClose(o, hhmm(min));
      else if(b.dataset.tozala !== undefined) ovClose(o, "");
    });
  });
}
// Kun ichida eng oxirgi tugagan yozuv vaqti (keyingi ish shundan boshlanadi)
function oxirgiTugash(sana, istisno){
  let ox = null;
  for(const r of kunYozuv(sana)){ if(r.id === istisno) continue; const s = hmToMin(r.vaqt); if(s == null) continue; const e = Math.min(s + r.daqiqa, 1440); if(ox == null || e > ox) ox = e; }
  return ox;
}
// Toifa tanlash -> Promise<toifa nomi|null>
function pickKat(joriy){
  return new Promise(resolve => {
    const chiz = q => {
      q = (q || "").trim().toLowerCase();
      const kats = faolKategoriyalar().filter(k => !q || k.toLowerCase().includes(q) || GURUH[katGuruh(k)].nom.toLowerCase().includes(q));
      if(joriy && !q && !kats.includes(joriy)) kats.push(joriy);
      if(!kats.length) return `<div class="empty"><div class="art">${ic("search")}</div><p>«${esc(q)}» bo'yicha toifa topilmadi.</p></div>`;
      return GURUH_TARTIB.map(g => {
        const list = kats.filter(k => katGuruh(k) === g); if(!list.length) return "";
        return `<div class="kat-g g-${g}"><div class="kat-gh"><span class="gdot"></span>${GURUH[g].nom}</div><div class="kat-grid">${list.map(k =>
          `<button class="kat-b${k === joriy ? " on" : ""}" data-kat="${esc(k)}"><span class="tile-ic sm">${ic(katIcon(k))}</span><span>${katNomHTML(k)}</span></button>`).join("")}</div></div>`;
      }).join("");
    };
    const o = openSheet({title: "Toifa tanlang", full: true, cls: "kat-sheet",
      body: `<div class="srch">${ic("search")}<input type="search" placeholder="Toifa qidirish" aria-label="Toifa qidirish" autocomplete="off"></div>
        <div class="kat-list">${chiz("")}</div>
        <button class="btn dashed wide" data-yangi style="margin-top:16px">${ic("plus")}Yangi toifa</button>`,
      onClose: r => resolve(r || null)});
    const list = $(".kat-list", o.body);
    $("input", o.body).addEventListener("input", e => { list.innerHTML = chiz(e.target.value); cyrPass(list); });
    o.body.addEventListener("click", async e => {
      const b = e.target.closest("[data-kat]"); if(b){ ovClose(o, b.dataset.kat); return; }
      if(e.target.closest("[data-yangi]")){ const nom = await toifaTahrir(null); if(nom) ovClose(o, nom); }
    });
  });
}
// Oy taqvimi (tanlagich va Daftar uchun umumiy)
function calHTML(ym, tanl){
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, first = new Date(y, m, 1), last = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7, t = bugunISO();
  let h = `<div class="cal-w">${["Du","Se","Cho","Pa","Ju","Sha","Ya"].map(x => `<span>${x}</span>`).join("")}</div><div class="cal-g">`;
  for(let i = 0; i < lead; i++) h += `<span></span>`;
  for(let d = 1; d <= last; d++){
    const iso = ym + "-" + String(d).padStart(2, "0"), sp = kunChiqim(iso);
    const lvl = sp <= 0 ? 0 : sp >= 1380 ? 4 : sp >= 900 ? 3 : sp >= 400 ? 2 : 1;
    h += `<button class="cal-d l${lvl}${iso === t ? " today" : ""}${iso === tanl ? " on" : ""}" data-d="${iso}" aria-label="${sanaToliq(iso)}${sp ? ", " + sp + " tanga" : ""}">${d}</button>`;
  }
  return h + `</div>`;
}
function ymShift(ym, n){ const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
// Sana tanlash -> Promise<ISO|null>
function pickSana(joriy, sarlavha){
  return new Promise(resolve => {
    let ym = oyKey(joriy || bugunISO());
    const t = bugunISO();
    const chiz = () => `<div class="cal-nav"><button class="ibtn round" data-oy="-1" aria-label="Oldingi oy">${ic("chevron-left")}</button><b>${oyNomi(ym)}</b><button class="ibtn round" data-oy="1" aria-label="Keyingi oy">${ic("chevron-right")}</button></div>${calHTML(ym, joriy)}`;
    const o = openSheet({title: sarlavha || "Sanani tanlang",
      body: `<div class="chips" style="margin-bottom:14px"><button class="chip sm${joriy === t ? " on" : ""}" data-d="${t}">Bugun</button><button class="chip sm${joriy === addDays(t, -1) ? " on" : ""}" data-d="${addDays(t, -1)}">Kecha</button><button class="chip sm${joriy === addDays(t, -2) ? " on" : ""}" data-d="${addDays(t, -2)}">${sanaQisqa(addDays(t, -2))}</button></div><div class="cal">${chiz()}</div>
        <div class="cal-leg">Kam <i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> To'liq yozilgan</div>`,
      onClose: r => resolve(r || null)});
    o.body.addEventListener("click", e => {
      const nav = e.target.closest("[data-oy]"); if(nav){ ym = ymShift(ym, +nav.dataset.oy); const c = $(".cal", o.body); c.innerHTML = chiz(); cyrPass(c); return; }
      const d = e.target.closest("[data-d]"); if(d) ovClose(o, d.dataset.d);
    });
  });
}

// ---- Asosiy bo'limlar orasida o'tish ----
const _scroll = {};
function switchTab(t, opt){
  if(!TABLAR.includes(t)) t = "asosiy";
  const same = t === curTab;
  if(!same) _scroll[curTab] = window.scrollY;
  curTab = t;
  for(const k of TABLAR){ const el = $("#scr-" + k); if(el){ el.hidden = k !== t; el.classList.remove("enter"); } }
  const scr = $("#scr-" + t);
  $$(".nav-b").forEach(b => { const on = b.dataset.tab === t; b.classList.toggle("on", on); if(on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  const lens = $("#navLens"); if(lens){ lens.style.setProperty("--i", TABLAR.indexOf(t)); if(!same && !reduceMotion){ lens.classList.remove("squish"); void lens.offsetWidth; lens.classList.add("squish"); } }
  renderNow();
  if(!same){ if(!reduceMotion){ void scr.offsetWidth; scr.classList.add("enter"); } window.scrollTo(0, (opt && opt.keep) ? (_scroll[t] || 0) : 0); }
  else if(!(opt && opt.keep)) window.scrollTo({top: 0, behavior: reduceMotion ? "auto" : "smooth"});
}
A.tab = el => { vibra(8); switchTab(el.dataset.tab); };

// ---- Chizish ----
let _rq = 0;
function render(){ if(_rq) return; _rq = requestAnimationFrame(() => { _rq = 0; renderNow(); }); }
function renderNow(){
  if(_rq){ cancelAnimationFrame(_rq); _rq = 0; }
  const el = $("#scr-" + curTab), scr = Screens[curTab];
  if(el && scr){
    const fa = document.activeElement, fid = fa && fa.id && el.contains(fa) ? fa.id : null;
    let s0 = null, s1 = null; if(fid){ try{ s0 = fa.selectionStart; s1 = fa.selectionEnd; }catch(e){} }
    try{ scr.render(el); }catch(e){ console.error(e); el.innerHTML = xatoKarta(e); }
    cyrPass(el);
    if(fid){ const n = document.getElementById(fid); if(n){ try{ n.focus({preventScroll: true}); if(s0 != null) n.setSelectionRange(s0, s1); }catch(e){} } }
  }
  for(const o of Ov){ if(o.type === "page" && o.render) o.render(); }
  renderDock();
}
// Katta raqam maydoni (.amt): eni ichidagi raqamga moslashadi — birlik («tanga») doim raqam yonida turadi
function amtEn(inp){ if(inp) inp.style.width = Math.max(1, String(inp.value || "0").length) + "ch"; }
function renderDock(){
  const mini = $("#mini"); if(!mini) return;
  $("#dock").classList.toggle("no-fab", curTab === "fokus");
  if(kirilmi()) cyrPass($("#nav"));
  const yur = S.timer.ish || (typeof pomo !== "undefined" && pomo.run);
  if(yur && curTab !== "fokus"){
    mini.hidden = false;
    mini.innerHTML = `<span class="pulse"></span><span class="num" id="miniT">${miniVaqt()}</span><small>${esc(katNom(S.timer.kat))}</small>`;
    cyrPass(mini);
  } else mini.hidden = true;
  document.body.classList.toggle("has-mini", !mini.hidden);
}
function miniVaqt(){ return (typeof pomo !== "undefined" && pomo.on && pomo.run) ? pomoFmt(Math.max(0, (pomo.end - Date.now()) / 1000)) : timerMatn(); }

// ---- Hodisalarni bitta joydan tinglash ----
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if(!el || el.disabled) return;
  const fn = A[el.dataset.act]; if(!fn) return;
  try{ fn(el, e); }catch(err){ console.error(err); toast("Kutilmagan xato: " + esc(err.message || err)); }
});
document.addEventListener("input", e => { const el = e.target.closest && e.target.closest("[data-in]"); if(el && A[el.dataset.in]) A[el.dataset.in](el, e); });
document.addEventListener("change", e => { const el = e.target.closest && e.target.closest("[data-ch]"); if(el && A[el.dataset.ch]) A[el.dataset.ch](el, e); });
document.addEventListener("submit", e => { const f = e.target.closest && e.target.closest("form[data-sub]"); if(f){ e.preventDefault(); if(A[f.dataset.sub]) A[f.dataset.sub](f, e); } });
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && Ov.length){ e.preventDefault(); ovClose(Ov[Ov.length - 1]); return; }
  if(e.metaKey || e.ctrlKey || e.altKey || Ov.length) return;
  const tg = e.target;
  if(tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable)) return;
  if(!$("#auth").hidden || !$("#lock").hidden) return;
  const k = (e.key || "").toLowerCase();
  if(k === "n"){ e.preventDefault(); A.entryNew(); }
  else if(k === "b"){ e.preventDefault(); tanlangan = bugunISO(); switchTab("asosiy"); }
  else if(k === "s"){ e.preventDefault(); switchTab("fokus"); }
});

// ---- Ekran klaviaturasi: pastdan chiqadigan oynalar klaviatura ustida turadi (iOS'da ko'rinadigan maydon kichrayadi) ----
if(window.visualViewport){
  const vv = window.visualViewport;
  const kbYangila = () => { const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); document.documentElement.style.setProperty("--kb", kb > 80 ? Math.min(kb, window.innerHeight * .6) + "px" : "0px"); };
  vv.addEventListener("resize", kbYangila); vv.addEventListener("scroll", kbYangila);
}

// ---- «Orqaga» tugmasi (Android): avval ochiq oyna yopiladi, keyin Asosiyga qaytadi ----
let _chiqishga = 0;
function tarixQopqon(){ if(VB_KORGAZMA) return; try{ history.pushState({vb: 1}, ""); }catch(e){} }      // ko'rgazma boshqa sahifa ichida ochiladi — uning «orqaga» tugmasiga aralashmaymiz
window.addEventListener("popstate", () => {
  if(Ov.length){ ovClose(Ov[Ov.length - 1]); tarixQopqon(); return; }
  if(curTab !== "asosiy"){ switchTab("asosiy"); tarixQopqon(); return; }
  if(Date.now() - _chiqishga < 2600) return;               // ikkinchi bosish — ilovadan chiqadi
  _chiqishga = Date.now(); toast("Chiqish uchun yana bir marta bosing");
  setTimeout(() => { if($("#app")) tarixQopqon(); }, 2600);
});
