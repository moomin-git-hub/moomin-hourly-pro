
// ============================ 7. EKRANLAR ============================
// ---------------------------- ASOSIY ----------------------------
function foydalanuvchiIsmi(){
  if(Sync.user && Sync.user.name) return Sync.user.name;
  if(Sync.user && Sync.user.email) return Sync.user.email.split("@")[0];
  return "Mehmon";
}
function topHTML(){
  const ism = foydalanuvchiIsmi(), nk = Sync.user ? " data-nokir" : "";      // ism va email alifboga o'girilmaydi
  return `<header class="top">
    <button class="avatar" data-act="profil" aria-label="Profil" data-nokir>${esc(ism.charAt(0).toUpperCase())}</button>
    <button class="hello" data-act="profil"><small>${salom()}</small><b${nk}>${esc(ism)}</b></button>
    <div class="top-actions">
      ${syncBtnHTML()}
      <button class="ibtn" data-act="themeCycle" aria-label="Mavzuni almashtirish">${ic(themeIcon())}</button>
      <button class="ibtn" data-act="homeMenu" aria-label="Boshqa amallar">${ic("ellipsis-vertical")}</button>
    </div>
  </header>`;
}
// Yozuvlarni kun ichida tartiblash: vaqti borlari vaqt bo'yicha, qolganlari — yangisi tepada
function kunTartib(rows){
  const idxOf = new Map(rows.map((r, i) => [r.id, i]));
  return rows.slice().sort((a, b) => {
    if(a.vaqt && b.vaqt) return a.vaqt.localeCompare(b.vaqt);
    if(a.vaqt) return -1; if(b.vaqt) return 1;
    return idxOf.get(b.id) - idxOf.get(a.id);
  });
}
function yozuvRow(r){
  const g = katGuruh(r.kat);
  const sub = [r.vaqt ? `${r.vaqt}–${hhmm(hmToMin(r.vaqt) + r.daqiqa)}` : "", r.izoh ? esc(r.izoh) : (r.vaqt ? "" : GURUH[g].nom)].filter(Boolean).join(" · ");
  return `<button class="row g-${g}" data-act="entryEdit" data-id="${esc(r.id)}">
    <span class="tile-ic">${ic(katIcon(r.kat))}</span>
    <span class="row-main"><b>${esc(katNom(r.kat))}</b><small>${sub}</small></span>
    <span class="row-amt num">−${tanga(r.daqiqa)}<small>${soat(r.daqiqa)}</small></span>
  </button>`;
}
function kirimRow(s){
  const k = idx().kirim[s];
  return `<div class="row"><span class="tile-ic ok">${ic("coins")}</span>
    <span class="row-main"><b>Kunlik kirim</b><small>${k && k.izoh ? esc(k.izoh) : "Har kuni 1440 tanga beriladi"}</small></span>
    <span class="row-amt in num">+${tanga(KUNLIK)}</span></div>`;
}
function stackbarHTML(gj, jami, cls){
  const rest = Math.max(jami - GURUH_TARTIB.reduce((a, g) => a + gj[g], 0), 0);
  return `<div class="stackbar${cls ? " " + cls : ""}">${GURUH_TARTIB.filter(g => gj[g] > 0).map(g => `<i class="g-${g}" style="flex-grow:${gj[g]}" title="${GURUH[g].nom}: ${soat(gj[g])}"></i>`).join("")}${rest > 0 ? `<i class="rest" style="flex-grow:${rest}"></i>` : ""}</div>`;
}
let _heroOldin = null;

