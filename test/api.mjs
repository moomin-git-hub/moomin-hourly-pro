// Server sinovi: haqiqiy PostgreSQL bilan API, sinxron qoidalari va jonli aloqani tekshiradi.
import { spawn } from "node:child_process";
import { ROOT, TEST_DB, rootRequire } from "./_env.mjs";
const WebSocket = rootRequire("ws");

const PORT = 4310, BASE = `http://127.0.0.1:${PORT}`;
const DB = TEST_DB;
let pass = 0, fail = 0;
const t = (nom, shart, izoh) => { if (shart) { pass++; console.log("  ✓", nom); } else { fail++; console.log("  ✗", nom, izoh !== undefined ? "→ " + JSON.stringify(izoh) : ""); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { s: r.status, j, h: r.headers };
}
function wsOpen(token, dev) {
  return new Promise((res, rej) => { const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`); ws.msgs = [];
    ws.on("open", () => ws.send(JSON.stringify({ t: "auth", token, dev })));
    ws.on("message", (m) => { const o = JSON.parse(String(m)); ws.msgs.push(o); if (o.t === "ready") res(ws); if (o.t === "bye") res(ws); });
    ws.on("error", rej); setTimeout(() => rej(new Error("ws timeout")), 5000); });
}
const kut = async (ws, pred, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = ws.msgs.find(pred); if (m) return m; await sleep(30); } return null; };

// toza baza
const { Client } = rootRequire("pg");
{ const c = new Client({ connectionString: DB }); await c.connect(); await c.query("DROP TABLE IF EXISTS vb_items, vb_sessions, vb_users CASCADE"); await c.end(); }

// NODE_BIN / SERVER_JS — boshqa Node versiyasi yoki toza o'rnatilgan nusxani sinash uchun
const srv = spawn(process.env.NODE_BIN || "node", [process.env.SERVER_JS || ROOT + "/server.js"], { env: { ...process.env, PORT: String(PORT), DATABASE_URL: DB }, stdio: ["ignore", "pipe", "pipe"] });
let log = ""; srv.stdout.on("data", (d) => (log += d)); srv.stderr.on("data", (d) => (log += d));
for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE + "/api/health"); if (r.ok) break; } catch (e) {} await sleep(150); }

try {
  console.log("Asosiy");
  let r = await api("GET", "/api/health"); t("health", r.s === 200 && r.j.ok && r.j.db === true && r.j.signup === true && r.j.now > 0, r.j);
  r = await fetch(BASE + "/"); const html = await r.text(); t("index.html beriladi", r.status === 200 && html.includes("Vaqt Banki"));
  r = await fetch(BASE + "/qandaydir/yol"); t("noma'lum yo'l ham ilovani ochadi", r.status === 200);
  r = await api("GET", "/api/yoq"); t("noma'lum API → 404 JSON", r.s === 404 && r.j.error === "topilmadi", r);
  r = await fetch(BASE + "/api/sync", { method: "OPTIONS", headers: { Origin: "https://moomin-git-hub.github.io", "Access-Control-Request-Method": "POST" } });
  t("CORS preflight", r.status === 204 && r.headers.get("access-control-allow-origin") === "*" && /Authorization/.test(r.headers.get("access-control-allow-headers")));
  r = await api("GET", "/api/sync?since=0"); t("tokensiz → 401", r.s === 401 && r.j.error === "sessiya_yoq", r.j);
  r = await api("POST", "/api/sync", { since: 0, ops: [] }, "yolgon-token-yolgon-token-yolgon"); t("yolg'on token → 401", r.s === 401);

  console.log("Ro'yxat va kirish");
  r = await api("POST", "/api/auth/register", { email: "xato", password: "123456" }); t("noto'g'ri email → 400", r.s === 400 && r.j.error === "email", r.j);
  r = await api("POST", "/api/auth/register", { email: "a@test.uz", password: "123" }); t("qisqa parol → 400", r.s === 400 && r.j.error === "parol", r.j);
  r = await api("POST", "/api/auth/register", { email: "  A@Test.UZ ", password: "sir-parol-1", name: "Normo'min", device: "Android · Chrome" });
  t("ro'yxatdan o'tish", r.s === 201 && r.j.token && r.j.user.email === "a@test.uz" && r.j.user.name === "Normo'min", r.j);
  const T1 = r.j.token, UA = r.j.user.id;
  r = await api("POST", "/api/auth/register", { email: "a@test.uz", password: "boshqa-parol" }); t("band email → 409", r.s === 409 && r.j.error === "email_band", r.j);
  r = await api("POST", "/api/auth/login", { email: "a@test.uz", password: "xato-parol" }); t("xato parol → 401", r.s === 401 && r.j.error === "kirish", r.j);
  r = await api("POST", "/api/auth/login", { email: "yoq@test.uz", password: "xato-parol" }); t("yo'q foydalanuvchi → 401 (bir xil javob)", r.s === 401 && r.j.message === "Email yoki parol noto'g'ri.", r.j);
  r = await api("POST", "/api/auth/login", { email: "A@test.uz", password: "sir-parol-1", device: "Windows · Chrome" }); t("kirish (2-qurilma)", r.s === 200 && r.j.token && r.j.token !== T1, r.j);
  const T2 = r.j.token;

  console.log("Sinxron");
  const now = Date.now();
  const y = (id, daqiqa, extra) => ({ k: "y", id, d: { id, sana: "2026-10-10", tur: "chiqim", kat: "08 Ishga - Karimbek", daqiqa, izoh: "", ...extra }, ts: now });
  r = await api("POST", "/api/sync", { since: 0, dev: "D1", ops: [y("e1", 60), y("e2", 30), y("e3", 15), { k: "c", id: "byudjet", d: { uyqu: 480 }, ts: now }, { k: "k", id: "2026-10-10", d: 4, ts: now }, { k: "r", id: "2026-10-10", d: { ish: 500 }, ts: now }] }, T1);
  t("yuborish: 6 element qabul qilindi", r.s === 200 && r.j.rev === 6 && r.j.qabul === 6 && r.j.items.length === 0 && r.j.more === false, r.j);
  r = await api("GET", "/api/sync?since=0", undefined, T2);
  t("2-qurilma hammasini oladi", r.s === 200 && r.j.rev === 6 && r.j.items.length === 6 && r.j.items[0].rev === 1 && r.j.items.find((i) => i.k === "k").d === 4, r.j);
  r = await api("GET", "/api/sync?since=6", undefined, T2); t("yangilik yo'q → bo'sh", r.j.items.length === 0 && r.j.rev === 6);

  console.log("Jonli aloqa");
  const ws2 = await wsOpen(T2, "D2");
  t("ws: ready", ws2.msgs[0].t === "ready" && ws2.msgs[0].rev === 6 && ws2.msgs[0].online === 1, ws2.msgs[0]);
  const ws1 = await wsOpen(T1, "D1");
  t("ws: 2 qurilma onlayn", ws1.msgs[0].online === 2 && !!(await kut(ws2, (m) => m.t === "online" && m.n === 2)), ws1.msgs);
  r = await api("POST", "/api/sync", { since: 6, dev: "D1", ops: [y("e4", 45)] }, T1);
  const poke = await kut(ws2, (m) => m.t === "rev");
  t("1-qurilma yozdi → 2-qurilmaga darhol xabar", poke && poke.rev === 7 && poke.dev === "D1", poke);
  r = await api("POST", "/api/sync", { since: 6, dev: "D2", ops: [] }, T2);
  t("2-qurilma faqat yangisini oladi", r.j.items.length === 1 && r.j.items[0].id === "e4" && r.j.rev === 7, r.j);
  ws2.send('{"t":"ping"}'); t("ws: ping → pong", !!(await kut(ws2, (m) => m.t === "pong")));
  { const bad = new WebSocket(`ws://127.0.0.1:${PORT}/ws`); const got = await new Promise((res) => { bad.on("open", () => bad.send(JSON.stringify({ t: "auth", token: "x".repeat(40) }))); bad.on("message", (m) => res(String(m))); bad.on("close", () => res("yopildi")); }); t("ws: yolg'on token rad etiladi", /bye|yopildi/.test(got), got); }

  console.log("To'qnashuvlar (oxirgi yozgan yutadi)");
  r = await api("POST", "/api/sync", { since: 7, dev: "D2", ops: [{ ...y("e1", 999), ts: now - 5000 }] }, T2);
  t("eskirgan o'zgarish rad etiladi va serverdagi nusxa qaytadi", r.j.qabul === 0 && r.j.rev === 7 && r.j.items.length === 1 && r.j.items[0].id === "e1" && r.j.items[0].d.daqiqa === 60, r.j);
  r = await api("POST", "/api/sync", { since: 7, dev: "D2", ops: [{ ...y("e1", 75), ts: now + 1000 }] }, T2);
  t("yangiroq o'zgarish qabul qilinadi", r.j.qabul === 1 && r.j.rev === 8, r.j);
  r = await api("POST", "/api/sync", { since: 7, dev: "D1", ops: [{ k: "y", id: "e2", del: 1, ts: now + 2000 }] }, T1);
  t("o'chirish + boshqaning o'zgarishi bitta javobda", r.j.qabul === 1 && r.j.rev === 9 && r.j.items.length === 1 && r.j.items[0].id === "e1" && r.j.items[0].d.daqiqa === 75, r.j);
  r = await api("GET", "/api/sync?since=8", undefined, T2);
  t("o'chirilgan element belgi (tombstone) bo'lib keladi", r.j.items.length === 1 && r.j.items[0].id === "e2" && r.j.items[0].del === 1 && r.j.items[0].d === undefined, r.j);
  r = await api("POST", "/api/sync", { since: 9, dev: "D1", ops: [{ ...y("e2", 33), ts: now + 3000 }] }, T1);
  t("o'chirilganni qaytarish (undo)", r.j.qabul === 1 && r.j.rev === 10);
  r = await api("POST", "/api/sync", { since: 10, dev: "D1", ops: [{ ...y("e9", 10), ts: now + 100 }, { ...y("e9", 20), ts: now + 200 }, { k: "z", id: "q", d: 1, ts: now }, { k: "y", id: "", d: {}, ts: now }, { k: "y", id: "e8", d: { x: "y".repeat(5000) }, ts: now }, { k: "y", id: "e7", d: { a: 1 }, ts: -5 }] }, T1);
  t("bitta kalit ikki marta → oxirgisi; yaroqsizlari tashlab yuboriladi", r.j.qabul === 1 && r.j.rev === 11, r.j);
  r = await api("GET", "/api/sync?since=10", undefined, T2); t("…va saqlangani — oxirgi nusxa", r.j.items.length === 1 && r.j.items[0].d.daqiqa === 20, r.j);

  console.log("Katta hajm va sahifalash");
  const katta = []; for (let i = 0; i < 2600; i++) katta.push({ k: "y", id: "b" + i, d: { id: "b" + i, sana: "2026-09-" + String((i % 28) + 1).padStart(2, "0"), tur: "chiqim", kat: "01. Uyquga", daqiqa: 1 + (i % 400), izoh: "" }, ts: now });
  let rev = 11;
  for (let i = 0; i < katta.length; i += 1000) { r = await api("POST", "/api/sync", { since: rev, dev: "D1", ops: katta.slice(i, i + 1000) }, T1); rev = r.j.rev; }
  t("2600 yozuv 3 bo'lakda yuborildi", rev === 11 + 2600, rev);
  r = await api("POST", "/api/sync", { since: rev, ops: new Array(1001).fill(y("x", 1)) }, T1); t("1000 dan ortiq → 413", r.s === 413, r.s);
  let hammasi = [], since = 0, sah = 0;
  for (;;) { r = await api("GET", "/api/sync?since=" + since, undefined, T2); hammasi = hammasi.concat(r.j.items); sah++; if (!r.j.more) break; since = r.j.next; }
  const tirik = hammasi.filter((i) => !i.del);
  t("sahifalab olish: hech narsa yo'qolmaydi va takrorlanmaydi", sah === 3 && hammasi.length === new Set(hammasi.map((i) => i.k + i.id)).size && tirik.filter((i) => i.k === "y").length === 2600 + 5, { sah, n: hammasi.length });
  let tartib = true; for (let i = 1; i < hammasi.length; i++) if (hammasi[i].rev <= hammasi[i - 1].rev) tartib = false;
  t("elementlar rev bo'yicha tartibda", tartib);

  console.log("Bir vaqtda yozish");
  const par = await Promise.all(Array.from({ length: 12 }, (_, i) => api("POST", "/api/sync", { since: rev, dev: "P" + i, ops: [{ k: "y", id: "p" + i, d: { id: "p" + i, sana: "2026-10-01", tur: "chiqim", kat: "04 Yo'lga", daqiqa: 5 + i, izoh: "" }, ts: now }] }, i % 2 ? T1 : T2)));
  const revs = par.map((x) => x.j.rev).sort((a, b) => a - b);
  t("12 parallel yuborish: rev takrorlanmaydi", new Set(revs).size === 12 && revs[11] === rev + 12, revs);
  rev += 12;

  console.log("Hisoblar ajratilgan");
  r = await api("POST", "/api/auth/register", { email: "b@test.uz", password: "boshqa-odam" }); const TB = r.j.token;
  r = await api("GET", "/api/sync?since=0", undefined, TB); t("boshqa foydalanuvchi hech narsani ko'rmaydi", r.j.items.length === 0 && r.j.rev === 0, r.j);
  r = await api("POST", "/api/sync", { since: 0, ops: [y("e1", 1)] }, TB); t("bir xil id boshqa hisobda mustaqil", r.j.qabul === 1 && r.j.rev === 1);
  r = await api("GET", "/api/sync?since=" + rev, undefined, T1); t("…A hisobiga ta'sir qilmaydi", r.j.items.length === 0);

  console.log("Hisob boshqaruvi");
  r = await api("GET", "/api/me", undefined, T1);
  t("me: foydalanuvchi, sessiyalar, hisob", r.j.user.email === "a@test.uz" && r.j.sessions.length === 2 && r.j.sessions.filter((s) => s.current).length === 1 && r.j.yozuvlar === 2600 + 5 + 12 && r.j.onlayn === 2 && r.j.tiklash === false, r.j);
  r = await api("PATCH", "/api/me", { name: "Mo'min" }, T1); t("ismni o'zgartirish", r.j.user.name === "Mo'min");
  r = await api("POST", "/api/auth/password", { current: "xato", password: "yangi-parol-2" }, T1); t("parol: joriy xato → 403", r.s === 403 && r.j.error === "parol_xato", r.j);
  ws2.msgs.length = 0;
  r = await api("POST", "/api/auth/password", { current: "sir-parol-1", password: "yangi-parol-2" }, T1); t("parol o'zgartirildi", r.s === 200);
  t("…boshqa qurilma jonli aloqasi yopildi", !!(await kut(ws2, (m) => m.t === "bye")));
  r = await api("GET", "/api/sync?since=0", undefined, T2); t("…va uning tokeni yaroqsiz", r.s === 401);
  r = await api("GET", "/api/me", undefined, T1); t("…joriy sessiya saqlanadi", r.s === 200 && r.j.sessions.length === 1);
  r = await api("POST", "/api/auth/login", { email: "a@test.uz", password: "sir-parol-1" }); t("eski parol endi ishlamaydi", r.s === 401);
  r = await api("POST", "/api/auth/recovery", {}, T1); const KOD = r.j.code; t("tiklash kodi", /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(KOD), KOD);
  r = await api("POST", "/api/auth/reset", { email: "a@test.uz", code: "AAAA-BBBB-CCCC", password: "tiklangan-3" }); t("xato kod → 403", r.s === 403 && r.j.error === "kod");
  r = await api("POST", "/api/auth/reset", { email: "a@test.uz", code: KOD.toLowerCase().replace(/-/g, " "), password: "tiklangan-3" }); t("kod bilan parolni tiklash", r.s === 200 && r.j.token && r.j.rev === rev, r.j);
  const T3 = r.j.token;
  r = await api("GET", "/api/me", undefined, T1); t("…barcha eski sessiyalar yopildi", r.s === 401);
  r = await api("POST", "/api/auth/reset", { email: "a@test.uz", code: KOD, password: "yana-urinish" }); t("kod bir martalik", r.s === 403);
  r = await api("POST", "/api/auth/login", { email: "a@test.uz", password: "tiklangan-3", device: "iPhone · Safari" }); const T4 = r.j.token;
  r = await api("GET", "/api/me", undefined, T3); const boshqa = r.j.sessions.find((s) => !s.current);
  r = await api("DELETE", "/api/sessions/" + boshqa.id, undefined, T3); t("boshqa qurilmani chiqarish", r.s === 200);
  r = await api("GET", "/api/me", undefined, T4); t("…chiqarilgan qurilma tokeni yaroqsiz", r.s === 401);
  r = await api("GET", "/api/sync?since=0", undefined, T3); t("ma'lumot parol almashganda saqlanadi", r.j.rev === rev && r.j.items.length === 1000);
  // Baza uxlab qolganda (Neon bepul rejasida 5 daqiqada) ulanishlar uziladi — keyingi so'rovlar o'zi tiklanishi kerak
  { const c = new Client({ connectionString: DB }); await c.connect();
    await c.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND usename = current_user AND pid <> pg_backend_pid()"); await c.end(); }
  await sleep(300);
  const uygonish = await Promise.all([0, 1, 2, 3, 4, 5].map(() => api("GET", "/api/sync?since=" + (rev - 3), undefined, T3)));
  t("baza ulanishlari uzilgach: so'rovlar o'zi tiklanadi", uygonish.every((x) => x.s === 200 && x.j.items.length === 3), uygonish.map((x) => x.s));
  r = await api("POST", "/api/sync", { since: rev, ops: [{ k: "k", id: "2026-12-01", d: 3, ts: Date.now() }], dev: "d1" }, T3); t("…yozish ham ishlaydi", r.s === 200 && r.j.qabul === 1 && r.j.rev === rev + 1, r.j);
  r = await api("POST", "/api/auth/logout", {}, T3); t("chiqish", r.s === 200);
  r = await api("GET", "/api/me", undefined, T3); t("…token yaroqsiz", r.s === 401);
  r = await api("DELETE", "/api/me", { password: "xato" }, TB); t("hisobni o'chirish: xato parol → 403", r.s === 403);
  r = await api("DELETE", "/api/me", { password: "boshqa-odam" }, TB); t("hisobni o'chirish", r.s === 200);
  r = await api("POST", "/api/auth/login", { email: "b@test.uz", password: "boshqa-odam" }); t("…o'chirilgan hisobga kirib bo'lmaydi", r.s === 401);
  { const c = new Client({ connectionString: DB }); await c.connect(); const q = await c.query("SELECT (SELECT count(*)::int FROM vb_users) u, (SELECT count(*)::int FROM vb_items WHERE user_id <> $1) boshqa, (SELECT pass_hash FROM vb_users WHERE id = $1) h, (SELECT count(*)::int FROM vb_sessions s WHERE s.token_hash = $2) ochiq", [UA, T1]); await c.end();
    t("bazada: begona elementlar tozalangan, parol ochiq saqlanmaydi, token ochiq saqlanmaydi", q.rows[0].u === 1 && q.rows[0].boshqa === 0 && q.rows[0].h.startsWith("s1$") && !q.rows[0].h.includes("tiklangan") && q.rows[0].ochiq === 0, q.rows[0]); }
  r = await api("POST", "/api/auth/login", { email: "a@test.uz", password: "x" }); let cheklandi = false;
  for (let i = 0; i < 14; i++) { r = await api("POST", "/api/auth/login", { email: "a@test.uz", password: "x" + i }); if (r.s === 429) { cheklandi = true; break; } }
  t("ko'p xato urinish cheklanadi (429)", cheklandi, r.s);
  ws1.close(); ws2.close();
} catch (e) { fail++; console.log("  ✗ SINOV TO'XTADI:", e.stack || e); }
finally { srv.kill("SIGTERM"); await sleep(300); }
console.log(`\n${pass} o'tdi, ${fail} o'tmadi`);
if (fail) { console.log("--- server log ---\n" + log.slice(-1500)); process.exit(1); }
