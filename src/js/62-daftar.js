
// ---------------------------- DAFTAR (barcha yozuvlar) ----------------------------
const daftar = {oy: null, q: "", g: null, limit: 31};
function oylarRoyxati(){ const set = new Set(kunlar().map(oyKey)); set.add(oyKey(bugunISO())); return Array.from(set).sort().reverse(); }
function daftarMos(){
  const q = daftar.q.trim().toLowerCase(), g = daftar.g;
  if(!q && !g) return null;
  return r => (!g || katGuruh(r.kat) === g) && (!q || (katNom(r.kat) + " " + r.kat + " " + (r.izoh || "") + " " + GURUH[katGuruh(r.kat)].nom).toLowerCase().includes(q));
}
function daftarKunHTML(d, mos){
  const hammasi = kunYozuv(d), rows = mos ? hammasi.filter(mos) : hammasi;
  if(!rows.length) return "";
  const spent = kunChiqim(d), sum = rows.reduce((a, r) => a + r.daqiqa, 0), dd = dOf(d), t = bugunISO();
  return `<section class="card day">
    <div class="day-h">
      <button class="day-d" data-act="kunOch" data-d="${d}" aria-label="${sanaToliq(d)} — Asosiy ekranda ochish"><b class="num">${dd.getDate()}</b><span><b>${d === t ? "Bugun" : d === addDays(t, -1) ? "Kecha" : HK_TOLIQ[dd.getDay()]}</b><small>${OY_TOLIQ[dd.getMonth()].toLowerCase()}${dd.getFullYear() !== new Date().getFullYear() ? " " + dd.getFullYear() : ""}${isYopiq(d) ? " · yopilgan" : ""}</small></span></button>
      <div class="day-s num">${mos ? `<b>${tanga(sum)}</b><small>topildi</small>` : `<b>${tanga(spent)}</b><small>/ ${tanga(KUNLIK)}</small>`}</div>
      <button class="ibtn plain" data-act="entryNew" data-sana="${d}" aria-label="${sanaQisqa(d)} kuniga yozuv qo'shish">${ic("plus")}</button>
    </div>
    ${mos ? "" : stackbarHTML(kunGuruh(d), KUNLIK, "sm")}
    <div class="rows">${kunTartib(rows).map(yozuvRow).join("")}</div>
  </section>`;
}
function daftarRoyxatHTML(){
  const mos = daftarMos(), oy = daftar.oy;
  let dd = kunlar().slice().reverse();
  if(oy !== "hammasi") dd = dd.filter(d => oyKey(d) === oy);
  if(mos) dd = dd.filter(d => kunYozuv(d).some(mos));
  if(!dd.length){
    if(mos) return `<section class="card"><div class="empty"><div class="art">${ic("search")}</div><p>${daftar.q ? `«${esc(daftar.q)}» bo'yicha` : "Bu yo'nalishda"} ${oy === "hammasi" ? "" : oyNomi(oy) + " oyida "}yozuv topilmadi.</p><button class="link" data-act="dTozala">Filtrni tozalash</button></div></section>`;
    return `<section class="card"><div class="empty"><div class="art">${ic("receipt-text")}</div><p>${oy === "hammasi" ? "Daftar hali bo'sh. Birinchi yozuvni qo'shing — har bir daqiqa hisobda bo'ladi." : oyNomi(oy) + " oyida hali yozuv yo'q."}</p><button class="link" data-act="entryNew">Yozuv qo'shish</button></div></section>`;
  }
  const kor = dd.slice(0, daftar.limit);
  return kor.map(d => daftarKunHTML(d, mos)).join("") + (dd.length > kor.length ? `<button class="btn ghost wide" data-act="dYana">Yana ${Math.min(31, dd.length - kor.length)} kun ko'rsatish</button>` : "");
}
Screens.daftar = { render(el){
  const oylar = oylarRoyxati();
  if(!daftar.oy || (daftar.oy !== "hammasi" && !oylar.includes(daftar.oy))) daftar.oy = oyKey(bugunISO());
  const oy = daftar.oy, dd = oy === "hammasi" ? kunlar() : kunlar().filter(d => oyKey(d) === oy), st = statHisob(dd);
  const xulosa = `<section class="card dsum">
    <div class="ch"><h2>${oy === "hammasi" ? "Butun davr" : oyNomi(oy)}</h2>${oy !== "hammasi" && isYopiq(oy + "-01") ? `<span class="pill mute">${ic("lock")}yopilgan</span>` : ""}</div>
    <div class="duo"><div><small>Yozilgan kunlar</small><b class="num">${dd.length}</b><span>${st.full.length} tasi to'liq</span></div><div><small>Hisobga olingan</small><b class="num">${tanga(Math.round(st.jami / 60))}</b><span>soat</span></div></div>
    ${oy !== "hammasi" ? `<div class="cal" style="margin-top:16px" id="dCal">${calHTML(oy, null)}</div><div class="cal-leg">Kam <i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> To'liq yozilgan</div>` : ""}
  </section>`;
  el.innerHTML = `<header class="ph"><h1>Daftar<span class="sub">Barcha yozuvlar kunma-kun</span></h1>
      <button class="ibtn" data-act="dMenu" aria-label="Daftar amallari">${ic("ellipsis-vertical")}</button></header>
    <div class="srch">${ic("search")}<input type="search" id="daftarQ" data-in="dQ" placeholder="Izoh, toifa yoki #teg bo'yicha qidirish" aria-label="Daftardan qidirish" value="${esc(daftar.q)}" autocomplete="off"></div>
    <div class="strip" id="dOylar" style="margin-top:8px"><button class="sp${oy === "hammasi" ? " on" : ""}" data-act="dOy" data-oy="hammasi">Hammasi</button>${oylar.map(o => `<button class="sp${o === oy ? " on" : ""}" data-act="dOy" data-oy="${o}">${oyChip(o)}</button>`).join("")}</div>
    <div class="cols" style="margin-top:12px">
      <div class="col">${xulosa}
        <div class="chips scroll" id="dGur"><button class="chip sm${!daftar.g ? " on" : ""}" data-act="dG" data-g="">Hammasi</button>${GURUH_TARTIB.filter(g => st.g[g] > 0).map(g => `<button class="chip sm g-${g}${daftar.g === g ? " on" : ""}" data-act="dG" data-g="${g}"><span class="gdot"></span>${GURUH[g].nom}</button>`).join("")}</div>
      </div>
      <div class="col" id="dRoyxat">${daftarRoyxatHTML()}</div>
    </div>`;
  const s = $("#dOylar", el), on = s && $(".sp.on", s); if(s && on) s.scrollLeft = Math.max(0, on.offsetLeft - 40);
  el.classList.toggle("qidiruv", !!daftar.q.trim());       // telefonda qidiruv paytida xulosa yashirinadi — natijalar darhol ko'rinadi
}};
A.dQ = el => { daftar.q = el.value; daftar.limit = 31; const r = $("#dRoyxat"); if(r){ r.innerHTML = daftarRoyxatHTML(); cyrPass(r); } $("#scr-daftar").classList.toggle("qidiruv", !!daftar.q.trim()); };
A.dOy = el => { daftar.oy = el.dataset.oy; daftar.limit = 31; vibra(8); render(); };
A.dG = el => { daftar.g = el.dataset.g || null; daftar.limit = 31; vibra(8); render(); };
A.dYana = () => { daftar.limit += 31; const r = $("#dRoyxat"); if(r){ r.innerHTML = daftarRoyxatHTML(); cyrPass(r); } };
A.dTozala = () => { daftar.q = ""; daftar.g = null; render(); };
A.kunOch = el => { tanlangan = el.dataset.d; switchTab("asosiy"); };
A.dMenu = el => openMenu(el, [
  {icon: "file-spreadsheet", label: "Jadval (CSV) yuklab olish", fn: () => eksportCsv()},
  {icon: "file-json", label: "To'liq zaxira (JSON)", fn: () => eksportJson()},
  {icon: "upload", label: "Zaxiradan yuklash", fn: () => importTanla()},
]);
// Daftar taqvimidagi kunni bosish — o'sha kun Asosiyda ochiladi
document.addEventListener("click", e => { const d = e.target.closest && e.target.closest("#dCal .cal-d"); if(d){ tanlangan = d.dataset.d; switchTab("asosiy"); } });
