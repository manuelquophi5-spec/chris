import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "../lib/safe-redirect.ts";

const FB = "/dashboard";

test("keeps same-origin paths, including QR scan links with a query", () => {
  assert.equal(safeRedirectPath("/dashboard/admin", FB), "/dashboard/admin");
  assert.equal(
    safeRedirectPath("/scan?token=abc.def.ghi", FB),
    "/scan?token=abc.def.ghi",
  );
});

test("falls back when missing", () => {
  assert.equal(safeRedirectPath(null, FB), FB);
  assert.equal(safeRedirectPath("", FB), FB);
});

test("rejects other origins, script URLs and control-character tricks", () => {
  const bad = [
    "https://evil.example",
    "http://evil.example/x",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example/path",
    "/" + String.fromCharCode(9) + "/evil.example",
    "/" + String.fromCharCode(10) + "/evil.example",
  ];
  for (const value of bad) {
    assert.equal(safeRedirectPath(value, FB), FB, JSON.stringify(value));
  }
});
