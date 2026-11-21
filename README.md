# Café De Leila

Six customer pages and a manager's office use Supabase for the menu, orders, bookings, applications and messages. Start with the guide for your role. [Start here](docs/START-HERE.md)

## Open the site on a laptop

```powershell
python -m http.server 8080
```

Open `http://localhost:8080/` for the shop window or `http://localhost:8080/admin/` for the office. The normal site uses the project configured in `data/config.json`. The Vercel shortcut `/staff` leads to `/admin/`. It may not redirect on a plain Python server. [Admin phone access](docs/ADMIN_ACCESS.md)

## Run the mobile checks

```powershell
npm ci
npm run audit:mobile
```

Use Node 24 and Chrome. The audit uses pretend browser responses and creates no live Supabase records. Reports and screenshots go to the ignored `audit/mobile-output/` folder. The package files are for tests. The deployed web pages run directly in the browser. [Mobile results](docs/MOBILE_AUDIT.md)

## Database and launch

For a new project, use migrations 001–004, 006, and 007 and the separate sample seed. This mobile and documentation branch requires no new Supabase migrations or function changes for the existing project. Verify the preview and phone checklist before merging. [Database setup](docs/SETUP_SUPABASE.md) · [Verification](docs/VERIFY_SUPABASE.md)

The menu uses 80 sample dishes, and the café owner still needs to approve the real prices, images, hours and contact details. The owner records payment status manually. [Project report](PROJECT_REPORT.md)
