# Welcome to the café

## What this part does

Imagine you walk up to a café. Your phone is the customer, Vercel is the shop window, and Supabase holds the kitchen, cash counter and storeroom. The manager uses a separate office inside the same website.

## How it works, step by step

1. Your browser reads `index.html`. HTML gives the page its structure, such as headings, pictures and buttons.
2. CSS gives that structure colours, spacing and shapes. In `css/variables.css`, `--color-sand` is one colour used on buttons.
3. JavaScript gives the page actions. In `js/main.js`, `init` starts the site, and `addToCart` changes the basket when you tap Add.
4. A waiter takes a request to the kitchen. In this project a waiter is an Edge Function, a small program reached over the internet. The order waiter checks the menu price before it saves anything.
5. The manager can sign in and see orders from the office. `access` in `admin/js/app.js` checks the person's role.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `index.html` | Puts the home page headings and pictures in order. |
| `css/variables.css` | Names shared colours and sizes. |
| `js/main.js` | Builds the menu and basket and connects the forms. |
| `admin/index.html` | Opens the manager's office. |

## What can go wrong and what to check

The illustration and sample prices still need the owner's approval. Compare [Sample data and real data](16-sample-and-real.md) before treating a price as final.

## Try it yourself

Open the home page locally. Find its heading in `index.html` and its sand colour in `css/variables.css`. You can do both without signing in.
