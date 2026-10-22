
// ---------------------------- PROFIL VA SOZLAMALAR ----------------------------
const sw = (id, on, aria) => `<label class="sw"><input type="checkbox" data-ch="soz" data-k="${id}" ${on ? "checked" : ""} aria-label="${aria}"><i></i></label>`;
const pRow = (icon, cls, nom, izoh, act, extra, qiymat) => `<button class="row" data-act="${act}"${extra || ""}><span class="tile-ic sm ${cls}">${ic(icon)}</span><span class="row-main"><b>${nom}</b>${izoh ? `<small class="wrap">${izoh}</small>` : ""}</span>${qiymat ? `<span class="rv">${qiymat}</span>` : ""}${ic("chevron-right", "chev")}</button>`;
const pSw = (icon, cls, nom, izoh, k, on) => `<div class="row"><span class="tile-ic sm ${cls}">${ic(icon)}</span><span class="row-main"><b>${nom}</b><small class="wrap">${izoh}</small></span>${sw(k, on, nom)}</div>`;
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; });

function syncHolatHTML(){
  const m = syncMeta(), n = navbatSoni();
  const qator = [];
  if(Sync.user) qator.push(`<span data-nokir>${esc(Sync.user.email)}</span>`);
  if(Sync.oxirgi && Sync.token) qator.push(`oxirgi sinxron ${vaqtSoat(Sync.oxirgi)}`);
  if(Sync.token && Sync.onlayn > 1) qator.push(`${Sync.onlayn} ta qurilma onlayn`);
  if(n && Meta.uid) qator.push(`${n} ta o'zgarish navbatda`);
  return `<div class="sync-card ${m.cl}"><span class="tile-ic ${m.cl === "live" ? "ok" : m.cl === "busy" ? "blue" : m.cl === "off" ? "warn" : m.cl === "err" ? "bad" : ""}">${ic(m.icon)}</span>
    <div><h3>${m.nom}</h3><p>${m.izoh}</p>${qator.length ? `<small>${qator.join(" · ")}</small>` : ""}</div></div>`;
}
A.syncSheet = () => {
  openSheet({title: "Bulut va sinxron", body: `<div id="syncHolat">${syncHolatHTML()}</div>
    <p class="note" style="margin-top:14px">${VB_KORGAZMA ? "Bu ko'rgazma nusxada server yo'q. Ilovani Render'ga joylaganingizdan keyin shu yerda email bilan kirasiz — yozuvlar bulutda saqlanadi va qurilmalar orasida jonli sinxronlanadi."
      : "Har bir yozuv avval shu qurilmada saqlanadi, keyin bulutga yuboriladi. Internet bo'lmasa navbatda kutadi va aloqa tiklanganda o'zi ketadi."}</p>`,
    foot: VB_KORGAZMA ? `<button class="btn soft" data-act="ovClose">Tushunarli</button>`
      : Sync.token ? `<button class="btn blue" data-act="syncHozir">${ic("refresh-cw")}Hozir sinxronlash</button>`
      : `<button class="btn grad" data-act="authOch">${ic("log-in")}${Meta.uid ? "Qayta kirish" : "Hisobga kirish"}</button>`});
};
A.syncHozir = () => {
  if(!Sync.token){ toast("Avval hisobga kiring"); return; }
  toast(`${ic("refresh-cw")}<span>Sinxronlanmoqda…</span>`);
  if(Sync.user && Meta.uid !== Sync.user.id){ hisobBogla().catch(e => { setHolat("xato", e.message); toast(esc(e.message)); }); return; }
  if(!Sync.ws) wsUla(); syncNow();
};
A.authOch = () => { ovCloseAll(); authKor("kir"); };

