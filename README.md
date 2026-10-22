# Everyday Market - Agentic Cart Demo

A dependency-free Node.js ecommerce storefront with a real local SQLite
backend for demonstrating GitHub Agentic Workflows. Requires Node.js 24 or
newer. No SQL Server, npm install, cloud database, or payment account needed.

Browse nine products across Electronics, Appliances and Mobiles, search the
catalog, manage a persistent session bag, and explore simulated payment.
The responsive design uses local CSS illustrations and no external assets.

**This baseline intentionally has five exercises:** repeated Add does not
accumulate quantities, category filters return no results, checkout links to
a missing page, the theme switch is unfinished, and paid-shipping discounts
are wrong. These are documented learning scenarios, not production features.

- [Architecture, SQL model, API and visual design](docs/design.md)
- [Bug/feature backlog, browser acceptance and workflow walkthrough](docs/exercises.md)
- [Publishable issue definitions](demo/issues.json)

## Run locally

```powershell
npm start
# Open http://127.0.0.1:3000; Ctrl+C stops the server.
npm test
npm run test:pricing
npm run demo:pricing
npm run test:acceptance
```

No package installation is necessary. `npm start` runs the web server on
loopback; SQLite seeds automatically at `data/store.sqlite` (gitignored).
`PORT` and `DATABASE_PATH` are optional environment overrides. The pricing CLI
is retained as `npm run demo:pricing`. All money uses integer USD cents.
`npm test` is the passing baseline; `test:acceptance` deliberately fails five
desired-behavior checks initially. Do not put that command in ordinary CI until
all exercises are resolved.

## Business rules

1. Apply the percentage discount to merchandise only. Never discount shipping.
2. Round the discount to the nearest cent.
3. Calculate tax on the discounted merchandise subtotal, rounded to the nearest
   cent. Shipping is not taxable in this demo.
4. Add shipping after calculating the discounted merchandise and tax.
5. Amounts must be non-negative safe integers; percentages must be finite numbers
   between 0 and 100.

## Repository layout

- `src/pricing.js`: order calculation.
- `src/demo.js`: retained sample pricing CLI.
- `src/server.js`, `src/store.js`: HTTP API and SQLite service.
- `public/`: storefront, CSS illustrations and simulated payment.
- `docs/`, `demo/issues.json`: design, exercises and issue backlog.
- `exercises/`: intentionally failing desired-behavior checks.
- `test/pricing.test.js`: baseline tests using Node's built-in test runner.
- `scripts/`: deterministic reporting-window and release-range preparation.
- `test/report-context.test.js`, `test/release-context.test.js`: workflow-helper tests.
- `.github/workflows/`: agentic Markdown sources, compiled lock files, and test CI.

## Demonstration baseline

Alongside the four new storefront exercises, this repository preserves its
original pricing defect. The baseline tests pass but omit these regressions.

Run `npm run demo:pricing` (or add one coffee maker in the web UI):

| Input | Value |
| --- | --- |
| Merchandise | $100.00 |
| Shipping | $10.00 |
| Discount | 10% |
| Tax | 0% |
| Expected total | $100.00 |
| Current total | $99.00 |

The missing regression test and the fix are deliberately left for the agentic
workflow to propose. Do not correct the defect before the demonstration.

## Bug issue to open on GitHub

**Title:** [fix] Percentage discount incorrectly reduces shipping charges

**Body:**

With a merchandise subtotal of $100, shipping of $10, a 10% discount, and no tax,
the total should be $100. The application currently returns $99.

Steps to reproduce:

1. Use Node.js 24 or newer.
2. Run `npm run demo:pricing`.
3. Observe the total of $99.

Shipping must not be discounted. Please add a regression test and preserve the
existing pricing rules.

Acceptance criteria:

- The regression test fails on the original implementation for the reported
  calculation error.
- The corrected order has a $10 discount and a $100 total.
- Existing tests continue to pass.
- The proposed pull request includes the root cause and test evidence.

## Agentic workflow demos

All agentic workflows use GitHub Copilot. Sources are compiled with gh-aw v0.92.0.
Commit each Markdown source and its matching generated `.lock.yml` file together.
Never hand-edit generated lock files.

| Demo | Markdown source | Trigger | Output |
| --- | --- | --- | --- |
| Bug fix | `fix-cart-bug.md` | New `[fix]` issue or `/fix-cart` comment | Tested draft code PR |
| Feature | `implement-store-feature.md` | `/implement-feature` comment on an issue | Tested draft feature PR |
| Issue triage | `issue-triage.md` | New `[triage]` issue or `/triage-cart` comment | One classification label and one comment |
| Daily report | `daily-repo-report.md` | Weekdays at 09:00 IST or manual | One report issue per completed reporting day |
| Weekly digest | `weekly-engineering-digest.md` | Friday at 17:00 IST or manual | One digest issue per completed reporting week |
| CI investigation | `ci-failure-investigator.md` | Failed/timed-out `Test CI` on main or demo branches | One diagnosis issue per failed run ID |
| Documentation drift | `documentation-drift.md` | Tuesday at 10:30 IST or manual | Draft docs PR, uncertainty issue, or noop |
| Release notes | `release-notes.md` | Manual, with previous tag and target revision | Draft notes issue for the resolved commit range |

