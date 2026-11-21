# What happens on the customer's phone

## What this part does

The café window can show a sample menu even when the kitchen API is slow. The basket lives in the browser until the waiter accepts the order.

## How it works, step by step

1. `init` in `js/main.js` loads the public choices with `loadConfig`, builds the header and footer, then runs the page's setup.
2. `loadMenu` tries the online catalog. `catalogFromDatabase` in `js/support.js` keeps the real item ID. If the catalog is unavailable, `loadMenu` reads `data/menu.json` and checkout stays unavailable.
3. `initSearch`, `applyFilters` and `renderMenuGrid` keep what you see in sync with the text search and chips.
4. `saveCart` remembers the basket in local browser storage. `loadCart` restores items whose IDs still appear in the menu.
5. `installDialogAccessibility` makes Tab stay inside an open panel and returns focus when it closes. `installMobileFormScrolling` helps keep an active field in view when the visible area changes.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `js/main.js` | Runs the café window and the cart. |
| `js/support.js` | Supports requests, focus, contact details and mobile scrolling. |
| `js/menu-image.mjs` | Allows local images and public images in the café's own Supabase Storage. |
| `css/refinements.css` | Keeps the layout comfortable on small screens. |

## What can go wrong and what to check

A phone may block browser storage or load an old file. Reload and check whether the catalog is online. The mock browser audit does not prove real keyboard or phone behavior.

## Try it yourself

With a local mock, open and close the cart using Escape. Watch where the keyboard focus goes.
