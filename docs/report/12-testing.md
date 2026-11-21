# Practice before serving customers

## What this part does

The café can practice in a quiet kitchen. Local tests use made-up customers and a mock server or an in-process database. They help us see where the code works and where live evidence is still needed.

## How it works, step by step

1. `audit/static.cjs` checks page titles, labels, links, local artwork and sample dishes.
2. `audit/db-replay.cjs` and `audit/workflow-replay.cjs` apply the schema and exercise the checkout and office rules. The second runs both fresh and older database layouts.
3. `audit/browser.cjs` practices customer journeys. `audit/admin-browser.cjs` checks order actions, export, menu editing, and alerts. `audit/admin-session.cjs` opens new browser contexts to test both storage choices.
4. `audit/mobile.cjs` measures 256 phone and screen combinations. It uses throttling for four local performance measurements and crop-safe viewport simulations.
5. `scripts/evaluate-live-sql.mjs` compares a read-only export from the real kitchen with expected database rules.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `audit/static.cjs` | Checks HTML and sample data. |
| `audit/workflow-replay.cjs` | Replays actual order and form handlers against an embedded database. |
| `audit/mobile.cjs` | Runs the mobile audit without a live database. |
| `audit/admin-session.cjs` | Checks the sign-in choice, role denial and sign-out. |
| `scripts/live-sql-report.sql` | Collects live schema facts without writing rows. |

## What can go wrong and what to check

A local pass covers the fixture it used. It does not show how physical keyboards, home-screen installation, live order delivery or larger production photos behave. The completed hosted owner write run remains UNVERIFIED in the saved evidence.

## Try it yourself

Run `npm run audit:mobile -- --dialogs-only`. Check that your local tool closes the practice checkout and returns focus.
