# Café De Leila project report

## What this part does

This is the café's reading map. Start at the shop window, follow a ticket through the waiters, and see who can open the manager's office.

## How it works, step by step

1. Choose your reading path in [Start here](docs/START-HERE.md).
2. Learn the words in the [glossary](docs/report/glossary.md). If you know a little HTML, start with the welcome and the map.
3. Follow a request and check its evidence before trying it on a live project.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `docs/START-HERE.md` | Gives separate reading paths for the owner, student, and developer. |
| `docs/report/03-file-guide.md` | Explains each tracked file and folder. |
| `VERIFICATION_REPORT.md` | Records what was measured and what still needs proof. |

## What can go wrong and what to check

The café has sample content on a real website. Read the status and sample-data chapters before treating the prices as approved or the hosting as verified for this branch.

## Try it yourself

Open the one-page map and point to where a menu price is read and where an order is saved.

## Read the chapters

1. [Welcome to the café](docs/report/01-overview.md)
2. [One-page project map](docs/report/02-architecture.md)
3. [Every file and folder](docs/report/03-file-guide.md)
4. [The customer's phone](docs/report/04-frontend.md)
5. [Click-by-click journeys](docs/report/05-flows.md)
6. [The kitchen records](docs/report/06-database.md)
7. [The waiters](docs/report/07-edge-functions.md)
8. [The manager's office](docs/report/08-admin-panel.md)
9. [The security guard](docs/report/09-security.md)
10. [Signs and switches](docs/report/10-config-and-settings.md)
11. [Laptop setup and publishing](docs/report/11-setup-and-deploy.md)
12. [Practice tests](docs/report/12-testing.md)
13. [Logs and common problems](docs/report/13-troubleshooting.md)
14. [Owner handover and demo](docs/report/14-owner-and-demo.md)
15. [What to add next](docs/report/15-glossary-and-next.md)
16. [What is sample and what is real](docs/report/16-sample-and-real.md)
17. [Honest status](docs/report/17-status.md)
18. [Glossary](docs/report/glossary.md)
19. [Quiz yourself](docs/report/quiz.md)

## Corrections made

- The menu contains 19 categories and 80 sample dishes. Keep the sample marker until the owner approves them.
- The public settings list contains 12 keys. The owner controls the real settings through the office.
- The database setup uses 001–004, 006 and 007. 005 is archived. The old live status spellings and defaults conflicted with current code. Migration 007 aligned them, and the saved live SQL export passed all 100 checks.
- Migration 006 removes legacy anonymous write rights, protects staff columns, and preserves safe owner and staff checks. Local tests cover the old and new schemas.
- The office now remembers the sign-in choice and has an online home-screen icon. The mobile audit measures the café window and office without touching live data.
- Earlier correction details and dates are in [the verification report](VERIFICATION_REPORT.md) and [the historical report audit](REPORT_AUDIT.md).

## Status at a glance

| Area | Status | Evidence |
|---|---|---|
| Storefront and office | Built | Local browser and database checks pass. |
| Online customer forms and live office actions | Partly | Source and local evidence exist. A completed owner write smoke run is still outstanding. |
| Real photos and final prices | Partly | The menu carries sample material pending owner approval. |
| Automatic payments and notifications | Not built | The office tracks payment status manually. |
| This branch on real phones and production | UNVERIFIED | Use the manual checklist and Vercel preview. |
