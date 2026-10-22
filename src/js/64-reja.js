
// ---------------------------- REJA (byudjet, maqsadlar, qarzlar) ----------------------------
let rejaTab = "byudjet";
function budSev(g, plan, act){
  if(g === "behuda") return act <= plan + 1 ? "ok" : "bad";
  if(g === "ish") return act <= plan * 1.05 ? "ok" : act <= plan * 1.2 ? "warn" : "bad";
  return plan === 0 ? "ok" : act >= plan * .85 ? "ok" : act >= plan * .6 ? "warn" : "bad";
}
function rejaByudjetHTML(){
  const b = S.byudjet, sum = GURUH_TARTIB.reduce((a, g) => a + (b[g] || 0), 0), fullN = kunlar().filter(toliqKunmi).length;
  const cls = sum === KUNLIK ? "ok" : sum > KUNLIK ? "bad" : "warn";
  const izoh = sum === KUNLIK ? "Kun to'liq rejalashtirilgan" : sum > KUNLIK ? `Reja 1440 tangadan ${tanga(sum - KUNLIK)} ga oshib ketgan` : `${tanga(KUNLIK - sum)} tanga hali rejasiz`;
  const qatorlar = GURUH_TARTIB.map(g => {
    const plan = b[g] || 0, act = guruhOrtacha(g), delta = act - plan, sev = budSev(g, plan, act), shk = Math.max(plan, act, 1) * 1.12;
    const chip = act === 0 ? `<span class="pill mute">—</span>` : Math.abs(delta) < 1 ? `<span class="pill ok">aniq</span>` : `<span class="pill ${sev} num">${delta > 0 ? "+" : "−"}${tanga(Math.abs(delta))}</span>`;
    return `<button class="row bud g-${g}" data-act="budEdit" data-g="${g}">
      <span class="tile-ic">${ic(GURUH[g].icon)}</span>
      <span class="row-main"><b>${GURUH[g].nom}</b>
        <span class="bmeter"><i style="width:${Math.min(act / shk * 100, 100)}%"></i><s style="left:${Math.min(plan / shk * 100, 100)}%"></s></span>
        <small>${act > 0 ? "amalda o'rtacha " + soat(act) : "hali ma'lumot yo'q"}</small></span>
      <span class="row-amt num">${tanga(plan)}<small>${chip}</small></span>
    </button>`; }).join("");
  // Kun rejasi (tanlangan kun)
  const t = tanlangan || bugunISO(), plan = S.rejaKun[t] || {}, gj = kunGuruh(t), bor = Object.keys(plan).length > 0;
  let planJ = 0, bajJ = 0, cmp = "";
  for(const g of GURUH_TARTIB){ const p = +plan[g] || 0; if(!p) continue; const a = gj[g] || 0; planJ += p; bajJ += Math.min(a, p);
    cmp += `<div class="row g-${g}"><span class="gdot"></span><span class="row-main"><b>${GURUH[g].nom}</b><span class="meter"><i style="width:${Math.min(a / p * 100, 100)}%"></i></span></span><span class="row-amt num">${tanga(a)}<small>/ ${tanga(p)}</small></span></div>`; }
  const fz = planJ ? Math.round(bajJ / planJ * 100) : 0, oldingi = Object.keys(S.rejaKun).filter(d => d < t).sort().pop();
  return `<div class="cols"><div class="col">
    <section class="card">
      <div class="ch"><h2>Kunlik byudjet</h2><b class="num ${cls}-t" style="font-size:17px">${tanga(sum)} / ${tanga(KUNLIK)}</b></div>
      ${stackbarHTML(Object.fromEntries(GURUH_TARTIB.map(g => [g, b[g] || 0])), Math.max(KUNLIK, sum))}
      <p class="note" style="margin-top:10px"><span class="${cls}-t" style="font-weight:700">${izoh}.</span> Har yo'nalishga kuniga necha tanga ajratishingizni belgilang — amaldagi o'rtacha ${fullN ? fullN + " ta to'liq kun" : "to'liq kunlar"} bo'yicha solishtiriladi.</p>
    </section>
    <section class="card"><div class="rows">${qatorlar}</div>
      <p class="note" style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap"><span><i class="key-bar"></i> amalda</span><span><i class="key-mark"></i> reja</span></p></section>
  </div><div class="col">
    <section class="card">
      <div class="ch"><h2>Kun rejasi</h2><button class="link" data-act="kunTanla">${sanaNisbiy(t) === sanaToliq(t) ? sanaQisqa(t) : sanaNisbiy(t)}${ic("chevron-down")}</button></div>
      ${bor ? `<p class="note" style="margin-bottom:6px">Reja ${tanga(planJ)} tanga · <b class="${fz >= 80 ? "ok" : fz >= 50 ? "warn" : "bad"}-t">${fz}% bajarildi</b></p><div class="rows">${cmp}</div>
          <div class="btn-row" style="margin-top:14px"><button class="btn soft sm" data-act="kunRejaEdit">${ic("pencil")}O'zgartirish</button><button class="btn danger sm" data-act="kunRejaDel">${ic("trash-2")}O'chirish</button></div>`
        : `<div class="empty" style="padding-top:14px"><div class="art">${ic("calendar-check")}</div><p>${sanaQisqa(t)} uchun reja yo'q. Kunni oldindan taqsimlang, kechqurun amal bilan solishtiring.</p>
          <button class="link" data-act="kunRejaEdit">Reja tuzish</button>${oldingi ? `<br><button class="link" data-act="kunRejaNusxa">${sanaQisqa(oldingi)} rejasidan nusxa olish</button>` : ""}</div>`}
    </section>
  </div></div>`;
}
function rejaMaqsadHTML(){
  const yil = new Date().getFullYear();
  const jm = S.jamgarma.map(j => { const h = jamgarmaHolat(j);
    return `<button class="row jm g-${j.guruh}" data-act="jmEdit" data-id="${esc(j.id)}"><span class="tile-ic">${ic(h.tugadi ? "trophy" : GURUH[j.guruh].icon)}</span>
      <span class="row-main"><b>${esc(j.nom)}</b><span class="meter"><i style="width:${h.pct}%"></i></span><small>${h.matn}</small></span>
      <span class="row-amt num">${tanga(Math.floor(h.done))}<small>/ ${tanga(j.soat)} soat</small></span></button>`; }).join("");
  const dd = kunlar().filter(toliqKunmi);
  const zanjir = maqsadlar().map(m => { const st = streak(m.ok), bugun = dd.length ? m.ok(dd[dd.length - 1]) : false;
    return `<div class="card tile goal g-${m.g}${bugun ? " met" : ""}"><div class="tile-h"><span class="tile-ic sm">${ic(m.icon)}</span>${st.cur > 0 ? `<span class="pill warn num">${ic("flame")}${st.cur}</span>` : ""}</div>
      <b>${m.nom}</b><small class="num">${st.cur} kun ketma-ket${st.best > st.cur ? ` · rekord ${st.best}` : ""}</small>
      <span class="meter"><i style="width:${st.total ? Math.round(st.cur / st.total * 100) : 0}%"></i></span></div>`; }).join("");
  const nishon = NISHON.map(n => { const ha = S.nishonBer.includes(n.id);
    return `<div class="badge${ha ? " ha" : ""}"><span>${ic(n.icon)}</span><b>${n.nom}</b><small>${n.t}</small></div>`; }).join("");
  return `<div class="cols"><div class="col">
    <section class="card">
      <div class="ch"><h2>Vaqt jamg'armasi · ${yil}</h2><button class="link" data-act="jmEdit">${ic("plus")}Qo'shish</button></div>
      ${jm ? `<div class="rows">${jm}</div>` : `<div class="empty" style="padding-top:14px"><div class="art">${ic("piggy-bank")}</div><p>Yillik katta maqsad qo'ying — masalan, «Kitob o'qishga 200 soat». Ilova sur'atingizni kuzatib boradi.</p><button class="link" data-act="jmEdit">Maqsad qo'shish</button></div>`}
    </section>
    <section class="card"><div class="ch"><h2>Nishonlar</h2><span class="hint num">${S.nishonBer.filter(x => NISHON.some(n => n.id === x)).length} / ${NISHON.length}</span></div><div class="badges">${nishon}</div></section>
  </div><div class="col">
    <div class="sec"><h2>Ketma-ketlik</h2><span class="hint">to'liq kunlar bo'yicha</span></div>
    <div class="tiles">${zanjir}</div>
  </div></div>`;
}
function rejaQarzHTML(){
  const q = uyquQarz(), io = ishOrtiq(), tq = tangaQarz(), full = kunlar().filter(toliqKunmi).length, kecha = S.byudjet.uyqu > 0 ? Math.abs(q) / S.byudjet.uyqu : 0;
  if(!full) return `<section class="card"><div class="empty"><div class="art">${ic("landmark")}</div><p>Qarzlar to'liq yozilgan kunlar (1380 tangadan ko'p) bo'yicha hisoblanadi. Birinchi kunni oxirigacha yozing — shu yerda uyqu va behuda vaqt qarzi ko'rinadi.</p></div></section>`;
  return `<section class="card"><div class="duo big">
      <div><small>${q >= 0 ? "Uyqu qarzi" : "Uyqu zaxirasi"}</small><b class="num ${q > 0 ? "bad" : "ok"}-t">${q < 0 ? "+" : ""}${soat(Math.abs(q))}</b></div>
      <div><small>Tanga qarzi</small><b class="num ${tq.bal === 0 ? "ok" : tq.bal <= 60 ? "warn" : "bad"}-t">${tanga(tq.bal)}</b></div></div></section>
  <div class="cols" style="margin-top:14px"><div class="col">
    <section class="card insight"><span class="tile-ic g-uyqu">${ic("bed")}</span><div><h3>${q > 0 ? "Uyqu yetishmayapti" : q < 0 ? "Uyqu zaxirada" : "Uyqu reja bilan teng"}</h3>
      <p>${q > 0 ? `${full} ta to'liq kun bo'yicha <b>${soat(q)}</b> uyqu yetishmagan — bu taxminan <b class="num">${kecha.toFixed(1)}</b> kechalik to'liq uyqu. Har kuni ${soat(S.byudjet.uyqu)} rejasiga yetsangiz, qarz o'smaydi.`
        : q < 0 ? `Rejadan jami <b>${soat(-q)}</b> ortiq uxlagansiz. Muvozanat saqlanmoqda.` : `Uyqu rejasi (${soat(S.byudjet.uyqu)}) aniq bajarilmoqda.`}${io > 0 ? ` Bundan tashqari ishga rejadan jami <b>${soat(io)}</b> ortiq vaqt ketgan.` : ""}</p></div></section>
  </div><div class="col">
    <section class="card insight"><span class="tile-ic g-behuda">${ic("hourglass")}</span><div><h3>${tq.bal === 0 ? "Behuda vaqt qarzi yo'q" : tq.bal <= 60 ? "Ozgina qarz — bugun yopsa bo'ladi" : "Behuda vaqt yig'ilib qolgan"}</h3>
      <p>Kunlik behuda limiti <b class="num">${tanga(tq.lim)}</b> tanga. Limitdan oshgan vaqt qarz bo'ladi, limitdan kam sarflangan kunlar uni to'laydi. Jami yig'ilgan <b class="num">${tanga(tq.yigildi)}</b>, to'langan <b class="num">${tanga(tq.tolandi)}</b>.</p>
      <button class="link" data-act="budEdit" data-g="behuda">Limitni o'zgartirish${ic("chevron-right")}</button></div></section>
  </div></div>`;
}
Screens.reja = { render(el){
  el.innerHTML = `<header class="ph"><h1>Reja<span class="sub">Byudjet, maqsadlar va qarzlar</span></h1></header>
    <div class="seg" style="margin-bottom:14px">${[["byudjet","Byudjet"],["maqsad","Maqsadlar"],["qarz","Qarzlar"]].map(x => `<button class="${rejaTab === x[0] ? "on" : ""}" data-act="rTab" data-t="${x[0]}">${x[1]}</button>`).join("")}</div>
    ${rejaTab === "maqsad" ? rejaMaqsadHTML() : rejaTab === "qarz" ? rejaQarzHTML() : rejaByudjetHTML()}`;
}};
A.rTab = el => { rejaTab = el.dataset.t; vibra(8); render(); };

