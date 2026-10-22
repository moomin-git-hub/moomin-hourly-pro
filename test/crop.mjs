// Uzun skrinshotni bo'laklarga kesadi:  node test/crop.mjs <fayl> [balandlik]
import { toolsRequire } from "./_env.mjs";
const sharp = toolsRequire("sharp");
const [, , f, hh = "1600"] = process.argv; const H = +hh;
const m = await sharp(f).metadata(); let i = 0;
for (let y = 0; y < m.height; y += H) { const h = Math.min(H, m.height - y); if (h < 80) break; await sharp(f).extract({ left: 0, top: y, width: m.width, height: h }).toFile(f.replace(/\.png$/, `-p${++i}.png`)); }
console.log(i, "bo'lak", m.width + "x" + m.height);
