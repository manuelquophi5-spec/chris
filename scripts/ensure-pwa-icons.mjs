/**
 * Generates real 192×192 and 512×512 PWA icons (required for install).
 * Falls back to a tiny PNG only if sharp is unavailable.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");

const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function generateWithSharp() {
  const sharp = (await import("sharp")).default;
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="96" fill="#059669"/>
      <circle cx="256" cy="256" r="140" fill="#ffffff" opacity="0.15"/>
      <text x="256" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="200" font-weight="700" fill="#ffffff">E</text>
    </svg>
  `;
  const base = sharp(Buffer.from(svg));
  await base.resize(192, 192).png().toFile(join(iconsDir, "icon-192.png"));
  await base.resize(512, 512).png().toFile(join(iconsDir, "icon-512.png"));
  const maskable = sharp(Buffer.from(svg.replace('rx="96"', 'rx="0"')));
  await maskable.resize(512, 512).png().toFile(join(iconsDir, "icon-maskable-512.png"));
  console.log("Generated PWA icons with sharp");
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
  await generateWithSharp();
} catch (err) {
  console.warn("[pwa-icons] sharp not available:", err?.message ?? err);
  await ensurePlaceholder(join(iconsDir, "icon-192.png"));
  await ensurePlaceholder(join(iconsDir, "icon-512.png"));
  await ensurePlaceholder(join(iconsDir, "icon-maskable-512.png"));
}
