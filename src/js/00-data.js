"use strict";
/* ============================================================
   VAQT BANKI 2.0 — har bir daqiqa bir tanga
   Bo'limlar tartibi:
     1. MA'LUMOT        — doimiylar, toifalar, ikonkalar
     2. YORDAMCHILAR    — sana, format, DOM
     3. XOTIRA          — holat, saqlash, o'zgartirish amallari
     4. HISOB           — o'rtachalar, qarzlar, maqsadlar, tavsiyalar
     5. SINXRON         — server bilan aloqa (email kirish, bulut, jonli)
     6. UI KIT          — oynalar, tanlagichlar, navigatsiya
     7. EKRANLAR        — Asosiy, Daftar, Fokus, Reja, Tahlil, Profil
     8. ISHGA TUSHIRISH
   ============================================================ */

// ============================ 1. MA'LUMOT ============================
const APP_VER = "2.1.0";

// Server manzili. Bo'sh qolsa — ilova qaysi serverdan ochilgan bo'lsa, o'sha ishlatiladi (Render).
// Faylni boshqa joyga (GitHub Pages, APK) qo'ysangiz, shu yerga yozing: "https://vaqt-banki.onrender.com"
const VB_SERVER = "";

// Ko'rgazma nusxa: sahifa serversiz, faqat ko'rib chiqish uchun ochilganda true bo'ladi
// (namuna ma'lumot bilan ochiladi; kirish, sinxron va fayl yuklab olish o'chiriladi). Oddiy ilovada — false.
const VB_KORGAZMA = /*KORGAZMA*/false;

// AI yordamchi modeli (Anthropic API). Birinchisi topilmasa (eskirgan bo'lsa), zaxiradagisi ishlatiladi.
const AI_MODEL = "claude-sonnet-4-6";
const AI_MODEL_ZAXIRA = "claude-sonnet-5-5";

const KUNLIK = 1440;                      // bir kun = 1440 daqiqa = 1440 tanga
const KEY = "vaqtBanki2026";              // yozuvlar (oldingi versiya bilan bir xil kalit — ma'lumot saqlanib qoladi)
const CFG_KEY = "vaqtBankiCfg2026";       // sozlamalar, reja, shablonlar
const SYNC_KEY = "vbSync";                // sinxron holati (hisob, navbat)

// Namuna ma'lumot (ixtiyoriy: Profil → Ma'lumotlar → «Namuna yuklash»)
const SEED = /*SEED*/[];

// Yo'nalishlar (guruhlar). Rang CSS'da: --g-<kalit>. bucket: foydali / zarur / behuda
const GURUH = {
  uyqu:    {nom:"Uyqu va dam",    icon:"moon",        bucket:"zarur"},
  asosiy:  {nom:"Asosiy ehtiyoj", icon:"utensils",    bucket:"zarur"},
  rivoj:   {nom:"Rivojlanish",    icon:"sprout",      bucket:"foydali"},
  yumush:  {nom:"Uy yumushlari",  icon:"house",       bucket:"zarur"},
  ijtimoiy:{nom:"Ijtimoiy",       icon:"users",       bucket:"zarur"},
  soglik:  {nom:"Sog'lik",        icon:"heart-pulse", bucket:"foydali"},
  ish:     {nom:"Ish",            icon:"briefcase",   bucket:"foydali"},
  behuda:  {nom:"Behuda",         icon:"hourglass",   bucket:"behuda"},
  yol:     {nom:"Yo'l va boshqa", icon:"route",       bucket:"zarur"},
};
// Tartib o'zgarmas: qo'shni ranglar bir-biridan aniq ajralishi shu tartibga bog'liq
const GURUH_TARTIB = ["uyqu","asosiy","rivoj","yumush","ijtimoiy","soglik","ish","behuda","yol"];

