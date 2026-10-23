/* Vaqt Banki — oflayn ishlash va tez ochilish (service worker)

   Qoidalar:
   1. Server so'rovlari (/api, /ws) va boshqa saytlar HECH QACHON keshlanmaydi.
   2. Ilovaning o'zi (index.html) keshdan DARHOL ochiladi — server uxlab yotgan bo'lsa ham kutilmaydi.
      Orqa fonda yangi nusxa tekshiriladi; o'zgargan bo'lsa saqlanadi va ilovaga «Yangi versiya tayyor» deb xabar beriladi.
   3. Keshga faqat haqiqiy ilova sahifasi tushadi (ichida BELGI bo'lishi shart) — server uyg'onayotganda
      chiqadigan vaqtinchalik sahifa yoki xato sahifasi hech qachon saqlanmaydi. */
const KESH = "vaqt-banki-qobiq-v3";
const BELGI = 'id="scr-asosiy"';
const QOSHIMCHA = ["manifest.json", "icons/icon-192.png", "icons/icon-512.png"];
const SAHIFA = new URL("index.html", self.registration.scope).href;

async function sahifaniOl() {
  const r = await fetch(SAHIFA, { cache: "no-store" });
  if (!r.ok || !(r.headers.get("content-type") || "").includes("text/html")) return null;
  const matn = await r.text();
  // to'liq kelgan bo'lishi ham shart: oxiri </html> bilan tugamasa (aloqa uzilgan, fayl yarim o'qilgan) — olinmaydi
  return matn.includes(BELGI) && /<\/html>\s*$/.test(matn) ? matn : null;
}
const javob = (matn) => new Response(matn, { headers: { "Content-Type": "text/html; charset=utf-8" } });

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(KESH);
    const matn = await sahifaniOl().catch(() => null);
    if (matn) await c.put(SAHIFA, javob(matn));
    await Promise.all(QOSHIMCHA.map((u) => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  // faqat o'zimizning eski keshlar o'chiriladi — shu manzildagi boshqa ilovalar keshiga tegilmaydi
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vaqt-banki-") && k !== KESH).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Orqa fonda yangilash: yangi nusxa keshdagidan farq qilsa, ochiq oynalarga xabar beriladi
async function yangila(eskiJavob) {
  const matn = await sahifaniOl();
  if (!matn) return null;
  const c = await caches.open(KESH);
  const eski = eskiJavob ? await eskiJavob.text() : null;
  if (eski === matn) return matn;
  await c.put(SAHIFA, javob(matn));
  if (eski !== null) {
    const oynalar = await self.clients.matchAll({ type: "window" });
    for (const o of oynalar) o.postMessage({ t: "yangi-versiya" });
  }
  return matn;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/ws") return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(KESH);
      const bor = await c.match(SAHIFA);
      if (bor) {
        e.waitUntil(yangila(bor.clone()).catch(() => {}));      // keyingi ochilish uchun
        return bor;
      }
      // birinchi marta: tarmoqdan (va yaroqli bo'lsa keshga)
      try { const matn = await yangila(null); if (matn) return javob(matn); } catch (err) {}
      return fetch(req);
    })());
    return;
  }
  // qolgan fayllar (ikonka, manifest): avval kesh, bo'lmasa tarmoq
  e.respondWith(caches.match(req).then((bor) => bor || fetch(req).then((r) => {
    if (r.ok && r.type === "basic") { const nusxa = r.clone(); caches.open(KESH).then((c) => c.put(req, nusxa)); }
    return r;
  })));
});
