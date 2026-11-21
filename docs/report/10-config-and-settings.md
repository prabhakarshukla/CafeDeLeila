# The café's signs and switches

## What this part does

Some signs live in the shop window and others are controlled from the manager's office. A public list exposes just the settings a customer needs.

## How it works, step by step

1. `loadConfig` in `js/main.js` reads the fallback values from `data/config.json`.
2. `loadPublicSettings` in `js/support.js` reads `public_settings`, a database view that shows selected fields from the settings table.
3. `settings` in `admin/js/settings.js` lets an owner change the office settings.
4. The Orders waiter reads the current ordering, delivery, price and tax rules again before saving a ticket.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `data/config.json` | Public fallback information and project address. |
| `js/support.js` | Applies published settings to the customer view. |
| `supabase/migrations/002_admin_settings.sql` | Lists the public settings and their default values. |
| `admin/js/settings.js` | Lets the owner edit the approved settings. |

## What can go wrong and what to check

A locally edited JSON file can differ from the online settings. Check which values the browser received. Publishable keys are public, but private credentials belong only in Supabase.

## Try it yourself

Open `data/config.json` in your editor. Find `menu.is_sample` without copying any credentials.

The 12 public keys cover hours, address, phone, email, WhatsApp, ordering, delivery, delivery fee, minimum order, tax, booking capacity and the sample-menu flag. Find their exact names in the `public_settings` definition in migration 002.
