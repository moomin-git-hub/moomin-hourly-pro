
// ---------------------------- YOZUV OYNASI (qo'shish / tahrirlash) ----------------------------
function oxirgiKatlar(n){
  const cnt = new Map(), all = chiqimlar(), y = yashirinlar();
  for(let i = all.length - 1, k = 0; i >= 0 && k < 240; i--, k++) cnt.set(all[i].kat, (cnt.get(all[i].kat) || 0) + 1);
  return Array.from(cnt.entries()).filter(x => !y.includes(x[0])).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
}
function entrySheet(opt){
  opt = opt || {};
  const edit = opt.id ? yozuvTop(opt.id) : null;
  if(opt.id && !edit) return;
  const st = {
    sana: edit ? edit.sana : (opt.sana || (curTab === "asosiy" && tanlangan) || bugunISO()),
    kat: edit ? edit.kat : (opt.kat || oxirgiKatlar(1)[0] || KATEGORIYALAR[0]),
    daqiqa: edit ? edit.daqiqa : (Math.round(+opt.daqiqa) || 0),
    vaqt: edit ? (edit.vaqt || "") : (opt.vaqt || ""),
    izoh: edit ? (edit.izoh || "") : (opt.izoh || ""),
  };
  const katRow = () => { const g = katGuruh(st.kat);
    return `<button type="button" class="katrow g-${g}" id="eKat"><span class="tile-ic">${ic(katIcon(st.kat))}</span>
      <span class="row-main"><small>Qayerga sarflandi</small><b>${esc(katNom(st.kat))}</b></span><span class="pill mute">${GURUH[g].nom}</span>${ic("chevron-right", "chev")}</button>`; };
  const sanaMatn = () => `${sanaNisbiy(st.sana) === sanaToliq(st.sana) ? sanaToliq(st.sana) : sanaNisbiy(st.sana) + " · " + sanaQisqa(st.sana)}`;
  const qoldiq = () => Math.max(0, KUNLIK - kunChiqim(st.sana) + (edit && edit.sana === st.sana ? edit.daqiqa : 0));
  const tezkor = [5, 10, 15, 30, 45, 60, 90, 120];
  const oxirgi = oxirgiKatlar(7).filter(k => k !== st.kat).slice(0, 6);

  const o = openSheet({
    title: edit ? "Yozuvni tahrirlash" : "Yangi yozuv",
    body: `<div class="amt">
        <button type="button" class="amt-b" data-d="-5" aria-label="5 tanga kamaytirish">${ic("minus")}</button>
        <label class="amt-c"><input id="eAmt" class="num" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="0" value="${st.daqiqa || ""}" aria-label="Miqdor, tanga (daqiqa)" autocomplete="off"><span>tanga</span></label>
        <button type="button" class="amt-b" data-d="5" aria-label="5 tanga qo'shish">${ic("plus")}</button>
      </div>
      <div class="amt-s" id="eAmtS"></div>
      <div class="chips scroll" id="eTez">${tezkor.map(v => `<button type="button" class="chip sm num" data-q="${v}">${v < 60 ? v : soat(v)}</button>`).join("")}<button type="button" class="chip sm dash num" data-q="qoldiq">Qoldiq</button></div>
      <div id="eKatWrap">${katRow()}</div>
      ${oxirgi.length ? `<div class="chips scroll" id="eOxirgi">${oxirgi.map(k => `<button type="button" class="chip sm g-${katGuruh(k)}" data-rk="${esc(k)}"><span class="gdot"></span>${esc(katNom(k))}</button>`).join("")}</div>` : ""}
      <div class="field" style="margin-top:20px"><span>Sana</span><button type="button" class="fake" id="eSana"><b>${sanaMatn()}</b>${ic("calendar-days")}</button></div>
      <input type="hidden" id="eVaqt" value="${esc(st.vaqt)}"><input type="hidden" id="eTug" value="${st.vaqt && st.daqiqa ? hhmm(hmToMin(st.vaqt) + st.daqiqa) : ""}">
      <div class="field-row" style="margin-top:18px">
        <div class="field"><span>Boshlanishi</span><button type="button" class="fake vt-f" id="eVaqtB"></button></div>
        <div class="field"><span>Tugashi</span><button type="button" class="fake vt-f" id="eTugB"></button></div>
      </div>
      <div class="chips scroll" id="eVtTez" style="margin-top:10px"></div>
      <p class="note" style="margin:8px 6px 0">Ixtiyoriy. Ikkalasini kiritsangiz, miqdor o'zi hisoblanadi.</p>
      <label class="field" style="margin-top:18px"><span>Izoh</span><input type="text" id="eIzoh" maxlength="300" placeholder="masalan: telefonga ketdi #teg" value="${esc(st.izoh)}" autocomplete="off"></label>
      ${edit ? `<button type="button" class="link" id="eNusxa" style="margin-top:12px">${ic("copy")}Bugunga nusxalash</button>` : ""}`,
    foot: edit
      ? `<button class="btn danger" id="eDel" style="flex:0 0 auto" aria-label="O'chirish">${ic("trash-2")}</button><button class="btn blue" data-save="1">Saqlash</button>`
      : `<button class="btn ghost" data-save="yana" style="flex:0 0 auto">Yana qo'shish</button><button class="btn grad" data-save="1">Saqlash</button>`,
  });
  const q = s => $(s, o.el), amt = q("#eAmt"), vq = q("#eVaqt"), tg = q("#eTug");
  const amtYoz = () => { amtEn(amt); const s = q("#eAmtS"); s.textContent = st.daqiqa > 0 ? `${soatUzun(st.daqiqa)} · shu kundan ${tanga(qoldiq())} tanga bo'sh` : `Shu kunda ${tanga(qoldiq())} tanga bo'sh`; s.classList.toggle("warn", st.daqiqa > qoldiq()); if(kirilmi()) cyrPass(s); };
  const amtSet = (v, vaqtdan) => { st.daqiqa = clamp(Math.round(v) || 0, 0, KUNLIK); amt.value = st.daqiqa ? String(st.daqiqa) : ""; amtYoz(); if(!vaqtdan){ const s = hmToMin(vq.value); if(s != null && st.daqiqa > 0) tg.value = hhmm(s + st.daqiqa); } vtKor(); };
  amtYoz();
  amt.addEventListener("input", () => { const v = parseInt(amt.value.replace(/\D/g, ""), 10) || 0; st.daqiqa = clamp(v, 0, KUNLIK); if(String(v) !== amt.value) amt.value = v ? String(st.daqiqa) : ""; amtYoz(); const s = hmToMin(vq.value); if(s != null && st.daqiqa > 0) tg.value = hhmm(s + st.daqiqa); vtKor(); });
  amt.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); saqla(false); } });
  // vaqt tugmalari (yashirin maydonlarda qiymat, ko'rinishi — tugma)
  const vtKor = () => {
    for(const [inp, btn] of [[vq, "#eVaqtB"], [tg, "#eTugB"]]){ const v = inp.value; q(btn).innerHTML = v ? `<b class="num">${v}</b>${ic("clock")}` : `<span class="ph">—:—</span>${ic("clock")}`; }
    const tez = [], ox = oxirgiTugash(st.sana, edit && edit.id), hz = hozirDaqiqa(), bugunmi = st.sana === bugunISO();
    if(!vq.value && ox != null && ox < 1440) tez.push(`<button type="button" class="chip sm" data-vs="${hhmm(ox)}">${ic("corner-down-right")}Oldingisidan keyin <b class="num">${hhmm(ox)}</b></button>`);
    if(!vq.value && bugunmi && st.daqiqa > 0 && hz - st.daqiqa >= 0) tez.push(`<button type="button" class="chip sm" data-vs="${hhmm(hz - st.daqiqa)}" data-ve="${hhmm(hz)}">${ic("clock")}Hozir tugadi <b class="num">${hhmm(hz - st.daqiqa)}–${hhmm(hz)}</b></button>`);
    if(!vq.value && bugunmi && !st.daqiqa) tez.push(`<button type="button" class="chip sm" data-vs="${hhmm(hz)}">${ic("play")}Hozirdan <b class="num">${hhmm(hz)}</b></button>`);
    const w = q("#eVtTez"); w.innerHTML = tez.join(""); w.hidden = !tez.length; if(kirilmi()) cyrPass(w);
  };
  const vaqtQuy = (s, e) => {   // s, e — "HH:MM" yoki undefined (o'zgarmaydi)
    if(s !== undefined) vq.value = s; if(e !== undefined) tg.value = e;
    const a = hmToMin(vq.value), b = hmToMin(tg.value);
    if(e !== undefined && a != null && b != null){ let d = (b - a + 1440) % 1440; if(d === 0) d = 1440; amtSet(d, true); }
    else if(s !== undefined && a != null){ if(st.daqiqa > 0) tg.value = hhmm(a + st.daqiqa); else if(b != null){ let d = (b - a + 1440) % 1440; if(d === 0) d = 1440; amtSet(d, true); } }
    if(!vq.value) tg.value = "";
    vtKor();
  };
  vtKor();
  const katYangila = () => { q("#eKatWrap").innerHTML = katRow(); cyrPass(q("#eKatWrap")); };

  o.el.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.d){ amtSet(Math.max(0, st.daqiqa + (+b.dataset.d))); vibra(6); }
    else if(b.dataset.q){ amtSet(b.dataset.q === "qoldiq" ? qoldiq() : +b.dataset.q); vibra(6); }
    else if(b.dataset.rk){ st.kat = b.dataset.rk; katYangila(); vibra(6); }
    else if(b.id === "eKat"){ const k = await pickKat(st.kat); if(k){ st.kat = k; katYangila(); } }
    else if(b.id === "eSana"){ const d = await pickSana(st.sana); if(d){ st.sana = d; $("b", q("#eSana")).textContent = kirilmi() ? latKir(sanaMatn()) : sanaMatn(); amtYoz(); vtKor(); } }
    else if(b.id === "eVaqtB"){ const ox = oxirgiTugash(st.sana, edit && edit.id); const v = await pickVaqt({title: "Boshlanish vaqti", tozalash: !!vq.value, value: vq.value || (ox != null && ox < 1440 ? hhmm(ox) : ""), tavsiya: [ox != null && ox < 1440 ? {label: "Oldingisi tugagan", value: hhmm(ox)} : null, st.sana === bugunISO() ? {label: "Hozir", value: hhmm(hozirDaqiqa())} : null]}); if(v !== null) vaqtQuy(v); }
    else if(b.id === "eTugB"){ const v = await pickVaqt({title: "Tugash vaqti", tozalash: !!tg.value, value: tg.value || (vq.value && st.daqiqa ? hhmm(hmToMin(vq.value) + st.daqiqa) : ""), tavsiya: [st.sana === bugunISO() ? {label: "Hozir", value: hhmm(hozirDaqiqa())} : null]}); if(v !== null){ if(v && !vq.value){ toast("Avval boshlanish vaqtini tanlang"); } else vaqtQuy(undefined, v); } }
    else if(b.dataset.vs){ vaqtQuy(b.dataset.vs, b.dataset.ve); vibra(6); }
    else if(b.dataset.save) saqla(b.dataset.save === "yana");
    else if(b.id === "eDel"){ if(guardYopiq(edit.sana)) return; const out = entryRemove([edit.id]); ovClose(o); toast(`${ic("trash-2")}<span>Yozuv o'chirildi</span>`, {undo: () => entryRestore(out)}); }
    else if(b.id === "eNusxa"){ const t = bugunISO(); if(guardYopiq(t)) return; ovClose(o); qosh([{sana: t, kat: st.kat, daqiqa: st.daqiqa || edit.daqiqa, izoh: q("#eIzoh").value, vaqt: vq.value}], `${ic("copy")}<span>Bugunga nusxalandi · <b>${tanga(st.daqiqa || edit.daqiqa)} tanga</b></span>`); }
  });
  function saqla(yana){
    if(!(st.daqiqa > 0)){ const c = q(".amt"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); toast("Miqdorni kiriting — necha tanga (daqiqa) sarflandi?"); try{ amt.focus(); }catch(e){} return; }
    st.izoh = q("#eIzoh").value.trim(); st.vaqt = hmToMin(vq.value) != null ? vq.value : "";
    if(guardYopiq(st.sana) || (edit && guardYopiq(edit.sana))) return;
    if(edit){
      entryUpdate(edit.id, {sana: st.sana, kat: st.kat, daqiqa: st.daqiqa, izoh: st.izoh, vaqt: st.vaqt});
      ovClose(o); toast(`${ic("check")}<span>Yozuv yangilandi</span>`); return;
    }
    if(curTab === "asosiy") tanlangan = st.sana;
    qosh([{sana: st.sana, kat: st.kat, daqiqa: st.daqiqa, izoh: st.izoh, vaqt: st.vaqt}], `${ic("check")}<span><b>${tanga(st.daqiqa)} tanga</b> yozildi · ${esc(katNom(st.kat))}</span>`);
    if(!yana){ ovClose(o); return; }
    // ketma-ket yozish: keyingi yozuv oldingisi tugagan vaqtdan boshlanadi
    const keyingi = st.vaqt ? hhmm(hmToMin(st.vaqt) + st.daqiqa) : "";
    st.izoh = ""; q("#eIzoh").value = ""; vq.value = keyingi; tg.value = ""; amtSet(0); vtKor();
    o.body.scrollTo({top: 0, behavior: reduceMotion ? "auto" : "smooth"});
  }
  if(!MOBIL && !st.daqiqa) setTimeout(() => { try{ amt.focus(); }catch(e){} }, 260);
  return o;
}
A.entryNew = el => { const d = (el && el.dataset) || {}; entrySheet({daqiqa: +d.amt || 0, sana: d.sana || undefined, vaqt: d.vaqt || undefined}); };
A.entryEdit = el => entrySheet({id: el.dataset.id});

