# Glossary for the café project

## What this part does

Use this word list when the shop window, waiter or manager's office uses a term you have not learned yet.

## How it works, step by step

1. Look up the word in the table.
2. Read the example next to it and open the named file when you want more detail.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `PROJECT_REPORT.md` | Links the project chapters. |
| `docs/report/02-architecture.md` | Shows where the words fit on the map. |

## What can go wrong and what to check

The same word can mean two things in a café. In this report, a table in the kitchen records is a set of database rows. A table in a booking is where people sit.

## Try it yourself

Explain API, RLS and Realtime using one sentence each. Compare your answer with the examples.

## Words and examples

| Word | Meaning in simple words | Example from the project |
|---|---|---|
| SQL | Instructions for reading and changing a database. | `scripts/live-sql-report.sql` reads the current database setup. |
| Node.js | Runs JavaScript on a computer without a web page. | `node audit/static.cjs` checks the project files. |
| npm | Installs packages and runs project commands. | `npm ci` installs the pinned mobile test library. |
| HTTP | The rules a browser and a server use to exchange requests. | The menu uses GET to ask for dishes. |
| HTML | The page structure that says where headings, buttons and links go. | `menu.html` places the search field and menu grid. |
| CSS | Rules for colours, spacing, text and layout. | `css/variables.css` names the sand colour used on buttons. |
| JavaScript | Instructions the browser can run when someone taps or types. | `addToCart` in `js/main.js` adds a dish to the basket. |
| API | An address where one program can ask another to read or do something. | `publicSupabase` calls the menu address. |
| JSON | A text format for values, lists and named fields. | The order request contains `{ "quantity": 2 }` for a dish. |
| Database | An organised store for information, like a set of linked Excel sheets. | Supabase keeps all the café orders. |
| Table | One collection of records, like one sheet. | `orders` stores the kitchen tickets. |
| Row | One record inside a table. | A single booking is one row. |
| Column | One named detail that can appear on each row. | `orders.total_inr` records the rupee total. |
| Trigger | A database action that runs automatically when a row changes. | `trigger_generate_order_number` runs before an order is inserted. |
| Sequence | A database counter that supplies the next number. | `order_seq` provides the last part of a `CDL-` reference. |
| RLS | Row Level Security, a guard that checks which rows each caller may read or change. | Migration 004 lets admins see orders and limits staff edits. |
| Edge Function | A small program reached over the internet, like a waiter serving the phone. | `supabase/functions/orders/index.ts` checks the order before it writes. |
| JWT | A signed digital note used to carry proof about a sign-in. | The office library uses the owner session when it calls the database. |
| CORS | A browser rule about which websites may read a web response. | `requestHandler` checks the café's configured origin list. |
| Signed URL | A temporary link that gives permission for a particular file action. | The Applications waiter returns a link to upload one CV. |
| Realtime | A connection that sends notices when records change. | `render` in `admin/js/orders.js` listens for new order inserts. |
| Migration | A numbered file that changes the database structure or rules. | 007 aligns order and booking statuses. |
| Branch | A named line of work that can stay separate from the published version. | `feat/mobile-admin-docs` holds the phone and report work. |
| Commit | A saved group of changes with its own name and ID. | One commit added the staff shortcut and sign-in preference. |
| Deploy | Put a version on a server where a browser can open it. | Vercel serves the café pages after the website is deployed. |
| Session | Information the browser keeps to show you are still signed in. | `adminSessionStorage` decides how long the browser remembers it. |
| Mock | A made-up response that lets a test practice without a live service. | `audit/admin-session.cjs` uses a pretend admin account. |
| Supabase Storage | The project's file store, like the storeroom. | The `cv-uploads` bucket holds private job documents. |
| Café subtotal | The total for the dishes before tax and delivery fees. | The Orders waiter multiplies database prices by quantities. |
| CSV | A text file with values separated by commas, useful for opening in Excel. | `exportOrders` creates a file for the owner. |
| LCP | Largest Contentful Paint, the time until a large visible part of the page appears. | `audit/mobile.cjs` captures it for the menu. |
| CLS | Cumulative Layout Shift, a count of how much the page unexpectedly moves. | The mobile menu audit recorded a before and after value. |
| TBT | Total Blocking Time, which estimates how long heavy work prevents a quick response. | The mobile audit counts the slow part of each long task. |
