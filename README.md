# Vaqt Banki 2.0

Bir kun — 1440 daqiqa — 1440 tanga. Ilova vaqtni pul kabi hisoblaydi: nimaga sarflaganingizni yozasiz, rejalaysiz, tahlil qilasiz.

Bu papkada ilovaning o'zi va uning serveri bor. **Server Render'da, baza Neon'da** ishlaydi: email bilan kirish, bulutli saqlash, qurilmalar orasida jonli sinxron. Firebase kerak emas. Ikkalasining ham bepul rejasi yetadi.

```
server.js            server (Node.js + Express + PostgreSQL + WebSocket)
package.json         kutubxonalar ro'yxati
render.yaml          Render uchun tayyor sozlama (ixtiyoriy)
public/index.html    ilovaning o'zi — bitta fayl
public/sw.js         oflayn ishlash va tez ochilish
public/manifest.json telefonga o'rnatish uchun
public/icons/        ilova ikonkalari
src/, test/          manba va sinovlar — faqat ilovani o'zgartirish uchun (9-bo'lim); serverga kerak emas
```

---

## 1. Joylash: Render (server) + Neon (baza)

### 1-qadam. GitHub'ga yuklash
1. GitHub'da yangi repozitoriy oching (masalan `vaqt-banki`, Private bo'lsa ham bo'ladi).
2. **Add file → Upload files** ni bosib, shu papkadagi hamma narsani (`public` papkasi bilan birga) sudrab tashlang va **Commit changes** ni bosing.

### 2-qadam. Baza — Neon
1. <https://neon.com> da ro'yxatdan o'ting (karta so'ralmaydi).
2. Yangi loyiha yarating: nomi — `vaqt-banki`, **Region — AWS Europe (Frankfurt)**. Regionni keyin o'zgartirib bo'lmaydi, shuning uchun aynan Frankfurt'ni tanlang — server ham o'sha shaharda turadi va so'rovlar tez ishlaydi.
3. Loyiha ochilgach, tepada **Connect** tugmasini bosing. Chiqqan oynadagi manzilni (connection string) boshidan oxirigacha nusxalang. U shunga o'xshaydi:

   ```
   postgresql://neondb_owner:npg_…@ep-…-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

   Hech narsasini o'zgartirmang. Oynadagi «Connection pooling» yoqilgan bo'lsa ham, o'chirilgan bo'lsa ham ishlaydi.

> Bu manzil ichida baza paroli bor — uni hech kimga ko'rsatmang, chatga yoki GitHub'ga tashlamang. Faqat Render'ning Environment bo'limiga qo'yiladi. Bexosdan oshkor bo'lsa, Neon'da parolni yangilab (Roles → Reset password), Render'dagi manzilni almashtiring.

### 3-qadam. Server — Render
1. Render → **New → Web Service** → GitHub'dagi `vaqt-banki` repozitoriysini tanlang.
2. Sozlamalar:
   - **Language:** Node
   - **Region:** Frankfurt (Neon bilan bir xil shahar)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
3. **Environment Variables** bo'limiga bitta qator qo'shing:
   - `DATABASE_URL` = Neon'dan nusxalagan manzil
4. **Deploy Web Service** ni bosing. Jurnalda shu ikki qator chiqsa — tayyor:

   ```
   [db] ulandi: ep-…neon.tech (SSL, sertifikat tekshirildi, …)
   Vaqt Banki v2.1.0 — 10000-portda ishlayapti
   ```

   Jadvallarni server o'zi yaratadi. Ulanib bo'lmasa, jurnalning oxirgi qatorida sababi va nima qilish kerakligi yoziladi (manzil chala nusxalangan, parol noto'g'ri va h.k.).

(Yoki: Render → **New → Blueprint** → shu repozitoriy. `render.yaml` sozlamalarni o'zi to'ldiradi, faqat `DATABASE_URL` so'raladi.)

### 4-qadam. Kirish
Render bergan manzilni oching (masalan `https://vaqt-banki.onrender.com`) → **Ro'yxatdan o'tish**. Telefonda ham shu manzilni ochib, o'sha email va parol bilan kiring — yozuvlar ikkala qurilmada jonli ko'rinadi.

Ro'yxatdan o'tib bo'lgach, begona odam hisob ochmasligi uchun Render → Environment'ga `ALLOW_SIGNUP` = `0` qo'shing (o'zingiz bemalol kira olasiz).