`test-ci.yml` is ordinary CI, not an agentic workflow. It runs `npm test` on
pushes to main/demo branches, pull requests targeting main, and manual dispatch.
The original nine pricing tests still pass while the intentional pricing bug
remains. Additional tests cover SQLite, API, issue planning and workflow helpers.
Manual Test CI dispatch can optionally run an acceptance exercise and produce
a genuine failure for the CI investigator; normal pushes run baseline tests only.

### Prerequisites

1. GitHub Actions must be enabled in the repository.
2. Create a fine-grained PAT under your personal GitHub account with account
   permission **Copilot Requests: Read**. Store it as the **Actions repository
   secret** `COPILOT_GITHUB_TOKEN`. Never commit or paste the token into commands.
   Local `gh auth login` is separate from cloud engine authentication.
3. In **Settings > Actions > General**, enable **Allow GitHub Actions to create
   and approve pull requests** for the code/docs PR demos. These workflows do
   not approve or merge PRs.
4. Ensure the existing labels `bug`, `enhancement`, `question`, `documentation`
   are available. Triage deliberately does not create missing labels. Check
   with `gh label list --repo VeeraMS/GH-AW-Demo`. If a label is missing, create
   it in the repository's Issues > Labels UI before the demonstration.
5. Use a trusted maintainer/owner account to open demo issues. Default gh-aw
   role restrictions do not allow arbitrary external contributors to run agents.
6. Configure repository branch protections as appropriate; draft output does not
   replace review. Code-writer path restrictions in the prompt are instructions,
   not a complete filesystem security boundary.

### Local verification and publishing

From the repository root in PowerShell:

```powershell
npm test
gh aw compile
git status --short
```

Review the diff and stage only the files you intend to publish. Include the
workflow Markdown and lock files, ordinary test CI, both scripts, their tests,
and this README. Do not accidentally include unrelated local changes. Commit
and push to main yourself when ready; preparing these demos does not publish
or run them.

Pushing will activate Test CI and enable the scheduled workflows. Schedules
and manual dispatch need workflows on the default branch. Scheduling is
best-effort, not a precise-time guarantee, and enabled schedules consume Actions
and model usage. Use **Actions > workflow > Disable workflow** between sessions
if you do not want automatic runs. Fixed-time schedule advisory warnings from
the compiler are intentional for these customer-session times.

Scheduled reports also support **Actions > workflow > Run workflow** so there
is no need to wait for a schedule during a live demo.

### 1. Issue triage

Open one of these issues (include the prefix exactly):

- **[triage] Discount is wrong**: "Checkout total looks wrong. Please help."
  Expected: bug classification, targeted missing-data questions, and possible
  related issues linked without closing anything.
- **[triage] Add a loyalty discount**: "Please support an additional discount
  for repeat customers." Expected: enhancement classification, not a bug fix.
- **[triage] Are shipping charges taxable?**: "How does the demo calculate tax
  on shipping?" Expected: question classification and a response grounded in
  the documented non-taxable shipping rule, not unnecessary repro questions.

Acceptance: at most one approved label and one useful comment, no code PR.
Only `[fix]` issues activate the bug-fix workflow on opening. New `/fix-cart`,
`/triage-cart` and `/implement-feature` comments provide explicit retriggers
after publishing. Opening an automated report does not launch these agents.
Editing an existing issue title or comment does not trigger a workflow.

### 2. Daily report

Manually run **Daily Repository Report** after creating a few issues and PRs.
Verify its source links against actual repository activity.

The deterministic daily interval is the previous 24 hours ending at the latest
03:30 UTC cutoff. It does not move on reruns. Before today's cutoff it reports
the previous completed day. For Monday, the activity window starts on Sunday;
it is deliberately not a whole-weekend report.

Acceptance: exact interval displayed, new issues and failed CI evidence linked,
current attention/review snapshots distinguished from interval activity, and
no invented counts. A rerun for the same period must not create another issue.

### 3. Weekly digest

Manually run **Weekly Engineering Digest**. For a richer demonstration,
prepare a few human-reviewed PRs covering a fix, documentation, and maintenance
and merge them into the demo repository first.

The interval is seven days ending at the most recent Friday 11:30 UTC.
Running it before Friday's cutoff reports the previous completed week, so new
activity after that cutoff will not appear until the next period.

