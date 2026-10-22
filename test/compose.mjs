// Bir nechta skrinshotni yonma-yon bitta rasmga yig'adi:  node compose.mjs out.png a.png b.png ...
import { toolsRequire } from "./_env.mjs";
const sharp = toolsRequire("sharp");
const [, , out, ...files] = process.argv;
const H = +(process.env.H || 1400), GAP = 36, PAD = 44, BG = process.env.BG || "#0b0e24";
const imgs = [];
for (const f of files) { const b = await sharp(f).resize({ height: H }).png().toBuffer(); const m = await sharp(b).metadata();
  const mask = Buffer.from(`<svg width="${m.width}" height="${m.height}"><rect width="${m.width}" height="${m.height}" rx="44" ry="44"/></svg>`);
  imgs.push({ buf: await sharp(b).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer(), w: m.width, h: m.height }); }
const W = imgs.reduce((a, i) => a + i.w, 0) + GAP * (imgs.length - 1) + PAD * 2;
let x = PAD; const comp = imgs.map((i) => { const c = { input: i.buf, left: x, top: PAD }; x += i.w + GAP; return c; });
await sharp({ create: { width: W, height: H + PAD * 2, channels: 4, background: BG } }).composite(comp).png().toFile(out);
console.log("composed", out, W + "x" + (H + PAD * 2));
