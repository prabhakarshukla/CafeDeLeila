# Project state before changes

Reviewed 18 November 2026. This records the supplied frontend, not the old public website. Previous audit claims are not accepted as test evidence.

## File tree and responsibilities

```text
.
|-- .git/                    Git metadata, not application source
|-- .gitignore               Ignores dependencies and, incorrectly, audit documents
|-- index.html               Hero, featured dishes, story, hours, reviews, CTA
|-- menu.html                Search, diet filters, category chips, menu grid
|-- book-table.html          Date/time/guest buttons and booking form
|-- careers.html             Applicant fields and CV picker
|-- contact.html             Contact form, hardcoded details, map
|-- locations.html           Location, map, unsupported future location
|-- css/
|   |-- variables.css        Theme, spacing, fonts, reduced motion
|   |-- base.css             Reset, typography, forms, buttons, utilities
|   |-- components.css       Header, drawers, footer, modals, badges
|   `-- pages.css            Page layouts and checkout styling
|-- js/
|   |-- main.js              Active bundle loaded by every page
|   |-- app.js               Older unused module version of shared app
|   |-- utils.js             Older unused module utilities
|   |-- home.js              Older unused home module; syntax errors
|   |-- menu.js              Older unused menu module; invalid import
|   |-- booking.js           Older unused booking module
|   |-- careers.js           Older unused careers module
|   |-- contact.js           Older unused contact module
|   `-- locations.js         Older unused maps module
|-- data/
|   |-- config.json          Business details and demo settings
|   `-- menu.json            18 categories, 77 sample dishes
|-- assets/
|   |-- favicon.svg          Existing black vector artwork
|   `-- logo_delelia.svg     Existing vector logo; owner approval unknown
|-- audit/                   Empty evidence directory
|-- README.md                Setup and claims, some stale
|-- AUDIT.md                 Previous checklist, unproven PASS claims
|-- CHANGELOG.md             Initial build and planned iterations
`-- PROJECT_REPORT.md        Stale completion claims, not verification
```

## Present and reusable

All six semantic HTML pages, responsive CSS, JSON-backed menu, filters, cart controls, checkout rendering, form markup, storage try/catch wrappers, reduced-motion rules, skip links and metadata exist. The dark/sand theme and page structure can be retained. Runtime behavior still requires testing.

## Broken or missing from source inspection

- Active bundle repeats `initFormValidation`, `handleSubmit`, `validateField`, `buildWhatsAppMessage` and map initialization in one global scope. Later declarations override earlier ones. Booking/careers bind the contact initializer; order messages invoke the booking formatter.
- Menu adds click handlers twice. One click can add two portions.
- Booking picker handlers are missing from the active bundle; date values use UTC rather than India time. Submission does not recheck slot validity.
- Checkout overlay never opens. Hidden delivery address starts required, its CSS stays hidden when selected, and initial totals include delivery for dine-in.
- Careers uses `#careers-cv` where markup has `#cv`. Invalid file selection can leave a previous valid file selected.
- 77 dish image paths do not exist. Sample flags were removed. Four Chinese IDs collide with Continental IDs. Egg biryani, anchovy salad and egg soup are incorrectly marked vegetarian.
- Brief specifies separate Main Course and Chinese categories; existing data combines them and lacks Main Course.
- Fake hours are displayed despite a TODO. Address discrepancy is not recorded. WhatsApp is an unrelated sample numeric number without a safety gate.
- Reviews are presented as real. Founding date, future location, staff benefits and tracking claims lack support in the brief.
- Footer links point to missing privacy/terms pages. Contact details are hardcoded; contact/location hours are empty.
- Mobile header hides the café name. Header sticky positioning is constrained by its wrapper. Desktop featured grid squeezes six cards into one row. Contact grid targets the wrong element. Some controls are below 44px; body copy is often 14px. CSS has missing semicolons and colors outside variables.
- Dialogs lack consistent focus containment/restoration; closed drawers remain keyboard reachable. Page-specific titles are overwritten with the home title.
- No cart notes field; success messages imply actual delivery to the café although there is no backend.
- Unused modules have import/export and syntax problems. Keep them as reference during repair; do not switch runtime architectures blindly.

## Sample and owner-dependent content

All dishes, prices, tags, descriptions, testimonials, booking slots, hiring roles, fee/tax assumptions and imagery require owner review. Phone/email/address originate from the supplied brief, not independent verification. Hours and WhatsApp must remain unconfirmed. Existing logo provenance is unknown.

## Environment

Node 24 is available. `python` resolves to an inaccessible Windows app alias; no workspace Playwright package was found initially. Browser/tool availability will be checked before audit. No application code changed before this document was created.
