# Audit, 18 November 2026

This replaces the unsupported previous checklist. PASS applies to the stated demo scope, not production readiness.

Evidence: **S** = audit/static-results.json and static.cjs; **B** = audit/browser-results.json and browser.cjs; **L** = audit/layout-results.json; **V** = audit/screenshots plus visual inspection of home mobile/desktop, booking mobile and the 18-view contact sheet; **H** = audit/server-results.json.

| Requirement | Status | Evidence |
|---|---|---|
| Read source and create state before edits | PASS | PROJECT_STATE.md; tool sequence |
| Ordered plan and assumptions | PASS | PLAN.md, ASSUMPTIONS.md |
| Six pages; plain HTML/CSS/JS | PASS | S, B |
| Retain existing structure | PASS | Original pages, styles and main.js patched; CHANGELOG.md |
| Python HTTP server compatibility | PASS | H, HTTP 200 with bundled Python; PATH caveat in README |
| Obsidian/sand theme and derived shades | PASS | variables.css; V |
| CSS palette centralized in root variables | PASS | variables.css; active CSS inspection |
| Body text contrast at least 4.5:1 | PASS | S, tested palette pairs 5.36–15.98 |
| Serif/sans font stacks and fallbacks | PASS | variables.css; V uses fallback fonts |
| Consistent cards, spacing and subtle animation | PASS | V; refinements.css |
| Reduced motion | PASS | B, computed hero animation becomes none |
| Compact sticky header with logo/nav | PASS | Sticky header wrapper and V |
| Cart count and mobile hamburger | PASS | B count and mobile keyboard tests |
| No contact/social bar above navbar | PASS | renderHeader; contact/footer markup |
| Both hero CTAs visible at 360×640 | PASS | B bounding-box assertions; index-360.png |
| Hero, featured dishes and ordering steps | PASS | V; six featured IDs and index.html |
| About, hours and CTA band | PASS | V; unconfirmed hours notice |
| Sample reviews clearly labelled | PASS | Global disclaimer and per-card fictional label; V |
| Menu schema and exact categories | PASS | S, 19 category names |
| At least three dishes/category and unique descriptions | PASS | S, 80 unique IDs and descriptions |
| Sample flags and visible price labels | PASS | S flags; V card labels/menu notice |
| Veg/non-veg/all filtering | PASS | B badge/count assertions |
| Search | PASS | B Garlic Naan search returns one item |
| Horizontal category-chip scrolling | PASS | CSS overflow-x; V at 360px |
| Dietary dot and text on cards | PASS | main.js badges, V; egg/anchovy corrections |
| Local images and alt attributes | PASS | S paths; card/hero markup; local SVG |
| Single add, quantity and count | PASS | B asserts one then two portions |
| Cart removal and empty state | PASS | B clicks remove, checks empty state, then follows Start Ordering back to all 80 dishes |
| Subtotal and cart notes | PASS | B persists notes and verifies ₹160 total |
| Storage persistence and try/catch recovery | PASS | B reload, malformed data and blocked Storage methods |
| Checkout name and Indian 10-digit phone | PASS | B required fields; regex validator; invalid phone test |
| Three order types and delivery-only address | PASS | B delivery/takeaway toggling; source required state |
| Order ID, summary and local save | PASS | B stored order fields/notes/quantity/total |
| Prefilled WhatsApp and placeholder config | PASS | B verified-number URL dry-run; default safe email fallback |
| Clear backend/payment phase 2 notice | PASS | Confirmation text and README |
| Booking name/phone/date/time/guests/request | PASS | B selection and summary; notes field in markup |
| Reject past booking date and invalid details | PASS | B past date, invalid phone/optional email; submit-time slot check |
| Booking summary and handoff link | PASS | B confirmation; handoffUrl produces draft |
| Careers fields and success preview | PASS | B complete valid applicant preview |
| CV PDF/DOC/DOCX and 2 MB cap | PASS | B allowed types, invalid extension, oversized replacement |
| Careers backend/upload clearly placeholder | PASS | Visible form and success disclosures; no network submission |
| Contact validation and preview | PASS | B full valid contact flow; validators in main.js |
| Contact/location details and hours from config | PASS | support.js bindings; V |
| Lazy map iframe and Open in Maps link | PASS | loading=lazy; config URLs; remote rendering excluded |
| Address mismatch and hours TODO | PASS | config.json notes and visible warning; empty schedule |
| 360/768/1280 layouts without horizontal overflow | PASS | L, all 18 scroll widths equal viewports |
| Visible primary controls at least 44px | PASS | L, zero undersized buttons/inputs; drawer CSS corrected |
| Body copy at least 16px | PASS | Body/description/form/contact/footer CSS; smaller metadata only |
| Semantic landmarks, one h1, labels, skip links | PASS | S; support.js associates errors with inputs |
| Visible focus and dialog keyboard behavior | PASS | B Tab wrap/Escape/focus restoration; focus CSS |
| Title/description/viewport/favicon/lang | PASS | S; L retains page-specific titles |
| No application console errors in tested flows | PASS | B errors=[] |
| No missing local HTML links/assets | PASS | S; nonexistent legal links removed |
| Working primary menu/cart/form actions | PASS | B positive and negative flows; unsupported branch button removed |
| README, owner TODO and phase 2 handover | PASS | README.md |
| Live Maps content and external webfonts | BLOCKED | Stubbed during browser audit; external rendering unverified |
| Live WhatsApp/email delivery | BLOCKED | Owner number missing; draft URLs tested without sending |
| Production business content and assets | BLOCKED | Owner must supply/confirm hours, address, menu, prices, photos, logo, email and social URLs |

Final requirement count: **55 PASS, 0 FAIL, 3 BLOCKED**.

## Method and limits

Three audit/fix rounds, described in CHANGELOG.md, stayed below the six-round limit. Every round with layout changes rechecked all six pages, including locations for regression coverage.

Installed desktop Chrome ran headlessly with India timezone and emulated widths. Exact local files were served through Playwright request routing because browser loopback access failed. External fonts/maps were stubbed and a verified WhatsApp URL was intercepted, not opened externally. Separate real Python HTTP check returned 200. No deployment, message or payment occurred.

The Windows python/py app aliases are inaccessible; README supplies the tested bundled executable fallback. Real iOS/Android, Safari, remote map/font rendering and actual messaging are not certified. Retained legacy modules are unused; all ten JS files pass syntax checks, but only main.js/support.js are supported runtime entry points.
