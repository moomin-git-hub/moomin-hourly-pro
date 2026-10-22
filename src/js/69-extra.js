
// ---------------------------- QO'SHIMCHA: eslatma, hisobotlar, havolalar ----------------------------
// Kunlik eslatma (ilova ochiq turganda)
let _remT = null;
function eslatmaQur(){
  if(_remT){ clearTimeout(_remT); _remT = null; }
  if(!S.sozlama.eslatma) return;
  const m = hmToMin(S.sozlama.vaqt); if(m == null) return;
  const now = new Date(), tgt = new Date(); tgt.setHours(Math.floor(m / 60), m % 60, 0, 0);
  if(tgt <= now) tgt.setDate(tgt.getDate() + 1);
  _remT = setTimeout(() => {
    const t = bugunISO(), sp = kunChiqim(t);
    if(sp < 1380){
      const q = Math.max(KUNLIK - sp, 0);
      try{ if(typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Vaqt Banki", {body: `Bugun ${tanga(q)} tanga (${soat(q)}) hali yozilmagan. Kuningizni yakunlang.`}); }catch(e){}
      toast(`${ic("bell-ring")}<span>Eslatma: bugun <b>${tanga(q)} tanga</b> hali yozilmagan</span>`, {ms: 6000});
    }
    eslatmaQur();
  }, Math.min(tgt - now, 2147000000));
}
// Havola orqali amallar: ?a=yoz, ?a=timer, ?text=… (ulashilgan matn AI ga boradi)
function urlAmallar(){
  try{
    if($("#app").hidden) return;
    const p = new URLSearchParams(location.search), a = p.get("a"), txt = p.get("text") || p.get("title") || "";
    if(a === "yoz") A.entryNew();
    else if(a === "timer") switchTab("fokus");
    if(txt) A.aiOpen(null, null, "Quyidagi matndan yozuvlar yasab qo'sh:\n" + txt);
    if(a || txt) history.replaceState(history.state, "", location.pathname);
  }catch(e){}
}

// Haftalik hisobot: 7 kunlik tasma, yo'nalishlar va o'tgan hafta bilan farq
A.haftaSheet = () => {
  const {A: h, B: o} = haftaHisob();
  const YON = {rivoj: 1, soglik: 1, behuda: -1};          // +1: ko'paygani yaxshi, -1: kamaygani yaxshi, 0: betaraf
  const farq = (a, b, yon) => {
    const d = a - b;
    if(Math.abs(d) < 5) return `<span class="pill mute">o'zgarishsiz</span>`;
    const cl = !yon ? "mute" : (d > 0) === (yon > 0) ? "ok" : "bad";
    return `<span class="pill ${cl} num">${ic(d > 0 ? "arrow-up" : "arrow-down")}${soat(Math.abs(d))}</span>`;
  };
  const kunlar7 = h.days.map(d => { const dd = dOf(d), sp = kunChiqim(d);
    return `<button class="hk-r" data-act="hkKun" data-d="${d}" aria-label="${sanaToliq(d)} — ${sp} tanga"><span class="hk-d"><b>${HK_QISQA[dd.getDay()]}</b><small class="num">${dd.getDate()}</small></span>${stackbarHTML(kunGuruh(d), KUNLIK, "sm")}<span class="hk-v num">${sp ? tanga(sp) : "—"}</span></button>`; }).join("");
  const guruhlar = GURUH_TARTIB.filter(g => h.g[g] > 0 || o.g[g] > 0).sort((a, b) => h.g[b] - h.g[a]).map(g =>
    `<div class="row g-${g}"><span class="tile-ic sm">${ic(GURUH[g].icon)}</span><span class="row-main"><b>${GURUH[g].nom}</b><small>${o.n ? "o'tgan hafta " + soat(o.g[g]) : "o'tgan hafta yozilmagan"}</small></span>
      <span class="row-amt num">${soat(h.g[g])}<small>${o.n ? farq(h.g[g], o.g[g], YON[g] || 0) : ""}</small></span></div>`).join("");
  const df = h.ch - o.ch, som = S.sozlama.som || 0;
  openSheet({title: "Haftalik hisobot", sub: `${sanaQisqa(h.days[0])} – ${sanaQisqa(h.days[6])}`,
    body: h.n ? `<div class="duo"><div><small>Yozilgan</small><b class="num">${tanga(Math.round(h.ch / 60))}</b><span>soat</span></div><div><small>To'liq kunlar</small><b class="num">${h.full}</b><span>/ 7</span></div></div>
        <p class="note" style="margin:10px 2px 0">${o.n ? (Math.abs(df) < 30 ? "O'tgan hafta bilan deyarli bir xil yozilgan." : `O'tgan haftadan <b>${soat(Math.abs(df))}</b> ${df > 0 ? "ko'p" : "kam"} yozilgan.`) : "O'tgan hafta yozilmagan — solishtirish keyingi haftadan boshlanadi."}${h.g.behuda > 0 && som > 0 ? ` Behuda vaqt <b class="num">${somF(h.g.behuda * som)}</b>ga teng.` : ""}</p>
        <div class="sub-h">Kunma-kun</div><div class="hk">${kunlar7}</div>
        <div class="sub-h">Yo'nalishlar</div><div class="rows">${guruhlar}</div>`
      : `<div class="empty"><div class="art">${ic("clipboard-list")}</div><p>Oxirgi 7 kunda yozuv yo'q. Bir necha kun yozib boring — hafta yakuni shu yerda chiqadi.</p></div>`,
    foot: h.n ? `<button class="btn ghost" data-act="hfNusxa">${ic("copy")}Nusxalash</button><button class="btn blue" data-act="hfAi">${ic("sparkles")}AI tahlil qilsin</button>` : ""});
};
A.hkKun = el => { ovCloseAll(); tanlangan = el.dataset.d; switchTab("asosiy"); };
A.hfNusxa = async () => { toast((await nusxala(haftaText())) ? `${ic("copy")}<span>Hisobot matni nusxalandi</span>` : "Nusxalab bo'lmadi — matnni qo'lda belgilab oling"); };
A.hfAi = el => { ovClose(ovOf(el)); setTimeout(() => { A.aiOpen(); aiYubor("Mana haftalik hisobotim, tahlil qilib 3 ta aniq maslahat ber:\n" + haftaText()); }, 240); };

// Yil xulosasi
function wrapQatorlar(s){
  return [[String(s.dd.length), "kun yozilgan"], [String(s.full.length), "to'liq kun"], [tanga(Math.round(s.ch / 60)), "soat hisobga olindi"],
    [String(s.streak), "eng uzun zanjir, kun"], [s.topG ? GURUH[s.topG].nom : "—", "yilning yo'nalishi"], [s.bestOy ? OY_TOLIQ[+s.bestOy[0] - 1] : "—", "eng samarali oy"]];
}
A.wrapSheet = () => {
  const yil = heatYil, s = wrapStats(yil);
  openSheet({title: `${yil} — yil xulosasi`, sub: "Ulashsa bo'ladigan karta",
    body: s.dd.length ? `<div class="yilk"><div class="yilk-h">${LOGO_SVG.replace(/lgA/g, "lgW")}<div><b>Vaqt Banki</b><small>${yil}-yil xulosasi</small></div></div>
        <div class="yilk-g">${wrapQatorlar(s).map(x => `<div><b class="num${/^[\d\s]+$/.test(x[0]) ? "" : " matn"}">${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div>
        <p>Behuda jami ${soat(s.g.behuda)}${S.sozlama.som > 0 && s.g.behuda > 0 ? ` (${somF(s.g.behuda * S.sozlama.som)})` : ""}. Har bir daqiqa — bir tanga.</p></div>`
      : `<div class="empty"><div class="art">${ic("gift")}</div><p>${yil}-yilda hali yozuv yo'q. Yil davomida yozib boring — oxirida chiroyli xulosa chiqadi.</p></div>`,
    foot: s.dd.length ? `<button class="btn ghost" data-act="wrapUlash">${ic("share-2")}Ulashish</button><button class="btn blue" data-act="wrapPng">${ic("image")}Rasm yuklab olish</button>` : ""});
};
A.wrapUlash = async () => {
  const yil = heatYil, s = wrapStats(yil);
  const txt = `${yil} — Vaqt Banki xulosam:\n${s.dd.length} kun yozdim, ${s.full.length} to'liq kun, ${Math.round(s.ch / 60)} soat hisobga olindi, eng uzun zanjir ${s.streak} kun.`;
  if(navigator.share){ try{ await navigator.share({text: txt}); return; }catch(e){ if(e && e.name === "AbortError") return; } }   // foydalanuvchi o'zi yopsa — hech narsa qilinmaydi
  toast((await nusxala(txt)) ? `${ic("copy")}<span>Matn nusxalandi — xohlagan joyga qo'ying</span>` : "Ulashib bo'lmadi");
};
A.wrapPng = () => {
  const yil = heatYil, s = wrapStats(yil), c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const x = c.getContext("2d"), F = "'Plus Jakarta Sans', system-ui, sans-serif";
  x.fillStyle = "#04051a"; x.fillRect(0, 0, 1080, 1350);
  const blob = (cx, cy, r, rang) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rang); g.addColorStop(1, "rgba(4,5,26,0)"); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350); };
  blob(160, 80, 760, "rgba(44,68,216,.85)"); blob(1020, 40, 620, "rgba(26,141,153,.6)"); blob(900, 1340, 560, "rgba(74,75,255,.35)");
  x.strokeStyle = "rgba(255,255,255,.10)"; x.lineWidth = 2;
  for(const k of [0, 1]){ x.save(); x.translate(820, 300); x.rotate(k ? .5 : -.4); x.beginPath(); x.ellipse(0, 0, 330, k ? 150 : 120, 0, 0, Math.PI * 2); x.stroke(); x.restore(); }
  const lg = x.createLinearGradient(80, 90, 176, 186); lg.addColorStop(0, "#3fdcc0"); lg.addColorStop(.5, "#3f8ee8"); lg.addColorStop(1, "#4a4bff");
  x.fillStyle = lg; x.beginPath(); x.roundRect(80, 90, 96, 96, 27); x.fill();
  x.strokeStyle = "#fff"; x.lineWidth = 8; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.arc(128, 138, 26, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(128, 123); x.lineTo(128, 138); x.lineTo(139, 146); x.stroke();
  x.fillStyle = "#fff"; x.font = `700 44px ${F}`; x.fillText("vaqt banki", 204, 153);
  x.font = `800 92px ${F}`; x.fillText(String(yil), 80, 372);
  x.font = `600 40px ${F}`; x.fillStyle = "rgba(255,255,255,.78)"; x.fillText("Yil xulosasi", 80, 432);
  const q = wrapQatorlar(s); let y = 560;
  q.forEach((r, i) => { const cx = i % 2 ? 580 : 80, cy = y + Math.floor(i / 2) * 210;
    x.fillStyle = "rgba(255,255,255,.07)"; x.strokeStyle = "rgba(255,255,255,.14)"; x.lineWidth = 2; x.beginPath(); x.roundRect(cx, cy, 420, 180, 40); x.fill(); x.stroke();
    x.fillStyle = "#fff"; x.font = `800 ${String(r[0]).length > 9 ? 44 : 64}px ${F}`; x.fillText(r[0], cx + 34, cy + 88);
    x.fillStyle = "rgba(255,255,255,.72)"; x.font = `500 30px ${F}`; x.fillText(r[1], cx + 34, cy + 140); });
  x.fillStyle = "rgba(255,255,255,.6)"; x.font = `500 30px ${F}`; x.fillText("Har bir daqiqa — bir tanga", 80, 1270);
  c.toBlob(b => { if(!b){ toast("Rasmni tayyorlab bo'lmadi"); return; }
    faylBer(`vaqt-banki-${yil}.png`, b, "image/png").then(ok => { if(ok) toast(`${ic("image")}<span>Rasm yuklab olindi</span>`); }); }, "image/png");
};