// Kun chizig'i: vaqti yozilgan ishlar soat bo'yicha, orasidagi bo'sh vaqt bilan (bo'shliqqa bossangiz — o'sha vaqtga yozuv)
function kunChizigiHTML(t, rows){
  const bugun = bugunISO(), now = hozirDaqiqa(), isBugun = t === bugun;
  const timed = rows.filter(r => hmToMin(r.vaqt) != null).sort((a, b) => hmToMin(a.vaqt) - hmToMin(b.vaqt));
  const vaqtsiz = rows.filter(r => hmToMin(r.vaqt) == null);
  const bosh = (s, e, oxirgi) => { const d = e - s; if(d < 5) return "";
    return `<button class="tl2-gap${oxirgi ? " now" : ""}" data-act="entryNew" data-sana="${t}" data-vaqt="${hhmm(s)}" data-amt="${d}">
      <span class="tl2-t num">${hhmm(s)}</span><span class="tl2-rail"></span>
      <span class="tl2-gm">${ic("hourglass")}<span><b class="num">${soat(d)}</b> ${oxirgi ? "hozirgacha yozilmagan" : "bo'sh"}</span></span><span class="tl2-add">${ic("plus")}</span></button>`; };
  let html = "", oldin = null, nowQuydi = false;
  const nowLine = () => `<div class="tl2-now"><span class="tl2-t num">${hhmm(now)}</span><span class="tl2-rail"><i></i></span><span>hozir</span></div>`;
  for(const r of timed){
    const s = hmToMin(r.vaqt), e = Math.min(s + r.daqiqa, 1440), g = katGuruh(r.kat);
    if(isBugun && !nowQuydi && now < s){ if(oldin != null) html += bosh(oldin, Math.min(now, s)); html += nowLine(); nowQuydi = true; oldin = Math.max(oldin == null ? now : oldin, now); }
    if(oldin != null && s > oldin) html += bosh(oldin, s);
    const bal = clamp(Math.round(r.daqiqa * .55), 54, 170);
    html += `<button class="tl2-it g-${g}" data-act="entryEdit" data-id="${esc(r.id)}">
      <span class="tl2-t num">${r.vaqt}</span>
      <span class="tl2-rail"><span class="tl2-pill" style="height:${bal}px">${ic(katIcon(r.kat))}</span></span>
      <span class="tl2-m"><small class="num">${r.vaqt}–${hhmm(e)} (${soat(r.daqiqa)})</small><b>${esc(katNom(r.kat))}</b>${r.izoh ? `<em>${esc(r.izoh)}</em>` : ""}</span>
      <span class="tl2-amt num">−${tanga(r.daqiqa)}</span></button>`;
    oldin = oldin == null ? e : Math.max(oldin, e);
  }
  if(isBugun && !nowQuydi && timed.length){ if(oldin != null && now > oldin) html += bosh(oldin, now, true); html += nowLine(); }
  const yangi = !timed.length ? `<button class="tl2-start" data-act="entryNew" data-sana="${t}"${isBugun ? ` data-vaqt="${hhmm(Math.max(0, now - 60))}" data-amt="60"` : ""}>${ic("plus")}<span><b>Kunni vaqt chizig'iga yozing</b><small>Boshlanish vaqtini belgilasangiz, ishlar shu yerda soat bo'yicha tiziladi</small></span></button>` : "";
  return `${timed.length ? `<div class="tl2">${html}</div>` : yangi}
    ${vaqtsiz.length ? `<div class="sub-h" style="margin-top:${timed.length ? 16 : 14}px">Vaqti belgilanmagan</div><div class="rows">${kunTartib(vaqtsiz).map(yozuvRow).join("")}</div>` : ""}`;
}
// «Hozir nima qilyapsiz?» — bir bosishda ishni boshlash, keyingisiga o'tish (oldingisi o'zi yoziladi)
function hozirHTML(){
  const yur = S.timer.ish || timerMs() > 0, kat = S.timer.kat, g = katGuruh(kat);
  const tez = oxirgiKatlar(8).filter(k => !(yur && k === kat)).slice(0, 7);
  return `<section class="card hozir o3${yur ? " on g-" + g : ""}" id="hozirK">
    ${yur ? `<div class="hz-top"><span class="tile-ic">${ic(katIcon(kat))}</span><div class="hz-m"><small>${S.timer.ish ? "Hozir" : "To'xtatilgan"}</small><b>${esc(katNom(kat))}</b></div><b class="hz-t num" id="hozirT">${timerMatn()}</b></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn soft sm" data-act="hzPauza">${ic(S.timer.ish ? "pause" : "play")}${S.timer.ish ? "Pauza" : "Davom"}</button><button class="btn blue sm" data-act="hzTugat">${ic("check")}Tugatish va yozish</button></div>
      <div class="sub-h" style="margin-top:14px">Keyingi ishga o'tish</div>`
      : `<div class="ch" style="margin-bottom:10px"><h2>Hozir nima qilyapsiz?</h2><span class="hint">bossangiz, vaqt sanaladi</span></div>`}
    <div class="chips scroll">${tez.map(k => `<button class="chip g-${katGuruh(k)}" data-act="hzOt" data-kat="${esc(k)}"><span class="tile-ic xs">${ic(katIcon(k))}</span>${esc(katNom(k))}</button>`).join("")}<button class="chip dash" data-act="hzOt">${ic("search")}Boshqa</button></div>
  </section>`;
}
A.hzOt = async el => {
  let kat = el.dataset.kat; if(!kat){ kat = await pickKat(S.timer.kat); if(!kat) return; }
  const oldin = S.timer.kat, min = Math.round(timerMs() / 60000), yur = S.timer.ish || timerMs() > 0;
  if(yur && kat === oldin){ if(!S.timer.ish) timerStart(); render(); return; }
  if(yur && min >= 1){ const t = bugunISO(); const bosh = hozirDaqiqa() - min; timerReset();
    if(!guardYopiq(t)) qosh([{sana: t, kat: oldin, daqiqa: min, izoh: "", vaqt: bosh >= 0 ? hhmm(bosh) : ""}]); }
  else if(yur) timerReset();
  S.timer.kat = kat; cfgTouch("timer"); timerStart(); vibra(12); render();
  toast(`${ic("play")}<span>${yur && min >= 1 ? `<b>${esc(katNom(oldin))}</b> ${tanga(min)} tanga yozildi · ` : ""}${esc(katNom(kat))} boshlandi</span>`);
};
A.hzPauza = () => { if(S.timer.ish) timerPause(); else timerStart(); render(); };
A.hzTugat = () => { if(timerMs() < 60000){ timerReset(); toast("1 daqiqadan kam — yozilmadi"); } else timerSaqla(); render(); };

Screens.asosiy = { render(el){
  if(!tanlangan) tanlangan = bugunISO();
  const t = tanlangan, bugun = bugunISO(), isBugun = t === bugun;
  const rows = kunYozuv(t), spent = kunChiqim(t), left = Math.max(KUNLIK - spent, 0), over = spent > KUNLIK;
  const gj = kunGuruh(t), bk = bucketJami(gj), now = hozirDaqiqa();
  const yozilmagan = isBugun ? Math.max(0, Math.min(now, KUNLIK) - spent) : (t < bugun ? left : 0);

  // --- Qoldiq kartasi ---
  const lbl = isBugun ? "Bugungi qoldiq" : "Qoldiq";
  const hero = `<section class="hero o1${over ? " over" : ""}">
    <div class="hero-top">
      <button class="hero-lbl" data-act="kunTanla" aria-label="${lbl}, ${sanaToliq(t)} — kunni almashtirish"><b>${lbl}</b><span>· ${sanaQisqa(t)}, ${HK_QISQA[dOf(t).getDay()]}</span>${ic("chevron-down")}</button>
    </div>
    <div class="hero-num"><b class="num" id="heroNum">${over ? "+" + tanga(spent - KUNLIK) : tanga(left)}</b><span>tanga</span></div>
    <div class="hero-sub">${over ? `Kun 1440 tangadan oshib ketdi — yozuvlarni tekshiring` : `${soatUzun(left)} hali taqsimlanmagan`}</div>
    <div class="dayline" aria-hidden="true">
      <div class="dl-track"><i class="dl-fill" style="width:${Math.min(spent / KUNLIK * 100, 100)}%"></i>${isBugun ? `<i class="dl-now" style="left:${now / KUNLIK * 100}%"></i>` : ""}</div>
      <div class="dl-lbl"><span${isBugun && now < 300 ? ' style="visibility:hidden"' : ""}>00:00</span>${isBugun ? `<span class="now" style="left:${clamp(now / KUNLIK * 100, 13, 87)}%">hozir ${hhmm(now)}</span>` : ""}<span${isBugun && now > 1140 ? ' style="visibility:hidden"' : ""}>24:00</span></div>
    </div>
    <div class="hero-chips">
      <span class="hchip num">${rows.length} ta yozuv</span>
      ${yozilmagan > 0 ? `<button class="hchip line num" data-act="entryNew" data-amt="${yozilmagan}">${ic("hourglass")}Yozilmagan <b>${tanga(yozilmagan)}</b></button>`
        : (spent >= 1380 && !over ? `<span class="hchip line">${ic("circle-check")}Kun to'liq yozildi</span>` : "")}
    </div>
  </section>`;

  // --- Kunlar tasmasi ---
  let kunList = []; for(let i = 13; i >= 0; i--) kunList.push(addDays(bugun, -i));
  if(t < kunList[0]) kunList = [t].concat(kunList.slice(1)); else if(t > bugun) kunList.push(t);
  const strip = `<div class="strip days o2" id="kunStrip">
    <button class="dchip cal" data-act="kunTanla" aria-label="Taqvimdan kun tanlash">${ic("calendar-days")}</button>
    ${kunList.map(d => { const dd = dOf(d), sp = kunChiqim(d);
      return `<button class="dchip${d === t ? " on" : ""}${d === bugun ? " today" : ""}" data-act="kun" data-d="${d}" aria-label="${sanaToliq(d)}"><small>${HK_QISQA[dd.getDay()]}</small><b class="num">${dd.getDate()}</b><i style="--f:${Math.min(sp / KUNLIK, 1).toFixed(3)}"></i></button>`; }).join("")}
  </div>`;

  // --- Foydali / Behuda ---
  const tiles = `<div class="tiles o6">
    <div class="card tile"><div class="tile-h"><span class="tile-ic ok">${ic("trending-up")}</span><span>Foydali</span></div>
      <div class="tile-v"><b class="num">${tanga(bk.foydali)}</b><span>tanga</span></div><small>${soat(bk.foydali)} · kunning ${foiz(bk.foydali, KUNLIK)}%</small></div>
    <div class="card tile"><div class="tile-h"><span class="tile-ic bad">${ic("trending-down")}</span><span>Behuda</span></div>
      <div class="tile-v"><b class="num">${tanga(bk.behuda)}</b><span>tanga</span></div><small>${bk.behuda ? soat(bk.behuda) + (S.sozlama.som > 0 ? " · " + somF(bk.behuda * S.sozlama.som) : " · kunning " + foiz(bk.behuda, KUNLIK) + "%") : "yo'qotish yo'q"}</small></div>
  </div>`;

  // --- Tezkor qo'shish (shablonlar) ---
  const tezkor = `<div class="o5"><div class="sec"><h2>Tezkor qo'shish</h2><button class="link" data-act="shablonlar">Sozlash</button></div>
    <div class="chips scroll" style="margin-top:10px">
      ${S.shablonlar.map((s, i) => `<button class="chip g-${katGuruh(s.kat)}" data-act="tplAdd" data-i="${i}"><span class="gdot"></span>${esc(s.nom || katNom(s.kat))} <b class="num">${tanga(s.daqiqa)}</b></button>`).join("")}
      <button class="chip dash" data-act="shablonlar">${ic("plus")}Shablon</button>
    </div></div>`;

  // --- Kun yozuvlari ---
  const prev = kunlar().filter(d => d < t).pop();
  const yozuvlar = `<section class="card o4">
    <div class="ch"><h2>${isBugun ? "Bugungi kun" : sanaQisqa(t)}</h2>${rows.length ? `<button class="link" data-act="tab" data-tab="daftar">Hammasi${ic("chevron-right")}</button>` : ""}</div>
    ${kunChizigiHTML(t, rows)}
    <div class="btn-row" style="margin-top:${rows.length ? 12 : 0}px">
      ${prev ? `<button class="btn soft sm" data-act="kechagidek">${ic("copy")}${sanaQisqa(prev)} dagidek</button>` : ""}
      ${S.shablonlar.length ? `<button class="btn soft sm" data-act="odatiyKun">${ic("list-plus")}Odatiy kun</button>` : ""}
    </div>
  </section>`;

  // --- Kun taqsimoti ---
  const segs = GURUH_TARTIB.filter(g => gj[g] > 0).sort((a, b) => gj[b] - gj[a]);
  const taqsimot = segs.length ? `<section class="card o7">
    <div class="ch"><h2>Kun taqsimoti</h2><span class="hint num">${tanga(spent)} / ${tanga(KUNLIK)}</span></div>
    ${stackbarHTML(gj, KUNLIK)}
    <div class="lg">${segs.map(g => `<div class="lg-r g-${g}"><span class="gdot"></span><span class="lg-n">${GURUH[g].nom}</span><b class="num">${soat(gj[g])}</b><small class="num">${foiz(gj[g], KUNLIK)}%</small></div>`).join("")}</div>
  </section>` : "";

  // --- Kun kayfiyati ---
  const mood = S.kayfiyat[t] || 0, yuz = ["angry","frown","meh","smile","laugh"], yuzNom = ["Juda yomon","Yomon","O'rtacha","Yaxshi","A'lo"];
  const kayf = (rows.length || mood) ? `<section class="card o8">
    <div class="ch"><h2>Kun kayfiyati</h2><span class="hint">${mood ? yuzNom[mood - 1] : "baholang"}</span></div>
    <div class="mood">${yuz.map((n, i) => `<button class="m${i + 1}${mood === i + 1 ? " on" : ""}" data-act="mood" data-v="${i + 1}" aria-label="${yuzNom[i]}" aria-pressed="${mood === i + 1}">${ic(n)}</button>`).join("")}</div>
  </section>` : "";

  // --- Kuzatuv ---
  const kz = bugunKuzatuv();
  const kuzatuv = `<section class="card insight o9"><span class="tile-ic ${kz.cl === "ok" ? "ok" : kz.cl === "bad" ? "bad" : kz.cl === "warn" ? "warn" : "blue"}">${ic(kz.icon)}</span>
    <div><h3>${kz.h}</h3><p>${kz.p}</p>${kunlar().length ? `<button class="link" data-act="tab" data-tab="tahlil">Batafsil tahlil${ic("chevron-right")}</button>` : ""}</div></section>`;

  const namunaBor = namunami() && kunlar().length > 0;
  const namunaT = VB_KORGAZMA ? `<div class="demo-b"><button class="demo-t" data-act="korgazmaHaqida"><span class="tile-ic sm blue">${ic("flask-conical")}</span><span><b>Ko'rgazma nusxa</b><small>${namunaBor ? "Namuna yozuvlar bilan. " : ""}Kirish va sinxron Render'da ishlaydi</small></span></button>${namunaBor ? `<button class="btn soft xs" data-act="namunaToza">Namunani olib tashlash</button>` : ""}</div>`
    : namunaBor ? `<div class="demo-b"><div class="demo-t"><span class="tile-ic sm blue">${ic("flask-conical")}</span><span><b>Namuna ma'lumot</b><small>Misol uchun qo'yilgan yozuvlar</small></span></div><button class="btn soft xs" data-act="namunaToza">Olib tashlash</button></div>` : "";
  el.innerHTML = topHTML() + namunaT + `<div class="cols home">
    <div class="col">${hero}${strip}${isBugun ? hozirHTML() : ""}${yozuvlar}</div>
    <div class="col">${tezkor}${tiles}${taqsimot}${kayf}${kuzatuv}</div>
  </div>`;

  // tanlangan kun tasmada ko'rinib tursin
  const st = $("#kunStrip", el), on = st && $(".dchip.on", st);
  if(st && on) st.scrollLeft = Math.max(0, on.offsetLeft - st.clientWidth / 2 + on.offsetWidth / 2);
  // qoldiq raqamini yumshoq sanash (faqat shu kun ichida o'zgarganda)
  const hn = $("#heroNum", el), kalit = t + (over ? "+" : "");
  if(hn && !over && _heroOldin && _heroOldin.k === kalit && _heroOldin.v !== left) animateNum(hn, _heroOldin.v, left);
  _heroOldin = {k: kalit, v: left};
}};

// Yozuv qo'shish (effektlar va ogohlantirishlar bilan)
function qosh(list, xabar){
  const sana = list[0] && list[0].sana, oldin = sana ? kunChiqim(sana) : 0;
  const r = entryAdd(list);
  if(r.blok) toast(`${ic("lock")}<span>${r.blok} ta yozuv yopilgan oyga tegishli — qo'shilmadi</span>`);
  if(!r.ids.length) return r;
  blip(); vibra();
  const jami = kunChiqim(sana);
  if(oldin < 1380 && jami >= 1380 && jami <= KUNLIK) fxCoins();
  if(xabar) toast(xabar, {undo: () => entryRemove(r.ids)});
  if(jami > KUNLIK) setTimeout(() => toast(`${ic("triangle-alert")}<span>${sanaQisqa(sana)}: kun 1440 tangadan <b>${tanga(jami - KUNLIK)}</b> oshib ketdi</span>`), xabar ? 3000 : 100);
  return r;
}

