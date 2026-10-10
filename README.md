# Mo'min — Kun tartibi · server (Render + Neon)

```
Telefon / brauzer (PWA)  ──►  Render (Node server, bepul)  ──►  Neon (PostgreSQL, bepul, doimiy)
```

- **Render** — serverni ishlatadi va ilovaning o'zini ham shu manzildan beradi.
- **Neon** — ma'lumotlar bazasi. Render'ning o'z bepul bazasi 30 kundan keyin o'chib ketadi, Neon'niki esa muddatsiz.
- Ikkalasi ham bepul rejada **uxlab qoladi**: Render 15 daqiqa so'rov bo'lmasa (qayta uyg'onishi ~1 daqiqa), Neon 5 daqiqada (uyg'onishi bir necha soniya). Ma'lumot yo'qolmaydi — faqat uzoq tanaffusdan keyingi birinchi ulanish sekinroq. Ilovaning o'zi har doim telefonning xotirasi bilan darhol ishlaydi, bulutga fonda ulanadi (ulanmasa o'zi qayta urinadi).

---

## 1-qadam · Neon'da baza (≈ 3 daqiqa)

1. **neon.com** ga kiring va ro'yxatdan o'ting (Google / GitHub / email).
2. **Create project** → nom: `momin` → **Region: AWS Europe (Frankfurt)** (Render ham Frankfurt'da bo'ladi, shuning uchun tez).
3. Loyiha ochilgach **Connect** tugmasini bosing. Ochilgan oynada **Connection pooling** yoqilgan bo'lsin (manzilda `-pooler` so'zi bo'ladi).
4. `postgresql://…` bilan boshlanadigan manzilni **to'liq nusxalang** — bu `DATABASE_URL`. Parol shu manzilning ichida, uni hech kimga bermang va GitHub'ga yozmang.

Jadvallarni qo'lda yaratish shart emas — server birinchi ishga tushganda o'zi yaratadi.

## 2-qadam · Kodni GitHub'ga

1. **github.com** → *New repository* → nom: `momin` (Private bo'lishi mumkin).
2. Shu zip ichidagi hamma fayllarni repo'ga yuklang (*Add file → Upload files*). `render.yaml` repo'ning eng yuqorisida turishi kerak. `node_modules` papkasi bo'lsa yuklamang.

## 3-qadam · Render'da server

1. **render.com** → **New +** → **Blueprint** → GitHub'ni ulang → `momin` repo'sini tanlang.
2. Render `render.yaml` ni o'qiydi va **DATABASE_URL** qiymatini so'raydi → 1-qadamda nusxalagan Neon manzilini qo'ying. (`JWT_SECRET` ni Render o'zi yaratadi.)
3. **Deploy Blueprint** ni bosing. 2–4 daqiqada holat **Live** bo'ladi. Manzil: `https://momin-xxxx.onrender.com`.

## 4-qadam · Tekshirish

| Manzil | Nima ko'rsatadi |
|---|---|
| `…onrender.com/api/health` | `{"ok":true,…}` — server tirik (bazaga tegmaydi) |
| `…onrender.com/api/health/db` | `{"ok":true,"ms":…}` — **Neon'ga ulanish ishlayapti**. Ishlamasa `error` maydonida sababi o'zbekcha yoziladi |
| `…onrender.com` | ilovaning o'zi |

Ilovada: **Yana → Sozlamalar → Hisob va sinxron → Ro'yxatdan o'tish** (email + parol). Boshqa qurilmada shu email bilan **Kirish** — ma'lumot sinxron bo'ladi.
Telefonga o'rnatish: brauzer menyusidan **Bosh ekranga qo'shish**.

---

## Muammolar

