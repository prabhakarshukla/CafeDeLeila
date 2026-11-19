# Assumptions

- Work in the supplied local checkout. Deployment instructions are requested; no production launch or business account changes are needed.
- The specific home/contact/location requirements permit hours/contact information in those page bodies. The global footer-only rule means no contact strip above the navbar.
- Interpret the category list literally as 19 categories, including separate Main Course and Chinese.
- Keep existing sample dishes where suitable; all prices and menu descriptions remain sample. Correct obvious dietary contradictions.
- Empty WhatsApp plus `whatsappVerified: false` is the placeholder. Do not send personal details to a random numeric sample. Show an email draft fallback until the owner supplies a verified WhatsApp number.
- Booking slots are explicitly demo slots, not advertised opening hours or availability. No reservation or order is accepted by a backend.
- Preserve existing vector logo artwork pending owner approval. Use local decorative SVG artwork, not food photos or claims about actual dishes.
- Do not invent founding dates, locations, ratings, employment benefits, delivery fees or taxes. This prototype shows sample subtotal only.
- Browser localStorage is optional. Failed persistence must leave the interaction usable and disclose that the result was not saved.
## Backend handover

Existing untracked SQL drafts were moved intact to the ignored supabase/legacy/local-drafts directory to keep them out of the migration runner. Booking capacity counts active reservations per slot. Storefront sample fallback is display-only for orders. Auth users are created by the owner in Supabase and assigned to staff by UUID in the panel.
