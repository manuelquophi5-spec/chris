/**
 * Generates PWA icons from public/logo.png (Data Link brand).
 * Falls back to wine-colored placeholder if sharp or logo is unavailable.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
const logoPath = join(__dirname, "..", "public", "logo.png");
const WINE = "#6B2D3E";
const CREAM = "#F5F0E8";

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function generateFromLogo() {
  const sharp = (await import("sharp")).default;
  await access(logoPath);
  const logo = sharp(logoPath);
  const meta = await logo.metadata();
  if (!meta.width) throw new Error("Invalid logo");

  const padded = await logo
    .resize(420, 420, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 46,
      bottom: 46,
      left: 46,
      right: 46,
      background: CREAM,
    })
    .png()
    .toBuffer();

  const base = sharp(padded);
  await base.resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
  await base.resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));
  await sharp(padded)
    .resize(512, 512)
    .extend({ top: 0, bottom: 0, left: 0, right: 0 })
    .png()
    .toFile(join(iconsDir, "icon-maskable-512.png"));
  console.log("Generated PWA icons from logo.png");
}

async function generateWineFallback() {
  const sharp = (await import("sharp")).default;
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="${CREAM}"/>
      <circle cx="256" cy="256" r="160" fill="${WINE}" opacity="0.12"/>
      <text x="256" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="120" font-weight="700" fill="${WINE}">DL</text>
    </svg>
  `;
  const base = sharp(Buffer.from(svg));
  await base.resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
  await base.resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));
  const maskable = sharp(Buffer.from(svg.replace('rx="96"', 'rx="0"')));
  await maskable.resize(512, 512).png().toFile(join(iconsDir, "icon-maskable-512.png"));
  console.log("Generated wine fallback PWA icons");
}

async function ensurePlaceholder(file) {
  try {
    await access(file);
  } catch {
    await writeFile(file, MINI_PNG);
    console.warn("Placeholder icon (install sharp for proper PWA):", file);
  }
}

await mkdir(iconsDir, { recursive: true });

try {
  await generateFromLogo();
} catch (logoErr) {
  console.warn("[pwa-icons] logo generation failed:", logoErr?.message ?? logoErr);
  try {
    await generateWineFallback();
  } catch (err) {
    console.warn("[pwa-icons] sharp not available:", err?.message ?? err);
    await ensurePlaceholder(join(iconsDir, "icon-192.png"));
    await ensurePlaceholder(join(iconsDir, "icon-512.png"));
    await ensurePlaceholder(join(iconsDir, "icon-maskable-512.png"));
  }
}
