# Sample data and real data

## What this part does

The café window contains practice material while the owner prepares the real menu. Treat the sample banner as a sign to check the detail first.

## How it works, step by step

1. `data/menu.json` holds 80 sample dishes and local illustrations. `supabase/seed/menu_items.sql` installs those sample items in a database when the operator chooses to run it.
2. `loadPublicSettings` reads the owner's `menu_is_sample` choice. `renderMenuGrid` shows the sample notice when the online catalog is flagged or the fallback is in use.
3. The café's deployed catalog counts, settings whitelist and database constraints were verified in the saved Supabase export. That verifies structure and availability at the time of the test.
4. Customer orders, applications, bookings and messages are real records only after their waiter creates them in the actual café project. The browser and SQL practice runs use fictional records.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `data/menu.json` | Stores sample dishes and prices. |
| `assets/meal.svg` | Shows a drawing of a meal. |
| `supabase/seed/menu_items.sql` | Inserts the practice menu if the operator runs it. |
| `VERIFICATION_REPORT.md` | Records what was proven about the deployed database. |

## What can go wrong and what to check

Even a live menu may still contain practice prices. Owner-approved photos, descriptions, prices and business information need a separate review.

## Try it yourself

Find a sample dish in `data/menu.json`. Compare its image name with `assets/meal.svg`.
