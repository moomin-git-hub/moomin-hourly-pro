
// ---------------------------- AI YORDAMCHI ----------------------------
let aiTarix = [], aiBand = false, aiOyna = null, aiKutilgan = null;
function aiMalumot(){
  const log = kunlar(), full = log.filter(toliqKunmi).length, t = tanlangan || bugunISO(), sp = kunChiqim(t), left = KUNLIK - sp;
  const tot = statHisob(log).g;
  const top = GURUH_TARTIB.filter(g => tot[g] > 0).sort((a, b) => tot[b] - tot[a]).slice(0, 6).map(g => `${GURUH[g].nom} ${(tot[g] / 60).toFixed(1)} soat`).join(", ");
  return `Tanlangan kun ${t}: ${left} daqiqa (${(left / 60).toFixed(1)} soat) hali hisobga olinmagan, ${sp} daqiqa yozilgan. Jami ${log.length} kun yozilgan, shundan ${full} to'liq kun. Umumiy taqsimot: ${top || "hali ma'lumot yo'q"}.`;
}
function aiTizim(){
  const kats = faolKategoriyalar().slice(0, 70).join(" | ");
  return `Sen "Vaqt Banki" ilovasining shaxsiy yordamchisisan. Bu ilova vaqtni pul (tanga) kabi boshqarishga asoslangan: bir kun = 1440 daqiqa = 1440 tanga; foydalanuvchi har kuni shu 1440 daqiqani turli faoliyatga "sarflaydi", maqsad — butun kunni hisobga olish. Faqat O'ZBEK TILIDA, qisqa (2-5 jumla), iliq va amaliy javob ber. ${kirilmi() ? "Javobni O'ZBEK KIRILL alifbosida yoz." : ""} Markdown emas, oddiy matn yoz.

MUHIM PROTOKOL — YOZUV QO'SHISH: Agar foydalanuvchi faoliyatlarini yozib qo'yishni so'rasa, kunini tasvirlasa yoki matndan import qilishni so'rasa, javobingni AYNAN shu formatdagi blok bilan boshla:
<vb>{"yozuvlar":[{"sana":"YYYY-MM-DD","kat":"...","daqiqa":N,"izoh":"...","vaqt":"HH:MM yoki bo'sh"}]}</vb>
so'ng bitta qisqa tasdiq jumla yoz. "kat" ni FAQAT shu ro'yxatdan tanla (eng mosini): ${kats}. Soatlarni daqiqaga aylantir (1 soat=60). Sana aytilmagan bo'lsa ${tanlangan || bugunISO()} dan foydalan. "kecha" bo'lsa bir kun oldingi sana. Vaqt aniq aytilmasa "vaqt"ni bo'sh qoldir. Yozuv so'ralmagan oddiy savollarda <vb> ishlatma.

Foydalanuvchining hozirgi ma'lumotlari: ${aiMalumot()}`;
}
function aiChiz(){
  if(!aiOyna || aiOyna.closed) return;
  const box = $("#aiMsgs", aiOyna.el); if(!box) return;
  box.innerHTML = aiTarix.length ? aiTarix.map(m => `<div class="ai-m ${m.role === "user" ? "me" : "ai"}${m.yozmoqda ? " typing" : ""}">${m.yozmoqda ? "<i></i><i></i><i></i>" : esc(m.text)}</div>`).join("")
    : `<div class="ai-hello"><span class="tile-ic violet">${ic("sparkles")}</span><p>Salom! Kuningizni so'z bilan aytib bering — men yozuvlarga aylantiraman. Yoki vaqtingiz haqida savol bering.</p></div>`;
  box.scrollTop = box.scrollHeight;
  const ch = $("#aiChips", aiOyna.el); if(ch) ch.hidden = aiTarix.length > 0;
  const tas = $("#aiTasdiq", aiOyna.el);
  if(tas){
    if(aiKutilgan){ const jami = aiKutilgan.reduce((a, b) => a + b.daqiqa, 0);
      tas.innerHTML = `<div class="ai-vb"><div class="rows">${aiKutilgan.map(e => `<div class="row g-${katGuruh(e.kat)}"><span class="gdot"></span><span class="row-main"><b>${esc(katNom(e.kat))}</b><small>${[e.vaqt, esc(e.izoh)].filter(Boolean).join(" · ") || sanaQisqa(e.sana)}</small></span><span class="row-amt num">${tanga(e.daqiqa)}</span></div>`).join("")}</div>
        <div class="btn-row" style="margin-top:10px"><button class="btn ghost sm" data-act="aiBekor">Bekor qilish</button><button class="btn blue sm" data-act="aiQosh">${ic("check")}${aiKutilgan.length} ta yozuvni qo'shish · ${tanga(jami)}</button></div></div>`;
      cyrPass(tas);
    } else tas.innerHTML = "";
  }
}
function aiVb(text){
  const m = String(text).match(/<vb>([\s\S]*?)<\/vb>/); if(!m) return text;
  const qoldi = String(text).replace(m[0], "").trim();
  let data = null; try{ data = JSON.parse(m[1]); }catch(e){ return qoldi || text; }
  const list = Array.isArray(data && data.yozuvlar) ? data.yozuvlar : null;
  if(!list || !list.length) return qoldi;
  const kats = faolKategoriyalar();
  const tayyor = list.map(e => ({
    sana: isIso(e.sana) ? e.sana : (tanlangan || bugunISO()),
    kat: kats.includes(e.kat) ? e.kat : (kats.find(k => k.toLowerCase().includes(String(e.kat || "").toLowerCase().slice(0, 6))) || "15 Boshqa"),
    daqiqa: clamp(parseInt(e.daqiqa, 10) || 0, 0, KUNLIK), izoh: String(e.izoh || "").slice(0, 120), vaqt: hmToMin(e.vaqt) != null ? e.vaqt : ""
  })).filter(e => e.daqiqa > 0);
  if(!tayyor.length) return qoldi;
  aiKutilgan = tayyor;
  return qoldi || `${tayyor.length} ta yozuv tayyor — pastda tasdiqlang.`;
}
async function aiYubor(matn){
  const inp = aiOyna && $("#aiIn", aiOyna.el);
  const txt = String(matn != null ? matn : (inp ? inp.value : "")).trim();
  if(!txt || aiBand) return;
  if(inp){ inp.value = ""; inp.style.height = "auto"; }
  if(VB_KORGAZMA){ aiTarix.push({role: "user", text: txt}); aiTarix.push({role: "assistant", text: "Ko'rgazma sahifasida AI yordamchi ishlamaydi. Ilovani Render'ga joylab, Profil → AI yordamchi bo'limiga Anthropic API kalitingizni kiritsangiz, shu yerda javob beraman."}); aiChiz(); return; }
  aiTarix.push({role: "user", text: txt}); aiTarix.push({role: "assistant", text: "", yozmoqda: true}); aiChiz();
  aiBand = true; const sb = aiOyna && $("#aiSend", aiOyna.el); if(sb) sb.disabled = true;
  try{
    const msgs = aiTarix.filter(m => !m.yozmoqda).slice(-16).map(m => ({role: m.role === "user" ? "user" : "assistant", content: m.text}));
    const headers = {"Content-Type": "application/json"}, key = (lsGet("vbAiKey") || "").trim();
    if(key){ headers["x-api-key"] = key; headers["anthropic-version"] = "2023-06-01"; headers["anthropic-dangerous-direct-browser-access"] = "true"; }
    const sora = model => fetch("https://api.anthropic.com/v1/messages", {method: "POST", headers, body: JSON.stringify({model, max_tokens: 1000, system: aiTizim(), messages: msgs})});
    let r = await sora(AI_MODEL);
    if(r.status === 404 && AI_MODEL_ZAXIRA) r = await sora(AI_MODEL_ZAXIRA);       // model eskirgan bo'lsa — yangisi bilan
    if(!r.ok){ let d = ""; try{ const j = await r.json(); d = (j && j.error && j.error.message) || ""; }catch(e){} throw new Error("HTTP " + r.status + (d ? ": " + d : "")); }
    const data = await r.json();
    let out = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim() || "(bo'sh javob)";
    aiTarix = aiTarix.filter(m => !m.yozmoqda);
    out = aiVb(out);
    if(out) aiTarix.push({role: "assistant", text: out});
  }catch(e){
    aiTarix = aiTarix.filter(m => !m.yozmoqda);
    aiTarix.push({role: "assistant", text: "AI bilan bog'lana olmadim. " + ((lsGet("vbAiKey") || "").trim() ? "Kalit yoki internet aloqasini tekshiring." : "AI ishlashi uchun Profil → AI yordamchi bo'limiga Anthropic API kalitingizni kiriting.") + (e && e.message && /HTTP/.test(e.message) ? " (" + e.message.slice(0, 120) + ")" : "")});
  }
  aiBand = false; if(sb) sb.disabled = false; aiChiz();
}
A.aiOpen = (el, ev, boshMatn) => {
  if(aiOyna && !aiOyna.closed) return;
  const savollar = ["Kunimni yozib ber: 7s uyqu, 8s ish, 1s sport, 2s telefon", "Bugun vaqtim qayerga ketdi?", "Behuda vaqtni qanday kamaytiraman?"];
  aiOyna = openSheet({title: "AI yordamchi", sub: "Vaqt ma'lumotlaringizni biladi", full: true, cls: "ai-sheet",
    body: `<div class="ai-msgs" id="aiMsgs" aria-live="polite"></div>
      <div class="chips" id="aiChips">${savollar.map((q, i) => `<button class="chip sm" data-act="aiSavol" data-i="${i}">${esc(q)}</button>`).join("")}<button class="chip sm dash" data-act="aiImport">${ic("file-text")}Matndan import</button></div>
      <div id="aiTasdiq"></div>`,
    foot: `<textarea id="aiIn" rows="1" placeholder="Savol yoki kuningizni yozing…" aria-label="AI ga xabar"></textarea><button class="ai-send" id="aiSend" data-act="aiSend" aria-label="Yuborish">${ic("arrow-up")}</button>`,
    onClose: () => { aiOyna = null; }});
  aiOyna.savollar = savollar;
  const inp = $("#aiIn", aiOyna.el);
  inp.addEventListener("keydown", e => { if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); aiYubor(); } });
  inp.addEventListener("input", () => { inp.style.height = "auto"; inp.style.height = Math.min(inp.scrollHeight, 120) + "px"; });
  aiChiz();
  if(boshMatn){ inp.value = boshMatn; inp.dispatchEvent(new Event("input")); }
  if(!MOBIL) setTimeout(() => { try{ inp.focus(); }catch(e){} }, 300);
};
A.aiSend = () => aiYubor();
A.aiSavol = el => aiYubor(aiOyna.savollar[+el.dataset.i]);
A.aiImport = () => { const i = $("#aiIn", aiOyna.el); i.value = "Quyidagi matndan yozuvlar yasab qo'sh:\n"; i.dispatchEvent(new Event("input")); i.focus(); };
A.aiQosh = () => {
  if(!aiKutilgan) return;
  const jami = aiKutilgan.reduce((a, b) => a + b.daqiqa, 0), r = qosh(aiKutilgan);
  aiTarix.push({role: "assistant", text: r.ids.length ? `${r.ids.length} ta yozuv qo'shildi (jami ${tanga(jami)} tanga). Daftaringiz yangilandi.` : "Yozuvlar qo'shilmadi."});
  aiKutilgan = null; aiChiz();
};
A.aiBekor = () => { aiKutilgan = null; aiTarix.push({role: "assistant", text: "Bekor qilindi — hech narsa qo'shilmadi."}); aiChiz(); };