A.profil = () => {
  openPage({title: "Profil", render(el, o){
    o.sync = true;
    const ism = foydalanuvchiIsmi(), s = S.sozlama, mavzu = {light: "Yorug'", dark: "Qorong'u", auto: "Tizimga qarab"}[themeMode()];
    const mavsum = {avto: "Avto", oddiy: "Oddiy", navroz: "Navro'z", mustaqillik: "Mustaqillik", ramazon: "Ramazon"}[s.mavsum] || "Avto";
    const hisob = Sync.user ? `<section class="card acc">
        <div class="acc-top"><span class="avatar lg" data-nokir>${esc(ism.charAt(0).toUpperCase())}</span><div><b data-nokir>${esc(ism)}</b><small data-nokir>${esc(Sync.user.email)}</small></div>
          <button class="ibtn plain" data-act="ismEdit" aria-label="Ismni o'zgartirish">${ic("pencil")}</button></div>
        <div id="syncHolat">${syncHolatHTML()}</div>
        <div class="btn-row" style="margin-top:14px">${Sync.token ? `<button class="btn soft sm" data-act="syncHozir">${ic("refresh-cw")}Sinxronlash</button>` : `<button class="btn blue sm" data-act="authOch">${ic("log-in")}Qayta kirish</button>`}<button class="btn ghost sm" data-act="chiqish">${ic("log-out")}Chiqish</button></div>
      </section>`
      : `<section class="card acc"><div class="acc-top"><span class="avatar lg">M</span><div><b>Mehmon rejimi</b><small>Ma'lumot faqat shu qurilmada saqlanmoqda</small></div></div>
        ${VB_KORGAZMA
          ? `<p class="note" style="margin:12px 0 0">Bu — ko'rgazma nusxa. Email bilan kirish, bulut va qurilmalar orasida jonli sinxron ilovani Render'ga joylaganingizdan keyin ishlaydi.</p>`
          : `<p class="note" style="margin:12px 0 14px">Hisobga kirsangiz, yozuvlaringiz bulutda saqlanadi, telefon va kompyuter orasida jonli sinxronlanadi.${namunami() || !chiqimlar().length ? "" : ` Bu qurilmadagi ${tanga(chiqimlar().length)} ta yozuv hisobingizga qo'shiladi.`}</p>
        <button class="btn grad wide" data-act="authOch">${ic("log-in")}Kirish yoki ro'yxatdan o'tish</button>`}</section>`;
    el.innerHTML = hisob + `
      <section class="card"><div class="ch"><h2>Ko'rinish</h2></div><div class="rows">
        ${pRow(themeIcon(), "blue", "Mavzu", "", "pMavzu", "", mavzu)}
        ${pRow("languages", "blue", "Alifbo", "butun ilova matni", "pAlifbo", "", s.alifbo === "kiril" ? "Кирилл" : "Lotin")}
        ${pRow("palette", "blue", "Mavsumiy tema", "fon yog'dusi bayramga moslashadi", "pMavsum", "", mavsum)}
      </div></section>
      <section class="card"><div class="ch"><h2>Yozuvlar</h2></div><div class="rows">
        ${pRow("tags", "violet", "Toifalar", `o'zingizniki ${S.toifalar.length} ta · jami ${faolKategoriyalar().length} ta`, "toifalarPage")}
        ${pRow("zap", "violet", "Shablonlar", "tezkor qo'shish tugmalari", "shablonlar", "", String(S.shablonlar.length))}
        ${pRow("coins", "warn", "1 tanganing qiymati", "behuda vaqt so'mda ham ko'rsatiladi", "somEdit", "", s.som > 0 ? somF(s.som) : "yo'q")}
      </div></section>
      <section class="card"><div class="ch"><h2>Eslatma va effektlar</h2></div><div class="rows">
        ${pSw("bell", "blue", "Kunlik eslatma", "kun to'liq yozilmagan bo'lsa, belgilangan vaqtda eslatadi", "eslatma", s.eslatma)}
        ${s.eslatma ? `<label class="row"><span class="tile-ic sm blue">${ic("alarm-clock")}</span><span class="row-main"><b>Eslatma vaqti</b></span><input type="time" class="tin" data-ch="soz" data-k="vaqt" value="${esc(s.vaqt)}" aria-label="Eslatma vaqti"></label>` : ""}
        ${pSw("volume-2", "blue", "Tanga tovushi", "yozuv qo'shilganda mayin jiring", "tovush", s.tovush)}
        ${pSw("vibrate", "blue", "Titrash", "telefonda yengil titrash", "vibra", s.vibra)}
        ${pSw("sparkles", "blue", "Tanga yomg'iri", "kun to'liq yozilganda", "effekt", s.effekt)}
      </div></section>
      <section class="card"><div class="ch"><h2>Xavfsizlik</h2></div><div class="rows">
        ${pRow("lock-keyhole", "ok", "PIN qulf", "ilova ochilganda shu qurilmada PIN so'raladi", "pinEdit", "", lsGet("vbPin") ? "yoqilgan" : "o'chiq")}
        ${Sync.token ? pRow("key-round", "ok", "Parolni o'zgartirish", "boshqa qurilmalar hisobdan chiqariladi", "parolEdit") : ""}
        ${Sync.token ? pRow("shield-check", "ok", "Tiklash kodi", "parol unutilsa, shu kod bilan yangisi o'rnatiladi", "tiklashKod") : ""}
        ${Sync.token ? pRow("smartphone", "ok", "Qurilmalar", "hisobga kirgan qurilmalar", "qurilmalarPage") : ""}
      </div></section>
      <section class="card"><div class="ch"><h2>Ma'lumot</h2></div><div class="rows">
        ${pRow("database", "blue", "Zaxira va ma'lumotlar", "eksport, import, oyni yopish, tozalash", "malumotPage")}
        ${pRow("sparkles", "violet", "AI yordamchi", "Anthropic API kaliti", "aiKalit", "", lsGet("vbAiKey") ? "ulangan" : "kalitsiz")}
        ${deferredPrompt ? pRow("download", "blue", "Ilovani o'rnatish", "bosh ekranga qo'shiladi, oflayn ham ochiladi", "pwaOrnat") : ""}
        ${pRow("gift", "blue", "Yangiliklar", "bu versiyada nimalar o'zgardi", "yangiliklarPage", "", "v" + APP_VER)}
      </div></section>
      <p class="note" style="text-align:center;padding:4px 0 10px">Vaqt Banki v${APP_VER} · «Vaqt — bu pul. Uni behuda sarflagan — boylikni behuda sarflagan.»</p>`;
  }});
};
A.soz = el => {
  const k = el.dataset.k;
  if(el.type === "checkbox"){ S.sozlama[k] = el.checked;
    if(k === "eslatma" && el.checked && typeof Notification !== "undefined" && Notification.permission === "default"){ try{ const p = Notification.requestPermission(); if(p && p.catch) p.catch(() => {}); }catch(e){} }
    if(k === "tovush" && el.checked) blip(); if(k === "vibra" && el.checked) vibra(20); }
  else if(k === "vaqt"){ S.sozlama.vaqt = hmToMin(el.value) != null ? el.value : "21:00"; }
  cfgTouch("sozlama"); eslatmaQur();
};
A.pMavzu = async () => { const v = await pickOption({title: "Mavzu", value: themeMode(), options: [{value: "light", label: "Yorug'", icon: "sun"}, {value: "dark", label: "Qorong'u", icon: "moon"}, {value: "auto", label: "Tizimga qarab", sub: "telefon sozlamasiga ergashadi", icon: "sun-moon"}]}); if(v) themeSet(v); };
A.pAlifbo = async () => {
  const v = await pickOption({title: "Alifbo", value: S.sozlama.alifbo, options: [{value: "lotin", label: "Lotin", icon: "languages"}, {value: "kiril", label: "Кирилл", icon: "languages"}]});
  if(!v || v === S.sozlama.alifbo) return;
  S.sozlama.alifbo = v; cfgTouch("sozlama", true);
  if(v === "kiril"){ render(); cyrPass(document.getElementById("dock")); toast("Кирилл алифбоси ёқилди"); } else location.reload();
};
A.pMavsum = async () => { const v = await pickOption({title: "Mavsumiy tema", value: S.sozlama.mavsum, options: [{value: "avto", label: "Avto", sub: "bayram kunlari o'zi almashadi"}, {value: "oddiy", label: "Oddiy"}, {value: "navroz", label: "Navro'z"}, {value: "mustaqillik", label: "Mustaqillik"}, {value: "ramazon", label: "Ramazon"}]}); if(v){ S.sozlama.mavsum = v; cfgTouch("sozlama"); applyMavsum(); } };
A.somEdit = () => {
  const o = openSheet({title: "1 tanganing qiymati", sub: "Bir daqiqangiz necha so'm turadi?",
    body: `<label class="field" style="margin-top:8px"><span>So'm</span><input type="text" inputmode="numeric" id="somIn" maxlength="9" placeholder="0 — ko'rsatilmaydi" value="${S.sozlama.som || ""}" autocomplete="off"></label>
      <p class="note" style="margin:10px 6px 0">Masalan, oylik daromadingizni ish daqiqalariga bo'ling. Shunda behuda ketgan vaqt so'mda ham ko'rinadi.</p>`,
    foot: `<button class="btn blue" id="somSave">Saqlash</button>`});
  const saqla = () => { S.sozlama.som = Math.max(0, parseInt($("#somIn", o.el).value.replace(/\D/g, ""), 10) || 0); cfgTouch("sozlama"); ovClose(o); };
  $("#somSave", o.el).addEventListener("click", saqla); $("#somIn", o.el).addEventListener("keydown", e => { if(e.key === "Enter") saqla(); });
};
A.pwaOrnat = () => { if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; render(); } };

