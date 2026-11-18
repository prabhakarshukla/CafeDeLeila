# Changelog

## 18 November 2026

Created PROJECT_STATE.md before application changes, then PLAN.md and ASSUMPTIONS.md. Previous report/audit claims did not match the code or include browser evidence.

### Round 1: source and functional repairs

- Retained six pages and active main.js. Renamed colliding page functions, removed duplicate add handlers and premature global aliases.
- Fixed checkout visibility, conditional address, form property access, order message formatting and page-specific titles. Added cart notes and resilient storage handling.
- Restored booking date/time/guest interaction, India-time dates and submission-time checks. Fixed CV input lookup and invalid replacement files.
- Restored sample flags, repaired duplicate IDs, split Chinese/Main Course and added three items for 80 total. Corrected egg/anchovy dietary contradictions.
- Replaced broken photo paths with a local illustration; retained logo/favicon. Removed guessed hours, unsupported founding year/branch/benefits, unverified socials and random WhatsApp number. Added safe email fallback.
- Removed missing legal links and populated contact/location details from config. Demo success text no longer implies actual submission.
- Browser transport failed twice; changed to serving local files through Playwright routing. A premature utility alias ReferenceError found by the first browser run was repaired.

### Round 2: responsive checks

- Retained original stylesheets and added refinements.css. Fixed sticky wrapper, mobile branding, hero, card grids, contact layout, typography and touch controls.
- Centralized CSS palette with four derived opaque shades and alpha variants. Fixed missing semicolons.
- All 18 viewport checks passed. A diet test exposed a secondary Healthy badge using the veg class; changed its class. Screenshot capture caught hero animation mid-frame; now captures settled animations.
- Core cart, checkout, booking, CV and contact tests passed.

### Round 3: failure cases and final proof

- Replaced stale focus lists with a dynamic dialog controller. Added error associations and focus restoration. Repaired white-space affected by an overly broad color substitution; added visible input borders.
- Fixed optional booking email validation and prevented non-delivery orders retaining a hidden address.
- Tested invalid/oversized CVs, all allowed extensions, invalid details, past dates, malformed/unavailable storage, keyboard controls, reduced motion and a dry-run verified WhatsApp URL.
- Re-ran all six pages, including unchanged locations, at all widths. No application console errors. Static checks and real Python HTTP check passed.
- Rewrote README, AUDIT and PROJECT_REPORT because their architecture/completion claims were stale. No application file required a full rewrite. Removed ignores for audit/changelog documents.

External maps/fonts, real message delivery and owner-provided content remain unverified. No production deployment, message or payment occurred. Three rounds used, below the six-round limit.
