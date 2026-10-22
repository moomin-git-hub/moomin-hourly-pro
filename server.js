"use strict";
/* ============================================================
   VAQT BANKI — server
   Express + PostgreSQL + WebSocket. Server Render'da, baza Neon'da (yoki istalgan PostgreSQL'da) ishlaydi.
     • email va parol bilan ro'yxatdan o'tish / kirish
     • bulutli saqlash: har bir yozuv va sozlama alohida element
     • jonli sinxron: bir qurilmadagi o'zgarish boshqalariga darhol yetadi
   Kerakli muhit o'zgaruvchisi: DATABASE_URL (PostgreSQL manzili — Neon → Connect → Connection string)
   Ixtiyoriy: PORT, ALLOW_SIGNUP=0 (yangi ro'yxatni yopish), CORS_ORIGIN, PGSSL=0|1|verify
   Jadvallar "vb_" bilan boshlanadi — boshqa ilova bilan bitta bazada ham bemalol yashaydi.
   Baza bo'sh turganda server unga so'rov yubormaydi: Neon bepul rejasida baza 5 daqiqada uxlaydi va oylik soat tejaladi.
   ============================================================ */
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const compression = require("compression");
const { Pool } = require("pg");
const { WebSocketServer } = require("ws");

const VERSION = require("./package.json").version;
const PORT = +process.env.PORT || 3000;
const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP !== "0";
const CORS = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
const PUBLIC = path.join(__dirname, "public");

