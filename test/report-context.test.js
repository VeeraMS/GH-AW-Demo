import assert from "node:assert/strict";
import test from "node:test";
import { reportContext } from "../scripts/report-context.js";

test("daily report uses the latest 09:00 IST cutoff and a 24-hour interval", () => {
  const context = reportContext("daily", new Date("2026-10-20T12:00:00Z"));
  assert.equal(context.title, "[daily-report] 2026-10-20");
  assert.equal(context.start, "2026-10-19T03:30:00.000Z");
  assert.equal(context.end, "2026-10-20T03:30:00.000Z");
});

test("daily report before cutoff uses the previous day, including year rollover", () => {
  const context = reportContext("daily", new Date("2027-01-01T03:29:59Z"));
  assert.equal(context.title, "[daily-report] 2026-12-31");
  assert.equal(context.start, "2026-12-30T03:30:00.000Z");
});

test("weekly report uses the latest Friday 17:00 IST cutoff", () => {
  const context = reportContext("weekly", new Date("2026-10-20T12:00:00Z"));
  assert.equal(context.title, "[weekly-digest] 2026-10-16");
  assert.equal(context.start, "2026-10-09T11:30:00.000Z");
  assert.equal(context.end, "2026-10-16T11:30:00.000Z");
});

test("Friday before cutoff uses the previous completed week", () => {
  assert.equal(
    reportContext("weekly", new Date("2026-10-23T11:29:59Z")).end,
    "2026-10-16T11:30:00.000Z",
  );
  assert.equal(
    reportContext("weekly", new Date("2026-10-23T11:30:00Z")).end,
    "2026-10-23T11:30:00.000Z",
  );
});

test("manual reruns within one period have the same title and boundaries", () => {
  for (const kind of ["daily", "weekly"]) {
    const first = reportContext(kind, new Date("2026-10-23T12:00:00Z"));
    const second = reportContext(kind, new Date("2026-10-23T19:00:00Z"));
    assert.equal(first.title, second.title);
    assert.equal(first.start, second.start);
    assert.equal(first.end, second.end);
  }
});

test("invalid report kind and time fail explicitly", () => {
  assert.throws(() => reportContext("monthly"), /Report kind/);
  assert.throws(() => reportContext("daily", new Date(NaN)), /valid date/);
});
