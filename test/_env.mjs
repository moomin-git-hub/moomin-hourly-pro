// Sinovlar uchun umumiy yo'llar. Muhit o'zgaruvchilari bilan o'zgartirsa bo'ladi:
//   VB_PW     — playwright va sharp o'rnatilgan node_modules (standart: /opt/npm-tools/node_modules/)
//   TEST_DB   — sinov bazasi (standart: postgres://vb@127.0.0.1:54329/vaqtbanki). DIQQAT: sinov vb_ jadvallarini tozalaydi!
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
export const SHOTS = path.join(ROOT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
export const TEST_DB = process.env.TEST_DB || "postgres://vb@127.0.0.1:54329/vaqtbanki";
export const toolsRequire = createRequire(process.env.VB_PW || "/opt/npm-tools/node_modules/");
export const rootRequire = createRequire(ROOT + "/");