Acceptance: included PRs were actually merged inside the interval, statements
link to evidence, blockers are distinguished as a current snapshot, and no
claim that merged code was deployed. Rerunning the period creates no duplicate.

Daily/weekly/release/CI issue creation uses handler-level exact-title
deduplication and serialized safe-output jobs. Keep generated titles unchanged.
The handler searches open and recently closed issues; agents also search closed
history. This reduces duplicates but is not permanent storage or an exactly-once
guarantee if titles are changed, history is unavailable, or reads fail.
An existing report is not automatically refreshed by rerunning it.

### 4. CI failure investigator

After publishing the workflows to main, use **Actions > Test CI > Run workflow**
and select `CART-001` (or another unresolved exercise) instead of `baseline`.
This runs the passing baseline first, then the selected desired-behavior check.
The resulting genuine assertion failure activates the investigator. It should
identify an intentional exercise from dispatch inputs and logs, not recommend
weakening the expected result. Selecting `baseline` keeps CI green.

For an alternative unexpected-regression demonstration, create a separate,
clearly named demo branch and a deliberately failing test:

```powershell
git switch -c demo/ci-failure
```

In `test/ci-demo.test.js`, manually add:

```javascript
import assert from "node:assert/strict";
import test from "node:test";

test("intentional customer-session CI failure", () => {
  assert.equal(1, 2, "Controlled demo assertion; not a production defect");
});
```

Commit and push only that named test on the demo branch, not main. Test CI will
fail; its completion activates the investigator. No broken fixture is included
in the current working tree.

Acceptance: a diagnosis issue identifies the actual run, attempt, SHA, failed
step and assertion, and clearly states that no reproduction was executed by
the investigator. Rerunning a failed run uses the same diagnostic issue key.
Remove the fixture in a later demo-branch commit after the session, or discard
the disposable branch through your normal reviewed process. Do not merge it.

The investigator only reacts to `Test CI`, so its own run cannot recursively
trigger itself. Compiler-generated checks reject fork/cross-repository runs.
It reads failed-revision source and logs through APIs, without executing that
source or downloading untrusted artifacts.

### 5. Documentation drift

Manually run **Documentation Drift**. A correct noop is expected if the
documentation is already sufficient.

For a predictable omission, use a dedicated demo copy of the repository:
remove the `npm run test:pricing` line from the local-run instructions on its
default branch and publish that intentional omission there. The script still
exists in package.json, so the workflow can verify and propose restoring its
usage instructions. Do not introduce this omission into the main demo baseline
just to force an output.

Acceptance: any proposed PR changes Markdown documentation only, cites actual
commands/results, and leaves the intentional pricing defect and authoritative
business rules untouched. An ambiguous contradiction should produce a question
issue rather than speculative changes.

### 6. Release-notes drafter

Prepare a tag on a meaningful baseline through your usual release process.
For example, after verifying the intended baseline commit:

```powershell
git tag demo-v0.1.0 <baseline-commit-sha>
git push origin demo-v0.1.0
```

Make a few subsequent human-reviewed changes so the range is nonempty. In
**Actions > Release Notes Drafter > Run workflow**, enter:

- `previous_tag`: `demo-v0.1.0`
- `target_revision`: `main` (or an existing simple tag, branch, or commit SHA)

Inputs must be plain Git names or SHAs, not shell expressions or revision
operators. Previous tag must exist and resolve to an ancestor of the target.
Ambiguous branch/tag names pointing to different commits are rejected.
Refs are passed as environment values to a script using argument-based Git
execution, never interpolated into a shell command.

Acceptance: a notes issue identifies both immutable SHAs, lists only changes
in the verified range, links PRs or commits, and does not publish a release.
Empty ranges produce no notes issue. Invalid refs fail visibly before the
agent starts. Repeating the same SHA pair must not create duplicate notes.

### Important operational limits

- Cloud inference, API access, permissions, and final outputs must be verified
  with actual GitHub runs after publishing. Local compilation is not a cloud run.
- PRs created with the standard Actions token generally do not trigger ordinary
  PR workflows. Agent test evidence is not an independent PR CI check. Use a
  properly scoped GitHub App or an approved separate validation process if
  automatic downstream checks on those PRs are required.
- The report helpers deliberately use `.git/` context files so generated
  evidence is not part of a proposed application/docs patch.
- Missing or inaccessible evidence must be reported as incomplete, not as
  success, zero activity, or a proven diagnosis.

Official references:
[Gallery](https://github.github.com/gh-aw/gallery/),
[Authentication](https://github.github.com/gh-aw/reference/auth/),
[Triggers](https://github.github.com/gh-aw/reference/triggers/),
[Safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/).
