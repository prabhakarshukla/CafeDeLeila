# CAFÉ DE LEILA — Website

A modern, mobile-first website for Café De Leila, Lucknow. Built with vanilla HTML, CSS, and JavaScript — no build step required.

## 🚀 Quick Start

```bash
# Navigate to project directory
cd "C:/cafe de lelia"

# Start local server (Windows PowerShell compatible)
python -m http.server 8080

# Open in browser
# http://localhost:8080
```

## 📁 Folder Structure

```
cafe de lelia/
├── index.html           # Home page
├── menu.html            # Menu with filters & search
├── book-table.html      # Table booking form
├── careers.html         # Job applications with CV upload
├── contact.html         # Contact form & map
├── locations.html       # Location cards & maps
├── css/
│   ├── variables.css    # CSS custom properties (theme)
│   ├── base.css         # Reset, typography, utilities
│   ├── components.css   # Header, footer, cart, modals, forms
│   └── pages.css        # Page-specific styles
├── js/
│   ├── utils.js         # Shared utilities (DOM, storage, formatting, etc.)
│   ├── app.js           # Core app (header, footer, cart, checkout)
│   ├── menu.js          # Menu page logic
│   ├── booking.js       # Booking page logic
│   ├── careers.js       # Careers page logic
│   ├── contact.js       # Contact page logic
│   └── locations.js     # Locations page logic
├── data/
│   ├── config.json      # Site configuration (contacts, hours, social, etc.)
│   └── menu.json        # Menu data (categories, items, prices)
├── assets/
│   ├── favicon.svg      # Site favicon
│   └── logo_deleila.svg # Logo placeholder
└── audit/               # Audit screenshots (generated during QA)
```

## ⚙️ Configuration

### `data/config.json` — Site Settings

Edit this file to update:
- **Contact info**: phone, email, address, WhatsApp number
- **Opening hours**: schedule array (TODO: confirm actual hours)
- **Social links**: Facebook, Instagram, YouTube
- **Ordering settings**: delivery fee, minimum order, tax rate
- **Booking settings**: time slots, max guests, advance booking window
- **Careers settings**: allowed file types, max file size, roles
- **SEO**: default title, description, OG image

### `data/menu.json` — Menu Data

Structure:
```json
{
  "_meta": {
    "note": "All prices are SAMPLE values for demonstration only.",
    "_sample": true,
    "currency": "INR"
  },
  "categories": [
    {
      "id": "desserts",
      "name": "Desserts",
      "description": "Sweet endings...",
      "items": [
        {
          "id": "dessert-1",
          "name": "Gulab Jamun Cheesecake",
          "description": "Creamy New York cheesecake...",
          "price": 280,
          "veg": true,
          "image": "/assets/menu/dessert-gulab-jamun-cheesecake.jpg",
          "tags": ["popular", "signature"],
          "_sample": true
        }
      ]
    }
  ]
}
```

**Important**: All prices are marked with `"_sample": true` — replace with real prices before launch.

## 🎨 Theme Customization

All colors are defined in `css/variables.css` under `:root`:

```css
:root {
  --color-sand: #B28F6F;        /* Primary accent */
  --color-sand-light: #C9A88E;  /* Hover states */
  --color-sand-dark: #967858;   /* Active/pressed */
  --color-obsidian: #161616;    /* Main background */
  --color-obsidian-light: #1E1E1E;
  --color-obsidian-card: #1A1A1A; /* Card backgrounds */
  --color-text-primary: #F5F0EB;
  --color-text-secondary: #D4C4B8;
  --color-text-muted: #9A8D82;
}
```

Derive new shades only from these two base colors.

## 📱 Features

### Home Page (`index.html`)
- Hero with headline, tagline, CTA buttons, image placeholder
- Featured dishes (6 cards from menu data)
- "How ordering works" (3 steps)
- About section with story
- Opening hours from config
- Reviews strip (sample data)
- CTA band

### Menu Page (`menu.html`) — **Core Feature**
- Search box with debounced filtering
- Dietary filter chips: All / Veg / Non-Veg
- Horizontal scrollable category chips (all 18 categories)
- Responsive grid: 1 col (mobile) → 2 (tablet) → 3 (desktop) → 4 (large)
- Dish cards with: image, name, description, price, veg/non-veg badge, tags, add button
- Quantity stepper in cart drawer

