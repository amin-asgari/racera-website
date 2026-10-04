import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("public/assets");
const iconSource = path.join(root, "icons", "app_icon.png");
const iconOutput = path.resolve("public/web-app/icons");

await mkdir(iconOutput, { recursive: true });

async function renderIcon(size, filename, padding = 0) {
  const inner = Math.max(1, Math.round(size * (1 - padding * 2)));
  const buffer = await sharp(iconSource)
    .resize(inner, inner, { fit: "contain" })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: "#0a0a0a" },
  })
    .composite([{ input: buffer, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconOutput, filename));
}

await renderIcon(180, "apple-touch-icon.png");
await renderIcon(192, "icon-192.png");
await renderIcon(512, "icon-512.png");
await renderIcon(192, "icon-maskable-192.png", 0.12);
await renderIcon(512, "icon-maskable-512.png", 0.12);
await renderIcon(96, "badge-96.png", 0.18);

// The app deliberately serves the original PNG/SVG files so the visual output
// stays byte-for-byte aligned with the Flutter source. This script only creates
// the small PWA icon derivatives; it never converts or removes source assets.
console.log("Generated PWA icons; original PNG/SVG assets were left untouched.");
