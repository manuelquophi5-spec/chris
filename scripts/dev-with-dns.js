// Wrapper: set DNS before running Next.js dev server
require("./dns-patch.js");
const { spawn } = require("child_process");
const path = require("path");

const nextBin = path.resolve(__dirname, "..", "node_modules", "next", "dist", "bin", "next");

spawn(
  process.execPath,
  ["--require", path.join(__dirname, "dns-patch.js"), nextBin, "dev"],
  { stdio: "inherit", env: { ...process.env } }
).on("exit", (code) => process.exit(code || 0));
