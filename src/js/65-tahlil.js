
// ---------------------------- TAHLIL ----------------------------
let tahlilDavr = "30";
let heatYil = new Date().getFullYear();
const charts = {};
const jadvalOchiq = new Set();
function chartYoq(k){ if(charts[k]){ try{ charts[k].destroy(); }catch(e){} charts[k] = null; } }
function chartSozla(){
  try{
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 11.5; Chart.defaults.font.weight = 600;
    Chart.defaults.color = cssv("--c-axis");
    Chart.defaults.animation = (MOBIL || reduceMotion) ? false : {duration: 420};
    Chart.defaults.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = "#12162f"; tt.titleColor = "#fff"; tt.bodyColor = "#dfe3f5"; tt.footerColor = "#9fb4ff"; tt.borderColor = "rgba(255,255,255,.14)"; tt.borderWidth = 1;
    tt.padding = 11; tt.cornerRadius = 14; tt.boxPadding = 5; tt.usePointStyle = true; tt.titleFont = {weight: 800, size: 12.5}; tt.bodyFont = {weight: 600, size: 12}; tt.footerFont = {weight: 800, size: 12};
  }catch(e){}
}
// Chiziqli grafikda ko'rsatkich ustidagi tik chiziq
const crosshair = { id: "vbCross", afterDatasetsDraw(ch){
  const a = ch.tooltip && ch.tooltip.getActiveElements ? ch.tooltip.getActiveElements() : []; if(!a.length) return;
  const x = a[0].element.x, ar = ch.chartArea, c = ch.ctx; c.save(); c.beginPath(); c.moveTo(x, ar.top); c.lineTo(x, ar.bottom); c.lineWidth = 1; c.strokeStyle = cssv("--tx-3"); c.stroke(); c.restore(); } };