A.kun = el => { tanlangan = el.dataset.d; vibra(8); render(); };
A.kunTanla = async () => { const d = await pickSana(tanlangan, "Qaysi kunni ko'rasiz?"); if(d){ tanlangan = d; if(curTab !== "asosiy") switchTab("asosiy"); else render(); } };
A.mood = el => kayfiyatSet(tanlangan || bugunISO(), +el.dataset.v);
A.tplAdd = el => {
  const s = S.shablonlar[+el.dataset.i]; if(!s) return;
  const sana = tanlangan || bugunISO(); if(guardYopiq(sana)) return;
  qosh([{sana, kat: s.kat, daqiqa: s.daqiqa, izoh: ""}], `${ic("check")}<span><b>${tanga(s.daqiqa)} tanga</b> · ${esc(s.nom || katNom(s.kat))}</span>`);
};
A.kechagidek = async () => {
  const t = tanlangan || bugunISO(); if(guardYopiq(t)) return;
  const prev = kunlar().filter(d => d < t).pop();
  if(!prev){ toast("Nusxalash uchun oldingi kun topilmadi"); return; }
  const src = kunYozuv(prev);
  if(kunYozuv(t).length && !(await confirmDlg({icon: "copy", title: "Ustiga qo'shilsinmi?", text: `${sanaQisqa(t)} kunida yozuvlar bor. ${sanaQisqa(prev)} dagi ${src.length} ta yozuv ularga qo'shiladi.`, ok: "Qo'shish"}))) return;
  qosh(src.map(r => ({sana: t, kat: r.kat, daqiqa: r.daqiqa, izoh: r.izoh, vaqt: r.vaqt})), `${ic("copy")}<span>${sanaQisqa(prev)} dan <b>${src.length}</b> ta yozuv nusxalandi</span>`);
};
A.odatiyKun = async () => {
  const t = tanlangan || bugunISO(); if(guardYopiq(t)) return;
  if(!S.shablonlar.length){ toast("Shablon yo'q"); return; }
  const jami = S.shablonlar.reduce((a, s) => a + s.daqiqa, 0);
  if(!(await confirmDlg({icon: "list-plus", title: "Odatiy kun qo'shilsinmi?", text: `${S.shablonlar.length} ta shablon (${tanga(jami)} tanga) ${sanaQisqa(t)} kuniga yoziladi.`, ok: "Qo'shish"}))) return;
  qosh(S.shablonlar.map(s => ({sana: t, kat: s.kat, daqiqa: s.daqiqa, izoh: ""})), `${ic("check")}<span>Odatiy kun qo'shildi · <b>${tanga(jami)} tanga</b></span>`);
};
A.homeMenu = el => openMenu(el, [
  {icon: "search", label: "Yozuvlarni qidirish", fn: () => { switchTab("daftar"); setTimeout(() => { const i = $("#daftarQ"); if(i) i.focus(); }, 120); }},
  {icon: "sparkles", label: "AI yordamchi", fn: () => A.aiOpen()},
  {icon: "clipboard-list", label: "Haftalik hisobot", fn: () => A.haftaSheet()},
  {icon: "gift", label: "Yil xulosasi", fn: () => A.wrapSheet()},
  kunYozuv(tanlangan || bugunISO()).length ? {icon: "save", label: "Shu kunni shablon qilish", fn: () => A.kunShablon()} : null,
]);
A.kunShablon = async () => {
  const t = tanlangan || bugunISO(), rows = kunYozuv(t);
  if(!rows.length){ toast("Bu kunda yozuv yo'q"); return; }
  if(!(await confirmDlg({icon: "save", title: "Shablonlar almashtirilsinmi?", text: `Hozirgi shablonlar o'rniga ${sanaQisqa(t)} kunidagi yozuvlar shablon bo'ladi.`, ok: "Almashtirish"}))) return;
  const agg = {}; for(const r of rows) agg[r.kat] = (agg[r.kat] || 0) + r.daqiqa;
  S.shablonlar = Object.keys(agg).map(k => ({nom: katNom(k), kat: k, daqiqa: agg[k]}));
  cfgTouch("shablonlar"); toast(`${ic("check")}<span>${S.shablonlar.length} ta shablon saqlandi</span>`);
};