// ---- Hisob amallari ----
A.ismEdit = () => {
  const o = openSheet({title: "Ismingiz", body: `<label class="field" style="margin-top:8px"><span>Ism</span><input type="text" id="ismIn" maxlength="60" value="${esc((Sync.user && Sync.user.name) || "")}" autocomplete="name"></label><div class="err" id="ismErr"></div>`,
    foot: `<button class="btn blue" id="ismSave">Saqlash</button>`});
  $("#ismSave", o.el).addEventListener("click", async e => {
    const b = e.currentTarget; b.classList.add("busy");
    try{ const r = await api("PATCH", "/api/me", {name: $("#ismIn", o.el).value.trim()}); Sync.user = r.user; lsSet("vbUser", JSON.stringify(r.user)); ovClose(o); render(); }
    catch(err){ $("#ismErr", o.el).textContent = err.message; } finally{ b.classList.remove("busy"); }
  });
};
A.chiqish = async () => {
  const n = navbatSoni();
  const r = await confirmDlg({icon: "log-out", danger: n > 0, title: "Hisobdan chiqilsinmi?",
    text: n > 0 ? `<b>${n}</b> ta o'zgarish hali bulutga yuborilmagan. Hozir chiqsangiz, ular yo'qoladi.` : "Bu qurilmadagi nusxa tozalanadi. Ma'lumotingiz bulutda saqlanib qoladi — qayta kirsangiz, hammasi qaytadi.",
    ok: n > 0 ? "Baribir chiqish" : "Chiqish", alt: n > 0 && Sync.token ? "Avval sinxronlash" : null});
  if(r === "alt"){ A.syncHozir(); return; }
  if(!r) return;
  if(Sync.token){ try{ await api("POST", "/api/auth/logout", {}, {timeout: 6000}); }catch(e){} }
  ovCloseAll(); lokalTozalash(); pomo.on = false; pomo.run = false;
  $("#app").hidden = true; $("#dock").hidden = true; authKor("kir");
};
A.parolEdit = () => {
  const o = openSheet({title: "Parolni o'zgartirish",
    body: `<form id="pwF" style="display:flex;flex-direction:column;gap:18px;margin-top:8px">
      <label class="field"><span>Joriy parol</span><input type="password" id="pwJ" autocomplete="current-password"></label>
      <label class="field"><span>Yangi parol</span><input type="password" id="pwY" autocomplete="new-password" minlength="6"></label>
      <div class="err" id="pwErr"></div></form>
      <p class="note">Parol o'zgargach, boshqa barcha qurilmalar hisobdan chiqariladi.</p>`,
    foot: `<button class="btn blue" id="pwSave">Parolni yangilash</button>`});
  const yubor = async () => {
    const b = $("#pwSave", o.el), err = $("#pwErr", o.el); err.textContent = "";
    if($("#pwY", o.el).value.length < 6){ err.textContent = "Yangi parol kamida 6 belgidan iborat bo'lsin."; return; }
    b.classList.add("busy");
    try{ await api("POST", "/api/auth/password", {current: $("#pwJ", o.el).value, password: $("#pwY", o.el).value}); ovClose(o); toast(`${ic("check")}<span>Parol yangilandi</span>`); }
    catch(e){ err.textContent = e.message; } finally{ b.classList.remove("busy"); }
  };
  $("#pwSave", o.el).addEventListener("click", yubor); $("#pwF", o.el).addEventListener("submit", e => { e.preventDefault(); yubor(); });
};
A.tiklashKod = async () => {
  const o = openSheet({title: "Tiklash kodi",
    body: `<p class="note" style="font-size:14px">Parolni unutsangiz, kirish ekranidagi «Parolni unutdingizmi?» orqali email va shu kod bilan yangi parol o'rnatasiz. Kod bir martalik — ishlatilgach yangisini oling. Yangi kod yaratilsa, eskisi bekor bo'ladi.</p>
      <div class="kod" id="tkKod" data-nokir hidden></div><div class="err" id="tkErr"></div>`,
    foot: `<button class="btn blue" id="tkYar">${ic("shield-check")}Kod yaratish</button>`});
  $("#tkYar", o.el).addEventListener("click", async e => {
    const b = e.currentTarget; b.classList.add("busy");
    try{ const r = await api("POST", "/api/auth/recovery", {}); const k = $("#tkKod", o.el); k.hidden = false; k.innerHTML = `<b>${esc(r.code)}</b><button class="btn soft sm" id="tkNus">${ic("copy")}Nusxalash</button>`;
      $("#tkNus", o.el).addEventListener("click", async () => { toast((await nusxala(r.code)) ? "Kod nusxalandi — xavfsiz joyga saqlang" : "Nusxalab bo'lmadi — qo'lda yozib oling"); });
      b.innerHTML = ic("refresh-cw") + "Yangi kod yaratish"; }
    catch(err){ $("#tkErr", o.el).textContent = err.message; } finally{ b.classList.remove("busy"); }
  });
};
A.qurilmalarPage = () => {
  let holat = {yuk: true};
  const yukla_ = async o => { try{ holat = {d: await api("GET", "/api/me")}; if(holat.d.user){ Sync.user = holat.d.user; lsSet("vbUser", JSON.stringify(holat.d.user)); } }catch(e){ holat = {xato: e.message}; } if(!o.closed) o.render(); };
  const pg = openPage({title: "Hisob va qurilmalar", render(el){
    if(holat.yuk){ el.innerHTML = `<section class="card"><div class="empty"><div class="wake" style="justify-content:center"><i style="border-color:var(--line);border-top-color:var(--blue)"></i>Yuklanmoqda…</div></div></section>`; return; }
    if(holat.xato){ el.innerHTML = `<section class="card"><div class="empty"><div class="art">${ic("cloud-off")}</div><p>${esc(holat.xato)}</p><button class="link" data-qayta>Qayta urinish</button></div></section>`; return; }
    const d = holat.d;
    el.innerHTML = `<section class="card"><div class="duo"><div><small>Bulutdagi yozuvlar</small><b class="num">${tanga(d.yozuvlar)}</b><span>ta</span></div><div><small>Hozir onlayn</small><b class="num">${d.onlayn}</b><span>qurilma</span></div></div>
        <p class="note" style="margin-top:12px" data-nokir>${esc(d.user.email)} · ${new Date(d.created).toLocaleDateString("uz-UZ")} dan beri</p></section>
      <section class="card"><div class="ch"><h2>Qurilmalar</h2><span class="hint">${d.sessions.length} ta</span></div><div class="rows">${d.sessions.map(s => `<div class="row"><span class="tile-ic sm ${s.onlayn ? "ok" : ""}">${ic(/Android|iPhone/.test(s.device) ? "smartphone" : "monitor")}</span>
        <span class="row-main"><b data-nokir>${esc(s.device || "Qurilma")}</b><small>${s.current ? "shu qurilma" : (s.onlayn ? "hozir onlayn" : "oxirgi marta " + new Date(s.seen).toLocaleString("uz-UZ", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}))}</small></span>
        ${s.current ? `<span class="pill ok">joriy</span>` : `<button class="btn danger xs" data-sid="${esc(s.id)}">Chiqarish</button>`}</div>`).join("")}</div>
        ${d.sessions.length > 1 ? `<button class="btn ghost wide sm" data-hammasi style="margin-top:14px">Boshqa barcha qurilmalardan chiqish</button>` : ""}</section>
      <section class="card"><div class="ch"><h2>Xavfli hudud</h2></div><p class="note" style="margin-bottom:12px">Hisob o'chirilsa, bulutdagi barcha yozuvlar ham butunlay o'chadi. Buni ortga qaytarib bo'lmaydi.</p>
        <button class="btn danger wide sm" data-act="hisobOchir">${ic("trash-2")}Hisobni o'chirish</button></section>`;
  }});
  pg.body.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.qayta !== undefined){ holat = {yuk: true}; pg.render(); yukla_(pg); }
    else if(b.dataset.sid){ b.classList.add("busy"); try{ await api("DELETE", "/api/sessions/" + b.dataset.sid); toast("Qurilma hisobdan chiqarildi"); }catch(err){ toast(esc(err.message)); } yukla_(pg); }
    else if(b.dataset.hammasi !== undefined){ if(!(await confirmDlg({icon: "log-out", title: "Boshqa qurilmalardan chiqilsinmi?", text: "Shu qurilmadan tashqari hamma joyda qayta kirish talab qilinadi.", ok: "Chiqarish"}))) return; try{ await api("POST", "/api/auth/logout-all", {}); toast("Boshqa qurilmalar chiqarildi"); }catch(err){ toast(esc(err.message)); } yukla_(pg); }
  });
  yukla_(pg);
};
A.hisobOchir = () => {
  const o = openSheet({title: "Hisobni o'chirish", body: `<p class="note" style="font-size:14px;margin-bottom:16px">Tasdiqlash uchun parolingizni kiriting. Hisob va bulutdagi barcha ma'lumot butunlay o'chiriladi.</p>
    <label class="field"><span>Parol</span><input type="password" id="hoP" autocomplete="current-password"></label><div class="err" id="hoErr"></div>`,
    foot: `<button class="btn danger" id="hoOk">${ic("trash-2")}Butunlay o'chirish</button>`});
  $("#hoOk", o.el).addEventListener("click", async e => {
    const b = e.currentTarget; b.classList.add("busy");
    try{ await api("DELETE", "/api/me", {password: $("#hoP", o.el).value}); ovCloseAll(); lokalTozalash(); $("#app").hidden = true; $("#dock").hidden = true; authKor("royxat"); toast("Hisob o'chirildi"); }
    catch(err){ $("#hoErr", o.el).textContent = err.message; b.classList.remove("busy"); }
  });
};