### Cart & Order Flow (No Backend)
- Slide-out cart drawer (persists in localStorage)
- Quantity controls, remove items
- Subtotal, delivery fee (free above ₹200), tax (5%)
- Checkout modal: name, phone (10-digit validation), order type (Dine-in/Takeaway/Delivery), address (conditional), notes
- On submit: validation → order ID → localStorage → WhatsApp pre-filled message
- **Phase 2**: Real payment gateway integration

### Book a Table (`book-table.html`)
- Date picker (next 60 days, no past dates)
- Time slots (configurable, past times disabled for today)
- Guest counter (1-20)
- Form validation with clear error messages
- Success screen with booking summary + WhatsApp confirmation link

### Careers (`careers.html`)
- Form: name, email, phone, role (dropdown from config), CV upload (PDF/DOC/DOCX, max 2MB), address
- Drag & drop file upload with validation
- Success screen with reference ID

### Contact (`contact.html`)
- Contact form with validation
- Contact info card (phone, email, address from config)
- Lazy-loaded Google Maps iframe
- "Open in Maps" link

### Locations (`locations.html`)
- Location cards with embedded maps (lazy-loaded)
- Address, hours, direction/call buttons
- Placeholder for future locations

## ♿ Accessibility

- Semantic HTML5 (header, nav, main, section, footer, article, aside)
- One `<h1>` per page
- Skip link on every page
- ARIA labels, roles, and states on interactive components
- Focus visible styles on all interactive elements
- Keyboard navigation (Tab, Escape to close modals)
- Focus trapping in modals/drawers
- Screen reader announcements for cart updates, form errors
- `prefers-reduced-motion` respected
- Minimum 44px touch targets
- Minimum 16px body text
- Color contrast ≥ 4.5:1

## 🚀 Deployment

### Netlify (Recommended)
1. Push to GitHub
2. Connect repo to Netlify
3. Build command: (none)
4. Publish directory: `.` (root)
5. Netlify provides free HTTPS, custom domain, form handling

### Vercel
1. Push to GitHub
2. Import in Vercel
3. Framework: Other
4. Output directory: `.`

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: Deploy from branch (main)
3. Folder: `/ (root)`
4. Enable "Enforce HTTPS"

**All three provide free HTTPS** — fixing the old site's security warning.

## 📋 TODO FOR OWNER (Before Launch)

| Item | Status | Notes |
|------|--------|-------|
| Real logo file | ⬜ | Replace `/assets/logo_deleila.svg` |
| Real food photos | ⬜ | Add to `/assets/menu/` and update `menu.json` |
| Real prices | ⬜ | Edit `menu.json`, remove `"_sample": true` |
| Confirm opening hours | ⬜ | Update `config.json` hours.schedule |
| WhatsApp number | ⬜ | Update `config.json` contact.whatsapp |
| Confirm address | ⬜ | Update `config.json` contact.address |
| Payment gateway | ⬜ | Phase 2: Razorpay/Stripe/PayU integration |
| Admin panel | ⬜ | Phase 2: Order management dashboard |
| SSL/HTTPS | ✅ | Provided by Netlify/Vercel/GitHub Pages |

## 🔧 Development Notes

### Adding New Menu Items
1. Edit `data/menu.json`
2. Add item to appropriate category
3. Include: id, name, description, price, veg (boolean), image path, tags array, "_sample": true

### Adding New Pages
1. Create `new-page.html` with header/footer placeholders
2. Add page-specific CSS to `css/pages.css`
3. Create `js/new-page.js` if needed
4. Import in HTML: `<script type="module" src="/js/new-page.js"></script>`

### Browser Support
- Modern browsers (last 2 versions)
- ES Modules (native)
- CSS Custom Properties
- IntersectionObserver (lazy loading)
- localStorage

## 📝 Changelog

See `CHANGELOG.md` for iteration history.

## 📄 License

Proprietary — Café De Leila. All rights reserved.