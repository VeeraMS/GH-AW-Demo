import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function validateRef(value, name, cwd) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 200 ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value)
  ) {
    throw new Error(`${name} must be a plain Git ref or SHA, not a command or expression.`);
  }
  git(["check-ref-format", "--allow-onelevel", value], cwd);
}

export function releaseContext(previousTag, targetRevision, cwd = process.cwd()) {
  validateRef(previousTag, "Previous tag", cwd);
  validateRef(targetRevision, "Target revision", cwd);

  const previousSha = git([
    "rev-parse", "--verify", "--end-of-options", `refs/tags/${previousTag}^{commit}`,
  ], cwd);

  let targetRef = targetRevision;
  if (!/^[a-fA-F0-9]{7,40}$/.test(targetRevision)) {
    const candidates = [
      `refs/heads/${targetRevision}`,
      `refs/remotes/origin/${targetRevision}`,
      `refs/tags/${targetRevision}`,
    ];
    const matches = candidates.filter((ref) => {
      const result = spawnSync("git", ["show-ref", "--verify", "--quiet", ref], { cwd });
      if (result.error) throw result.error;
      if (![0, 1].includes(result.status)) {
        throw new Error(`Unable to inspect ref ${ref}: ${result.stderr?.toString()}`);
      }
      return result.status === 0;
    });
    if (!matches.length) throw new Error(`Target revision not found: ${targetRevision}`);
    const resolved = matches.map((ref) =>
      git(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], cwd));
    if (new Set(resolved).size !== 1) {
      throw new Error(`Target revision is ambiguous between branches/tags: ${targetRevision}`);
    }
    targetRef = matches[0];
  }

  const targetSha = git([
    "rev-parse", "--verify", "--end-of-options", `${targetRef}^{commit}`,
  ], cwd);
  const ancestry = spawnSync("git", ["merge-base", "--is-ancestor", previousSha, targetSha], { cwd });
  if (ancestry.error) throw ancestry.error;
  if (ancestry.status === 1) {
    throw new Error("The previous tag must be an ancestor of the target revision.");
  }
  if (ancestry.status !== 0) {
    throw new Error(`Git ancestry check failed: ${ancestry.stderr?.toString()}`);
  }

  const range = `${previousSha}..${targetSha}`;
  const hashes = git(["rev-list", "--reverse", range], cwd);
  const commits = hashes ? hashes.split(/\r?\n/).map((sha) => ({
    sha,
    subject: git(["show", "-s", "--format=%s", sha], cwd),
  })) : [];
  return {
    title: `[release-notes] ${previousSha}..${targetSha}`,
    previousTag,
    targetRevision,
    previousSha,
    targetSha,
    range,
    commits,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = releaseContext(process.env.PREVIOUS_TAG, process.env.TARGET_REVISION);
  writeFileSync(".git/agentic-release-context.json", JSON.stringify(context, null, 2));
  console.log(`Prepared ${context.commits.length} commits for ${context.range}`);
}
