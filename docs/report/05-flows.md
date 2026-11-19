# Customer and order workflows

## How it works

### Place an order

1. `loadMenu` gets active categories and available items. `addToCart` saves selected IDs and quantities. If only local samples load, browse still works and checkout stays unavailable.
2. `openCheckout` and `validateCheckoutForm` collect the name, phone, order type, notes and delivery address when applicable. Errors stay on the form.
3. `apiRequest('orders', ...)` sends IDs and quantities. The handler rejects missing items, inactive categories, unavailable dishes, duplicates and invalid quantities. It calculates subtotal, fee, tax and total from database rows and settings.
4. An order insert assigns the reference and returns a pending record. `showOrderConfirmation` displays the server line prices and total. Submission failure leaves the cart intact.

### Book a table

1. `loadBookingConfig` builds date and time options. `bookingHandleSubmit` validates the fields and sends contact details, the chosen date and time, and guest count.
2. The booking handler validates the request and calls `reserve_booking`. The database serializes requests for the same slot before checking capacity and inserting.
3. The response includes the booking number. `showBookingConfirmation` presents the request. A full slot or backend error keeps the form available and shows the café phone.

### Submit a CV

1. `handleFileSelect` checks file type and size. `careersHandleSubmit` asks the applications upload route for a signed URL and path.
2. The browser puts the file to the signed URL. Storage applies its own type and size limits. If the write fails, the application request is not sent.
3. The browser submits a second request with `cv_path`. The function checks the object exists, writes `job_applications.cv_url` as the path and returns the application number.
4. The UI shows a reference on success and an inline message with the café phone on failure. A successful upload followed by a failed application insert can leave an orphaned file.

### Send a contact message

`contactHandleSubmit` sends name, email, phone, subject and message to `contact`. It validates and stores a `new` row and returns `received: true`. The browser resets after success. Validation or rate-limit errors leave the form filled and show the café phone.

### Handle a new order

`orders.js` subscribes to inserts, shows an alert and can play sound if enabled. Refresh the list, open the order details and take an available next action. `changeStatus` checks the expected old status and PostgreSQL checks the transition. The owner can update payment status and print a slip. Subscription failure leaves manual refresh available. An update conflict asks the operator to reload.

### Load settings and the catalog

`loadConfig` reads local defaults. `loadPublicSettings` overlays whitelisted rows. `catalogFromDatabase` converts `price_inr` into the UI price field while retaining the UUID. The sample banner follows the public flag and stays visible for local fallback. If settings fail, local defaults remain and server writes still check server rules.

## Where to look

Customer flows are in `js/main.js` and `js/support.js`. Function contracts are in `supabase/functions/<name>/index.ts`. Reference generation and booking locks are in migrations 001, 004 and 006. Operator order actions are in `admin/js/orders.js` and `admin/js/ui.js`.
