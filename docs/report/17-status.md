# What is built and what still needs proof

## What this part does

The café has a working window, waiters and an office in the project. Some claims are about code. Others need evidence from the actual shop or a real phone.

## How it works, step by step

1. Check the evidence source in the status list.
2. Use the relevant audit or operator guide to turn UNVERIFIED into a demonstrated result.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `VERIFICATION_REPORT.md` | Records live and local evidence and outstanding checks. |
| `docs/MOBILE_AUDIT.md` | Records phone emulation and manual gaps. |

## What can go wrong and what to check

A completed local check only proves that specific case. Keep working software, approved content and production checks separate.

## Try it yourself

Pick an UNVERIFIED row and write the smallest safe test that could prove it.

## Honest status

| Area | Status | Evidence or gap |
|---|---|---|
| Six customer pages and cart | Built | Storefront fixture exercises browsing and order journeys. |
| Admin sign-in choice and shortcut files | Built | Session tests pass in Chrome mocks. Actual phone install and live renewal remain open. |
| Clean and legacy schema | Built | Local replays pass. Earlier post-007 live export matched all 100 checks. |
| Orders, bookings, CV and contact | Partly | Code and local tests exist; saved evidence lacks a completed hosted owner write run. |
| Real café photos and prices | Partly | Local samples and owner editing exist. Final photos and prices are still for the owner. |
| Online payments and automatic notifications | Not built | Payment status is an owner-managed record. |
| Native phone behavior and Lighthouse mobile scores | UNVERIFIED | The audit used emulated Chromium profiles and synthetic insets. |
| This branch in production | UNVERIFIED | Local fixtures run without communicating with Vercel or Supabase. |
