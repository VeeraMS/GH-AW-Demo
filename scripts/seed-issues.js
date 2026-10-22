import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export function planIssues(definitions, existing) {
  return definitions.filter((definition) => !existing.some((issue) => issue.title.includes(definition.id)));
}

function gh(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `gh exited ${result.status}`);
  return result.stdout.trim();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--publish")) throw new Error("Usage: npm run issues:seed -- [--publish]");
  const definitions = JSON.parse(readFileSync(new URL("../demo/issues.json", import.meta.url), "utf8"));
  const repository = JSON.parse(gh(["repo", "view", "--json", "nameWithOwner"])).nameWithOwner;
  const existing = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/issues?state=all&per_page=100`])).flat().filter((item) => !item.pull_request);
  const pending = planIssues(definitions, existing);
  for (const issue of pending) {
    if (!args.includes("--publish")) {
      console.log(`[dry run] ${repository}: ${issue.title}`);
      continue;
    }
    const body = `${issue.body}\n\n## Demo context\n\nThis is an intentional Everyday Market exercise (${issue.id}), not a production incident. Requirements and browser checks: docs/exercises.md. Architecture: docs/design.md.\n\nThe storefront conversion must be committed and pushed before an agent can reproduce this on GitHub. Opening this issue does not publish local files. If a workflow runs against the older CLI baseline, stop and report that mismatch; do not invent a reproduction.\n\nAfter publishing: bugs use the opened-only [fix] workflow. For an issue opened before publishing, add a new /fix-cart comment after publishing to trigger a fresh run. Feature requests use /implement-feature. Triage uses /triage-cart. Commands are limited to trusted repository roles by gh-aw.`;
    console.log(`${issue.id}: ${gh(["issue", "create", "--repo", repository, "--title", issue.title, "--body-file", "-"], body)}`);
  }
  console.log(`${pending.length} issue(s) ${args.includes("--publish") ? "created" : "planned"}. Existing exercise IDs are skipped, including closed issues.`);
}