// ---------------------------- TOIFALAR ----------------------------
// Yangi toifa yoki mavjudini tahrirlash -> Promise<toifa nomi|null>
function toifaTahrir(index){
  return new Promise(resolve => {
    const eski = index != null ? S.toifalar[index] : null;
    const st = {nom: eski ? katNom(eski.nom) : "", guruh: eski ? eski.guruh : "rivoj", icon: eski ? (eski.icon || GURUH[eski.guruh].icon) : "star"};
    const guruhlar = () => GURUH_TARTIB.map(g => `<button type="button" class="chip sm g-${g}${st.guruh === g ? " on" : ""}" data-g="${g}"><span class="gdot"></span>${GURUH[g].nom}</button>`).join("");
    const ikonlar = () => ICON_TANLOV.map(n => `<button type="button" class="icon-b${st.icon === n ? " on" : ""}" data-icon="${n}" aria-label="${n}">${ic(n)}</button>`).join("");
    const o = openSheet({title: eski ? "Toifani tahrirlash" : "Yangi toifa",
      body: `<label class="field" style="margin-top:8px"><span>Toifa nomi</span><input type="text" id="tNom" maxlength="60" placeholder="masalan: Ingliz tili" value="${esc(st.nom)}" autocomplete="off"></label>
        <div class="sub-h">Yo'nalish</div><div class="chips g-${st.guruh}" id="tGur">${guruhlar()}</div>
        <div class="sub-h">Ikonka</div><div class="icon-grid g-${st.guruh}" id="tIc">${ikonlar()}</div>`,
      foot: `${eski ? `<button class="btn danger" id="tDel" style="flex:0 0 auto" aria-label="O'chirish">${ic("trash-2")}</button>` : ""}<button class="btn blue" id="tSave">${eski ? "Saqlash" : "Toifa qo'shish"}</button>`,
      onClose: r => resolve(r || null)});
    const q = s => $(s, o.el);
    o.el.addEventListener("click", async e => {
      const b = e.target.closest("button"); if(!b) return;
      if(b.dataset.g){ st.guruh = b.dataset.g; q("#tGur").innerHTML = guruhlar(); q("#tIc").className = "icon-grid g-" + st.guruh; cyrPass(q("#tGur")); }
      else if(b.dataset.icon){ st.icon = b.dataset.icon; q("#tIc").innerHTML = ikonlar(); }
      else if(b.id === "tSave"){
        const nom = q("#tNom").value.trim().replace(/\s+/g, " ");
        if(!nom){ toast("Toifa nomini kiriting"); return; }
        const sof = s => katNom(s).toLowerCase();
        if(barchaKategoriyalar().some((k, i) => sof(k) === nom.toLowerCase() && !(eski && k === eski.nom))){ toast("Bunday toifa allaqachon bor"); return; }
        let full;
        if(eski){
          full = (eski.nom.match(/^\d+\.?\s*/) || [""])[0] + nom;
          if(full !== eski.nom){   // nomi o'zgardi — shu toifadagi yozuv va shablonlar ham yangilanadi
            for(const r of S.yozuvlar) if(r.kat === eski.nom){ r.kat = full; r.u = nowTs(); markOut("y:" + r.id); }
            for(const s of S.shablonlar) if(s.kat === eski.nom) s.kat = full;
            if(S.timer.kat === eski.nom){ S.timer.kat = full; markOut("c:timer"); }
            markOut("c:shablonlar"); saqlaY();
          }
          eski.nom = full; eski.guruh = st.guruh; eski.icon = st.icon;
        } else {
          const nums = barchaKategoriyalar().map(k => { const m = String(k).match(/^(\d+)/); return m ? +m[1] : 0; });
          full = (Math.max(32, ...nums) + 1) + " " + nom;
          S.toifalar.push({nom: full, guruh: st.guruh, icon: st.icon});
        }
        invalidateIdx(); cfgTouch("toifalar");
        toast(`${ic("check")}<span>${eski ? "Toifa yangilandi" : "Yangi toifa qo'shildi"} · <b>${esc(nom)}</b></span>`);
        ovClose(o, full);
      }
      else if(b.id === "tDel"){
        const bor = S.yozuvlar.some(r => r.kat === eski.nom);
        if(!(await confirmDlg({danger: true, icon: "trash-2", title: "Toifa o'chirilsinmi?", text: bor ? "Bu toifadagi yozuvlar saqlanib qoladi, lekin «Yo'l va boshqa» yo'nalishiga o'tadi." : "Bu toifada yozuv yo'q.", ok: "O'chirish"}))) return;
        S.toifalar.splice(S.toifalar.indexOf(eski), 1); invalidateIdx(); cfgTouch("toifalar"); toast("Toifa o'chirildi"); ovClose(o, null);
      }
    });
  });
}

