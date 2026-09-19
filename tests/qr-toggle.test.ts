import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveQrAction, QR_MIN_MINUTES_BEFORE_CHECKOUT } from "../lib/qr-toggle.ts";

const t0 = new Date("2026-09-18T09:00:00Z");
const after = (min: number) => new Date(t0.getTime() + min * 60_000);

test("first scan of the day checks in", () => {
  const r = resolveQrAction({ hasIn: false, hasOut: false, checkInAt: null, now: t0 });
  assert.deepEqual(r, { ok: true, type: "check_in" });
});

test("a scan right after check-in is refused, not turned into a check-out", () => {
  const r = resolveQrAction({ hasIn: true, hasOut: false, checkInAt: t0, now: after(1) });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.status, 409);
    assert.match(r.error, /4 minutes/);
  }
});

test("scan after the minimum gap checks out", () => {
  const r = resolveQrAction({
    hasIn: true,
    hasOut: false,
    checkInAt: t0,
    now: after(QR_MIN_MINUTES_BEFORE_CHECKOUT),
  });
  assert.deepEqual(r, { ok: true, type: "check_out" });
});

test("nothing left once checked in and out", () => {
  const r = resolveQrAction({ hasIn: true, hasOut: true, checkInAt: t0, now: after(90) });
  assert.equal(r.ok, false);
});

test("singular minute wording", () => {
  const r = resolveQrAction({ hasIn: true, hasOut: false, checkInAt: t0, now: after(4.5) });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /1 minute to/);
});
