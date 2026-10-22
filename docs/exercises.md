# Agent workflow exercises

This is an intentionally imperfect **starting baseline**, not a claim of a
fully working ecommerce platform. Fix one issue per reviewed PR. Never change
expected results merely to match a defect.

## Commands

```powershell
npm start
# Open http://127.0.0.1:3000 in a browser. Stop with Ctrl+C.
npm test
npm run demo:pricing
npm run test:acceptance
node --test --test-name-pattern=CART-001 exercises/storefront.check.js
```

`npm test` runs only baseline tests under `test/`. They intentionally omit the
five exercise regressions. `npm run test:acceptance` runs desired-behavior
checks under `exercises/`; on the initial baseline it must fail **five tests**.
The theme check only detects the missing enabled control; it is **not**
evidence of a working persistent theme. Keep human/browser acceptance below.

The deterministic pricing CLI still prints the original $99 result. `npm start`
now starts a web server and does not exit by itself.

## Backlog and acceptance

| ID | Reproduction / actual | Required behavior |
| --- | --- | --- |
| CART-001 | Add coffee maker twice: bag stays at one | One line, quantity two, $200 merchandise subtotal; stock checks and cookie isolation preserved |
| CAT-001 | Select any category: empty collection | Three matching products per category; All finds nine; mobiles + Nova one, appliances + Nova zero; invalid category 400 |
| CHECKOUT-001 | Add a product, click checkout: `/checkout` 404 | Actual checkout link opens payment; simulated payment confirms, clears bag, and decrements inventory once |
| THEME-001 | Theme: soon is disabled; payment lacks a toggle | Usable keyboard toggle on both pages; initial system preference; explicit selection persists across refresh/navigation; accessible contrast |
| PRICE-001 | Coffee $100 + shipping $10, 10% off: $99 total | Merchandise-only $10 discount, $100 total; rounding and discounted-merchandise tax remain correct |

### Browser acceptance

1. At desktop width (1440px), view the hero, nine cards, category controls and
   bag. At 390px, verify no horizontal scrolling, usable controls and a stacked
   bag. No unrelated console/network failures should occur.
2. Add coffee once, reload: it remains in the bag. Open a separate browser
   context: its bag is empty. Explicit +, -, and Remove work; decrementing one
   removes the line. Repeated Add should accumulate after CART-001 is fixed.
3. Click each category and combine with search. Verify product membership, not
   just selected-button styling. Rapid search/category changes must not display
   an older request's results.
4. From a nonempty bag click checkout. Initially this is the known 404. To
   explore healthy payment independently, navigate directly to `/payment`.
   Review order, simulate payment, reload confirmation, return to store. The
   bag stays empty and stock is deducted once. Never enter real card details.
   After CHECKOUT-001 is fixed, test the actual bag-to-payment path.
5. After THEME-001 implementation, emulate light/dark system preference, test
   first-visit default and explicit override with keyboard, reload both pages,
   navigate bag -> payment, and test unavailable storage. Verify all major
   surfaces and focus indicators, not only a root attribute.
6. After PRICE-001 implementation, repeat the $100 example with 0% and 10% tax:
   totals $100 and $109 respectively. Empty cart must remain zero.

### Regression discipline

Copy or extend the relevant desired-behavior assertion into `test/` so that
ordinary CI protects each completed fix. First run that new regression against
the original implementation and record the actual assertion failure. Then
implement the narrow fix, run the targeted exercise, and run `npm test`.
The other unrelated exercise failures may remain; enumerate them explicitly.
Do not skip tests, install dependencies, or "fix" another exercise accidentally.

## Workflow mapping

| Scenario | Trigger | Output / evidence |
| --- | --- | --- |
| Bug fix | Open `[fix]` issue, or comment `/fix-cart` after publishing | Draft PR; failing regression then targeted/full passing tests |
| Theme feature | Comment `/implement-feature` on THEME-001 issue | Draft feature PR with regression and browser acceptance evidence or honest limitations |
| Triage | Open `[triage]` issue or comment `/triage-cart` | Classification + evidence-based comment; no code |
| CI investigation | Failed Test CI run | Diagnosis issue, actual logs; no execution of failed-revision source |
| Daily / weekly | Schedules or manual | Linked shopper-impact changes, unresolved cart/payment risks and PRs |
| Documentation drift | Schedule or manual | Evidence-backed docs PR/noop; known exercises are not docs drift |
| Release notes | Manual validated Git range | Draft notes; fixed vs still-open exercises, never assume deployed |

Slash commands run only from new comments after workflows are on the default
branch; editing a previous issue title or comment is not a retrigger. gh-aw's
trusted-role checks still apply. Inspect generated workflows before enabling.

## Seed GitHub issues

Definitions live in [the issue manifest](../demo/issues.json).

```powershell
npm run issues:seed
# Dry run; resolves authenticated repository and reads existing issues.
npm run issues:seed -- --publish
# Explicit write; creates only missing exercise IDs, even across closed issues.
```

The script uses `gh` with argument arrays, no token literals or shell expansion.
It never changes old issues. Older pricing reports may exist: link them as
related to PRICE-001 rather than closing or rewriting them.

If issues are created **before** local code/workflows are pushed, the cloud
cannot see this storefront. Existing `[fix]` workflows may run against the old
CLI baseline. After committing and pushing the conversion yourself, add a
fresh `/fix-cart` comment to an issue to investigate against the new source.
Publishing issues does not commit, push, or enable local workflows.

## Reset for another session

Stop the server. To retain prior orders, use a new local database filename:

```powershell
$env:DATABASE_PATH = "data\session-two.sqlite"
npm start
```

Use a fresh browser context (or clear only the local demo's cart cookie) for a
fresh cart. A different database automatically issues a new cart ID. No broad
delete/reset script is included. After fixes are merged, use a separately
reviewed demo baseline branch to replay the original defects; do not reintroduce
them into a corrected main branch.

## Initial conversion verification

The conversion was checked locally with Node 24.16.0:

- 30 baseline tests passed; all five desired-behavior checks failed at their
  intended assertions, not tooling or syntax errors.
- Standalone runtime probes passed for health, catalog, storefront and payment.
- Interactive browser checks confirmed nine cards, the disabled theme control,
  repeated Add retaining quantity one, $99 coffee order, explicit quantity
  changes, cart persistence after reload, empty Mobiles results and checkout 404.
- Direct `/payment` navigation successfully simulated payment; confirmation
  survived reload and returning to the store showed an empty bag.
- The 1440px storefront and 390px storefront/payment layouts had no horizontal
  overflow. The desktop storefront was also visually inspected.

These checks do not certify production readiness, fix the exercises, or replace
the post-fix browser acceptance above. Cloud workflow execution still requires
publishing to GitHub, valid permissions and configured engine authentication.