// Toifa raqami -> guruh
const RAQAM_GURUH = {
  "01":"uyqu","02":"asosiy","03":"asosiy","04":"yol","05":"rivoj","06":"rivoj",
  "07":"rivoj","08":"ish","09":"soglik","10":"soglik","11":"rivoj","12":"rivoj",
  "13":"yumush","14":"ijtimoiy","15":"yol","16":"yumush","17":"yol","18":"asosiy",
  "19":"asosiy","20":"yumush","21":"asosiy","23":"yumush","24":"ijtimoiy","25":"rivoj",
  "26":"rivoj","27":"asosiy","28":"asosiy","29":"yumush","30":"yumush","31":"asosiy","32":"behuda"
};
// Toifa raqami -> ikonka
const RAQAM_ICON = {
  "01":"bed","02":"sunrise","03":"sunset","04":"car","05":"book-open","06":"graduation-cap",
  "07":"book-heart","08":"briefcase","09":"footprints","10":"dumbbell","11":"chart-pie","12":"clipboard-list",
  "13":"spray-can","14":"phone-call","15":"ellipsis","16":"shopping-cart","17":"plane","18":"shirt",
  "19":"wind","20":"washing-machine","21":"bath","23":"brush","24":"messages-square","25":"wallet",
  "26":"keyboard","27":"droplets","28":"shower-head","29":"bed-double","30":"paintbrush","31":"toilet","32":"hourglass"
};
// Yangi toifa uchun tanlanadigan ikonkalar
const ICON_TANLOV = ["book-open","graduation-cap","brain","code-xml","laptop","pen-line","notebook-pen","languages",
  "dumbbell","bike","footprints","heart-pulse","apple","salad","coffee","utensils","cooking-pot","bed","moon","bath",
  "shirt","house","spray-can","washing-machine","wrench","shopping-cart","car","bus","plane","train-front","users",
  "phone-call","messages-square","baby","hand-heart","gamepad-2","tv","music","smartphone","hourglass","wallet",
  "briefcase","calculator","stethoscope","scissors","sprout","leaf","mountain","tent","book-heart","star","flag"];

// To'liq toifalar ro'yxati
const KATEGORIYALAR = [
  "01. Uyquga","02. Saharlikka","03 Iftorlikka","04 Yo'lga","05 Kitob o'qishga",
  "06 Dars qilishga","07 Sura yodlashga","08 Ishga - Karimbek","09 Yugurishga",
  "10 Badan tarbiyaga","11 Vaqt tahlini kiritishga","12 Reja tuzishga","13 Uborkaga",
  "14 Telefonda gaplashishga","15 Boshqa","16 Bozor qilishga","17 Uzoq safarga",
  "18. Kiyinish/Yechinishga","19 Soch quritishga","20 Kir yuvishga","21 Cho'milishga",
  "23 Supur - sidirga","24 Suhbatga","25 Moliyaviy tahlilini kiritishga",
  "26 Ma'lumotlarni Kompga kiritishga","27 Tahoratga","28 Dush qabul qilishga",
  "29 Xonani tartibga keltirishga","30 Oyoq kiyimni tozalashga","31 Hojatga",
  "32 BEHUDA O'TGAN VAQT"
];
const KAT_BEHUDA = "32 BEHUDA O'TGAN VAQT";

const VBUDJET = {uyqu:450, ish:540, rivoj:90, soglik:45, asosiy:120, yumush:90, ijtimoiy:45, yol:60, behuda:0};
const SHABLON_STD = [
  {nom:"Saharlik", kat:"02. Saharlikka", daqiqa:15},
  {nom:"Tahorat", kat:"27 Tahoratga", daqiqa:10},
  {nom:"Sura yodlash", kat:"07 Sura yodlashga", daqiqa:30},
  {nom:"Ishga", kat:"08 Ishga - Karimbek", daqiqa:540},
  {nom:"Yo'l (ishga)", kat:"04 Yo'lga", daqiqa:15},
  {nom:"Uyqu", kat:"01. Uyquga", daqiqa:450},
];
const SOZLAMA_STD = {eslatma:false, vaqt:"21:00", som:0, tovush:true, vibra:true, effekt:true, alifbo:"lotin", mavsum:"avto"};
const TIMER_STD = {ish:false, start:0, baza:0, kat:"11 Vaqt tahlini kiritishga"};

const OYLAR = ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"];
const OY_TOLIQ = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const HK_QISQA = ["Ya","Du","Se","Cho","Pa","Ju","Sha"];                      // getDay() bo'yicha
const HK_TOLIQ = ["yakshanba","dushanba","seshanba","chorshanba","payshanba","juma","shanba"];
