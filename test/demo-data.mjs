// Sinov uchun namunaviy ma'lumot (oxirgi N kun) — tasodifiy, lekin har safar bir xil
export function demoData(days = 24, now = new Date()) {
  let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const hm = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const out = []; let n = 0; const id = () => "d" + (++n).toString(36).padStart(4, "0");
  for (let i = days; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); const s = iso(d);
    if (i > 0 && rnd() < 0.12) continue; // ba'zi kunlar yozilmagan
    const wd = d.getDay(); const dam = wd === 0;
    const plan = [
      ["01. Uyquga", 380 + Math.round(rnd() * 110), 0, ""],
      ["27 Tahoratga", 10, 395, ""],
      ["07 Sura yodlashga", 20 + Math.round(rnd() * 25), 410, ""],
      ["02. Saharlikka", 20, 450, "nonushta"],
      ["04 Yo'lga", 25, 480, "ishga"],
      [dam ? "13 Uborkaga" : "08 Ishga - Karimbek", dam ? 90 : 420 + Math.round(rnd() * 120), 510, dam ? "" : (rnd() < .4 ? "hisobot #ish" : "")],
      ["03 Iftorlikka", 35, 780, "tushlik"],
      ["06 Dars qilishga", 50 + Math.round(rnd() * 70), 1080, rnd() < .5 ? "ingliz tili #til" : "diplom ishi #diplom"],
      ["09 Yugurishga", rnd() < .55 ? 30 : 0, 1170, ""],
      ["05 Kitob o'qishga", rnd() < .7 ? 25 + Math.round(rnd() * 30) : 0, 1260, "Atom odatlar"],
      ["24 Suhbatga", rnd() < .5 ? 30 + Math.round(rnd() * 40) : 0, 1200, ""],
      ["32 BEHUDA O'TGAN VAQT", rnd() < .75 ? 20 + Math.round(rnd() * 95) : 0, 1300, "telefon scroll"],
      ["18. Kiyinish/Yechinishga", 15, 465, ""],
      ["04 Yo'lga", 25, 1020, "uyga"],
    ];
    let rows = plan.filter((p) => p[1] > 0);
    if (i === 0) { const lim = now.getHours() * 60 + now.getMinutes(); rows = rows.filter((p) => p[2] + p[1] <= lim || p[0].startsWith("01")); }
    let sum = rows.reduce((a, p) => a + p[1], 0);
    if (i > 0 && rnd() < .8) { const rest = 1440 - sum; if (rest > 0) { rows.push(["15 Boshqa", Math.min(rest, 60 + Math.round(rnd() * 60)), 0, ""]); sum = rows.reduce((a, p) => a + p[1], 0); const r2 = 1440 - sum; if (r2 > 30) rows.push(["21 Cho'milishga", Math.min(r2, 40), 0, ""]); sum = rows.reduce((a, p) => a + p[1], 0); const r3 = 1440 - sum; if (r3 > 0 && rnd() < .85) rows[0][1] += r3; } }
    for (const p of rows) { const r = { id: id(), sana: s, tur: "chiqim", kat: p[0], daqiqa: p[1], izoh: p[3] }; if (p[2] > 0 && (i === 0 || rnd() < .6)) r.vaqt = hm(p[2]); out.push(r); }
  }
  return out;
}
