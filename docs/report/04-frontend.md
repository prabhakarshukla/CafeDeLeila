# Storefront code and state

## How it works

1. `init` renders the shared chrome, loads config and catalog, restores cart state, installs event delegation and dispatches page-specific initializers.
2. `loadConfig` fetches `data/config.json`, calls `applyConfigToPage` and attempts `loadPublicSettings`. `loadMenu` fetches the Edge catalog and maps it through `catalogFromDatabase`. An error or empty catalog falls back to `data/menu.json`; checkout requires `state.onlineCatalog`.
3. `initMenuPage` and the category and dietary controls call `applyFilters` and `renderMenuGrid`. `initSearch` updates the text query. `populateFeaturedDishes` uses available catalog rows for online mode and illustrative picks for the local sample.
4. `loadCart` restores saved entries only when their IDs still appear in the current catalog. Each cart entry has the menu fields and a quantity. `addToCart`, `updateCartQuantity`, `removeFromCart` and `clearCart` update the array. `saveCart` writes browser storage and refreshes the badge and drawer via `updateCartUI` and `renderCartDrawer`. `getCartSubtotal` sums price × quantity. Notes persist separately. Checkout estimates fees and rounded tax but displays the backend amounts after success.
5. `openCheckout` builds the modal, presents order types and requires a delivery address when relevant. `validateCheckoutForm` checks required fields and a 10-digit Indian mobile number. Requests are bounded to 50 distinct lines and quantities to 50. Success opens the confirmation. A failed submission leaves the cart intact and shows a clickable café phone number.
6. Booking initialization calls `loadBookingConfig`, `renderDateOptions`, `renderTimeSlots`, `renderGuestOptions` and `bookingInitFormValidation`. `bookingValidateField` checks required fields, phone and email format. `bookingHandleSubmit` checks the selected date, time and advance interval, submits, then shows the reference and resets on success.
7. Careers uses `renderRoleOptions`, `initFileUpload`, `handleFileSelect`, `showFileName` and `clearFile`. `careersValidateField` and `validateFileField` check required text, email, phone and a CV of an allowed type up to 2 MiB. `careersHandleSubmit` signs, uploads and then creates the application.
8. Contact uses `contactInitFormValidation`, `contactValidateField` and `contactHandleSubmit`. It checks required fields, email and mobile, shows validation feedback and only resets after a successful write. Contact and Locations use their map-loading initializers for map elements.
9. `renderHeader` and `renderFooter` output shared navigation and business information. Drawer functions toggle cart or mobile navigation. `initHeaderScroll`, `initLazyLoading` and home initializers cover scroll treatment, images and displayed content.

The IIFE at the top of `main.js` supplies DOM, storage, number formatting, validation, event and Toast helpers. Its `apiRequest` delegates POSTs to `publicSupabase`. The alternate storefront modules were removed after checking the script tags and import paths. The admin has a separate entry point.

## Where to look

| File | Responsibility |
|---|---|
| `js/support.js` | `showFormFailure` provides the café phone in the form; `syncPickers` updates controls; `populateBusinessDetails` binds contact and map details; `installDialogAccessibility` traps and restores focus and associates field errors; `publicSupabase`, `loadPublicSettings` and `catalogFromDatabase` handle public integration. `verifiedWhatsAppUrl` accepts only an explicitly verified 12-digit number starting with 91. |
| `js/menu-image.mjs` | Accepts local asset paths and the configured project's public Storage image URLs. Other URLs fall back to the placeholder. |
| `supabase/functions/_shared/booking-rules.mjs` | Shares booking slots, advance limits and India calendar validation with the booking handler. |
| `css/variables.css` | Palette, spacing, type stacks and motion tokens |
| `css/base.css` | Browser normalization, typography, forms and general utilities |
| `css/components.css` | Header, drawers, Footer and shared widgets |
| `css/pages.css` | Hero, forms, menu grid and sections |
| `css/refinements.css` | Responsive tuning, focus, controls and reduced motion |
| `data/config.json` | Browser defaults and fallback copy. See the configuration chapter for each key. |

Keyboard users have labelled inputs, a skip target and dialog focus management. Existing browser evidence is scoped to the runs listed in the testing chapter. A full accessibility audit remains open.
