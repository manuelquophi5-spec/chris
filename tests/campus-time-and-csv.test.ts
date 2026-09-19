import { test } from "node:test";
import assert from "node:assert/strict";
import { campusTimezoneOffsetMinutes } from "../lib/campus-time.ts";
import { neutralizeFormula } from "../lib/csv-safe.ts";

test("campus offset defaults to Ghana time (UTC+0)", () => {
  assert.equal(campusTimezoneOffsetMinutes(undefined), 0);
  assert.equal(campusTimezoneOffsetMinutes(""), 0);
  assert.equal(campusTimezoneOffsetMinutes("not a number"), 0);
});

test("campus offset override is honoured and clamped", () => {
  assert.equal(campusTimezoneOffsetMinutes("-60"), -60);
  assert.equal(campusTimezoneOffsetMinutes("99999"), 840);
  assert.equal(campusTimezoneOffsetMinutes("-99999"), -840);
});

test("formula-looking cells are neutralised, normal text is untouched", () => {
  assert.equal(neutralizeFormula("=HYPERLINK(\"http://x\")"), "'=HYPERLINK(\"http://x\")");
  assert.equal(neutralizeFormula("+1 555"), "'+1 555");
  assert.equal(neutralizeFormula("-2+3"), "'-2+3");
  assert.equal(neutralizeFormula("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(neutralizeFormula("Ama Mensah"), "Ama Mensah");
  assert.equal(neutralizeFormula("CS201"), "CS201");
  assert.equal(neutralizeFormula(""), "");
});
