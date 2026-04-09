import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import { join, extname, basename } from "path";

const IMG_DIR = new URL("../src/assets/img", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const QUALITY = 82;

const FILES_TO_CONVERT = [
  "1.png", "2.png", "3.png",
  "4.jpg", "5.jpg", "6.jpg", "7.jpg", "8.jpg",
  "fotomontaje3.jpg",
];

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function compress() {
  console.log("\n  RIXX — Image Compression (sharp → WebP)\n");
  console.log("  Dir:", IMG_DIR, "\n");

  let totalBefore = 0;
  let totalAfter  = 0;

  for (const file of FILES_TO_CONVERT) {
    const src  = join(IMG_DIR, file);
    const name = basename(file, extname(file));
    const dest = join(IMG_DIR, `${name}.webp`);

    try {
      const { size: before } = await stat(src);
      await sharp(src).webp({ quality: QUALITY }).toFile(dest);
      const { size: after } = await stat(dest);

      const saved = (((before - after) / before) * 100).toFixed(0);
      totalBefore += before;
      totalAfter  += after;

      console.log(`  ✓  ${file.padEnd(20)} ${fmtKB(before).padStart(10)} → ${fmtKB(after).padStart(10)}   (-${saved}%)`);
    } catch (err) {
      console.error(`  ✗  ${file}: ${err.message}`);
    }
  }

  const totalSaved = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0);
  console.log(`\n  Total: ${fmtKB(totalBefore)} → ${fmtKB(totalAfter)}  (ahorro: -${totalSaved}%)\n`);
}

compress();
