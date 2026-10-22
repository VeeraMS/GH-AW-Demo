import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { planIssues } from "../scripts/seed-issues.js";

test("issue manifest has five unique IDs and classifications", () => {
  const issues = JSON.parse(readFileSync(new URL("../demo/issues.json", import.meta.url), "utf8"));
  assert.equal(issues.length, 5);
  assert.equal(new Set(issues.map((issue) => issue.id)).size, 5);
  for (const issue of issues) {
    assert.ok(issue.title.includes(issue.id));
    assert.ok(["bug", "enhancement"].includes(issue.kind));
    assert.match(issue.body, /expected|should|Implement/i);
  }
});

test("issue planning skips existing exercise IDs without changing older issues", () => {
  const definitions = [{ id: "CART-001" }, { id: "THEME-001" }];
  assert.deepEqual(planIssues(definitions, [{ title: "[fix] CART-001 Already reported" }]), [definitions[1]]);
  assert.equal(planIssues(definitions, [{ title: "Percentage discount incorrectly reduces shipping charges" }]).length, 2);
});