// ---------------------------- Ma'lumotlar bazasi ----------------------------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS vb_users (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  pass_hash     TEXT NOT NULL,
  recovery_hash TEXT,
  rev           BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vb_sessions (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES vb_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vb_sessions_user ON vb_sessions (user_id);
CREATE TABLE IF NOT EXISTS vb_items (
  user_id    UUID NOT NULL REFERENCES vb_users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  data       JSONB,
  deleted    BOOLEAN NOT NULL DEFAULT false,
  ts         BIGINT NOT NULL DEFAULT 0,
  rev        BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX IF NOT EXISTS vb_items_user_rev ON vb_items (user_id, rev);
`;
let pool = null;
let dbOk = false;

// DATABASE_URL ni o'qiydi. SSL sozlamalari manzildan ajratib olinadi va kutubxonaga aniq qilib beriladi.
function dbSozlama() {
  // Neon oynasidan «psql 'postgresql://…'» ko'rinishida yoki tirnoq bilan nusxalangan bo'lsa ham qabul qilinadi
  const raw = String(process.env.DATABASE_URL || "").trim().replace(/^psql\s+/i, "").replace(/^['"]+|['"]+$/g, "").trim();
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch (e) { return { url: raw, host: "", sslmode: "", kanal: false }; }
  const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
  const kanal = (u.searchParams.get("channel_binding") || "").toLowerCase() === "require";
  for (const k of ["sslmode", "ssl", "channel_binding", "uselibpqcompat"]) u.searchParams.delete(k);
  return { url: u.toString(), host: u.hostname.toLowerCase(), sslmode, kanal };
}
// Qaysi tartibda ulanib ko'rish:
//   Neon (yoki sslmode=verify-full) — faqat sertifikati tekshirilgan SSL (Neon sertifikati ochiq ishonchli markazdan);
//   sslmode=require — SSL, sertifikat tekshirilmaydi;  manzilda hech narsa yo'q — avval SSL, bo'lmasa SSL'siz (Render ichki manzili);
//   PGSSL=verify | 1 | 0 — qo'lda: tekshirilgan SSL | tekshirilmagan SSL | SSL'siz.
function dbUrinishlar(c) {
  const TEKSHIR = { rejectUnauthorized: true }, TEKSHIRMA = { rejectUnauthorized: false };
  const lokal = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/.test(c.host), neon = /\.neon\.(tech|com)$/.test(c.host);
  const q = process.env.PGSSL;
  let ssl;
  if (q === "0") ssl = [false];
  else if (q === "1") ssl = [TEKSHIRMA];
  else if (q === "verify") ssl = [TEKSHIR];
  else if (c.sslmode === "disable") ssl = [false];
  else if (c.sslmode === "verify-full" || c.sslmode === "verify-ca" || neon) ssl = [TEKSHIR];
  else if (c.sslmode === "require") ssl = [TEKSHIRMA];
  else ssl = lokal ? [false, TEKSHIRMA] : [TEKSHIRMA, false];
  const out = [];
  for (const x of ssl) {
    if (x && c.kanal) out.push({ ssl: x, kanal: true });     // channel_binding=require: avval kanal bog'lash bilan, server taklif qilmasa — usiz
    out.push({ ssl: x, kanal: false });
  }
  return out;
}
const dbTavsif = (v) => (!v.ssl ? "SSL'siz" : "SSL" + (v.ssl.rejectUnauthorized ? ", sertifikat tekshirildi" : ", sertifikat tekshirilmadi") + (v.kanal ? ", kanal bog'lash yoqilgan" : ""));
async function dbInit() {
  const c = dbSozlama();
  if (!c) throw new Error("DATABASE_URL o'rnatilmagan. Render → Environment bo'limiga baza manzilini kiriting (Neon → Connect → Connection string).");
  let oxirgi = null;
  for (const v of dbUrinishlar(c)) {
    // idleTimeoutMillis: bo'sh ulanish 30 soniyada yopiladi — uxlab qolgan baza ulanishi hovuzda qolib ketmaydi
    const p = new Pool({ connectionString: c.url, ssl: v.ssl, enableChannelBinding: v.kanal, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000 });
    p.on("error", (e) => console.error("[db] bo'sh ulanish uzildi:", e.message));
    try { await p.query("SELECT 1"); pool = p; console.log(`[db] ulandi: ${c.host || "baza"} (${dbTavsif(v)})`); break; }
    catch (e) { oxirgi = e; await p.end().catch(() => {}); }
  }
  if (!pool) throw oxirgi;
  await pool.query(SCHEMA);
  dbOk = true;
}
// Ulanib bo'lmaganda: xato turiga qarab nima qilish kerakligini aytadi
function dbMaslahat(e) {
  const kod = String((e && e.code) || ""), m = String((e && e.message) || "");
  if (!dbSozlama()) return "";
  if (/quota|exceeded/i.test(m)) return "Bazaning oylik bepul limiti tugagan ko'rinadi — Neon → Billing/Usage bo'limini tekshiring (limit keyingi oy boshida tiklanadi).";
  if (kod === "ENOTFOUND" || kod === "EAI_AGAIN") return "Baza manzili topilmadi — DATABASE_URL to'liq nusxalanmagan bo'lishi mumkin. Neon → Connect → Connection string'ni boshidan oxirigacha qayta nusxalang.";
  if (kod === "28P01" || kod === "28000" || /authentication failed/i.test(m)) return "Foydalanuvchi nomi yoki parol noto'g'ri — Neon → Connect oynasidan manzilni qayta nusxalang (parol almashtirilgan bo'lsa, eskisi ishlamaydi).";
  if (kod === "3D000" || /no such database|database .* does not exist/i.test(m)) return "Bunday nomli baza yo'q — manzil oxiridagi baza nomini tekshiring (Neon'da odatda «neondb»).";
  if (/certificate|self.signed|CERT_|altnames/i.test(kod + " " + m)) return "SSL sertifikatini tekshirib bo'lmadi. Manzil to'g'ri bo'lsa, Environment'ga PGSSL=1 qo'shib qayta urinib ko'ring.";
  if (kod === "ECONNREFUSED" || kod === "ETIMEDOUT" || /timeout/i.test(m)) return "Bazaga yetib bo'lmadi — manzil va portni tekshiring; baza o'chirilmaganmi?";
  return "Tekshiring: Render → Environment'dagi DATABASE_URL to'g'ri va to'liq nusxalanganmi (Neon → Connect → Connection string); Neon'dagi loyiha o'chirilmaganmi.";
}
// Sozlama xatosi (manzil, parol, baza nomi, sertifikat) qayta urinish bilan tuzalmaydi — darhol aytiladi
function dbDoimiyXato(e) {
  const kod = String((e && e.code) || ""), m = String((e && e.message) || "");
  return !dbSozlama() || /^(28P01|28000|3D000|ENOTFOUND)$/.test(kod) || /authentication failed|no such database|database .* does not exist|certificate|self.signed|CERT_|altnames/i.test(kod + " " + m);
}

// ---------------------------- Yordamchilar ----------------------------
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const k = await scrypt(String(pw).normalize("NFKC"), salt);
  return `s1$${salt.toString("base64")}$${k.toString("base64")}`;
}
async function verifyPassword(pw, stored) {
  const p = String(stored || "").split("$");
  if (p[0] !== "s1" || !p[1] || !p[2]) return false;
  const k = await scrypt(String(pw).normalize("NFKC"), Buffer.from(p[1], "base64"));
  const h = Buffer.from(p[2], "base64");
  return h.length === k.length && crypto.timingSafeEqual(h, k);
}
const SOXTA_HASH = "s1$" + Buffer.alloc(16, 7).toString("base64") + "$" + Buffer.alloc(64, 9).toString("base64");

class Xato extends Error { constructor(status, kod, msg) { super(msg); this.status = status; this.kod = kod; } }
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const emailOk = (e) => typeof e === "string" && e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name || "" });

// Oddiy cheklagich (xotirada): kalit bo'yicha oynada nechta urinish
const urinish = new Map();
function chekla(kalit, max, oynaMs) {
  const now = Date.now(); let r = urinish.get(kalit);
  if (!r || now > r.t) { r = { n: 0, t: now + oynaMs }; urinish.set(kalit, r); }
  r.n++;
  if (r.n > max) throw new Xato(429, "kop_urinish", "Juda ko'p urinish bo'ldi. Bir necha daqiqadan keyin qayta urining.");
}
setInterval(() => { const now = Date.now(); for (const [k, r] of urinish) if (now > r.t) urinish.delete(k); }, 60000).unref();
const tengmi = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ---------------------------- Sessiyalar ----------------------------
const sessKesh = new Map(); // token_hash -> {sid, uid, t}
async function sessiyaTop(token) {
  if (!token || typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  const th = sha(token), now = Date.now();
  const c = sessKesh.get(th);
  if (c && now - c.t < 60000) return c;
  const q = await pool.query("SELECT id, user_id, last_seen FROM vb_sessions WHERE token_hash = $1", [th]);
  if (!q.rows.length) { sessKesh.delete(th); return null; }
  const s = { sid: q.rows[0].id, uid: q.rows[0].user_id, t: now, th };
  sessKesh.set(th, s);
  if (now - new Date(q.rows[0].last_seen).getTime() > 600000) pool.query("UPDATE vb_sessions SET last_seen = now() WHERE id = $1", [s.sid]).catch(() => {});
  return s;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of sessKesh) if (now - v.t > 300000) sessKesh.delete(k); }, 300000).unref();
function keshTozala(sid) { for (const [k, v] of sessKesh) if (v.sid === sid) sessKesh.delete(k); }
function keshTozalaUser(uid) { for (const [k, v] of sessKesh) if (v.uid === uid) sessKesh.delete(k); }
async function sessiyaYarat(uid, device) {
  const token = crypto.randomBytes(32).toString("base64url"), sid = crypto.randomUUID();
  await pool.query("INSERT INTO vb_sessions (id, user_id, token_hash, device) VALUES ($1, $2, $3, $4)", [sid, uid, sha(token), String(device || "").slice(0, 80)]);
  return { token, sid };
}
const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || "";
  const s = await sessiyaTop(h.startsWith("Bearer ") ? h.slice(7).trim() : "");
  if (!s) throw new Xato(401, "sessiya_yoq", "Sessiya tugagan — qayta kiring.");
  req.uid = s.uid; req.sid = s.sid;
  next();
});

// ---------------------------- Jonli aloqa (WebSocket) ----------------------------
const hub = new Map(); // uid -> Set<ws>
function onlaynSoni(uid) { const set = hub.get(uid); return set ? new Set(Array.from(set, (w) => w.dev || w)).size : 0; }
function yubor(uid, msg, filtr) {
  const set = hub.get(uid); if (!set) return;
  const s = JSON.stringify(msg);
  for (const ws of set) { if (ws.readyState === 1 && (!filtr || filtr(ws))) { try { ws.send(s); } catch (e) {} } }
}
function sessiyaniUz(uid, sid) { // shu sessiyadagi ochiq aloqalarni yopadi (sid bo'lmasa — hammasini)
  const set = hub.get(uid); if (!set) return;
  for (const ws of Array.from(set)) { if (!sid || ws.sid === sid) { try { ws.send('{"t":"bye"}'); ws.close(4001, "sessiya yopildi"); } catch (e) {} } }
}

// ---------------------------- Ilova ----------------------------
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(compression());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});
app.use("/api", (req, res, next) => {
  const o = (req.headers.origin || "").replace(/\/+$/, "");
  if (o && (CORS.includes("*") || CORS.includes(o))) {
    res.setHeader("Access-Control-Allow-Origin", CORS.includes("*") ? "*" : o);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use("/api", express.json({ limit: "2mb" }));
const ok = (res, obj) => res.json({ ok: true, now: Date.now(), ...obj });

app.get("/api/health", (req, res) => ok(res, { name: "vaqt-banki", version: VERSION, db: dbOk, signup: ALLOW_SIGNUP }));

// ---- Ro'yxatdan o'tish / kirish ----
app.post("/api/auth/register", wrap(async (req, res) => {
  if (!ALLOW_SIGNUP) throw new Xato(403, "royxat_yopiq", "Yangi ro'yxatdan o'tish yopilgan.");
  chekla("reg:" + req.ip, 10, 3600000);
  const email = String(req.body.email || "").trim().toLowerCase(), password = String(req.body.password || ""), name = String(req.body.name || "").trim().slice(0, 60);
  if (!emailOk(email)) throw new Xato(400, "email", "Email manzil noto'g'ri yozilgan.");
  if (password.length < 6 || password.length > 200) throw new Xato(400, "parol", "Parol kamida 6 belgidan iborat bo'lsin.");
  const hash = await hashPassword(password), id = crypto.randomUUID();
  try { await pool.query("INSERT INTO vb_users (id, email, name, pass_hash) VALUES ($1, $2, $3, $4)", [id, email, name, hash]); }
  catch (e) { if (e.code === "23505") throw new Xato(409, "email_band", "Bu email allaqachon ro'yxatdan o'tgan — «Kirish»ni bosing."); throw e; }
  const s = await sessiyaYarat(id, req.body.device);
  ok(res.status(201), { token: s.token, user: { id, email, name }, rev: 0 });
}));
app.post("/api/auth/login", wrap(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(), password = String(req.body.password || "");
  chekla("login:" + req.ip, 30, 600000); chekla("login:" + email, 12, 600000);
  const q = await pool.query("SELECT id, email, name, pass_hash, rev FROM vb_users WHERE email = $1", [email]);
  const u = q.rows[0];
  const togri = await verifyPassword(password, u ? u.pass_hash : SOXTA_HASH);   // foydalanuvchi bo'lmasa ham bir xil vaqt sarflanadi
  if (!u || !togri) throw new Xato(401, "kirish", "Email yoki parol noto'g'ri.");
  const s = await sessiyaYarat(u.id, req.body.device);
  ok(res, { token: s.token, user: publicUser(u), rev: Number(u.rev) });
}));
app.post("/api/auth/logout", auth, wrap(async (req, res) => {
  await pool.query("DELETE FROM vb_sessions WHERE id = $1", [req.sid]);
  keshTozala(req.sid); sessiyaniUz(req.uid, req.sid);
  ok(res, {});
}));
app.post("/api/auth/logout-all", auth, wrap(async (req, res) => {
  const q = await pool.query("DELETE FROM vb_sessions WHERE user_id = $1 AND id <> $2 RETURNING id", [req.uid, req.sid]);
  for (const r of q.rows) { keshTozala(r.id); sessiyaniUz(req.uid, r.id); }
  ok(res, { yopildi: q.rows.length });
}));
app.delete("/api/sessions/:id", auth, wrap(async (req, res) => {
  const sid = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(sid)) throw new Xato(400, "id", "Sessiya topilmadi.");
  const q = await pool.query("DELETE FROM vb_sessions WHERE id = $1 AND user_id = $2 RETURNING id", [sid, req.uid]);
  if (q.rows.length) { keshTozala(sid); sessiyaniUz(req.uid, sid); }
  ok(res, {});
}));
app.post("/api/auth/password", auth, wrap(async (req, res) => {
  chekla("pw:" + req.uid, 10, 600000);
  const current = String(req.body.current || ""), password = String(req.body.password || "");
  if (password.length < 6 || password.length > 200) throw new Xato(400, "parol", "Yangi parol kamida 6 belgidan iborat bo'lsin.");
  const q = await pool.query("SELECT pass_hash FROM vb_users WHERE id = $1", [req.uid]);
  if (!q.rows[0] || !(await verifyPassword(current, q.rows[0].pass_hash))) throw new Xato(403, "parol_xato", "Joriy parol noto'g'ri.");
  await pool.query("UPDATE vb_users SET pass_hash = $2 WHERE id = $1", [req.uid, await hashPassword(password)]);
  const d = await pool.query("DELETE FROM vb_sessions WHERE user_id = $1 AND id <> $2 RETURNING id", [req.uid, req.sid]);
  for (const r of d.rows) { keshTozala(r.id); sessiyaniUz(req.uid, r.id); }
  ok(res, {});
}));
// Tiklash kodi: kirgan qurilmadan olinadi; parol unutilsa shu kod bilan yangisi o'rnatiladi
const KOD_ALIF = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
app.post("/api/auth/recovery", auth, wrap(async (req, res) => {
  chekla("rec:" + req.uid, 10, 3600000);
  const b = crypto.randomBytes(12); let kod = "";
  for (let i = 0; i < 12; i++) { kod += KOD_ALIF[b[i] % KOD_ALIF.length]; if (i % 4 === 3 && i < 11) kod += "-"; }
  await pool.query("UPDATE vb_users SET recovery_hash = $2 WHERE id = $1", [req.uid, sha(req.uid + ":" + kod)]);
  ok(res, { code: kod });
}));
app.post("/api/auth/reset", wrap(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase(), password = String(req.body.password || "");
  const kod = String(req.body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
  chekla("reset:" + req.ip, 10, 3600000); chekla("reset:" + email, 6, 3600000);
  if (password.length < 6 || password.length > 200) throw new Xato(400, "parol", "Yangi parol kamida 6 belgidan iborat bo'lsin.");
  const q = await pool.query("SELECT id, email, name, recovery_hash, rev FROM vb_users WHERE email = $1", [email]);
  const u = q.rows[0];
  if (!u || !u.recovery_hash || !tengmi(u.recovery_hash, sha(u.id + ":" + kod))) throw new Xato(403, "kod", "Email yoki tiklash kodi noto'g'ri.");
  await pool.query("UPDATE vb_users SET pass_hash = $2, recovery_hash = NULL WHERE id = $1", [u.id, await hashPassword(password)]);
  await pool.query("DELETE FROM vb_sessions WHERE user_id = $1", [u.id]);
  keshTozalaUser(u.id); sessiyaniUz(u.id);
  const s = await sessiyaYarat(u.id, req.body.device);
  ok(res, { token: s.token, user: publicUser(u), rev: Number(u.rev) });
}));

// ---- Hisob ----
app.get("/api/me", auth, wrap(async (req, res) => {
  const [u, s, n] = await Promise.all([
    pool.query("SELECT id, email, name, rev, created_at, recovery_hash IS NOT NULL AS tiklash FROM vb_users WHERE id = $1", [req.uid]),
    pool.query("SELECT id, device, created_at, last_seen FROM vb_sessions WHERE user_id = $1 ORDER BY last_seen DESC LIMIT 30", [req.uid]),
    pool.query("SELECT count(*)::int AS n FROM vb_items WHERE user_id = $1 AND kind = 'y' AND NOT deleted", [req.uid]),
  ]);
  if (!u.rows[0]) throw new Xato(401, "sessiya_yoq", "Hisob topilmadi.");
  const set = hub.get(req.uid), jonli = new Set(set ? Array.from(set, (w) => w.sid) : []);
  ok(res, { user: publicUser(u.rows[0]), rev: Number(u.rows[0].rev), created: u.rows[0].created_at, tiklash: u.rows[0].tiklash, yozuvlar: n.rows[0].n, onlayn: onlaynSoni(req.uid),
    sessions: s.rows.map((r) => ({ id: r.id, device: r.device, created: r.created_at, seen: r.last_seen, current: r.id === req.sid, onlayn: jonli.has(r.id) })) });
}));
app.patch("/api/me", auth, wrap(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 60);
  const q = await pool.query("UPDATE vb_users SET name = $2 WHERE id = $1 RETURNING id, email, name", [req.uid, name]);
  ok(res, { user: publicUser(q.rows[0]) });
}));
app.delete("/api/me", auth, wrap(async (req, res) => {
  chekla("del:" + req.uid, 6, 600000);
  const q = await pool.query("SELECT pass_hash FROM vb_users WHERE id = $1", [req.uid]);
  if (!q.rows[0] || !(await verifyPassword(String(req.body.password || ""), q.rows[0].pass_hash))) throw new Xato(403, "parol_xato", "Parol noto'g'ri.");
  sessiyaniUz(req.uid);
  await pool.query("DELETE FROM vb_users WHERE id = $1", [req.uid]);
  keshTozalaUser(req.uid);
  ok(res, {});
}));

// ---- Sinxron ----
const TURLAR = { y: 4000, c: 400000, r: 2000, k: 16 };   // element turi -> ma'lumot hajmi chegarasi (belgi)
const SAHIFA = 1000;
const elem = (r) => (r.deleted ? { k: r.kind, id: r.id, del: 1, ts: Number(r.ts), rev: Number(r.rev) } : { k: r.kind, id: r.id, d: r.data, ts: Number(r.ts), rev: Number(r.rev) });
function sahifa(rows, joriyRev) {
  const more = rows.length > SAHIFA; if (more) rows.length = SAHIFA;
  return { items: rows.map(elem), more, next: more ? Number(rows[rows.length - 1].rev) : joriyRev };
}
// O'zgarishlarni olish: since dan keyingi hamma element
app.get("/api/sync", auth, wrap(async (req, res) => {
  const since = Math.max(0, parseInt(req.query.since, 10) || 0);
  const u = await pool.query("SELECT rev FROM vb_users WHERE id = $1", [req.uid]);
  if (!u.rows[0]) throw new Xato(401, "sessiya_yoq", "Hisob topilmadi.");
  const rev = Number(u.rows[0].rev);
  const q = await pool.query("SELECT kind, id, data, deleted, ts, rev FROM vb_items WHERE user_id = $1 AND rev > $2 AND rev <= $3 ORDER BY rev LIMIT $4", [req.uid, since, rev, SAHIFA + 1]);
  ok(res, { rev, ...sahifa(q.rows, rev) });
}));
// O'zgarishlarni yuborish (va shu so'rovda boshqa qurilmalarnikini olish)
app.post("/api/sync", auth, wrap(async (req, res) => {
  const since = Math.max(0, parseInt(req.body.since, 10) || 0);
  const kirgan = Array.isArray(req.body.ops) ? req.body.ops : [];
  if (kirgan.length > 1000) throw new Xato(413, "kop", "Bitta so'rovda 1000 tadan ortiq o'zgarish yuborib bo'lmaydi.");
  const dev = String(req.body.dev || "").slice(0, 60), tab = String(req.body.tab || "").slice(0, 40);
  const ops = new Map();
  for (const op of kirgan) {
    if (!op || !TURLAR[op.k] || typeof op.id !== "string" || !op.id || op.id.length > 80) continue;
    const ts = Math.round(+op.ts); if (!(ts > 0) || ts > Date.now() + 86400000) continue;
    const del = !!op.del; let d = null;
    if (!del) { if (op.d === undefined || op.d === null) continue; d = JSON.stringify(op.d); if (d.length > TURLAR[op.k]) continue; }
    const key = op.k + ":" + op.id, bor = ops.get(key);
    if (!bor || ts >= bor.ts) ops.set(key, { k: op.k, id: op.id, d, del, ts, key });
  }
  const c = await pool.connect();
  let rev, oldingi, qabul = 0, rows = [];
  try {
    await c.query("BEGIN");
    const u = await c.query("SELECT rev FROM vb_users WHERE id = $1 FOR UPDATE", [req.uid]);   // foydalanuvchi qatori qulflanadi — yuborishlar navbat bilan
    if (!u.rows[0]) throw new Xato(401, "sessiya_yoq", "Hisob topilmadi.");
    oldingi = rev = Number(u.rows[0].rev);
    const rad = [];
    if (ops.size) {
      const list = Array.from(ops.values());
      const ex = await c.query("SELECT kind, id, ts FROM vb_items WHERE user_id = $1 AND (kind, id) IN (SELECT * FROM unnest($2::text[], $3::text[]))", [req.uid, list.map((o) => o.k), list.map((o) => o.id)]);
      const borTs = new Map(ex.rows.map((r) => [r.kind + ":" + r.id, Number(r.ts)]));
      const yoz = [];
      for (const o of list) {
        const t = borTs.get(o.key);
        if (t !== undefined && t > o.ts) { rad.push(o); continue; }       // serverda yangiroq nusxa bor — bu o'zgarish eskirgan
        o.rev = ++rev; yoz.push(o);
      }
      if (yoz.length) {
        await c.query(`INSERT INTO vb_items (user_id, kind, id, data, deleted, ts, rev, updated_at)
          SELECT $1, x.k, x.i, x.d::jsonb, x.del, x.t, x.r, now()
          FROM unnest($2::text[], $3::text[], $4::text[], $5::boolean[], $6::bigint[], $7::bigint[]) AS x(k, i, d, del, t, r)
          ON CONFLICT (user_id, kind, id) DO UPDATE SET data = EXCLUDED.data, deleted = EXCLUDED.deleted, ts = EXCLUDED.ts, rev = EXCLUDED.rev, updated_at = now()`,
          [req.uid, yoz.map((o) => o.k), yoz.map((o) => o.id), yoz.map((o) => o.d), yoz.map((o) => o.del), yoz.map((o) => o.ts), yoz.map((o) => o.rev)]);
        await c.query("UPDATE vb_users SET rev = $2 WHERE id = $1", [req.uid, rev]);
        qabul = yoz.length;
      }
    }
    // boshqa qurilmalardan kelgan o'zgarishlar (shu so'rovgacha bo'lganlari)
    const q = await c.query("SELECT kind, id, data, deleted, ts, rev FROM vb_items WHERE user_id = $1 AND rev > $2 AND rev <= $3 ORDER BY rev LIMIT $4", [req.uid, since, oldingi, SAHIFA + 1]);
    rows = q.rows;
    if (rad.length) { // rad etilganlarning serverdagi nusxasi ham qaytariladi — qurilma shunga tenglashadi
      const bor = new Set(rows.map((r) => r.kind + ":" + r.id));
      const kerak = rad.filter((o) => !bor.has(o.key));
      if (kerak.length) {
        const r2 = await c.query("SELECT kind, id, data, deleted, ts, rev FROM vb_items WHERE user_id = $1 AND (kind, id) IN (SELECT * FROM unnest($2::text[], $3::text[]))", [req.uid, kerak.map((o) => o.k), kerak.map((o) => o.id)]);
        rows = r2.rows.concat(rows);
      }
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
  const s = sahifa(rows, rev);
  ok(res, { rev, qabul, ...s });
  if (qabul) yubor(req.uid, { t: "rev", rev, dev, tab });   // tab — yuborgan oyna: o'sha oyna qayta so'ramaydi, qolganlari (shu qurilmadagi boshqa oynalar ham) yangilanadi
}));

// ---- Statik fayllar (ilovaning o'zi) ----
app.use(express.static(PUBLIC, { index: false, maxAge: "7d", setHeaders(res, f) { if (/(index\.html|sw\.js|manifest\.json)$/.test(f)) res.setHeader("Cache-Control", "no-cache"); } }));
app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "topilmadi", message: "Bunday manzil yo'q." }));
app.get("*", (req, res) => { res.setHeader("Cache-Control", "no-cache"); res.sendFile(path.join(PUBLIC, "index.html")); });

// ---- Xatolar ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof Xato) return res.status(err.status).json({ ok: false, error: err.kod, message: err.message });
  if (err && err.type === "entity.too.large") return res.status(413).json({ ok: false, error: "katta", message: "So'rov hajmi juda katta." });
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) return res.status(400).json({ ok: false, error: "format", message: "So'rov formati noto'g'ri." });
  console.error("[xato]", req.method, req.path, err && err.code, err && err.message);
  const kod = String((err && err.code) || ""), m = String((err && err.message) || "");
  // Baza limitga yetgan: yozuvlar qurilmada navbatda turadi, limit tiklangach o'zi ketadi
  if (/quota|exceeded the/i.test(m)) return res.status(503).json({ ok: false, error: "baza_limit", message: "Bazaning oylik bepul limiti tugagan — keyingi oy boshida o'zi tiklanadi. Yozuvlaringiz shu qurilmada saqlanib turadi." });
  // Baza vaqtincha javob bermayapti (uyg'onmoqda, ulanish uzildi) — ilova o'zi qayta urinadi
  if (/^(08|57P0|53)/.test(kod) || /^(ECONN|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN)/.test(kod) || /Connection terminated|timeout exceeded when trying to connect|connection timeout/i.test(m))
    return res.status(503).json({ ok: false, error: "baza", message: "Baza hozircha javob bermayapti — birozdan keyin o'zi qayta uriniladi." });
  res.status(500).json({ ok: false, error: "server", message: "Serverda xato yuz berdi. Birozdan keyin qayta urining." });
});

// ---------------------------- Ishga tushirish ----------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on("upgrade", (req, socket, head) => {
  let p = ""; try { p = new URL(req.url, "http://x").pathname; } catch (e) {}
  if (p !== "/ws") { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
wss.on("connection", (ws) => {
  ws.tirik = true; ws.uid = null;
  const kutish = setTimeout(() => { if (!ws.uid) ws.close(4000, "auth kutildi"); }, 10000);
  ws.on("pong", () => { ws.tirik = true; });
  ws.on("message", async (raw) => {
    let m; try { m = JSON.parse(String(raw)); } catch (e) { return; }
    if (!m || typeof m !== "object") return;
    if (m.t === "ping") { try { ws.send('{"t":"pong"}'); } catch (e) {} return; }
    if (m.t === "auth" && !ws.uid) {
      try {
        const s = await sessiyaTop(String(m.token || ""));
        if (!s) { ws.send('{"t":"bye"}'); ws.close(4001, "sessiya yo'q"); return; }
        ws.uid = s.uid; ws.sid = s.sid; ws.dev = String(m.dev || "").slice(0, 60) || crypto.randomUUID();
        clearTimeout(kutish);
        let set = hub.get(s.uid); if (!set) hub.set(s.uid, (set = new Set()));
        set.add(ws);
        const u = await pool.query("SELECT rev FROM vb_users WHERE id = $1", [s.uid]);
        const n = onlaynSoni(s.uid);
        ws.send(JSON.stringify({ t: "ready", rev: u.rows[0] ? Number(u.rows[0].rev) : 0, online: n, now: Date.now() }));
        yubor(s.uid, { t: "online", n }, (w) => w !== ws);
      } catch (e) { try { ws.close(1011, "xato"); } catch (_) {} }
    }
  });
  ws.on("close", () => {
    clearTimeout(kutish);
    if (!ws.uid) return;
    const set = hub.get(ws.uid);
    if (set) { set.delete(ws); if (!set.size) hub.delete(ws.uid); else yubor(ws.uid, { t: "online", n: onlaynSoni(ws.uid) }); }
  });
  ws.on("error", () => {});
});
// Uzilib qolgan aloqalarni tozalash (va proksi aloqani uzib qo'ymasligi uchun ping)
setInterval(() => { for (const ws of wss.clients) { if (!ws.tirik) { ws.terminate(); continue; } ws.tirik = false; try { ws.ping(); } catch (e) {} } }, 30000).unref();
// 180 kundan beri ishlatilmagan sessiyalar o'chiriladi
setInterval(() => { if (pool) pool.query("DELETE FROM vb_sessions WHERE last_seen < now() - interval '180 days'").catch(() => {}); }, 6 * 3600000).unref();

async function start() {
  for (let i = 1; ; i++) {
    try { await dbInit(); break; }
    catch (e) {
      console.error(`[db] ulanib bo'lmadi (${i}-urinish):`, e.code || "", e.message);
      if (i >= 5 || dbDoimiyXato(e)) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  server.listen(PORT, () => console.log(`Vaqt Banki v${VERSION} — ${PORT}-portda ishlayapti`));
}
function toxta() { console.log("To'xtatilmoqda…"); for (const ws of wss.clients) { try { ws.close(1001); } catch (e) {} } server.close(() => { (pool ? pool.end() : Promise.resolve()).finally(() => process.exit(0)); }); setTimeout(() => process.exit(0), 8000).unref(); }
process.on("SIGTERM", toxta); process.on("SIGINT", toxta);
process.on("unhandledRejection", (e) => console.error("[unhandled]", e && e.message));

if (require.main === module) start().catch((e) => {
  console.error("Server ishga tushmadi:", e.message);
  const maslahat = dbMaslahat(e); if (maslahat) console.error(maslahat);
  process.exit(1);
});
module.exports = { app, server, start };