// ---- Toifalar sahifasi ----
A.toifalarPage = () => {
  const pg = openPage({title: "Toifalar", right: `<button class="btn blue sm" data-yangi>${ic("plus")}Yangi</button>`, render(el){
    const y = yashirinlar();
    el.innerHTML = (S.toifalar.length ? `<section class="card"><div class="ch"><h2>O'zingiz qo'shgan</h2><span class="hint">bosib tahrirlang</span></div><div class="rows">${S.toifalar.map((t, i) => `<button class="row g-${t.guruh}" data-i="${i}"><span class="tile-ic sm">${ic(katIcon(t.nom))}</span><span class="row-main"><b>${esc(katNom(t.nom))}</b><small>${GURUH[t.guruh].nom}</small></span>${ic("pencil", "chev")}</button>`).join("")}</div></section>` : "")
      + GURUH_TARTIB.map(g => { const list = KATEGORIYALAR.filter(k => katGuruh(k) === g); if(!list.length) return "";
        return `<section class="card g-${g}"><div class="ch"><h2><i class="gdot" style="margin-right:8px"></i>${GURUH[g].nom}</h2></div><div class="rows">${list.map(k => `<div class="row"><span class="tile-ic sm">${ic(katIcon(k))}</span><span class="row-main"><b${y.includes(k) ? ' style="opacity:.45"' : ""}>${esc(katNom(k))}</b></span>
          <label class="sw"><input type="checkbox" data-kat="${esc(k)}" ${y.includes(k) ? "" : "checked"} aria-label="${esc(katNom(k))} ro'yxatda ko'rinsin"><i></i></label></div>`).join("")}</div></section>`; }).join("")
      + `<p class="note" style="text-align:center">O'chirib qo'yilgan toifa tanlash ro'yxatida ko'rinmaydi. Eski yozuvlar o'zgarmaydi.</p>`;
  }});
  pg.el.addEventListener("click", async e => {
    if(e.target.closest("[data-yangi]")){ await toifaTahrir(null); return; }
    const b = e.target.closest("button[data-i]"); if(b) await toifaTahrir(+b.dataset.i);
  });
  pg.el.addEventListener("change", e => {
    const c = e.target.closest("input[data-kat]"); if(!c) return;
    const set = new Set(yashirinlar()); if(c.checked) set.delete(c.dataset.kat); else set.add(c.dataset.kat);
    S.sozlama.yashirin = Array.from(set); cfgTouch("sozlama");
  });
};

