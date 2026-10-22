import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { releaseContext } from "../scripts/release-context.js";

test("release preparation validates refs, range, ambiguity, and input safety", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "agentic-release-test-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const commit = (message) => git(
    "-c", "user.name=Demo Test", "-c", "user.email=demo@example.invalid",
    "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", message,
  );

  git("init", "-b", "main");
  commit("Baseline");
  git("tag", "demo-v0.1.0");
  const previousSha = git("rev-parse", "HEAD");
  commit("Document pricing examples");
  const targetSha = git("rev-parse", "HEAD");
  const context = releaseContext("demo-v0.1.0", "main", cwd);
  assert.equal(context.previousSha, previousSha);
  assert.equal(context.targetSha, targetSha);
  assert.deepEqual(context.commits, [{ sha: targetSha, subject: "Document pricing examples" }]);
  assert.equal(context.title, `[release-notes] ${previousSha}..${targetSha}`);
  assert.deepEqual(releaseContext("demo-v0.1.0", "demo-v0.1.0", cwd).commits, []);
  assert.equal(releaseContext("demo-v0.1.0", targetSha, cwd).targetSha, targetSha);
  assert.throws(() => releaseContext("missing-tag", "main", cwd));
  assert.throws(() => releaseContext("main", "main", cwd));
  assert.throws(() => releaseContext("demo-v0.1.0", "missing-branch", cwd), /not found/);

  for (const input of ["--help", "main; echo bad", "$(whoami)", "main^", "../main", "main\n"]) {
    assert.throws(() => releaseContext("demo-v0.1.0", input, cwd));
    assert.throws(() => releaseContext(input, "main", cwd));
  }

  git("tag", "main", previousSha);
  assert.throws(() => releaseContext("demo-v0.1.0", "main", cwd), /ambiguous/);
  git("tag", "-d", "main");
  git("tag", "future");
  assert.throws(
    () => releaseContext("future", "demo-v0.1.0", cwd),
    /must be an ancestor/,
  );
});