| Belgi | Sabab va yechim |
|---|---|
| Deploy "Failed", logda `✖ Bazaga ulanib bo'lmadi — …` | Sabab shu satrning o'zida yozilgan. Odatda `DATABASE_URL` noto'g'ri nusxalangan: Neon → **Connect** → qaytadan nusxalab, Render → *Environment* → `DATABASE_URL` ni almashtiring → *Save*. |
| `/api/health/db` → "parol noto'g'ri" | Neon'da parol almashtirilgan bo'lishi mumkin — yangi manzilni nusxalang. |
| `/api/health/db` → "limit to'lgan" | Neon bepul limiti (oyiga 100 CU-soat yoki 1 GB) tugagan. Keyingi oy boshigacha kuting yoki Neon panelida tekshiring. |
| Ilovada "☁ ulanmagan", "Server uyg'onmoqda…" | Render yoki Neon uxlab yotgan. 30–60 soniya kuting — ilova o'zi qayta ulanadi. |
| Bazaning SSL sertifikati haqida xato | Render → *Environment* → `PGSSL` = `insecure` qo'shing (faqat Neon bo'lmagan baza uchun kerak bo'lishi mumkin). |

## Uxlab qolmasligi uchun (ixtiyoriy)

Bepul tashqi "pinger" (masalan UptimeRobot yoki cron-job.org) har 5–10 daqiqada `https://…onrender.com/api/health` ni chaqirsa, Render uxlamaydi.

- Faqat **`/api/health`** ni chaqiring. `/api/health/db` ni pingerga **qo'ymang** — Neon uxlamay qoladi va bepul soatlari tez tugaydi.
- Bitta xizmat butun oy uyg'oq tursa ~744 soat ketadi; Render'ning bepul chegarasi — oyiga 750 soat (barcha bepul xizmatlar uchun umumiy).

Neon haqida: ilova har ~15 soniyada "yangilik bormi?" deb so'raydi, lekin server buni bazaga bormasdan, xotiradan javoblaydi. Shuning uchun ilova ochiq turganda ham baza uxlay oladi va soatlar tejaladi.

## Yangilash

Yangi `server.js`, `public/index.html` va boshqa fayllarni GitHub'ga yuklang — Render o'zi qayta joylaydi. Telefondagi ilova ham keyingi ochilishda yangilanadi.

## Avval Render'ning o'z bazasi bilan joylagan bo'lsangiz

1. Render → `momin` → *Environment* → `DATABASE_URL` ni Neon manziliga almashtiring → *Save* (qayta joylanadi).
2. Neon'dagi baza bo'sh, shuning uchun ilovada qaytadan **ro'yxatdan o'ting**. **Eng ko'p ma'lumot turgan qurilmadan** boshlang — ilova uni o'zi bulutga yuklaydi, boshqa qurilmalar keyin kirib oladi.
3. Eski `momin-db` bazasi endi kerak emas — Render panelidan o'chirib tashlashingiz mumkin.

---

## Sozlamalar (Render → Environment)

| O'zgaruvchi | Ma'nosi |
|---|---|
| `DATABASE_URL` | Neon manzili (majburiy). `psql '…'` ko'rinishida nusxalanib qolsa ham tushunadi. |
| `JWT_SECRET` | Kirish tokenlari kaliti — Render yaratadi, o'zgartirmang (o'zgarsa hamma qayta kiradi). |
| `PGSSL` | Odatda kerak emas. `off` — SSL'siz baza; `insecure` — sertifikatni tekshirmaslik. |
| `PG_POOL_MAX` | Bazaga ochiq ulanishlar soni (standart 5). |
| `NO_POLL_CACHE` | `1` bo'lsa sinxron so'rovlari har safar bazaga boradi (odatda kerak emas). |

## Mahalliy ishga tushirish (sinov uchun)

```bash
npm install
npm start                                   # DATABASE_URL yo'q → ma'lumot data.json faylda
DATABASE_URL='postgresql://…' npm start     # Neon bilan
```
`http://localhost:3000` da ilova ochiladi.

## API (qisqacha)

`POST /api/register` · `POST /api/login` · `GET /api/me` · `GET|POST|DELETE /api/data` (`?since=` — faqat o'zgarganlar) · `GET /api/snaps`, `GET /api/snaps/:sana` · `DELETE /api/account` · `GET /api/health`, `GET /api/health/db`.
Parollar `scrypt` bilan, tokenlar HMAC bilan imzolanadi (90 kun). Har bir foydalanuvchi ma'lumoti alohida.
