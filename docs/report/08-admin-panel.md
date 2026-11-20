# Admin pages and permissions

## How it works

1. `start` loads public client config and initializes the pinned Supabase client. The sign-in form calls email/password Auth. `access` queries the current user's `admin_users.role`; it signs out a user without membership.
2. `showPage` resolves the hash against the allowed routes, updates navigation and imports a page module. Owner routes require the owner role. Database policies apply independently of these UI checks.
3. `ui.js` builds DOM elements and labelled controls, surfaces errors with `action`, and writes status using `changeStatus` with both row ID and old status to detect stale updates.

| Route | Module | Reads and writes |
|---|---|---|
| Dashboard | `dashboard.js` | Reads `get_admin_dashboard_stats`, renders daily counts and top dishes. |
| Orders | `orders.js` | Reads paginated orders by status, search and India date. Subscribes to inserts, supports sound, opens order details and prints a kitchen slip. The page shows payment controls to owners. At the database level, migration 006 also allows staff to change `payment_status`. |
| Menu | `menu.js` | Owner creates, edits and deletes categories and items, sets order, toggles availability and updates the sample marker. Image upload uses the JPEG/PNG/WebP 5 MiB check and `menu-images` bucket. |
| Bookings | `requests.js` | Reads date/status pages and updates eligible booking states. |
| Applications | `requests.js` | Reads applications, changes review status and creates a 60-second download URL for `cv_url` in `cv-uploads`. |
| Messages | `requests.js` | Lists contact submissions and marks new messages read. |
| Settings | `settings.js` | Owner reads and upserts hours, address, phone, email and ordering settings. CSV export pages by ID and quotes cells, guarding spreadsheet formula prefixes. |
| Staff | `settings.js` | Owner grants or revokes staff membership for an Auth user UUID. Create Auth users separately. |

An operator with staff membership can open the dashboard and four operational views. The owner additionally sees Menu, Settings and Staff. The panel uses field labels, a visible focus treatment and mobile layouts. `noindex` limits indexing only. Mock tests verify navigation and role affordances. Actual sessions, writes, print and alerts need the acceptance checks.

## Where to look

`admin/index.html`, `admin/admin.css`, `admin/js/app.js` and the linked modules in the route table. Database access is defined in migrations 002–004 and 006.
