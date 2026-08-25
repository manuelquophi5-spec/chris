/**
 * Create or update the admin account (email + password).
 * Loads .env.local via dotenv if present.
 *
 * Usage:
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='YourLongPassword1' ADMIN_NAME='Admin' npm run create-admin
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Some local/ISP networks block MongoDB Atlas SRV lookups; Google DNS works
// around that (same fix as lib/db.ts and scripts/setup-school.js).
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  /* ignore if already set */
}

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = (process.env.ADMIN_NAME ?? "Admin").trim();

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Set ADMIN_EMAIL to a valid email address");
  process.exit(1);
}
if (password.length < 10) {
  console.error("ADMIN_PASSWORD must be at least 10 characters");
  process.exit(1);
}
if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("ADMIN_PASSWORD must include letters and numbers");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, sparse: true, uppercase: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, select: false },
    passwordMustChange: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true },
);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);

function employeeIdFromEmail(addr) {
  const local = addr
    .split("@")[0]
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 32);
  return local.length >= 3 ? local : "ADMIN";
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  const employeeId = employeeIdFromEmail(email);

  const existing = await User.findOne({ email }).select("+passwordHash");
  if (existing) {
    existing.name = name;
    existing.role = "admin";
    existing.passwordHash = passwordHash;
    existing.passwordMustChange = false;
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = null;
    if (!existing.employeeId) existing.employeeId = employeeId;
    await existing.save();
    console.log(`Updated admin: ${email}`);
  } else {
    await User.create({
      email,
      name,
      role: "admin",
      employeeId,
      passwordHash,
      passwordMustChange: false,
    });
    console.log(`Created admin: ${email}`);
  }

  console.log("Sign in at /login/admin with this email and password.");
  await mongoose.disconnect();
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