---

## 2. Eski ma'lumotni ko'chirish

Eski ilovadagi ma'lumot o'sha brauzer xotirasida turibdi. Ikki yo'l bor:

**A. Hammasi birga (tavsiya).** Yozuvlar, o'z toifalaringiz, byudjet, shablonlar, kun rejalari va kayfiyat — hammasi ko'chadi.
1. Eski ilova turgan joyga (masalan GitHub Pages'dagi fayllar o'rniga) `public` papkasi ichidagilarni qo'ying: `index.html`, `sw.js`, `manifest.json`, `icons`.
2. Eski ilovani doim ochadigan qurilmada o'sha manzilni oching — eski yozuvlar yangi ko'rinishda chiqadi. Eski ko'rinish chiqaversa, sahifani bir-ikki marta yangilang.
3. Kirish ekranida pastdagi **Server manzili** ga Render manzilingizni yozing → **Ro'yxatdan o'tish**. Hamma narsa hisobingizga yuklanadi.
4. Bundan keyin Render manzilining o'zidan foydalaning — xohlagan qurilmada kirsangiz, ma'lumot keladi.

**B. Faqat yozuvlar.** Eski ilovada **Zaxira (JSON)** ni yuklab oling → yangi ilovada Profil → Zaxira va ma'lumotlar → **Zaxiradan yuklash**. Eski zaxira faylida faqat yozuvlar bor: toifalar, byudjet va shablonlarni qaytadan sozlaysiz.

Firebase'dagi eski nusxaga tegilmaydi — xohlagan payt o'chirib tashlashingiz mumkin.

---

## 3. Telefonga o'rnatish

Manzilni Chrome'da oching → menyu (⋮) → **Bosh ekranga qo'shish**. Ilova alohida oynada, oflayn ham ochiladi. Yangi versiya chiqsa, ilova «Yangi versiya tayyor» deb xabar beradi.

---

## 4. Faylni boshqa joyda saqlasangiz (GitHub Pages, APK)

`index.html` ni Render'dan boshqa joyga qo'ysangiz ham ishlaydi — faqat serverni ko'rsatish kerak. Ikki yo'ldan biri:

- kirish ekranida **Server manzili** ga Render manzilingizni yozing, yoki
- `index.html` ichida `const VB_SERVER = "";` qatoriga manzilni yozib qo'ying: `const VB_SERVER = "https://vaqt-banki.onrender.com";`

---

## 5. Bepul reja haqida bilib qo'ying

**Render (server)**
- **Server uxlaydi.** 15 daqiqa so'rov kelmasa, Render bepul serverni uxlatadi; keyingi ochilishda uyg'onishi bir daqiqagacha vaqt oladi. Ilova buni kutmaydi: telefonga o'rnatilgan bo'lsa darhol ochiladi, yozuvlar shu qurilmada saqlanadi va server uyg'onishi bilan o'zi yuboriladi (tepada bulut belgisi aylanib turadi).
- **Oylik 750 soat — hamma bepul serverlarga umumiy.** Hisob, Kun tartibi va Vaqt Banki serverlari shu 750 soatni birga sarflaydi; tugasa, oy oxirigacha hammasi to'xtaydi. Shuning uchun ilovada **tejamkor rejim** bor: ilova 12 daqiqa ishlatilmasa yoki 3 daqiqa orqa fonda tursa, jonli aloqa uziladi va server uxlay oladi. Ekranga tegishingiz bilan aloqa tiklanadi.
- **Parolni tiklash email orqali emas.** Render'ning bepul serverida xat yuborish (SMTP) portlari yopiq, shuning uchun ilovada **tiklash kodi** bor: Profil → Xavfsizlik → Tiklash kodi. Kodni yozib, xavfsiz joyda saqlang — parol unutilsa, kirish ekranidagi «Parolni unutdingizmi?» orqali shu kod bilan yangisini o'rnatasiz.

