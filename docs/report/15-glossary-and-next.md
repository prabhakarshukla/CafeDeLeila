# What the café can add next

## What this part does

The shop window, the waiters and the office already exist. The work left is mostly real café content, device checks and optional payment work.

## How it works, step by step

1. The owner adds photos and final prices in the Office Menu view. `editor` in `admin/js/menu.js` saves each item. The owner can then approve the menu so customers see the final-price label.
2. Run the mobile checks again once the pictures are real. Current SVG files are only illustrations, so they cannot tell us how quickly photographs will load.
3. `admin/js/orders.js` records payment status manually. An online payment system and automated notifications are future features.
4. Review the [glossary](glossary.md) when a word in the code is unfamiliar.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `admin/js/menu.js` | Manages catalog content and its sample label. |
| `admin/js/orders.js` | Lets the owner record payment status. |
| `docs/MOBILE_AUDIT.md` | Captures current results and the physical-phone checklist. |

## What can go wrong and what to check

Do not assume a new feature exists because a database field has a name for it. Confirm whether the user action and its test exist.

## Try it yourself

Choose one future improvement. Write down which screen changes, how you would test it, and what you would ask the owner to check.