// Davrni grafik uchun bo'laklarga ajratish: kun / hafta / oy (uzun davrda ustunlar siqilib ketmasligi uchun)
function bolaklar(days){
  if(days.length <= 40) return {tur: "kun", list: days.map(d => ({k: d, yorliq: sanaQisqa(d), days: [d]}))};
  const guruhla = (kf, yf) => { const m = new Map(); for(const d of days){ const k = kf(d); if(!m.has(k)) m.set(k, {k, yorliq: yf(k), days: []}); m.get(k).days.push(d); } return Array.from(m.values()); };
  const haft = guruhla(isoHafta, k => k.split("-H")[1] + "-h");
  if(haft.length <= 40) return {tur: "hafta", list: haft};
  return {tur: "oy", list: guruhla(oyKey, oyChip)};
}
function bolakOrt(b, g){ let s = 0; for(const d of b.days) s += kunGuruh(d)[g]; return s / b.days.length; }
function jadvalHTML(head, rows){
  return `<div class="tbl-w"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td class="num">${c}</td>` : `<th>${c}</th>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function chartKarta(id, sarlavha, izoh, legend, jadval){
  const j = jadvalOchiq.has(id);
  return `<section class="card chart${j ? " jadval" : ""}" id="ck-${id}">
    <div class="ch"><div><h2>${sarlavha}</h2><span class="hint">${izoh}</span></div>
      <button class="ibtn plain" data-act="chJadval" data-id="${id}" aria-label="Jadval ko'rinishi" aria-pressed="${j}">${ic(j ? "chart-column" : "table")}</button></div>
    ${legend ? `<div class="lgd">${legend}</div>` : ""}
    <div class="chartbox"><canvas id="ch-${id}" role="img" aria-label="${esc(sarlavha)}"></canvas></div>
    ${jadval}
  </section>`;
}
A.chJadval = el => { const id = el.dataset.id; if(jadvalOchiq.has(id)) jadvalOchiq.delete(id); else jadvalOchiq.add(id); render(); };
const lgdHTML = gs => gs.map(g => `<span class="g-${g[0]}"><i class="gdot"></i>${g[1]}</span>`).join("");

Screens.tahlil = { render(el){
  for(const k in charts) chartYoq(k);
  const days = davrKunlar(tahlilDavr), st = statHisob(days), som = S.sozlama.som || 0;
  const strip = `<div class="strip" id="tDavr">${[["7","7 kun"],["30","30 kun"],["yil",String(new Date().getFullYear())],["hammasi","Hammasi"]].map(x => `<button class="sp${tahlilDavr === x[0] ? " on" : ""}" data-act="tDavr" data-d="${x[0]}">${x[1]}</button>`).join("")}</div>`;
  const bosh = `<header class="ph"><h1>Tahlil<span class="sub">${days.length ? `${davrNomi(tahlilDavr)} · ${days.length} kun yozilgan, ${st.full.length} tasi to'liq` : davrNomi(tahlilDavr)}</span></h1></header>${strip}`;
  if(!days.length){
    el.innerHTML = bosh + `<section class="card" style="margin-top:14px"><div class="empty"><div class="art">${ic("chart-column")}</div><p>${kunlar().length ? "Bu davrda yozuv yo'q. Boshqa davrni tanlang." : "Tahlil uchun ma'lumot kerak. Bir necha kun yozib boring — vaqtingiz qayerga ketayotgani shu yerda ko'rinadi."}</p>${kunlar().length ? `<button class="link" data-act="tDavr" data-d="hammasi">Butun davrni ko'rish</button>` : `<button class="link" data-act="entryNew">Yozuv qo'shish</button>`}</div></section>`;
    return;
  }
  // --- Asosiy ko'rsatkichlar ---
  const u = st.ort("uyqu"), i = st.ort("ish"), bPct = foiz(st.behuda, st.jami), fPct = foiz(st.foydali, st.jami);
  const uS = !st.full.length ? "mute" : (u >= 420 && u <= 540 ? "ok" : (u < 360 || u > 600 ? "bad" : "warn"));
  const iS = !st.full.length ? "mute" : (i <= 600 ? "ok" : (i > 720 ? "bad" : "warn"));
  const bS = bPct <= 3 ? "ok" : (bPct >= 8 ? "bad" : "warn"), fS = fPct >= 45 ? "ok" : (fPct < 30 ? "bad" : "warn");
  const holat = {ok: "me'yorda", warn: "e'tibor bering", bad: "me'yordan chetda", mute: "to'liq kun yo'q"};
  const kpi = (g, icon, nom, qiymat, birlik, sev, izoh) => `<div class="card tile kpi"><div class="tile-h"><span class="tile-ic sm g-${g}">${ic(icon)}</span><span>${nom}</span></div>
    <div class="tile-v"><b class="num">${qiymat}</b>${birlik ? `<span>${birlik}</span>` : ""}</div><small>${izoh}</small><span class="pill ${sev}">${ic(sev === "ok" ? "circle-check" : sev === "mute" ? "info" : "circle-alert")}${holat[sev]}</span></div>`;
  const kpis = `<div class="kpis">
    ${kpi("uyqu", "moon", "Uyqu", st.full.length ? soat(u) : "—", "", uS, "to'liq kunlarda kunlik o'rtacha")}
    ${kpi("ish", "briefcase", "Ish", st.full.length ? soat(i) : "—", "", iS, "to'liq kunlarda kunlik o'rtacha")}
    ${kpi("behuda", "hourglass", "Behuda", tanga(st.behuda), "tanga", bS, som > 0 && st.behuda ? somF(st.behuda * som) : `yozilgan vaqtning ${bPct}%`)}
    ${kpi("rivoj", "zap", "Foydali", fPct + "%", "", fS, `${soat(st.foydali)} ish, rivojlanish va sog'liqqa`)}
  </div>`;
  // --- Vaqt qayerga ketdi (tartiblangan tasmalar) ---
  const gs = GURUH_TARTIB.filter(g => st.g[g] > 0).sort((a, b) => st.g[b] - st.g[a]), gMax = st.g[gs[0]] || 1;
  const qayerga = `<section class="card"><div class="ch"><div><h2>Vaqt qayerga ketdi</h2><span class="hint">yo'nalishlar bo'yicha jami · ${soat(st.jami)}</span></div></div>
    <div class="rank">${gs.map(g => `<div class="rank-r g-${g}"><span class="rank-n"><i class="gdot"></i>${GURUH[g].nom}</span><b class="num">${soat(st.g[g])}</b><small class="num">${foiz(st.g[g], st.jami)}%</small><span class="rank-b"><i style="width:${Math.max(st.g[g] / gMax * 100, 1.5)}%"></i></span></div>`).join("")}</div></section>`;
  // --- Grafiklar uchun bo'laklar ---
  const bl = bolaklar(days), turNom = bl.tur === "kun" ? "kunma-kun" : bl.tur === "hafta" ? "haftalar bo'yicha, kunlik o'rtacha" : "oylar bo'yicha, kunlik o'rtacha";
  const faolG = GURUH_TARTIB.filter(g => st.g[g] > 0);
  const taqsJ = jadvalHTML(["Davr"].concat(faolG.map(g => GURUH[g].nom)), bl.list.map(b => [b.yorliq].concat(faolG.map(g => soat(bolakOrt(b, g))))));
  const dinJ = jadvalHTML(["Davr", "Uyqu", "Ish", "Behuda"], bl.list.map(b => [b.yorliq, soat(bolakOrt(b, "uyqu")), soat(bolakOrt(b, "ish")), soat(bolakOrt(b, "behuda"))]));
  // --- Hafta kunlari ---
  const wd = haftaKunStat(days), WD = ["Du","Se","Cho","Pa","Ju","Sha","Ya"], WDF = ["dushanba","seshanba","chorshanba","payshanba","juma","shanba","yakshanba"];
  const bor = [0, 1, 2, 3, 4, 5, 6].filter(k => wd[k]);
  let topilma = [];
  if(bor.length){
    const fd = st.full;
    if(fd.length >= 14){
      const sl = fd.map(d => kunGuruh(d).uyqu), wk = fd.map(d => kunGuruh(d).ish), wb = fd.map(d => kunGuruh(d).behuda);
      const r1 = pearson(sl, wk); if(r1 !== null && Math.abs(r1) >= .4) topilma.push(`Ko'p ishlagan kunlari <b>${r1 < 0 ? "kamroq" : "ko'proq"}</b> uxlagansiz (r = ${r1.toFixed(2)}).`);
      const r2 = pearson(sl, wb); if(r2 !== null && Math.abs(r2) >= .4) topilma.push(`Kam uxlagan kunlari behuda vaqt <b>${r2 < 0 ? "ko'paygan" : "kamaygan"}</b> (r = ${r2.toFixed(2)}).`);
    } else topilma.push(`Bog'liqliklarni ishonchli hisoblash uchun kamida 14 to'liq kun kerak (hozir ${fd.length} ta).`);
    let bi = bor[0], si = bor[0]; for(const k of bor){ if(wd[k].ish / wd[k].n > wd[bi].ish / wd[bi].n) bi = k; if(wd[k].uyqu / wd[k].n < wd[si].uyqu / wd[si].n) si = k; }
    topilma.push(`Eng ko'p ish <b>${WDF[bi]}</b> kuniga to'g'ri keladi — o'rtacha <b>${soat(wd[bi].ish / wd[bi].n)}</b>.`);
    topilma.push(`Eng kam uyqu <b>${WDF[si]}</b> kuni — o'rtacha <b>${soat(wd[si].uyqu / wd[si].n)}</b>.`);
  }
  const wdJ = jadvalHTML(["Kun", "Uyqu", "Ish", "Behuda"], bor.map(k => [WDF[k], soat(wd[k].uyqu / wd[k].n), soat(wd[k].ish / wd[k].n), soat(wd[k].behuda / wd[k].n)]));
  const wdKarta = bor.length ? chartKarta("wd", "Hafta kunlari", "to'liq kunlarda o'rtacha, soat", lgdHTML([["uyqu","Uyqu"],["ish","Ish"],["behuda","Behuda"]]), wdJ).replace("</section>", `<div class="finds">${topilma.map(x => `<p>${x}</p>`).join("")}</div></section>`) : "";
  // --- Tavsiyalar, teglar ---
  const tv = tavsiyalar(days), teg = tegStat(days);
  const tavs = `<section class="card"><div class="ch"><h2>Tavsiyalar</h2><span class="hint">${davrNomi(tahlilDavr)} bo'yicha</span></div>
    <div class="adv">${tv.map(o => `<div class="adv-r"><span class="tile-ic sm ${o.cl === "ok" ? "ok" : o.cl === "bad" ? "bad" : o.cl === "warn" ? "warn" : "blue"}">${ic(o.icon)}</span><div><h3>${o.h}</h3><p>${o.p}</p></div></div>`).join("")}</div></section>`;
  const teglar = teg.length ? `<section class="card"><div class="ch"><h2>Teglar</h2><span class="hint">izohdagi #teg bo'yicha</span></div>
    <div class="rows">${teg.map(x => `<div class="row"><span class="tile-ic sm blue">${ic("hash")}</span><span class="row-main"><b>${esc(x[0].slice(1))}</b><small>${x[1].n} marta</small></span><span class="row-amt num">${soat(x[1].min)}</span></div>`).join("")}</div></section>` : "";
  const hisobot = `<section class="card"><div class="ch"><h2>Hisobotlar</h2></div><div class="rows">
    <button class="row" data-act="haftaSheet"><span class="tile-ic sm blue">${ic("clipboard-list")}</span><span class="row-main"><b>Haftalik hisobot</b><small>oxirgi 7 kun o'tgan hafta bilan solishtiriladi</small></span>${ic("chevron-right", "chev")}</button>
    <button class="row" data-act="wrapSheet"><span class="tile-ic sm violet">${ic("gift")}</span><span class="row-main"><b>Yil xulosasi</b><small>ulashsa bo'ladigan karta</small></span>${ic("chevron-right", "chev")}</button></div></section>`;

  el.innerHTML = bosh + kpis + `<div class="cols" style="margin-top:14px">
    <div class="col">${qayerga}
      ${chartKarta("taqs", "Kun qanday taqsimlangan", turNom + ", soat", lgdHTML(faolG.map(g => [g, GURUH[g].nom])), taqsJ)}
      ${chartKarta("din", "Uyqu, ish va behuda vaqt", turNom + ", soat", lgdHTML([["uyqu","Uyqu"],["ish","Ish"],["behuda","Behuda"]]), dinJ)}
    </div>
    <div class="col">${wdKarta}${heatKartaHTML()}${tavs}${teglar}${hisobot}</div>
  </div>`;
  const s = $("#tDavr", el), on = s && $(".sp.on", s); if(s && on) s.scrollLeft = Math.max(0, on.offsetLeft - 40);
  const hw = $("#heatW", el), bg = hw && ($(".today", hw) || $(".hm-c:last-child", hw)); if(hw && bg) hw.scrollLeft = Math.max(0, (bg.closest(".hm-c") || bg).offsetLeft - hw.clientWidth + 80);

  // --- Grafiklarni chizish ---
  if(typeof Chart === "undefined") return;
  chartSozla();
  const sirt = cssv("--card"), panj = cssv("--c-grid"), oq = cssv("--c-axis");
  const xS = {grid: {display: false}, border: {color: panj}, ticks: {color: oq, maxRotation: 0, autoSkip: true, autoSkipPadding: 10}};
  const yS = max => ({beginAtZero: true, max, grid: {color: panj}, border: {display: false}, ticks: {color: oq, callback: v => v + "s", stepSize: max === 24 ? 6 : undefined, maxTicksLimit: 6}});
  const yorliqlar = bl.list.map(b => b.yorliq);
  const cv = id => !jadvalOchiq.has(id) && $("#ch-" + id, el);
  if(cv("taqs")) charts.taqs = new Chart(cv("taqs"), {type: "bar",
    data: {labels: yorliqlar, datasets: faolG.map(g => ({label: GURUH[g].nom, data: bl.list.map(b => +(bolakOrt(b, g) / 60).toFixed(2)), backgroundColor: gRang(g), borderColor: sirt, borderWidth: 1, borderRadius: 3, borderSkipped: false, stack: "s", maxBarThickness: 22}))},
    options: {responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false},
      scales: {x: {...xS, stacked: true}, y: {...yS(24), stacked: true}},
      plugins: {legend: {display: false}, tooltip: {filter: t => t.parsed.y > 0, itemSort: (a, b) => b.parsed.y - a.parsed.y,
        callbacks: {label: c => ` ${c.dataset.label}: ${soat(c.parsed.y * 60)}`, footer: items => "Jami: " + soat(items.reduce((a, b) => a + b.parsed.y, 0) * 60)}}}}});
  const chiziq = (g, nom) => { const data = bl.list.map(b => +(bolakOrt(b, g) / 60).toFixed(2)), n = data.length - 1;
    return {label: nom, data, borderColor: gRang(g), backgroundColor: gRang(g), borderWidth: 2, cubicInterpolationMode: "monotone", pointRadius: c => c.dataIndex === n ? 4 : 0, pointHoverRadius: 5, pointBorderColor: sirt, pointBorderWidth: 2, pointHitRadius: 14}; };
  if(cv("din")) charts.din = new Chart(cv("din"), {type: "line", plugins: [crosshair],
    data: {labels: yorliqlar, datasets: [chiziq("uyqu", "Uyqu"), chiziq("ish", "Ish"), chiziq("behuda", "Behuda")]},
    options: {responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false}, layout: {padding: {right: 8, top: 6}},
      scales: {x: xS, y: yS(undefined)}, plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => ` ${c.dataset.label}: ${soat(c.parsed.y * 60)}`}}}}});
  if(bor.length && cv("wd")){
    const mk = (g, nom) => ({label: nom, data: bor.map(k => +(wd[k][g] / wd[k].n / 60).toFixed(2)), backgroundColor: gRang(g), borderColor: sirt, borderWidth: 1, borderRadius: {topLeft: 4, topRight: 4}, maxBarThickness: 16});
    charts.wd = new Chart(cv("wd"), {type: "bar", data: {labels: bor.map(k => WD[k]), datasets: [mk("uyqu", "Uyqu"), mk("ish", "Ish"), mk("behuda", "Behuda")]},
      options: {responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false}, scales: {x: xS, y: yS(undefined)},
        plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => ` ${c.dataset.label}: ${soat(c.parsed.y * 60)}`}}}}});
  }
}};
A.tDavr = el => { tahlilDavr = el.dataset.d; vibra(8); render(); };

