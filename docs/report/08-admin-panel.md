# Inside the manager's office

## What this part does

The manager's office shows orders, bookings, applications and messages. Owners also get tools for the menu, settings and staff list.

## How it works, step by step

1. `start` in `admin/js/app.js` opens the sign-in library. `restoreAccess` finds an existing session, and `access` checks the `admin_users` row. A missing role returns you to the sign-in screen with **Not authorised**.
2. `adminSessionStorage` remembers the browser choice. Off keeps this tab signed in. On keeps the session in the browser between visits. `endSession` clears both stores when you sign out.
3. `showPage` reads the part after `#` in the address and opens the right office view. Owners get Menu, Settings and Staff. Other signed-in users can see only the pages allowed to their role.
4. `render` in `admin/js/orders.js` shows each order and watches for a new-order notice. `changeStatus` in `admin/js/ui.js` sends the current and requested status so two managers do not silently overwrite each other.
5. `render` in `admin/js/requests.js` builds the booking, job and message queues. Only managers with access can ask for the temporary file link.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `admin/js/app.js` | Checks access and opens a page. |
| `admin/js/session-storage.mjs` | Saves a session for one tab or across visits. |
| `admin/js/orders.js` | Shows tickets, actions and the live notice. |
| `admin/js/requests.js` | Shows bookings, jobs and messages. |
| `admin/js/settings.js` | Shows owner settings, CSV export and the staff list. |

## What can go wrong and what to check

Hiding a menu button helps people find the right tools. The database guard is what stops an unwanted change. In a real phone session, sign out when using a shared device. Phone installation is UNVERIFIED.

## Try it yourself

Read `pages` in `admin/js/app.js`. Find the three owner-only entries, then read the plain-language [admin access guide](../ADMIN_ACCESS.md).
