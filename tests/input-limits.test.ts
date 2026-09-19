import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLateAfterMinutes, validateRadiusMeters } from "../lib/input-limits.ts";

test("late-after minutes: sensible values pass, junk falls back instead of NaN", () => {
  assert.equal(parseLateAfterMinutes(10), 10);
  assert.equal(parseLateAfterMinutes("20"), 20);
  assert.equal(parseLateAfterMinutes(undefined), 15);
  assert.equal(parseLateAfterMinutes(""), 15);
  assert.equal(parseLateAfterMinutes("abc"), 15);
  assert.equal(parseLateAfterMinutes(NaN), 15);
  assert.equal(parseLateAfterMinutes(Infinity), 15);
});

test("late-after minutes are clamped to 0-120 and rounded", () => {
  assert.equal(parseLateAfterMinutes(-5), 0);
  assert.equal(parseLateAfterMinutes(999), 120);
  assert.equal(parseLateAfterMinutes(7.6), 8);
});

test("campus radius must be 10-5000 m", () => {
  assert.equal(validateRadiusMeters(100), null);
  assert.equal(validateRadiusMeters(10), null);
  assert.equal(validateRadiusMeters(5000), null);
  assert.match(validateRadiusMeters(9) ?? "", /at least 10/);
  assert.match(validateRadiusMeters(5001) ?? "", /at most 5000/);
  assert.match(validateRadiusMeters(50_000_000) ?? "", /at most 5000/);
  assert.match(validateRadiusMeters(NaN) ?? "", /at least 10/);
  assert.match(validateRadiusMeters(Infinity) ?? "", /at least 10/);
});