// --- Yillik faollik xaritasi ---
function heatKartaHTML(){
  const all = kunlar(), nowY = new Date().getFullYear();
  let minY = nowY; for(const d of all){ const y = +d.slice(0, 4); if(y && y < minY) minY = y; }
  heatYil = clamp(heatYil, minY, nowY);
  const yil = heatYil, start = new Date(yil, 0, 1), end = new Date(yil, 11, 31), lead = (start.getDay() + 6) % 7, today = bugunISO();
  const cols = []; let cur = [];
  for(let k = 0; k < lead; k++) cur.push(null);
  for(const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)){
    const iso = isoOf(d), sp = kunChiqim(iso);
    cur.push({iso, sp, lvl: sp <= 0 ? 0 : sp >= 1380 ? 4 : sp >= 900 ? 3 : sp >= 400 ? 2 : 1, mo: d.getMonth()});
    if(cur.length === 7){ cols.push(cur); cur = []; }
  }
  if(cur.length) cols.push(cur);
  let last = -1;
  const oylar = cols.map(c => { const f = c.find(x => x); let l = ""; if(f && f.mo !== last){ l = OYLAR[f.mo]; last = f.mo; } return `<span>${l}</span>`; }).join("");
  const body = cols.map(c => `<div class="hm-c">${c.map(x => x ? `<i class="l${x.lvl}${x.iso === today ? " today" : ""}" data-d="${x.iso}" title="${sanaQisqa(x.iso)} — ${tanga(x.sp)} / 1440"></i>` : `<i class="void"></i>`).join("")}</div>`).join("");
  const yilK = all.filter(d => d.slice(0, 4) === String(yil));
  return `<section class="card" id="heatKarta"><div class="ch"><div><h2>Yillik xarita</h2><span class="hint">${yilK.length} kun yozilgan, ${yilK.filter(toliqKunmi).length} tasi to'liq</span></div>
      <div class="yil-nav"><button class="ibtn plain" data-act="heatYil" data-n="-1" ${yil <= minY ? "disabled" : ""} aria-label="Oldingi yil">${ic("chevron-left")}</button><b class="num">${yil}</b><button class="ibtn plain" data-act="heatYil" data-n="1" ${yil >= nowY ? "disabled" : ""} aria-label="Keyingi yil">${ic("chevron-right")}</button></div></div>
    <div class="hm-w" id="heatW"><div class="hm-m">${oylar}</div><div class="hm">${body}</div></div>
    <div class="cal-leg" style="justify-content:flex-end;margin-top:8px">Kam <i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> To'liq</div></section>`;
}
A.heatYil = el => { heatYil += +el.dataset.n; render(); };
document.addEventListener("click", e => { const c = e.target.closest && e.target.closest(".hm i[data-d]"); if(c){ tanlangan = c.dataset.d; switchTab("asosiy"); } });