**Neon (baza)**
- **Muddati yo'q.** Bepul reja sinov emas, doimiy; ma'lumot muddat o'tgani uchun o'chirilmaydi. (Render'ning o'z bepul bazasi esa 30 kundan keyin to'xtaydi — baza shuning uchun Neon'da.)
- **Baza ham uxlaydi** — 5 daqiqa so'rov kelmasa. Uyg'onishi soniyadan kam, sezilmaydi. Server bo'sh turganda bazaga umuman murojaat qilmaydi, shuning uchun baza bemalol uxlaydi.
- **Oyiga 100 CU-soat** hisoblash vaqti (eng kichik o'lchamda taxminan 400 soat uyg'oq turish). Bir kishilik foydalanishga ortig'i bilan yetadi. Tugab qolsa, baza keyingi oy boshigacha to'xtaydi — ma'lumot o'chmaydi, yozuvlaringiz esa qurilmada navbatda turadi va keyin o'zi ketadi.
- **1 GB joy.** Yillar davomidagi yozuvlar bir necha megabayt bo'ladi.
- **Zaxira.** Neon bepul rejada faqat oxirgi 6 soatni tiklay oladi. Shuning uchun ilovada Profil → Zaxira va ma'lumotlar → **To'liq zaxira (JSON)** orqali vaqti-vaqti bilan nusxa olib turing.

Manbalar: <https://render.com/docs/free>, <https://neon.com/docs/introduction/plans>

---

## 6. Sozlamalar (Environment Variables)

| Nomi | Majburiy | Nima |
|---|---|---|
| `DATABASE_URL` | ha | Baza manzili — Neon → Connect oynasidagi connection string (istalgan PostgreSQL ham bo'ladi) |
| `ALLOW_SIGNUP` | yo'q | `0` — yangi ro'yxatdan o'tish yopiladi |
| `CORS_ORIGIN` | yo'q | `index.html` boshqa manzilda tursa, faqat shu manzillarga ruxsat (vergul bilan). Standart: hammasiga |
| `PGSSL` | yo'q | Odatda kerak emas — server o'zi aniqlaydi (Neon uchun: SSL, sertifikat tekshiriladi). Qo'lda: `verify` — tekshirilgan SSL, `1` — tekshirilmagan SSL, `0` — SSL'siz |
| `PORT` | yo'q | Render o'zi beradi |

---

## 7. Sinxron qanday ishlaydi

- Har bir yozuv avval shu qurilmada saqlanadi, keyin serverga yuboriladi. Internet yo'q bo'lsa navbatda kutadi.
- Server har bir o'zgarishga tartib raqami beradi; qurilma faqat o'zida yo'q o'zgarishlarni oladi.
- Boshqa qurilmada o'zgarish bo'lsa, server WebSocket orqali darhol xabar beradi (jonli aloqa uzilsa — har 25 soniyada tekshiriladi).
- Bitta yozuv ikki qurilmada bir vaqtda o'zgartirilsa, keyinroq o'zgartirilgani qoladi.
- Parollar serverda ochiq saqlanmaydi (scrypt bilan xeshlanadi), kirish kalitlari ham xesh ko'rinishida turadi.
- Server bilan baza orasidagi aloqa shifrlangan (SSL) va Neon sertifikati tekshiriladi.

---

## 8. Kompyuterda sinab ko'rish

Node.js 18.17+ va PostgreSQL kerak.

```
npm install
DATABASE_URL=postgres://foydalanuvchi:parol@localhost:5432/vaqtbanki npm start
```

Keyin brauzerda `http://localhost:3000` ni oching.

---

## 9. Ilovani o'zgartirish (ishlab chiquvchi uchun)

`public/index.html` qo'lda yozilmagan — `src/` papkasidagi bo'laklardan yig'iladi:

```
src/css/*.css   ko'rinish          src/js/*.js   mantiq (00-data … 90-init)
src/head.html, src/body.html       src/seed.json namuna ma'lumot
```

```
npm i --no-save lucide-static@1.54.0 chart.js@4.5.1 @fontsource-variable/plus-jakarta-sans
node src/build.mjs            # → public/index.html
```

Sinovlar haqiqiy PostgreSQL va Chromium (Playwright) bilan ishlaydi; yo'llar `test/_env.mjs` da:

```
node test/api.mjs                              # server: 63 ta tekshiruv
sh test/srv.sh 4311 && node test/e2e.mjs       # brauzer: kirish, jonli sinxron, oflayn, ko'p oyna, baza uzilishi — 112 ta
node test/quota.mjs && node test/perf.mjs      # xotira to'lishi, katta hajmda tezlik
node test/tour.mjs light phone                 # barcha ekranlar skrinshoti (shots/ papkasiga)
```

**Diqqat:** sinovlar `TEST_DB` bazasidagi `vb_` jadvallarini tozalaydi — hech qachon haqiqiy bazaga qaratmang.
