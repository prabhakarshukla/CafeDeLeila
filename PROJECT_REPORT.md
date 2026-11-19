# Café De Leila project report

1. Purpose. Six customer pages for the Gomti Nagar café pitch.
2. Status. Frontend and backend source exist. Production integration is unverified.
3. Architecture. Static JavaScript and Supabase Auth, PostgREST, Storage and Edge Functions.
4. Files. Customer pages load js/main.js and js/support.js.
5. Theme. Obsidian, sand, serif headings and sans-serif body text.
6. Customer flows. Orders, bookings and applications call Edge Functions. Contact now submits to the contact Edge Function.
7. Database. Six core tables, admin_users, settings, order_status_history and submission_limits. Three sequences assign request numbers.
8. Functions. Orders, bookings, menu, applications and contact.
9. Admin. The branch now has eight admin views.
10. Security. Public catalog read policies, private operational rows and role helpers. Runtime enforcement is unverified.
11. Settings. The public view exposes whitelisted keys. Local catalog contains 19 categories and 80 flagged dishes.
12. Setup. Follow docs/SETUP_SUPABASE.md. Built-in function credentials are injected. Set the custom origin secret separately.
13. Testing. Prior screenshots predate these changes. Use BACKEND_AUDIT.md for current evidence.
14. Known gaps. Owner data and deployed behaviour require verification.
15. Demo. Use fictional customer and candidate details.
16. Terminology. A publishable key identifies the client. Auth and RLS determine access.
17. Next steps. Test the new-project setup before an owner demonstration.

## Corrections made

Recounted tables and catalog entries. Removed unproved readiness, RLS, atomic booking and deployment claims. Corrected static configuration and built-in credential instructions. Removed payment-key examples and distinguished historical frontend results from backend proof.

## Admin branch implementation

The panel now has eight routed views under /admin. The dashboard uses get_admin_dashboard_stats. Orders, bookings, applications and messages use role-scoped operations. Owners manage categories, items, sample labels, settings and staff, and can export orders. There are ten application tables including the submission limiter, three numbering sequences, five views and 25 policy definitions, including five for Storage. There are five Edge endpoints including contact. Client screenshots use mocked Supabase responses. Real RLS, Auth, Realtime, upload, and full clean migrations remain unverified.
