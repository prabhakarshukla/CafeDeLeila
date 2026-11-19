# Public config and database settings

## How it works

`loadConfig` reads the JSON file before the shared storefront render. `loadPublicSettings` overlays public values from the database when reachable. The menu fallback keeps sample labels and blocks ordering. Treat every JSON key as publicly readable. Change local defaults through a code edit. Owners update supported live values through Settings or Menu; remaining settings can be edited by a database operator.

### JSON key inventory

| Keys | Use and status |
|---|---|
| `site.name`, `site.tagline`, `site.description` | Brand and copy defaults. HTML also contains fixed copy. |
| `contact.phone`, `contact.phoneRaw`, `contact.email` | Display, dial and mail defaults from supplied business info. Confirm before launch. |
| `contact.address.street`, `area`, `city`, `state`, `pincode`, `full`, `note` | Address components and display/advisory text. Listings conflict. |
| `contact.whatsapp`, `whatsappVerified`, `whatsappNote` | Unverified number and reminder. No automatic message is sent. |
| `contact.mapEmbedUrl`, `mapLinkUrl` | Location embed and external map link. Confirm the destination. |
| `hours.verified`, `note`, `schedule` | Whether hours are confirmed, note and schedule. Defaults await confirmation. |
| `social.facebook`, `instagram`, `youtube`, `note` | Footer profile URLs and reminder. Blank URLs hide links. |
| `ordering.types`, `defaultType`, `minOrderDelivery`, `deliveryFee`, `note` | UI choices, preferences and estimates. Server rules control accepted orders. |
| `menu.is_sample`, `note` | Default sample state and note. The live public setting can override the flag. |
| `careers.allowedFileTypes`, `maxFileSizeMB`, `roles`, `_sample` | CV UI validation and sample roles. Handler and bucket also limit uploads. |
| `booking.timeSlots`, `maxGuests`, `minAdvanceMinutes`, `maxAdvanceDays`, `_sample`, `note` | Date/time options and booking limits shown in UI. Times await owner confirmation. |
| `payment.note`, `methods` | Descriptive fields for manual arrangements. No payment integration. |
| `seo.defaultTitle`, `defaultDescription`, `ogImage`, `twitterHandle` | Configuration metadata. Active page titles and descriptions are in HTML. |
| `supabase.url`, `publishableKey` | Public endpoint and browser key used by storefront and admin. No private keys belong here. |

Keys after the first qualified name in a row share its prefix. `ordering.enabled`, `deliveryEnabled` and `taxRate` are runtime overlay fields in the browser, with tax represented as a fraction.

### Database setting inventory

| Key | JSON fields | Repository default and role |
|---|---|---|
| opening_hours | verified, schedule | False and empty. Owner Settings. |
| address | full, note | Candidate address, confirmation needed. Owner Settings. |
| phone | formatted, raw | Supplied phone formats. Owner Settings. |
| email | value | Supplied email. Owner Settings. |
| whatsapp_number | value, verified | Blank and false. Database operator until a dedicated UI is added. |
| ordering_enabled | enabled | True on fresh install for smoke testing. Owner Settings. |
| delivery_enabled | enabled | False. Owner Settings. |
| delivery_fee | amount | 0 sample INR. Owner Settings. |
| min_order | amount | 200 sample INR for delivery. Owner Settings. |
| tax_percent | value | 0 sample percent. Owner Settings. |
| booking_capacity_per_slot | capacity | 10 sample active reservations. Owner Settings. |
| menu_is_sample | is_sample | True. Owner Menu. |

## Where to look

`data/config.json`, `loadPublicSettings` and `publicSupabase` in `js/support.js`, seed rows and view in `002_admin_settings.sql`, replay rows in 006, and `settings` in `admin/js/settings.js`. Customer write functions read authoritative database rules.
