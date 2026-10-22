
// ============================ 2. YORDAMCHILAR ============================
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function ic(name, cls){ return `<svg class="ic${cls ? " " + cls : ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`; }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function jparse(s, d){ if(s == null || s === "") return d; try{ const v = JSON.parse(s); return v == null ? d : v; }catch(e){ return d; } }
function debounce(fn, ms){ let t; return function(){ clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; }
function clamp(n, a, b){ return Math.min(Math.max(n, a), b); }
function cssv(name){ try{ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }catch(e){ return ""; } }
function gRang(g){ return cssv("--g-" + g) || "#888"; }

const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const MOBIL = !!(window.matchMedia && (matchMedia("(max-width:640px)").matches || matchMedia("(pointer:coarse)").matches));

// Server soati bilan farq (qurilmalar orasida vaqt bir xil bo'lishi uchun)
let _clockOff = 0;
function nowTs(){ return Date.now() + _clockOff; }

// ---- Sana ----
function isoOf(d){ return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function bugunISO(){ return isoOf(new Date()); }
function dOf(iso){ const p = String(iso).split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
function addDays(iso, n){ const d = dOf(iso); d.setDate(d.getDate() + n); return isoOf(d); }
function isIso(s){ return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
function oyKey(iso){ return String(iso || "").slice(0, 7); }
function hozirDaqiqa(){ const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
function hhmm(min){ min = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0"); }
function hmToMin(v){ if(!v || !/^\d{2}:\d{2}$/.test(v)) return null; const p = v.split(":"); return (+p[0]) * 60 + (+p[1]); }

// ---- Format ----
function tanga(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
function soat(n){ n = Math.round(n); const neg = n < 0; n = Math.abs(n); const h = Math.floor(n / 60), m = n % 60; return (neg ? "−" : "") + (h > 0 ? (m > 0 ? `${h}s ${m}d` : `${h}s`) : `${m}d`); }
function soatUzun(n){ n = Math.max(0, Math.round(n)); const h = Math.floor(n / 60), m = n % 60; return h > 0 ? (m > 0 ? `${h} soat ${m} daqiqa` : `${h} soat`) : `${m} daqiqa`; }
function soatF(n){ return (n / 60).toFixed(1); }
function somF(n){ return tanga(Math.round(n)) + " so'm"; }
function foiz(a, b){ return b ? Math.round(a / b * 100) : 0; }
function sanaQisqa(iso){ const d = dOf(iso); return `${d.getDate()}-${OYLAR[d.getMonth()]}`; }
function sanaToliq(iso){ const d = dOf(iso); return `${d.getDate()}-${OYLAR[d.getMonth()]}, ${HK_TOLIQ[d.getDay()]}`; }
function sanaNisbiy(iso){ const t = bugunISO(); if(iso === t) return "Bugun"; if(iso === addDays(t, -1)) return "Kecha"; if(iso === addDays(t, 1)) return "Ertaga"; return sanaToliq(iso); }
function oyNomi(key){ const p = key.split("-"); return OY_TOLIQ[+p[1] - 1] + " " + p[0]; }
function oyChip(key){ const p = key.split("-"); return OYLAR[+p[1] - 1] + " " + p[0].slice(2); }
function fmtBytes(b){ if(b < 1024) return b + " B"; if(b < 1048576) return (b / 1024).toFixed(1) + " KB"; return (b / 1048576).toFixed(2) + " MB"; }
function vaqtSoat(ts){ try{ return new Date(ts).toLocaleTimeString("uz-UZ", {hour:"2-digit", minute:"2-digit"}); }catch(e){ return ""; } }
function salom(){ const h = new Date().getHours(); return h < 5 ? "Xayrli tun" : h < 11 ? "Xayrli tong" : h < 17 ? "Xayrli kun" : h < 22 ? "Xayrli kech" : "Xayrli tun"; }

// Toifa nomidan tartib raqamini olib tashlaydi: "08 Ishga - Karimbek" -> "Ishga - Karimbek"
function katNomHTML(kat){ return esc(katNom(kat)).replace(/\//g, "/<wbr>"); }      // "/" dan keyin qatorga bo'linishi mumkin
function katNom(kat){
  let s = String(kat || "").replace(/^\d+\.?\s*/, "").trim();
  if(s.length > 3 && s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s || String(kat || "");
}

async function vbHash(str){
  try{ if(window.crypto && crypto.subtle){ const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("vb1:" + str)); return "s" + Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); } }catch(e){}
  let h = 5381; const s = "vb1:" + str; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return "f" + h.toString(16);
}
// Matnni buferga nusxalaydi → Promise<boolean>. Clipboard API rad etsa — eski usul (yashirin maydon) bilan.
async function nusxala(matn){
  try{ if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(matn); return true; } }catch(e){}
  try{
    const t = document.createElement("textarea"); t.value = matn; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;left:-999px;top:0;opacity:0";
    document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return !!ok;
  }catch(e){ return false; }
}
// Faylni qurilmaga beradi → Promise<boolean> (true — fayl berildi). `data` — matn yoki Blob.
/*FAYL-BER*/
function faylBer(nom, data, tur){
  const blob = data instanceof Blob ? data : new Blob([data], {type: tur || "application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return Promise.resolve(true);
}
/*FAYL-BER-OXIRI*/
function yukla(nom, matn, tur){ return faylBer(nom, matn, tur); }

// ---- Lotin -> Kirill (ixtiyoriy alifbo) ----
const _K = [["o'","ў"],["O'","Ў"],["oʻ","ў"],["Oʻ","Ў"],["g'","ғ"],["G'","Ғ"],["gʻ","ғ"],["Gʻ","Ғ"],["sh","ш"],["Sh","Ш"],["SH","Ш"],["ch","ч"],["Ch","Ч"],["CH","Ч"],["yo","ё"],["Yo","Ё"],["YO","Ё"],["yu","ю"],["Yu","Ю"],["YU","Ю"],["ya","я"],["Ya","Я"],["YA","Я"],["a","а"],["A","А"],["b","б"],["B","Б"],["d","д"],["D","Д"],["e","е"],["E","Е"],["f","ф"],["F","Ф"],["g","г"],["G","Г"],["h","ҳ"],["H","Ҳ"],["i","и"],["I","И"],["j","ж"],["J","Ж"],["k","к"],["K","К"],["l","л"],["L","Л"],["m","м"],["M","М"],["n","н"],["N","Н"],["o","о"],["O","О"],["p","п"],["P","П"],["q","қ"],["Q","Қ"],["r","р"],["R","Р"],["s","с"],["S","С"],["t","т"],["T","Т"],["u","у"],["U","У"],["v","в"],["V","В"],["x","х"],["X","Х"],["y","й"],["Y","Й"],["z","з"],["Z","З"],["'","ъ"],["ʼ","ъ"]];
function latKir(str){
  let s = String(str);
  s = s.replace(/(^|[\s(«"'‘“])e/g, "$1э").replace(/(^|[\s(«"'‘“])E/g, "$1Э");
  s = s.replace(/(^|[^a-zA-Zʻ']|[aeiouAEIOU])ye/g, "$1е").replace(/(^|[^a-zA-Zʻ'])Y[eE]/g, "$1Е");   // so'z boshida va unlidan keyin: yetti -> етти, qayerga -> қаерга
  for(const p of _K) s = s.split(p[0]).join(p[1]);
  return s;
}
function kirilmi(){ return S.sozlama.alifbo === "kiril"; }
function cyrPass(root){
  if(!kirilmi() || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      const p = n.parentNode;
      if(!p) return NodeFilter.FILTER_REJECT;
      const nn = p.nodeName;
      if(nn === "SCRIPT" || nn === "STYLE" || nn === "TEXTAREA") return NodeFilter.FILTER_REJECT;
      if(p.closest && p.closest("[data-nokir]")) return NodeFilter.FILTER_REJECT;
      return /[a-zA-Z]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }});
  const list = []; while(w.nextNode()) list.push(w.currentNode);
  for(const n of list) n.nodeValue = latKir(n.nodeValue);
  $$("input[placeholder],textarea[placeholder]", root).forEach(i => { if(/[a-zA-Z]/.test(i.placeholder)) i.placeholder = latKir(i.placeholder); });
}
