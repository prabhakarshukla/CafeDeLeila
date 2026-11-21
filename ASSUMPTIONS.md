# Current assumptions

See [assumptions and migration decisions](docs/ASSUMPTIONS.md).

- The shared booking rules are the source for sample slots and advance limits. The storefront and booking handler use the same rules. Changing them requires deploying both.
- A local image path is relative to the storefront or rooted at its origin. An absolute image URL must match the configured Supabase project origin and its public Storage path.
- Local checks use fictional browser and database fixtures. Hosted probes that could create or change rows belong on a disposable project that mirrors the target.
- The local `main` ref was already one commit ahead of `origin/main` before this work. Only the feature branch is part of this delivery. Historical browser captures remain retrievable from commit `0d011ee`.

## Mobile and admin work

- Start from the fetched remote main. The production site and database remain outside local browser tests.
- Keep me signed in starts off for a fresh browser profile. A saved choice applies to that browser profile. Shared-device users can uncheck it.
- The admin icon is an online shortcut with no service worker. Physical-phone install and browser session renewal remain unverified.