// Bitta yo'nalishning kunlik rejasini o'zgartirish
A.budEdit = el => {
  const g = el.dataset.g; let v = S.byudjet[g] || 0;
  const boshqa = GURUH_TARTIB.reduce((a, x) => a + (x === g ? 0 : (S.byudjet[x] || 0)), 0);
  const o = openSheet({title: GURUH[g].nom, sub: g === "behuda" ? "Kunlik behuda vaqt limiti" : "Kunlik reja, tanga (daqiqa)",
    body: `<div class="amt"><button type="button" class="amt-b" data-d="-15" aria-label="15 tanga kamaytirish">${ic("minus")}</button>
        <label class="amt-c"><input id="bAmt" class="num" type="text" inputmode="numeric" maxlength="4" placeholder="0" value="${v || ""}" aria-label="Kunlik reja, tanga" autocomplete="off"><span>tanga</span></label>
        <button type="button" class="amt-b" data-d="15" aria-label="15 tanga qo'shish">${ic("plus")}</button></div>
      <div class="amt-s" id="bS"></div>
      <div class="chips" style="justify-content:center">${[0, 30, 60, 90, 120, 240, 420, 480, 540].map(n => `<button type="button" class="chip sm num" data-q="${n}">${n < 60 ? n : soat(n)}</button>`).join("")}</div>`,
    foot: `<button class="btn blue" id="bSave">Saqlash</button>`});
  const inp = $("#bAmt", o.el), s = $("#bS", o.el);
  const yoz = () => { amtEn(inp); const jami = boshqa + v; s.textContent = `${soatUzun(v)} · reja jami ${tanga(jami)} / ${tanga(KUNLIK)}`; s.classList.toggle("warn", jami > KUNLIK); if(kirilmi()) cyrPass(s); };
  const set = n => { v = clamp(Math.round(n) || 0, 0, KUNLIK); inp.value = v ? String(v) : ""; yoz(); };
  yoz();
  inp.addEventListener("input", () => { v = clamp(parseInt(inp.value.replace(/\D/g, ""), 10) || 0, 0, KUNLIK); yoz(); });
  const saqla = () => { S.byudjet[g] = v; cfgTouch("byudjet"); ovClose(o); toast(`${ic("check")}<span>${GURUH[g].nom}: kuniga <b>${tanga(v)} tanga</b></span>`); };
  inp.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); saqla(); } });
  o.el.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.d) set(Math.max(0, v + (+b.dataset.d))); else if(b.dataset.q) set(+b.dataset.q); else if(b.id === "bSave") saqla(); });
};
// Kun rejasi
A.kunRejaEdit = () => {
  const t = tanlangan || bugunISO(), plan = {...(S.rejaKun[t] || {})};
  const o = openSheet({title: "Kun rejasi", sub: sanaToliq(t),
    body: `<div class="kr-grid">${GURUH_TARTIB.map(g => `<label class="field g-${g}"><span><i class="gdot"></i> ${GURUH[g].nom}</span><input type="text" inputmode="numeric" maxlength="4" data-g="${g}" value="${plan[g] || ""}" placeholder="0" autocomplete="off"></label>`).join("")}</div>
      <div class="amt-s" id="krS" style="margin-top:14px"></div>
      <button type="button" class="link" id="krByud">${ic("copy")}Kunlik byudjetdan to'ldirish</button>`,
    foot: `<button class="btn blue" id="krSave">Rejani saqlash</button>`});
  const s = $("#krS", o.el);
  const oqi = () => { const out = {}; $$("input[data-g]", o.el).forEach(i => { const n = parseInt(i.value.replace(/\D/g, ""), 10); if(n > 0) out[i.dataset.g] = Math.min(n, KUNLIK); }); return out; };
  const yoz = () => { const j = Object.values(oqi()).reduce((a, b) => a + b, 0); s.textContent = `Reja jami ${tanga(j)} / ${tanga(KUNLIK)} tanga`; s.classList.toggle("warn", j > KUNLIK); if(kirilmi()) cyrPass(s); };
  yoz(); o.el.addEventListener("input", yoz);
  o.el.addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return;
    if(b.id === "krByud"){ $$("input[data-g]", o.el).forEach(i => { i.value = S.byudjet[i.dataset.g] || ""; }); yoz(); }
    else if(b.id === "krSave"){ rejaKunSet(t, oqi()); ovClose(o); toast(`${ic("check")}<span>Kun rejasi saqlandi</span>`); } });
};
A.kunRejaDel = () => { rejaKunSet(tanlangan || bugunISO(), null); toast("Kun rejasi o'chirildi"); };
A.kunRejaNusxa = () => { const t = tanlangan || bugunISO(), kk = Object.keys(S.rejaKun).filter(d => d < t).sort(); if(!kk.length){ toast("Oldingi reja topilmadi"); return; } rejaKunSet(t, {...S.rejaKun[kk[kk.length - 1]]}); toast(`${ic("copy")}<span>Reja nusxalandi</span>`); };
// Vaqt jamg'armasi (yillik maqsad)
A.jmEdit = el => {
  const eski = el && el.dataset.id ? S.jamgarma.find(j => j.id === el.dataset.id) : null;
  const st = {guruh: eski ? eski.guruh : "rivoj"};
  const gB = () => `<button type="button" class="katrow g-${st.guruh}" id="jG"><span class="tile-ic sm">${ic(GURUH[st.guruh].icon)}</span><span class="row-main"><small>Yo'nalish</small><b>${GURUH[st.guruh].nom}</b></span>${ic("chevron-right", "chev")}</button>`;
  const o = openSheet({title: eski ? "Maqsadni tahrirlash" : "Yangi maqsad", sub: `${new Date().getFullYear()}-yil uchun`,
    body: `<label class="field" style="margin-top:8px"><span>Maqsad nomi</span><input type="text" id="jNom" maxlength="60" placeholder="masalan: Kitob yili" value="${eski ? esc(eski.nom) : ""}" autocomplete="off"></label>
      <div id="jGW">${gB()}</div>
      <label class="field" style="margin-top:18px"><span>Yil davomida, soat</span><input type="text" inputmode="numeric" id="jSoat" maxlength="5" placeholder="masalan: 200" value="${eski ? eski.soat : ""}" autocomplete="off"></label>
      <p class="note" style="margin:8px 6px 0">Tanlangan yo'nalishdagi barcha yozuvlar shu maqsadga hisoblanadi.</p>`,
    foot: `${eski ? `<button class="btn danger" id="jDel" style="flex:0 0 auto" aria-label="O'chirish">${ic("trash-2")}</button>` : ""}<button class="btn blue" id="jSave">${eski ? "Saqlash" : "Maqsad qo'shish"}</button>`});
  o.el.addEventListener("click", async e => { const b = e.target.closest("button"); if(!b) return;
    if(b.id === "jG"){ const g = await pickOption({title: "Yo'nalish", value: st.guruh, options: GURUH_TARTIB.map(x => ({value: x, label: GURUH[x].nom, icon: GURUH[x].icon, g: x}))}); if(g){ st.guruh = g; $("#jGW", o.el).innerHTML = gB(); cyrPass($("#jGW", o.el)); } }
    else if(b.id === "jSave"){
      const nom = $("#jNom", o.el).value.trim(), soatN = parseInt($("#jSoat", o.el).value.replace(/\D/g, ""), 10);
      if(!nom || !(soatN > 0)){ toast("Nom va yillik soatni kiriting"); return; }
      if(eski){ eski.nom = nom; eski.guruh = st.guruh; eski.soat = soatN; } else S.jamgarma.push({id: uid(), nom, guruh: st.guruh, soat: soatN});
      cfgTouch("jamgarma"); ovClose(o); toast(`${ic("check")}<span>${eski ? "Maqsad yangilandi" : "Maqsad qo'shildi"}</span>`); }
    else if(b.id === "jDel"){ S.jamgarma = S.jamgarma.filter(j => j !== eski); cfgTouch("jamgarma"); ovClose(o); toast("Maqsad o'chirildi"); } });
};
// Yangi nishonlar (har o'zgarishdan keyin tekshiriladi)
let _nishonTayyor = false;
function nishonTekshir(){
  const st = nishonStat(), yangi = NISHON.filter(n => n.f(st) && !S.nishonBer.includes(n.id));
  if(yangi.length){
    for(const n of yangi) S.nishonBer.push(n.id);
    cfgTouch("nishonBer", true);
    if(_nishonTayyor) yangi.forEach((n, i) => setTimeout(() => { toast(`${ic("award")}<span>Yangi nishon: <b>${n.nom}</b> — ${n.t}</span>`, {ms: 4200}); fxCoins(); }, 400 + i * 2400));
  }
  _nishonTayyor = true;
}
