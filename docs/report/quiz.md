# Quiz yourself

## What this part does

Use this as a practice shift at the café. See whether you can explain what the phone, window, waiters and office each do.

## How it works, step by step

1. Answer the questions before looking at the answers.
2. Open the matching chapter if you miss a question. Then explain the idea to someone else using the café story.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `docs/report/05-flows.md` | Shows each customer and office step. |
| `docs/report/glossary.md` | Defines unfamiliar words. |
| `docs/report/06-database.md` | Explains the kitchen sheets and permission rules. |

## What can go wrong and what to check

If you remember a file but cannot explain why it matters, trace one request from a screen to its saved record.

## Try it yourself

Pick five questions at random and say the answers aloud.

## Questions

1. Which part of the café story is Vercel?
2. Which file gives Home its heading and pictures?
3. What gives the window its sand colour?
4. Which function starts the public site?
5. Which file stores the practice dishes?
6. What happens when online menu loading fails?
7. What does checkout send for each dish?
8. Who finds the real price?
9. What does one row in `orders` mean?
10. Which part creates an order reference?
11. What stops two people taking the last booking slot?
12. What is a signed CV upload URL?
13. Why might a message return 429?
14. What is the database guard called?
15. Can staff change an order's total?
16. What happens if the user lacks an admin role?
17. How does the office hear about a new order?
18. When can an order go out for delivery?
19. Does marking a payment paid charge a card?
20. Does a mock phone audit prove real iPhone behavior?

## Answers

1. The shop window that serves the website files.
2. `index.html`.
3. The CSS variable `--color-sand` in `css/variables.css`.
4. `init` in `js/main.js`.
5. `data/menu.json`.
6. `loadMenu` tries the sample file, and checkout stays unavailable.
7. Its ID and quantity.
8. The Orders Edge Function, by reading the menu records.
9. One order.
10. The `generate_order_number` trigger function, using `order_seq`.
11. The same-slot database lock in `reserve_booking`.
12. A temporary link with permission to upload one specific file.
13. The caller sent too many requests in the allowed time.
14. Row Level Security, or RLS.
15. No. Migration 006's `guard_staff_columns` blocks the edit.
16. `access` signs the browser out and shows **Not authorised**.
17. `render` in `admin/js/orders.js` listens via Realtime.
18. From ready, and only if it is a delivery order.
19. No. It updates the café's record of payment.
20. No. It proves the emulated layouts and steps. Install, keyboard and gestures still need a phone.