// ---- Zaxira va ma'lumotlar ----
function eksportJson(){ return yukla(`vaqt-banki-zaxira-${bugunISO()}.json`, JSON.stringify(toliqZaxira(), null, 1)).then(ok => { if(ok) toast(`${ic("download")}<span>To'liq zaxira yuklab olindi</span>`); return ok; }); }
function eksportCsv(){
  const rows = [["Sana","Boshlanishi","Tanga (daqiqa)","Yo'nalish","Toifa","Izoh"]];
  chiqimlar().slice().sort((a, b) => a.sana < b.sana ? -1 : a.sana > b.sana ? 1 : (a.vaqt || "").localeCompare(b.vaqt || ""))
    .forEach(r => rows.push([r.sana, r.vaqt || "", r.daqiqa, GURUH[katGuruh(r.kat)].nom, r.kat, r.izoh || ""]));
  return yukla(`vaqt-banki-jadval-${bugunISO()}.csv`, "﻿" + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8")
    .then(ok => { if(ok) toast(`${ic("download")}<span>CSV jadval yuklab olindi</span>`); return ok; });
}
function importTanla(){
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json,.json";
  inp.addEventListener("change", () => { const f = inp.files[0]; if(!f) return; const rd = new FileReader(); rd.onload = () => importQil(String(rd.result)); rd.readAsText(f); });
  inp.click();
}
async function importQil(matn){
  let j; try{ j = JSON.parse(matn); }catch(e){ toast("Fayl o'qilmadi — bu JSON zaxira emas"); return; }
  const arr = Array.isArray(j) ? j : (j && Array.isArray(j.yozuvlar) ? j.yozuvlar : null);
  if(!arr){ toast("Fayl ichida yozuvlar topilmadi"); return; }
  const yangi = arr.map(tozaYozuv).filter(Boolean), soni = yangi.filter(r => r.tur !== "kirim").length;
  if(!soni){ toast("Faylda yaroqli yozuv yo'q"); return; }
  const bor = chiqimlar().length;
  const r = bor ? await confirmDlg({icon: "upload", title: `${tanga(soni)} ta yozuv topildi`, text: "Mavjud yozuvlarga qo'shaymi yoki hammasini fayldagi bilan almashtiraymi? Qo'shishda takrorlar tashlab yuboriladi.", ok: "Qo'shish", alt: "Almashtirish"}) : true;
  if(!r) return;
  if(r === "alt"){
    if(!(await confirmDlg({danger: true, title: "Hozirgi yozuvlar o'chadi", text: `${tanga(bor)} ta mavjud yozuv o'rniga fayldagi ${tanga(soni)} tasi qoladi.${Meta.uid ? " Bu bulutdagi nusxaga ham ta'sir qiladi." : ""}`, ok: "Almashtirish"}))) return;
    entriesReplace(yangi);
  } else {
    const idlar = new Set(S.yozuvlar.map(x => x.id)), sig = x => [x.sana, x.tur, x.kat, x.daqiqa, x.izoh || "", x.vaqt || ""].join("|"), sanoq = new Map();
    for(const x of S.yozuvlar){ const k = sig(x); sanoq.set(k, (sanoq.get(k) || 0) + 1); }
    let n = 0;
    for(const x of yangi){ if(idlar.has(x.id)) continue; const k = sig(x), c = sanoq.get(k) || 0; if(c > 0){ sanoq.set(k, c - 1); continue; }
      x.u = nowTs(); S.yozuvlar.push(x); idlar.add(x.id); markOut("y:" + x.id); if(x.tur !== "kirim") n++; }
    saqlaY(); Bus.emit("local", "yozuv");
    toast(`${ic("check")}<span><b>${tanga(n)}</b> ta yangi yozuv qo'shildi${soni - n > 0 ? `, ${tanga(soni - n)} tasi allaqachon bor edi` : ""}</span>`);
  }
  // to'liq zaxirada sozlamalar ham bo'ladi: faqat hozir bo'sh/standart bo'lgan qismlar to'ldiriladi
  if(!Array.isArray(j)){
    if(Array.isArray(j.toifalar)){ const nomlar = new Set(S.toifalar.map(t => t.nom)); for(const t of tozaCfg("toifalar", j.toifalar)) if(!nomlar.has(t.nom)) S.toifalar.push(t); invalidateIdx(); cfgTouch("toifalar", true); }
    if(r === "alt"){ for(const k of ["byudjet","shablonlar","jamgarma","yopiqOylar"]) if(j[k] !== undefined){ S[k] = tozaCfg(k, j[k]); cfgTouch(k, true); }
      for(const d in (j.rejaKun || {})) if(isIso(d)){ const p = tozaReja(j.rejaKun[d]); if(Object.keys(p).length){ S.rejaKun[d] = p; markOut("r:" + d); } }
      for(const d in (j.kayfiyat || {})){ const v = +j.kayfiyat[d]; if(isIso(d) && v >= 1 && v <= 5){ S.kayfiyat[d] = v; markOut("k:" + d); } }
      saqlaC(); }
    Bus.emit("local", "toifalar");
  }
  if(r === "alt") toast(`${ic("check")}<span>Zaxiradan tiklandi · <b>${tanga(soni)}</b> ta yozuv</span>`);
  namunaBelgi(false);
  const kk = kunlar(); if(kk.length && !kk.includes(tanlangan)) tanlangan = kk[kk.length - 1];
  render();
}
A.malumotPage = () => {
  const pg = openPage({title: "Zaxira va ma'lumotlar", render(el){
    const oys = Array.from(new Set(kunlar().map(oyKey))).sort().reverse().slice(0, 8), bks = bkList();
    const hajm = new Blob([lsGet(KEY) || "", lsGet(CFG_KEY) || ""]).size;
    el.innerHTML = `<section class="card"><div class="duo"><div><small>Yozuvlar</small><b class="num">${tanga(chiqimlar().length)}</b><span>${kunlar().length} kunda</span></div><div><small>Hajmi</small><b class="num">${fmtBytes(hajm)}</b><span>shu qurilmada</span></div></div></section>
      <section class="card"><div class="ch"><h2>Eksport va import</h2></div><div class="rows">
        ${pRow("file-json", "blue", "To'liq zaxira (JSON)", "yozuvlar, reja, toifalar, shablonlar", "pEksJ")}
        ${pRow("file-spreadsheet", "ok", "Jadval (CSV)", "Excel yoki Google Sheets uchun", "pEksC")}
        ${pRow("upload", "violet", "Zaxiradan yuklash", "eski versiya fayllari ham ochiladi", "pImp")}
      </div></section>
      <section class="card"><div class="ch"><h2>Oyni yopish</h2><span class="hint">o'zgarishdan himoya</span></div>
        ${oys.length ? `<div class="rows">${oys.map(o => { const yop = S.yopiqOylar.includes(o);
          return `<div class="row"><span class="tile-ic sm ${yop ? "warn" : ""}">${ic(yop ? "lock" : "lock-open")}</span><span class="row-main"><b>${oyNomi(o)}</b><small>${yop ? "yopilgan — yozuvlar o'zgarmaydi" : "ochiq"}</small></span><button class="btn ${yop ? "soft" : "ghost"} xs" data-oy="${o}">${yop ? "Ochish" : "Yopish"}</button></div>`; }).join("")}</div>`
          : `<p class="note">Hali yozilgan oy yo'q.</p>`}
        <p class="note" style="margin-top:10px">Yopilgan oy yozuvlari tasodifiy o'zgartirish va o'chirishdan himoyalanadi.</p></section>
      <section class="card"><div class="ch"><h2>Avto zaxira</h2><span class="hint">oyiga bir marta, shu qurilmada</span></div>
        ${bks.length ? `<div class="rows">${bks.map(k => `<div class="row"><span class="tile-ic sm blue">${ic("archive")}</span><span class="row-main"><b>${oyNomi(k.slice(-7))}</b><small>${fmtBytes((lsGet(k) || "").length)}</small></span><button class="btn ghost xs" data-bk="${esc(k)}">Yuklab olish</button></div>`).join("")}</div>` : `<p class="note">Birinchi zaxira yozuv qo'shilgach o'zi yaratiladi.</p>`}</section>
      <section class="card"><div class="ch"><h2>Tozalash</h2></div><div class="rows">
        ${chiqimlar().length ? "" : pRow("flask-conical", "blue", "Namuna ma'lumotni yuklash", "ilovani sinab ko'rish uchun 5 kunlik misol", "namunaYukla")}
        ${pRow("trash-2", "bad", "Barcha yozuvlarni o'chirish", Meta.uid ? "bulutdagi nusxa ham o'chadi" : "shu qurilmadagi hamma yozuv", "hammasiniOchir")}
      </div></section>`;
  }});
  pg.body.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.oy){ const o = b.dataset.oy, i = S.yopiqOylar.indexOf(o); if(i >= 0) S.yopiqOylar.splice(i, 1); else S.yopiqOylar.push(o); cfgTouch("yopiqOylar"); toast(`${ic(i >= 0 ? "lock-open" : "lock")}<span>${oyNomi(o)} ${i >= 0 ? "ochildi" : "yopildi"}</span>`); }
    else if(b.dataset.bk){ const v = lsGet(b.dataset.bk); if(v) yukla(`vaqt-banki-avtozaxira-${b.dataset.bk.slice(-7)}.json`, v).then(ok => { if(ok) toast(`${ic("download")}<span>Zaxira yuklab olindi</span>`); }); }
  });
};
A.pEksJ = () => eksportJson(); A.pEksC = () => eksportCsv(); A.pImp = () => importTanla();
A.namunaYukla = () => { entriesReplace(SEED.map(r => ({id: uid(), ...r}))); if(!Meta.uid) namunaBelgi(true); const kk = kunlar(); tanlangan = kk[kk.length - 1] || bugunISO(); toast(`${ic("flask-conical")}<span>Namuna ma'lumot yuklandi</span>`); };
A.hammasiniOchir = async () => {
  const n = chiqimlar().length; if(!n){ toast("O'chiradigan yozuv yo'q"); return; }
  const r = await confirmDlg({danger: true, icon: "trash-2", title: "Barcha yozuvlar o'chirilsinmi?", text: `<b>${tanga(n)}</b> ta yozuv butunlay o'chadi${Meta.uid ? " — bulutda va boshqa qurilmalaringizda ham" : ""}. Avval zaxira olib qo'yishingiz mumkin.`, ok: "Hammasini o'chirish", alt: "Avval zaxira olish"});
  if(r === "alt"){ eksportJson(); return; }
  if(!r) return;
  entriesReplace([]); namunaBelgi(false); tanlangan = bugunISO(); toast("Barcha yozuvlar o'chirildi");
};
// Namuna ma'lumotni olib tashlab, toza daftar bilan boshlash
A.namunaToza = async () => {
  if(!(await confirmDlg({icon: "flask-conical", title: "Namuna olib tashlansinmi?", text: "Misol uchun qo'yilgan yozuvlar o'chadi va daftaringiz bo'sh holda boshlanadi.", ok: "Olib tashlash"}))) return;
  entriesReplace([]); namunaBelgi(false);
  if(VB_KORGAZMA){ S.kayfiyat = {}; S.jamgarma = []; S.rejaKun = {}; S.nishonBer = []; saqlaC(); }
  tanlangan = bugunISO(); render(); toast(`${ic("check")}<span>Daftar toza — birinchi yozuvni qo'shing</span>`);
};
A.aiKalit = () => {
  const bor = !!lsGet("vbAiKey");
  const o = openSheet({title: "AI yordamchi", sub: "Claude bilan ishlaydi va vaqt ma'lumotlaringizni biladi",
    body: `<label class="field" style="margin-top:8px"><span>Anthropic API kaliti</span><input type="password" id="aiK" placeholder="${bor ? "saqlangan — almashtirish uchun yangisini kiriting" : "sk-ant-…"}" autocomplete="off"></label>
      <p class="note" style="margin:10px 6px 0">Kalit faqat shu qurilma brauzerida saqlanadi va faqat Anthropic serveriga yuboriladi — bulutga sinxronlanmaydi, har bir qurilmada alohida kiritiladi. Uni hech kimga bermang.</p>`,
    foot: `${bor ? `<button class="btn danger" id="aiDel" style="flex:0 0 auto">Kalitni o'chirish</button>` : ""}<button class="btn blue" id="aiSave">Saqlash</button>`});
  o.el.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return;
    if(b.id === "aiSave"){ const v = $("#aiK", o.el).value.trim(); if(!v){ toast("Kalitni kiriting"); return; } lsSet("vbAiKey", v); ovClose(o); render(); toast(`${ic("check")}<span>AI kaliti saqlandi</span>`); }
    else if(b.id === "aiDel"){ lsDel("vbAiKey"); ovClose(o); render(); toast("Kalit o'chirildi"); } });
};
A.yangiliklarPage = () => {
  const y = [["list-plus","Kun chizig'i","Asosiy ekranda ishlar soat bo'yicha tiziladi. Ikki ish orasidagi bo'sh vaqtga bossangiz, o'sha vaqtga yozuv ochiladi."],
    ["play","Hozir nima qilyapsiz?","Ishni bir bosishda boshlang. Keyingisini bossangiz, oldingisi vaqti bilan o'zi yoziladi."],
    ["clock","Yangi vaqt tanlagich","Katta soat va daqiqa tugmalari, «Oldingisi tugagan» va «Hozir» tugmalari — telefonning noqulay maydoni o'rniga."],
    ["layout-grid","Yangi tuzilma","Beshta ekran: Asosiy, Daftar, Fokus, Reja, Tahlil. Har bir amal pastdan chiqadigan oynada bajariladi."],
    ["log-in","Email bilan kirish","Hisob oching — ma'lumot o'z serveringizda (Render) saqlanadi. Firebase endi kerak emas."],
    ["cloud-check","Jonli sinxron","Telefonda yozganingiz kompyuterda darhol ko'rinadi. Internet bo'lmasa navbatda kutadi."],
    ["timer","Fokus ekrani","Sekundomer qurilmalar orasida jonli. Fokus 25 + 5 rejimi tangani o'zi yozadi."],
    ["calendar-days","Boshlanish va tugash vaqti","Ikkalasini kiritsangiz miqdor o'zi hisoblanadi; «Yana qo'shish» keyingi yozuvni oldingisi tugagan joydan boshlaydi."],
    ["tags","Toifalar ikonkali","O'z toifangizga ikonka va yo'nalish tanlang, keraksizlarini ro'yxatdan yashiring."],
    ["shield-check","Xavfsizlik","PIN qulf, qurilmalar ro'yxati, parolni tiklash kodi."]];
  openPage({title: "Yangiliklar", render(el){ el.innerHTML = `<div class="ver"><b>v${APP_VER}</b><span class="pill ok">hozirgi versiya</span></div>
    ${y.map(x => `<section class="card insight"><span class="tile-ic blue">${ic(x[0])}</span><div><h3>${x[1]}</h3><p>${x[2]}</p></div></section>`).join("")}
    <p class="note" style="text-align:center">Kompyuterda tezkor tugmalar: <b>N</b> — yangi yozuv, <b>B</b> — bugun, <b>S</b> — sekundomer.</p>`; }});
};