// ---------------------------- SHABLONLAR ----------------------------
A.shablonlar = () => {
  const royxat = () => S.shablonlar.length ? `<div class="rows">${S.shablonlar.map((s, i) => `<div class="row g-${katGuruh(s.kat)}"><span class="tile-ic sm">${ic(katIcon(s.kat))}</span>
      <span class="row-main"><b>${esc(s.nom || katNom(s.kat))}</b><small>${esc(katNom(s.kat))}</small></span><span class="row-amt num">${tanga(s.daqiqa)}<small>${soat(s.daqiqa)}</small></span>
      <button class="ibtn plain" data-del="${i}" aria-label="Shablonni o'chirish">${ic("x")}</button></div>`).join("")}</div>`
    : `<div class="empty"><div class="art">${ic("zap")}</div><p>Shablon yo'q. Har kuni takrorlanadigan ishlarni shablon qilib qo'ying — bir bosishda yoziladi.</p></div>`;
  const st = {kat: oxirgiKatlar(1)[0] || KATEGORIYALAR[0]};
  const katB = () => `<button type="button" class="katrow g-${katGuruh(st.kat)}" id="sKat"><span class="tile-ic sm">${ic(katIcon(st.kat))}</span><span class="row-main"><small>Toifa</small><b>${esc(katNom(st.kat))}</b></span>${ic("chevron-right", "chev")}</button>`;
  const o = openSheet({title: "Shablonlar", sub: "Asosiy ekrandagi tezkor qo'shish tugmalari",
    body: `<div id="sList">${royxat()}</div>
      <div class="sub-h">Yangi shablon</div>
      <div id="sKatWrap">${katB()}</div>
      <div class="field-row" style="margin-top:18px">
        <label class="field"><span>Tanga</span><input type="text" inputmode="numeric" id="sAmt" maxlength="4" placeholder="0" autocomplete="off"></label>
        <label class="field"><span>Nomi</span><input type="text" id="sNom" maxlength="40" placeholder="ixtiyoriy" autocomplete="off"></label>
      </div>`,
    foot: `<button class="btn blue" id="sAdd">${ic("plus")}Shablon qo'shish</button>`});
  const q = s => $(s, o.el);
  o.el.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.del != null){ S.shablonlar.splice(+b.dataset.del, 1); cfgTouch("shablonlar"); q("#sList").innerHTML = royxat(); cyrPass(q("#sList")); }
    else if(b.id === "sKat"){ const k = await pickKat(st.kat); if(k){ st.kat = k; q("#sKatWrap").innerHTML = katB(); cyrPass(q("#sKatWrap")); } }
    else if(b.id === "sAdd"){
      const d = parseInt(q("#sAmt").value.replace(/\D/g, ""), 10);
      if(!(d > 0)){ toast("Tanga miqdorini kiriting"); return; }
      S.shablonlar.push({nom: q("#sNom").value.trim() || katNom(st.kat), kat: st.kat, daqiqa: Math.min(d, KUNLIK)});
      cfgTouch("shablonlar"); q("#sAmt").value = ""; q("#sNom").value = ""; q("#sList").innerHTML = royxat(); cyrPass(q("#sList"));
      toast(`${ic("check")}<span>Shablon qo'shildi</span>`);
    }
  });
};
