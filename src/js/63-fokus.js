
// ---------------------------- FOKUS (sekundomer va 25+5) ----------------------------
// Sekundomer holati (S.timer) bulut orqali sinxronlanadi: telefonda boshlab, kompyuterda to'xtatish mumkin.
function timerMs(){ return S.timer.baza + (S.timer.ish ? Math.max(0, nowTs() - S.timer.start) : 0); }
function timerMatn(){
  const tot = Math.floor(timerMs() / 1000), h = Math.floor(tot / 3600), m = Math.floor(tot % 3600 / 60), s = tot % 60;
  return (h > 0 ? String(h).padStart(2, "0") + ":" : "") + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function timerStart(){ if(S.timer.ish) return; S.timer.ish = true; S.timer.start = nowTs(); cfgTouch("timer"); tikBoshla(); }
function timerPause(){ if(!S.timer.ish) return; S.timer.baza = timerMs(); S.timer.ish = false; cfgTouch("timer"); }
function timerReset(){ S.timer.ish = false; S.timer.baza = 0; S.timer.start = 0; cfgTouch("timer"); }
function timerSaqla(){
  const min = Math.round(timerMs() / 60000);
  if(min < 1){ toast("Hali 1 daqiqa ham o'tmadi"); return; }
  const t = bugunISO(); if(guardYopiq(t)) return;
  const bosh = hozirDaqiqa() - min, kat = S.timer.kat;
  timerReset();
  qosh([{sana: t, kat, daqiqa: min, izoh: "Sekundomer bilan o'lchandi", vaqt: bosh >= 0 ? hhmm(bosh) : ""}], `${ic("check")}<span><b>${tanga(min)} tanga</b> sekundomerdan yozildi</span>`);
}
function timerTashqi(){ if(S.timer.ish) tikBoshla(); }

// Fokus 25+5 (shu qurilmada)
const POMO_ISH = 25 * 60, POMO_DAM = 5 * 60;
const pomo = {on: false, run: false, faza: "ish", sikl: 1, end: 0, qoldiq: POMO_ISH};
function pomoFmt(s){ s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function pomoQoldi(){ return pomo.run ? Math.max(0, (pomo.end - Date.now()) / 1000) : pomo.qoldiq; }
function pomoStart(){ if(pomo.run) return; pomo.run = true; pomo.end = Date.now() + pomo.qoldiq * 1000; tikBoshla(); render(); }
function pomoPause(){ if(!pomo.run) return; pomo.qoldiq = pomoQoldi(); pomo.run = false; render(); }
function pomoReset(){ pomo.run = false; pomo.faza = "ish"; pomo.sikl = 1; pomo.qoldiq = POMO_ISH; render(); }
function pomoTik(){
  if(!pomo.run || pomo.end - Date.now() > 0) return;
  if(pomo.faza === "ish"){
    const bosh = hozirDaqiqa() - 25;
    qosh([{sana: bugunISO(), kat: S.timer.kat, daqiqa: 25, izoh: "Fokus sessiya", vaqt: bosh >= 0 ? hhmm(bosh) : ""}]);
    toast(`${ic("check")}<span>${pomo.sikl}-sikl yakunlandi — <b>25 tanga</b> yozildi. Dam oling</span>`);
    pomo.faza = "dam"; pomo.end = Date.now() + POMO_DAM * 1000;
  } else {
    blip(); pomo.sikl++; pomo.faza = "ish"; pomo.end = Date.now() + POMO_ISH * 1000;
    toast(`${ic("play")}<span>${pomo.sikl}-sikl boshlandi — fokus</span>`);
  }
  render();
}

// Har 250 ms: faqat raqam va yoy yangilanadi (butun ekran qayta chizilmaydi)
let _tik = null;
function tikBoshla(){ if(_tik) return; _tik = setInterval(tik, 250); }
function tik(){
  if(!S.timer.ish && !pomo.run){ clearInterval(_tik); _tik = null; }
  if(pomo.on) pomoTik();
  const v = $("#fVaqt");
  if(v && curTab === "fokus") fokusJonli();
  const mt = $("#miniT"); if(mt) mt.textContent = miniVaqt();
  const ht = $("#hozirT"); if(ht) ht.textContent = timerMatn();
}
const DIAL_R = 118, DIAL_C = 2 * Math.PI * DIAL_R;
function fokusJonli(){
  const v = $("#fVaqt"), tg = $("#fTanga"), arc = $("#fArc"), dot = $("#fDot"); if(!v) return;
  let ulush;
  if(pomo.on){
    const q = pomoQoldi(), jami = pomo.faza === "ish" ? POMO_ISH : POMO_DAM;
    v.textContent = pomoFmt(q); ulush = 1 - q / jami;
    if(tg) tg.textContent = kirilmi() ? latKir(pomo.faza === "ish" ? `${pomo.sikl}-sikl · fokus` : "Dam — nafas oling") : (pomo.faza === "ish" ? `${pomo.sikl}-sikl · fokus` : "Dam — nafas oling");
  } else {
    const ms = timerMs(), min = Math.round(ms / 60000);
    v.textContent = timerMatn(); ulush = (ms % 3600000) / 3600000;
    const m = min > 0 ? `${tanga(min)} tanga to'plandi` : "hali 0 tanga";
    if(tg) tg.textContent = kirilmi() ? latKir(m) : m;
  }
  if(arc) arc.style.strokeDashoffset = String(DIAL_C * (1 - clamp(ulush, 0, 1)));
  if(dot){ const a = (clamp(ulush, 0, 1) * 360 - 90) * Math.PI / 180; dot.setAttribute("cx", (160 + DIAL_R * Math.cos(a)).toFixed(2)); dot.setAttribute("cy", (160 + DIAL_R * Math.sin(a)).toFixed(2)); }
}

Screens.fokus = { render(el){
  const yur = pomo.on ? pomo.run : S.timer.ish, g = katGuruh(S.timer.kat), t = bugunISO();
  const olchov = kunYozuv(t).filter(r => r.izoh === "Sekundomer bilan o'lchandi" || r.izoh === "Fokus sessiya" || r.izoh === "🍅 Fokus sessiya");
  const jami = olchov.reduce((a, r) => a + r.daqiqa, 0);
  const borVaqt = pomo.on ? (pomo.qoldiq !== POMO_ISH || pomo.run || pomo.sikl > 1 || pomo.faza !== "ish") : timerMs() > 0;
  el.innerHTML = `<header class="ph"><h1>Fokus<span class="sub">Vaqtni jonli o'lchang — tugagach tangaga yoziladi</span></h1></header>
  <div class="cols">
   <div class="col">
    <div class="seg"><button class="${pomo.on ? "" : "on"}" data-act="fMode" data-m="oddiy">Sekundomer</button><button class="${pomo.on ? "on" : ""}" data-act="fMode" data-m="fokus">Fokus 25 + 5</button></div>
    <section class="dial${yur ? " live" : ""}">
      <svg viewBox="0 0 320 320" class="dial-svg" aria-hidden="true">
        <defs><linearGradient id="dialG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fdcc0"/><stop offset=".55" stop-color="#3f8ee8"/><stop offset="1" stop-color="#4a4bff"/></linearGradient></defs>
        <ellipse class="orb" cx="160" cy="160" rx="156" ry="58" transform="rotate(-22 160 160)"/>
        <ellipse class="orb o2" cx="160" cy="160" rx="156" ry="74" transform="rotate(26 160 160)"/>
        <circle class="star" cx="38" cy="96" r="3"/><circle class="star s2" cx="286" cy="78" r="2.4"/><circle class="star s3" cx="262" cy="262" r="3"/><circle class="star s2" cx="58" cy="246" r="2"/>
        <circle class="dial-track" cx="160" cy="160" r="${DIAL_R}"/>
        <circle class="dial-arc" id="fArc" cx="160" cy="160" r="${DIAL_R}" stroke="url(#dialG)" stroke-dasharray="${DIAL_C.toFixed(2)}" stroke-dashoffset="${DIAL_C.toFixed(2)}" transform="rotate(-90 160 160)"/>
        <circle class="dial-dot" id="fDot" cx="160" cy="${160 - DIAL_R}" r="8"/>
      </svg>
      <div class="dial-c"><small>${pomo.on ? "Fokus 25 + 5" : (yur ? "O'lchanmoqda" : "Sekundomer")}</small><b class="num" id="fVaqt">00:00</b><span id="fTanga"></span></div>
    </section>
    <button class="katrow g-${g}" data-act="fKat" style="margin-top:0"><span class="tile-ic">${ic(katIcon(S.timer.kat))}</span>
      <span class="row-main"><small>Nima qilyapsiz?</small><b>${esc(katNom(S.timer.kat))}</b></span><span class="pill mute">${GURUH[g].nom}</span>${ic("chevron-right", "chev")}</button>
    <div class="f-ctl">
      <button class="f-side" data-act="fReset" ${borVaqt ? "" : "disabled"} aria-label="Tozalash">${ic("rotate-ccw")}<span>Tozalash</span></button>
      <button class="f-main${yur ? " on" : ""}" data-act="fToggle" aria-label="${yur ? "To'xtatish" : "Boshlash"}">${ic(yur ? "pause" : "play")}</button>
      ${pomo.on ? `<span class="f-side ghost" aria-hidden="true"></span>` : `<button class="f-side ok" data-act="fSave" ${timerMs() >= 30000 ? "" : "disabled"} aria-label="Tangaga yozish">${ic("check")}<span>Yozish</span></button>`}
    </div>
    <p class="note" style="text-align:center">${pomo.on ? "25 daqiqa fokus tugagach 25 tanga o'zi yoziladi, keyin 5 daqiqa dam." : (Sync.token ? "Sekundomer qurilmalaringiz orasida jonli: telefonda boshlab, kompyuterda to'xtatsangiz bo'ladi." : "«Yozish» bosilganda o'tgan vaqt bugungi kunga tanga bo'lib tushadi.")}</p>
   </div>
   <div class="col">
    <section class="card">
      <div class="ch"><h2>Bugun o'lchanganlar</h2><span class="hint num">${olchov.length ? `${olchov.length} ta · ${soat(jami)}` : ""}</span></div>
      ${olchov.length ? `<div class="rows">${kunTartib(olchov).map(yozuvRow).join("")}</div>`
        : `<div class="empty"><div class="art">${ic("timer")}</div><p>Bugun hali sekundomer bilan o'lchanmagan. Ishni boshlashdan oldin ▶ ni bosing.</p></div>`}
    </section>
   </div>
  </div>`;
  fokusJonli();
  if(yur) tikBoshla();
}};
A.fMode = el => {
  const fokus = el.dataset.m === "fokus"; if(pomo.on === fokus) return;
  if(fokus){ if(S.timer.ish) timerPause(); pomo.on = true; pomo.run = false; pomo.faza = "ish"; pomo.sikl = 1; pomo.qoldiq = POMO_ISH; }
  else { pomo.on = false; pomo.run = false; }
  vibra(8); render();
};
A.fToggle = () => { vibra(14); if(pomo.on){ if(pomo.run) pomoPause(); else pomoStart(); } else { if(S.timer.ish) timerPause(); else timerStart(); } };
A.fReset = async () => {
  if(pomo.on){ pomoReset(); return; }
  if(timerMs() >= 60000 && !(await confirmDlg({icon: "rotate-ccw", title: "Sekundomer tozalansinmi?", text: `${timerMatn()} o'lchangan vaqt yozilmasdan o'chadi.`, ok: "Tozalash", danger: true}))) return;
  timerReset();
};
A.fSave = () => timerSaqla();
A.fKat = async () => { const k = await pickKat(S.timer.kat); if(k){ S.timer.kat = k; cfgTouch("timer"); } };
