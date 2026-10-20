# Agentic Cart Demo

A dependency-free Node.js shopping-cart pricing application for demonstrating
GitHub Agentic Workflows. Requires Node.js 24 or newer.

## Run locally

```powershell
npm start
npm test
```

No package installation is necessary. The application is a command-line demo,
not a web server. All monetary inputs and outputs use integer USD cents.

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
- `src/demo.js`: sample order and console output.
- `test/pricing.test.js`: baseline tests using Node's built-in test runner.

## Demonstration baseline

This repository intentionally contains a pricing defect. The existing tests pass,
but do not cover a percentage discount combined with paid shipping.

Run `npm start` to reproduce the customer report:

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

**Title:** Percentage discount incorrectly reduces shipping charges

**Body:**

With a merchandise subtotal of $100, shipping of $10, a 10% discount, and no tax,
the total should be $100. The application currently returns $99.

Steps to reproduce:

1. Use Node.js 24 or newer.
2. Run `npm start`.
3. Observe the total of $99.

Shipping must not be discounted. Please add a regression test and preserve the
existing pricing rules.

Acceptance criteria:

- The regression test fails on the original implementation for the reported
  calculation error.
- The corrected order has a $10 discount and a $100 total.
- Existing tests continue to pass.
- The proposed pull request includes the root cause and test evidence.

## Next: build the workflow yourself

No GitHub Actions or agentic workflow files have been created. The next steps are
to publish this baseline to a GitHub repository, choose an AI engine, and author
the agentic workflow with guided instructions.
