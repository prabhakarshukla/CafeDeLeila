# Mobile audit

Run `npm ci` and `npm run audit:mobile` with Chrome installed. The audit uses Playwright and mocked responses. It covers 256 combinations across the six public pages, checkout, admin sign-in, and all eight admin screens. It checks 320, 360, 390, 412, and 768 px and the iPhone 13, Pixel 5, and Small Android profiles in both orientations. All profiles run on Chromium. The per-screen measurements and screenshots go in the ignored `audit/mobile-output/` folder.

## Checks and results

| Check | Status | Before → after or evidence |
|---|---|---|
| Horizontal overflow | FIXED | The layout viewport expanded from 320 to 330 px on seven public screens in both 320 px profiles. It now stays at 320 px. All 256 checks have zero overflow. |
| Sticky header and anchors | PASS | The main anchors passed in both measurements. Scroll padding now includes header height and the top safe inset. |
| Notch and bottom bar | FIXED | Added safe-area padding to main areas, fixed drawers, and notices. The checkout passed simulated top, side, and bottom insets. Real cutout and browser bar behavior is UNVERIFIED. |
| Hit areas and spacing | FIXED | 160 undersized targets across checks, including the admin brand link and visible CV label, fell to 0. No measured sibling target pairs were closer than 4 px. |
| Body and editable field size | PASS | Body text was 16 px on all pages. No editable fields below 16 px in either pass. |
| Name, email, telephone and guests | PASS | Form names use name autocomplete. Emails use email or sign-in username autocomplete. Public telephone fields use tel autocomplete and numeric input hints. Guests use 44 px or larger choice buttons. No missing accessible field labels were measured. |
| Menu, search and cart | PASS | At 360 px the mocked journey filters, searches, adds a dish, adjusts quantity, retains notes, and reopens the cart. |
| Checkout accepted and rejected | PASS | The mocked checkout verifies confirmation, backend pricing inputs, and that rejected submissions retain the basket and show help. |
| Booking, careers and contact | PASS | The same 360 px suite exercises each form and a dummy signed CV upload. It also tests failure responses. |
| Keyboard and submit reachability | FIXED | Checkout scrolls on a simulated height change from 700 to 335 px. The active field stays within the dialog and the submit button can scroll above the bottom inset. Actual iOS and Android keyboards are UNVERIFIED. |
| Dialogs and touch | PASS | The cart, checkout and mobile menu can open and close. Automated checks cover Escape, Tab containment and focus return. Finger swipe feel and browser edge gestures are UNVERIFIED. |
| Image layout | FIXED | Missing width and height declarations went from 1,376 occurrences across checks to 0. The menu now reserves space before its list appears. |
| Lazy images and asset size | PASS | Menu, cart and footer images load lazily. The single hero SVG remains an eager load; it is initially below the fold in seven short viewports and is about 1.75 KiB. Available illustrations are SVGs that scale without a separate `srcset`. Real photo variants and transfer costs are UNVERIFIED. |
| Fonts | FIXED | The Google Fonts stylesheet can load without blocking the initial display, and the font URL requests swap behavior. Performance fixtures replace the external stylesheet response; actual production font timings are UNVERIFIED. |
| Admin on 360 px | PASS | Mock orders show detail and allow status changes. Menu editing, export, CV links and live alert callbacks passed. Admin uses wrapping cards and forms. The inspected views contain no wide HTML tables. One-thumb reach on a real phone is UNVERIFIED. |
| Layout shift and blocking time | FIXED | Menu and checkout CLS went from 0.45 to 0.00 in these runs. Checkout’s blocking-time estimate increased, so the audit does not show a uniform speed gain. |
| Lighthouse mobile scores | UNVERIFIED | Lighthouse was unavailable. No performance, accessibility, best practices, or SEO scores were recorded. |

## Performance measurements

One cold run per scenario. Chrome throttled the local static server to a Slow 4G approximation (150 ms latency, 1.6 Mbps down, 0.75 Mbps up) and 4× CPU. API responses, the admin client, maps, and fonts use fixtures. KB are transferred KiB including browser-reported overhead. LCP records the largest visible content paint. Checkout LCP refers to its underlying menu navigation because opening the dialog requires a tap. CLS measures unexpected movement. TBT sums time over 50 ms in long tasks after the first paint through the end of the observation. These metrics are local estimates and can vary across runs.

| Screen | KB before → after | Requests | LCP ms before → after | CLS before → after | TBT ms before → after |
|---|---:|---:|---:|---:|---:|
| Home | 267.1 → 269.0 | 18 → 18 | 1216 → 1188 | 0.00 → 0.00 | 39 → 100 |
| Menu | 263.7 → 265.9 | 18 → 18 | 2448 → 2244 | 0.45 → 0.00 | 117 → 194 |
| Checkout | 263.7 → 265.9 | 18 → 18 | 1684 → 1092 | 0.45 → 0.00 | 193 → 279 |
| Admin orders | 31.7 → 32.1 | 12 → 12 | 1196 → 1072 | 0.00 → 0.00 | 57 → 28 |

To measure without running the interactive suites, use `npm run audit:mobile -- --label=after --measure-only`. Use `--dialogs-only` for the synthetic checkout viewport test.

## Manual Android and iPhone checklist

1. Open the preview in Android Chrome and iPhone Safari. Rotate both ways. Check the header, back gesture, menu chips and page edges.
2. Focus the last field in booking, contact and checkout. Confirm you can reach Submit with the keyboard open. Close checkout and check that focus returns.
3. In a disposable test project, complete an order, booking, dummy CV and contact form. Check the detail, status buttons and live alert in admin. Do not enter real names or payment details in a disposable test.
4. Add the admin icon using the [admin access guide](ADMIN_ACCESS.md). Test reopening with each sign-in choice and sign out before handing the phone to someone else.
5. After the owner adds photos and final prices, rerun the audit and repeat menu scrolling on a real mobile network.
