# Café De Leila website

Six-page pitch demo, repaired from the existing frontend. Plain HTML, CSS and JavaScript; no build step. No orders, bookings, CVs or contact messages reach a backend. No payment is collected.

## Run locally

```powershell
cd 'C:\cafe de lelia'
python -m http.server 8080
```

Open http://localhost:8080/index.html. Use an HTTP server, not file://, so JSON loading works.

On this machine, `python` resolves to an inaccessible Windows app alias. This bundled executable was tested successfully:

```powershell
& 'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1117-835-0_26.1117.835.0_x64__3k8sg7r9htsxt\dependencies\python\python.exe' -m http.server 8080
```

That path is machine-specific and may change after an update. Installing Python on PATH makes the standard command work.

## Structure

- Six HTML pages: home, menu, book-table, careers, contact, locations.
- `js/main.js`: active app, header/footer, cart, checkout, menu and forms.
- `js/support.js`: India dates, safe handoff links, config-driven details and dialog accessibility.
- Other `js/*.js`: retained legacy modules, not loaded. Edit the active scripts; do not load both implementations.
- `css/variables.css`: theme tokens. Original base/components/pages styles remain; `css/refinements.css` corrects layout and usability.
- `data/menu.json`: 19 categories and 80 sample dishes.
- `data/config.json`: business details, unconfirmed hours, booking samples and handoff settings.
- `assets/`: existing logo/favicon and local meal illustration.
- `PROJECT_STATE.md`, `PLAN.md`, `ASSUMPTIONS.md`, `CHANGELOG.md`, `AUDIT.md`: inventory, decisions and evidence.
- `audit/`: test scripts/results and screenshots at all three requested widths.

## Real versus SAMPLE

Name, tagline, phone and Gmail address come from the supplied brief, not independent verification. The address remains flagged because listings disagree. Opening hours are unconfirmed; no schedule is guessed.

All dishes, descriptions, prices, tags, illustrations, reviews, hiring roles and booking slots are samples. Menu metadata and every dish have `_sample: true`; reviews are explicitly fictional. Existing logo artwork requires owner approval.

Cart/notes and recent order/booking records use localStorage keys beginning `cafe_de_leila_`. Clear browser site data to remove them. Checkout creates a summary and ID, not an accepted order. Booking creates a request, not a reserved table. Applications and CVs stay in memory and are not uploaded. Contact messages are previews. Use fictional personal details for the pitch.

## Edit menu.json

Keep category/item IDs unique. Every item needs `id`, `name`, a distinct `description`, numeric `price`, boolean `veg`, local `image`, `tags` array and `_sample`. Image paths are relative to the site root; add the actual file before referencing it. Verify dietary labels and ingredients with the kitchen.

```json
{"id":"main-4","name":"Sample paneer dish","description":"Paneer with tomato and toasted cumin.","price":300,"veg":true,"image":"assets/meal.svg","tags":[],"_sample":true}
```

Keep sample labels until the owner approves the complete menu. Removing flags alone does not make this a production ordering system. Update the explicit demo copy and implement the backend before launch.

## Edit config.json

- Update `contact.phone`, `phoneRaw` with country code, `email`, `address.full`, `mapLinkUrl` and `mapEmbedUrl`. Footer and contact/location bodies use these values.
- Resolve the address discrepancy and update its warning in `js/support.js`.
- Keep `hours.verified: false` and `schedule: []` until confirmed. Then add entries such as `{"day":"Monday","open":"12:00","close":"21:00","closed":false}` and set `verified: true`.
- `contact.whatsapp` is deliberately empty. Add the owner's verified 12-digit Indian WhatsApp number beginning `91` and set `whatsappVerified: true`. Checkout then opens a prefilled wa.me draft. Otherwise confirmations offer an email draft. The user must send it; opening a draft does not mean acceptance.
- Add owner-confirmed Facebook/Instagram/YouTube URLs in `social`; nonempty values appear only in the footer.
- `booking.timeSlots`, `maxGuests`, `maxAdvanceDays` and `minAdvanceMinutes` control demo requests in India time. Confirm them before launch.
- Fees/tax are zero; the demo displays a sample subtotal. Real charges and service areas belong in phase 2.

## Tests

Run `node audit/static.cjs` for JSON/schema, all JS syntax, HTML metadata/labels/local links and contrast checks. No additional packages needed.

`node audit/browser.cjs` needs Playwright and Chrome. Set `NODE_PATH` to an installed package directory if needed. This machine used `C:\Users\prabh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules`. The suite captures six pages at 360, 768 and 1280px, then checks cart, forms, negative cases, storage failures, keyboard behavior and reduced motion.

Browser requests serve exact local files through routing because browser loopback access was restricted. External fonts/maps are stubbed; WhatsApp is intercepted, never sent. `audit/server-check.cjs` separately tests a real Python HTTP response on port 8099 and stops its server; set `CAFE_PYTHON` if Python is not on PATH. See AUDIT.md for limits. Test real Android/iOS devices before launch.

## Deploy after owner approval

No deployment was performed. Create an upload folder containing the six HTML files, `assets`, `css`, `data`, `js/main.js` and `js/support.js`, preserving relative paths. Exclude `.git`, audit evidence and local notes.

- Netlify: manually upload that folder or connect a repository. No build command; publish the directory containing index.html. [Netlify documentation](https://docs.netlify.com/manage/projects/add-new-project/).
- Vercel: choose the Other preset, leave the build command empty and select the directory containing index.html as output. [Vercel configuration](https://vercel.com/docs/builds/configure-a-build).
- GitHub Pages: place deployable files in the selected branch root or `/docs`, then select that branch/folder in Settings → Pages. Relative paths support repository subpaths. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Use the host's HTTPS URL; configure DNS/certificates before enforcing HTTPS on a custom domain. Static hosting adds no backend. Check current plan terms before choosing commercial hosting.

## TODO FOR OWNER

1. Approve the real logo; provide café and food photos with usage rights.
2. Supply real menu, prices, ingredients and dietary labels.
3. Confirm opening hours and booking slots.
4. Provide the WhatsApp Business number.
5. Resolve Vikas Khand versus Vipul Khand and confirm the map destination.
6. Set up email on the café's domain.
7. Confirm social URLs, vacancies, delivery area, charges and acceptance process.
8. Approve copy and genuine testimonials.

## Phase 2

Add an order/booking backend with server-side price and availability checks, an admin panel, secure CV upload, and a payment gateway with verified webhooks. Add notifications, order status, retention controls and launch policies once the business workflow is agreed.
