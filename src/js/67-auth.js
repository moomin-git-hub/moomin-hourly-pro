
// ---------------------------- KIRISH EKRANI ----------------------------
const LOGO_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fdcc0"/><stop offset=".5" stop-color="#3f8ee8"/><stop offset="1" stop-color="#4a4bff"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#lgA)"/><circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="5"/><path d="M32 22v10l7 5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let _authMode = "kir", _serverHolat = null, _royxatOchiq = true;
function authKor(mode, xabar){
  _authMode = mode || "kir";
  $("#app").hidden = true; $("#dock").hidden = true; $("#auth").hidden = false;
  authChiz(xabar);
  if(VB_KORGAZMA){ _serverHolat = "xato"; serverHolatYoz(); } else serverTekshir();
}
function authChiz(xabar){
  const el = $("#auth"), m = _authMode, base = apiBase(), lokalSoni = chiqimlar().length;
  const email = ($("#aEmail") && $("#aEmail").value) || (Sync.user && Sync.user.email) || "";
  const sarl = m === "royxat" ? "Hisob oching" : m === "tikla" ? "Parolni tiklash" : "Har bir daqiqa — bir tanga";
  const lead = m === "royxat" ? "Yozuvlaringiz bulutda saqlanadi va barcha qurilmalaringizda jonli sinxronlanadi."
    : m === "tikla" ? "Email, tiklash kodi va yangi parolni kiriting. Kod Profil → Xavfsizlik bo'limida yaratiladi."
    : "Hisobingizga kiring va vaqtingizni pul kabi boshqaring.";
  el.innerHTML = `<div class="auth-in">
    <div class="brand">${LOGO_SVG}<b>vaqt banki</b></div>
    <h1>${sarl}</h1><p class="lead">${lead}</p>
    ${xabar ? `<div class="info">${ic("info")}<span>${xabar}</span></div>` : ""}
    <div class="info warn" id="aSrvInfo" hidden>${ic("cloud-off")}<span>${VB_KORGAZMA
      ? `Bu ko'rgazma sahifasida server yo'q. Kirish va sinxron ilovani Render'ga joylaganingizdan keyin ishlaydi — hozircha pastdagi <b>«Hisobsiz davom etish»</b>ni bosing.`
      : `Bu yerda server ulanmagan. Ilovani hozir ko'rish uchun pastdagi <b>«${Meta.uid ? "Oflayn davom etish" : "Hisobsiz davom etish"}»</b>ni bosing. Bulutli sinxron uchun «Server manzili»ga Render'dagi manzilingizni yozing.`}</span></div>
    ${lokalSoni && !Meta.uid && m !== "tikla" ? `<div class="info">${ic("layers")}<span>Bu qurilmada <b>${tanga(lokalSoni)}</b> ta yozuv saqlanib turibdi. ${m === "royxat" ? "Ro'yxatdan o'tganingizda" : "Kirganingizda"} ular hisobingizga qo'shiladi.</span></div>` : ""}
    <form data-sub="authYubor" novalidate>
      ${m === "royxat" ? `<label class="field"><span>Ismingiz</span><input type="text" name="ism" id="aIsm" maxlength="60" autocomplete="name" placeholder="ixtiyoriy"></label>` : ""}
      <label class="field"><span>Email</span><input type="email" name="email" id="aEmail" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" value="${esc(email)}" required></label>
      ${m === "tikla" ? `<label class="field"><span>Tiklash kodi</span><input type="text" name="kod" id="aKod" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" maxlength="20"></label>` : ""}
      <label class="field has-btn"><span>${m === "tikla" ? "Yangi parol" : "Parol"}</span><input type="password" name="parol" id="aParol" autocomplete="${m === "kir" ? "current-password" : "new-password"}" minlength="6" required>
        <button type="button" class="in-btn" data-act="parolKoz" aria-label="Parolni ko'rsatish">${ic("eye-off")}</button></label>
      <div class="err" id="authErr" role="alert"></div>
      <div class="wake" id="authWake" hidden><i></i><span>Server uyg'onmoqda — bu bir daqiqagacha vaqt olishi mumkin…</span></div>
      <button class="btn blue wide" id="authBtn" type="submit">${m === "royxat" ? "Ro'yxatdan o'tish" : m === "tikla" ? "Parolni yangilash" : "Kirish"}</button>
    </form>
    <div class="auth-links">${m === "kir" ? `${_royxatOchiq ? `<button data-act="authMode" data-m="royxat">Ro'yxatdan o'tish</button>` : `<span></span>`}<button data-act="authMode" data-m="tikla">Parolni unutdingizmi?</button>`
      : `<button data-act="authMode" data-m="kir">${m === "royxat" ? "Hisobim bor — kirish" : "Kirishga qaytish"}</button>`}</div>
    <div class="or">yoki</div>
    <button class="skip" data-act="authSkip">${Meta.uid ? "Oflayn davom etish" : "Hisobsiz davom etish"}</button>
    <details id="aSrv"${base ? "" : " open"}${VB_KORGAZMA ? " hidden" : ""}><summary>${ic("settings")}Server manzili<span id="aSrvH" style="margin-left:auto;font-weight:600"></span></summary>
      <label class="field"><span>Manzil</span><input type="url" id="aApi" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="https://vaqt-banki.onrender.com" value="${esc(lsGet("vbApi") || "")}"></label>
      <p style="margin:10px 4px;line-height:1.5">Ilova serverning o'zidan ochilgan bo'lsa, bo'sh qoldiring. Faylni boshqa joydan ochsangiz, Render'dagi server manzilini yozing.</p>
      <button type="button" class="btn ghost sm" data-act="apiSaqla">Saqlash va tekshirish</button></details>
    <div class="foot">Ma'lumot avval shu qurilmada, keyin o'z serveringizda saqlanadi.<br>Vaqt Banki v${APP_VER}</div>
  </div>`;
  serverHolatYoz();
  cyrPass(el);
}
function serverHolatYoz(){
  const s = _serverHolat, yoq = !apiBase();
  const inf = $("#aSrvInfo"); if(inf) inf.hidden = !(yoq || s === "xato");
  const h = $("#aSrvH"); if(!h) return;
  h.textContent = yoq ? "kiritilmagan" : s === "ok" ? "tayyor" : s === "kut" ? "tekshirilmoqda…" : s === "xato" ? "topilmadi" : "";
  h.style.color = s === "ok" ? "var(--ok)" : s === "xato" || yoq ? "var(--bad)" : "";
  if(kirilmi()) cyrPass(h);
}
// Kirish ekrani ochilishi bilan server uyg'otiladi (Render bepul tarifda uxlab qoladi)
let _srvSeq = 0;
async function serverTekshir(){
  const seq = ++_srvSeq;
  if(!apiBase()){ _serverHolat = null; serverHolatYoz(); return; }
  _serverHolat = "kut"; serverHolatYoz();
  let r = null;
  try{ r = await apiSabr("GET", "/api/health", undefined, {noAuth: true, timeout: 80000}); }catch(e){}
  if(seq !== _srvSeq) return;                               // bu orada manzil o'zgargan — eski javob kerak emas
  _serverHolat = r && r.name === "vaqt-banki" ? "ok" : "xato";
  serverHolatYoz();
  const ochiq = !(r && r.signup === false);
  if(ochiq !== _royxatOchiq){ _royxatOchiq = ochiq; if(!$("#auth").hidden && _authMode === "kir" && !$("#authBtn.busy")){ const p = $("#aParol") ? $("#aParol").value : ""; authChiz(); if(p && $("#aParol")) $("#aParol").value = p; } }
}
A.authMode = el => { _authMode = el.dataset.m; authChiz(); const f = $(_authMode === "royxat" ? "#aIsm" : "#aEmail"); if(f && !MOBIL) f.focus(); };
A.parolKoz = el => { const i = $("#aParol"); if(!i) return; const ochiq = i.type === "text"; i.type = ochiq ? "password" : "text"; el.innerHTML = ic(ochiq ? "eye-off" : "eye"); el.setAttribute("aria-label", ochiq ? "Parolni ko'rsatish" : "Parolni yashirish"); };
A.apiSaqla = () => {
  let u = ($("#aApi").value || "").trim().replace(/\/+$/, "");
  if(u && !/^https?:\/\//i.test(u)) u = "https://" + u;
  if(u) lsSet("vbApi", u); else lsDel("vbApi");
  $("#aApi").value = u; serverTekshir();
};
A.authSkip = () => { lsSet("vbLocal", "1"); ilovaOch(); if(!Meta.uid && !chiqimlar().length) setTimeout(xushKelibsiz, 500); };
A.authYubor = async form => {
  const m = _authMode, err = $("#authErr"), btn = $("#authBtn"), wake = $("#authWake");
  const email = form.email.value.trim(), parol = form.parol.value;
  err.textContent = "";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ err.textContent = "Email manzilni to'g'ri kiriting."; form.email.focus(); return; }
  if(parol.length < 6){ err.textContent = "Parol kamida 6 belgidan iborat bo'lsin."; form.parol.focus(); return; }
  if(m === "tikla" && !form.kod.value.trim()){ err.textContent = "Tiklash kodini kiriting."; form.kod.focus(); return; }
  if(VB_KORGAZMA){ err.textContent = "Ko'rgazma sahifasida kirish ishlamaydi — ilovani Render'ga joylagach ishlaydi."; return; }
  if(!apiBase()){ err.textContent = "Avval server manzilini kiriting (pastda)."; $("#aSrv").open = true; return; }
  btn.classList.add("busy");
  const wk = setTimeout(() => { wake.hidden = false; }, 3500);
  try{
    const dev = qurilmaNomi(), o = {noAuth: true, timeout: 85000};
    const r = m === "royxat" ? await apiSabr("POST", "/api/auth/register", {email, password: parol, name: form.ism.value.trim(), device: dev}, o)
      : m === "tikla" ? await apiSabr("POST", "/api/auth/reset", {email, code: form.kod.value, password: parol, device: dev}, o)
      : await apiSabr("POST", "/api/auth/login", {email, password: parol, device: dev}, o);
    if(Meta.uid && Meta.uid !== r.user.id){   // bu qurilmada boshqa hisobning nusxasi qolgan — aralashmasligi uchun tozalanadi
      lsDel(KEY); lsDel(CFG_KEY); lsDel("vbPin"); storeReset(); Meta = {uid: null, rev: 0, out: {}}; metaSave();
    }
    sessiyaOch(r);
    tanlangan = bugunISO();
    ilovaOch();
    try{ await hisobBogla(); }catch(e){ console.error(e); setHolat("xato", e.message); toast(`${ic("cloud-alert")}<span>Kirildi, lekin birinchi sinxron tugamadi: ${esc(e.message)}</span>`, {ms: 5000}); }
    if(m === "royxat" && !chiqimlar().length) setTimeout(xushKelibsiz, 400);
  }catch(e){
    err.textContent = e.message || "Kutilmagan xato";
    if(e.kod === "format" || e.kod === "server_yoq" || e.status === 404 || e.status === 405){ $("#aSrv").open = true; _serverHolat = "xato"; serverHolatYoz(); }
  }finally{ clearTimeout(wk); if(btn.isConnected){ btn.classList.remove("busy"); wake.hidden = true; } }
};
// Birinchi marta: qisqa tanishtiruv
function xushKelibsiz(){
  if(lsGet("vbOnboarded") || Ov.length) return;
  lsSet("vbOnboarded", "1");
  openSheet({title: "Vaqt Bankiga xush kelibsiz", sub: "Uch narsa — va boshlaysiz",
    body: `<div class="adv">
      <div class="adv-r"><span class="tile-ic sm warn">${ic("coins")}</span><div><h3>Har kuni 1440 tanga</h3><p>Bir daqiqa — bir tanga. Kun davomida nimaga sarflaganingizni yozib borasiz.</p></div></div>
      <div class="adv-r"><span class="tile-ic sm blue">${ic("plus")}</span><div><h3>«+» — yangi yozuv</h3><p>Miqdor, toifa va xohlasangiz vaqtini kiriting. Sekundomer bilan jonli o'lchasa ham bo'ladi.</p></div></div>
      <div class="adv-r"><span class="tile-ic sm ok">${ic("chart-column")}</span><div><h3>Kechqurun — xulosa</h3><p>Kun 1380 tangadan oshsa «to'liq» hisoblanadi: o'rtachalar, qarzlar va tavsiyalar shu kunlar bo'yicha chiqadi.</p></div></div>
    </div>`,
    foot: `<button class="btn ghost" data-act="namunaKor" style="flex:0 0 auto">Namuna bilan ko'rish</button><button class="btn grad" data-act="birinchiYozuv">Birinchi yozuv</button>`});
}
A.namunaKor = el => { ovClose(ovOf(el)); A.namunaYukla(); };
A.birinchiYozuv = el => { ovClose(ovOf(el)); setTimeout(() => A.entryNew(), 200); };

