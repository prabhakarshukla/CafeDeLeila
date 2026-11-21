# Follow a customer and the manager

## What this part does

Imagine one customer walking up to the café window. Follow the taps from that first look to the ticket in the manager's office.

## How it works, step by step

1. Follow the customer steps from Home to Contact. The phone, shop window and waiter each do one part.
2. Follow the manager steps from Sign in to Permissions. Use the demo or a disposable project before trying writes.
3. For each step, read the named function. Look for the response it needs and the message it shows when something fails.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `js/main.js` | Runs the click and submit steps for the customer. |
| `js/support.js` | Sends requests and shows friendly failure messages. |
| `admin/js/app.js` | Signs in and checks which office views can open. |
| `admin/js/orders.js` | Shows tickets, notices and status controls. |
| `js/workflow.mjs` | Lists the next statuses the office may offer. |

## What can go wrong and what to check

The window can load while the kitchen is unavailable. Try the mock flows and watch the state stay visible after a failure.

## Try it yourself

Run the local browser fixtures. Pause on the order confirmation and locate the function that drew it.

### 1. Open the home page

Open the home address. `index.html` gives the phone its headings and illustration. `init`, `renderHeader`, and `initHomePage` in `js/main.js` build the header and featured dishes. If the menu service fails, `loadMenu` tries the local sample menu.

### 2. Browse and filter dishes

Tap **Menu**. `initMenuPage` in `js/main.js` calls `renderCategoryChips`, `initSearch`, and `applyFilters`. Tap a category or Veg, or type a dish name. `renderMenuGrid` shows the matches. With no matching name, it shows **No dishes found**.

### 3. Add and edit the cart

Tap the add button on a dish. `initEventDelegation` catches that click and calls `addToCart`. `renderCartDrawer` shows the basket. Tap plus, minus or Remove to call `updateCartQuantity` or `removeFromCart`. `saveCart` remembers the changes for that browser. A browser that blocks storage can forget the basket when you reload.

### 4. Send an order

Tap **Proceed to Checkout**. `openCheckout` shows the choices. `validateCheckoutForm` checks the fields. The submit handler inside `openCheckout` sends IDs and amounts through `apiRequest`. The waiter in `supabase/functions/orders/index.ts` reads fresh prices and stores an order. `showOrderConfirmation` shows the returned reference and total. `showFormFailure` in `js/support.js` keeps the basket and shows the café phone if the request fails.

### 5. Book a table

Tap **Book a Table**, choose a date, time and number of guests, then fill in your name and phone. `renderDateOptions` and `renderTimeSlots` in `js/main.js` draw the choices. `bookingHandleSubmit` sends the request. `reserve_booking` in migration 004 checks the remaining places. A successful response reaches `showBookingConfirmation`; a full or invalid slot leaves the form open.

### 6. Apply with a CV

Open **Careers**, choose a role and select a dummy document in a test project. `handleFileSelect` and `validateFileField` check the file. `careersHandleSubmit` asks the Applications waiter for a signed URL, a short-lived link for uploading one file. It uploads the file and sends the application. `showApplicationConfirmation` shows the reference. Failed validation or an expired upload leaves the form with a message.

### 7. Send a contact message

Open **Contact**, choose a subject, write a message, and tap **Send message**. `contactHandleSubmit` checks the required fields and calls the Contact waiter. `showContactConfirmation` shows success and clears the form. An error leaves the entries in place and shows the café phone.

### 8. Sign in as owner

Open `/staff`, which `vercel.json` routes to `/admin/`. Enter the email and password and choose whether to remember this device. The submit handler in `admin/js/app.js` signs in. `access` checks the matching `admin_users` row, and `showPage` opens the office. Missing membership returns to sign-in with **Not authorised**.

### 9. See a new ticket

Open **Orders** and optionally tap **Enable alert sound**. `render` in `admin/js/orders.js` subscribes to new rows. Realtime means the office can receive a notice when the kitchen stores a new ticket. Tap **Refresh orders** after a notice to see the row. If the connection fails, refresh manually.

### 10. Move pending to completed

Open a pending ticket, tap **confirmed**, then **preparing**, **ready**, and **completed**. A delivery ticket can pass through **out for delivery**. The button list in `js/workflow.mjs` and `validate_order_status_transition` in migration 007 check the routes. `changeStatus` in `admin/js/ui.js` requires the old status to match, so a stale view may ask you to reload.

### 11. Edit a dish

As owner, open **Menu**, pick a category or existing item, edit the fields, and save. `render` and its nested `editor` in `admin/js/menu.js` handle that form. The owner can upload an allowed JPEG, PNG or WebP under 5 MiB. A disallowed URL or file is rejected, and the existing item stays available as configured.

### 12. Change a setting

As owner, open **Settings**, change a setting such as delivery or booking capacity, and save. `settings` in `admin/js/settings.js` writes to `settings`. `loadPublicSettings` in `js/support.js` reads the published choices for customers. Invalid values or missing permission leave you with a notice.

### 13. Compare staff and owner

Open the office as staff in a disposable test project. `pages` and `access` in `admin/js/app.js` control which links the user sees. `guard_staff_columns` in migration 006 prevents changes to customer details or totals. Staff can handle permitted statuses; owners also manage menu, settings, staff, and deletion. The database checks these rules even if someone types a page address.
