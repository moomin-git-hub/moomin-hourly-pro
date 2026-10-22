
// ============================ 8. ISHGA TUSHIRISH ============================
Bus.on((src, nima) => {
  if(nima === "toifalar" || (nima && nima.has && nima.has("toifalar"))) invalidateIdx();
  if(nima === "sozlama" || (nima && nima.has && nima.has("sozlama"))) applyMavsum();
  render();
  nishonKech();
});
const nishonKech = debounce(() => { try{ nishonTekshir(); bkSnap(); }catch(e){ console.error(e); } }, 700);

// ---- Bir nechta oyna (tab): boshqa oynada o'zgargan ma'lumot shu oynaga ham darhol o'tadi ----
// Usiz eski oyna o'zining eskirgan nusxasini saqlab, yangi yozuvlarni o'chirib yuborishi mumkin edi.
const boshqaOynadan = debounce(() => {
  const kirEdi = S.sozlama.alifbo === "kiril";
  const birlashdi = storeQaytaYukla();
  if(kirEdi && S.sozlama.alifbo !== "kiril"){ location.reload(); return; }
  if(birlashdi && typeof syncKick === "function") syncKick();
  applyMavsum(); eslatmaQur();
  if(S.timer.ish) tikBoshla();
  if(typeof holatYangila === "function") holatYangila();
  render();
}, 40);
window.addEventListener("storage", e => {
  try{ if(e.storageArea !== localStorage) return; }catch(_){ return; }
  if(e.key === "vbTok" || e.key === null){ location.reload(); return; }        // boshqa oynada kirildi, chiqildi yoki xotira tozalandi
  if(e.key === KEY || e.key === CFG_KEY || e.key === SYNC_KEY) boshqaOynadan();
  else if(e.key === "vbTheme"){ applyTheme(); render(); }
  else if(e.key === "vbDemo"){ _namuna = null; render(); }
});

function ilovaOch(){
  $("#auth").hidden = true; $("#auth").innerHTML = "";
  $("#app").hidden = false; $("#dock").hidden = false;
  switchTab(curTab, {keep: true});
}
let _bugunOldin = null;
function daqiqaTik(){
  const b = bugunISO();
  if(_bugunOldin && _bugunOldin !== b){ if(tanlangan === _bugunOldin) tanlangan = b; bkSnap(); }   // yarim tundan o'tdi — yangi kun
  _bugunOldin = b;
  if(document.visibilityState === "visible" && curTab === "asosiy" && !Ov.length && !$("#app").hidden) render();
}
function init(){
  storeLoad();
  applyTheme(); applyMavsum();
  tanlangan = bugunISO(); _bugunOldin = tanlangan;
  if(VB_KORGAZMA && typeof korgazmaBoshla === "function") korgazmaBoshla();
  syncInit();
  if(Sync.token || lsGet("vbLocal") === "1" || VB_KORGAZMA) ilovaOch();
  else authKor("kir", Meta.uid ? "Sessiya tugadi — qayta kiring. Bu qurilmadagi o'zgarishlar saqlanib turibdi." : "");
  pinTekshir();
  if(S.timer.ish) tikBoshla();
  eslatmaQur(); bkSnap(); tarixQopqon(); nishonTekshir();
  setTimeout(urlAmallar, 350);
  setInterval(daqiqaTik, 30000);
  requestAnimationFrame(() => { const b = $("#boot"); if(b){ b.classList.add("out"); setTimeout(() => b.remove(), 400); } });
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