// ---------------------------- PIN QULF ----------------------------
function pinTekshir(){ if(lsGet("vbPin") && Sync.user) lockKor(); }
function lockKor(){
  const el = $("#lock"), saqlangan = lsGet("vbPin") || "", uz = /^\d:/.test(saqlangan) ? +saqlangan[0] : 0, hash = uz ? saqlangan.slice(2) : saqlangan;
  let kod = "", band = false;
  el.hidden = false;
  el.innerHTML = `${LOGO_SVG.replace("<svg ", '<svg class="logo" ').replace(/lgA/g, "lgL")}<h2>PIN kodni kiriting</h2><p id="lockM">Shu qurilmada tez ochish uchun</p>
    <div class="pin-dots" id="pinDots">${Array.from({length: uz || 6}, () => "<i></i>").join("")}</div>
    <div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join("")}<button class="ghost" data-chiq>Parol bilan</button><button data-n="0">0</button><button class="ghost" data-del aria-label="O'chirish">${ic("delete")}</button></div>`;
  cyrPass(el);
  const dots = () => $$("#pinDots i", el).forEach((d, i) => d.classList.toggle("on", i < kod.length));
  const xato = () => { const p = $("#pinDots", el); p.classList.remove("shake"); void p.offsetWidth; p.classList.add("shake"); $("#lockM", el).textContent = kirilmi() ? latKir("PIN noto'g'ri") : "PIN noto'g'ri"; kod = ""; dots(); vibra(40); };
  const tekshir = async () => {
    if(band) return; band = true;
    const mos = (await vbHash("pin:" + kod)) === hash;
    band = false;
    if(mos){ el.hidden = true; el.innerHTML = ""; document.removeEventListener("keydown", klav); }
    else if(uz || kod.length >= 6) xato();
  };
  const bos = n => { if(kod.length >= (uz || 6)) return; kod += n; dots(); vibra(8); if(uz ? kod.length === uz : kod.length >= 4) tekshir(); };
  const klav = e => { if(el.hidden) return; if(/^\d$/.test(e.key)) bos(e.key); else if(e.key === "Backspace"){ kod = kod.slice(0, -1); dots(); } };
  document.addEventListener("keydown", klav);
  el.onclick = async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.n) bos(b.dataset.n);
    else if(b.dataset.del !== undefined){ kod = kod.slice(0, -1); dots(); }
    else if(b.dataset.chiq !== undefined){
      if(!(await confirmDlg({icon: "key-round", title: "Parol bilan kirasizmi?", text: "PIN o'chiriladi va hisobdan chiqiladi. Email va parol bilan qayta kirsangiz, ma'lumotingiz bulutdan qaytadi.", ok: "Hisobdan chiqish"}))) return;
      if(Sync.token){ try{ await api("POST", "/api/auth/logout", {}, {timeout: 6000}); }catch(_){} }
      document.removeEventListener("keydown", klav); el.hidden = true; el.innerHTML = ""; ovCloseAll(); lokalTozalash(); authKor("kir");
    }
  };
}
A.pinEdit = () => {
  if(!Sync.user){ toast("PIN qulf uchun avval hisobga kiring — unutilsa parol bilan ochiladi"); return; }
  const bor = !!lsGet("vbPin");
  const o = openSheet({title: "PIN qulf", sub: "Ilova ochilganda shu qurilmada so'raladi",
    body: `<label class="field" style="margin-top:8px"><span>${bor ? "Yangi PIN" : "PIN"} (4–6 raqam)</span><input type="password" inputmode="numeric" id="pinIn" maxlength="6" autocomplete="off" pattern="[0-9]*"></label>
      <label class="field" style="margin-top:18px"><span>PINni takrorlang</span><input type="password" inputmode="numeric" id="pinIn2" maxlength="6" autocomplete="off" pattern="[0-9]*"></label>
      <div class="err" id="pinErr"></div><p class="note">PINni unutsangiz, email va parol bilan kirasiz — ma'lumot bulutda saqlanadi.</p>`,
    foot: `${bor ? `<button class="btn danger" id="pinDel" style="flex:0 0 auto">O'chirish</button>` : ""}<button class="btn blue" id="pinSave">Saqlash</button>`});
  o.el.addEventListener("click", async e => { const b = e.target.closest("button"); if(!b) return;
    if(b.id === "pinSave"){ const v = $("#pinIn", o.el).value.trim(), er = $("#pinErr", o.el);
      if(!/^\d{4,6}$/.test(v)){ er.textContent = "PIN 4–6 raqamdan iborat bo'lsin."; return; }
      if(v !== $("#pinIn2", o.el).value.trim()){ er.textContent = "PINlar mos kelmadi."; return; }
      lsSet("vbPin", v.length + ":" + await vbHash("pin:" + v)); ovClose(o); render(); toast(`${ic("lock-keyhole")}<span>PIN qulf yoqildi</span>`); }
    else if(b.id === "pinDel"){ lsDel("vbPin"); ovClose(o); render(); toast("PIN qulf o'chirildi"); } });
};
