require("./dns-patch.js");
const { readFileSync, existsSync } = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
    employeeId: String, email: String, passwordHash: String, passwordMustChange: Boolean,
    failedLoginAttempts: Number, lockedUntil: Date, name: String, role: String,
    program: String, level: Number
  }, { timestamps: true }));

  const hash = await bcrypt.hash("Student12345", 12);
  await User.findOneAndUpdate(
    { employeeId: "STU001" },
    { employeeId: "STU001", email: "stu001@ella.local", passwordHash: hash, name: "Test Student",
      role: "user", program: "computer-science", level: 200, passwordMustChange: false,
      failedLoginAttempts: 0, lockedUntil: null },
    { upsert: true, new: true }
  );
  console.log("Student created: STU001 / Student12345");
  console.log("Sign in at /login with Student ID: STU001");
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
