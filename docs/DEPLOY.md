# Deployment Guide — Café De Leila

**Project:** `cafe-de-leila`  
**Repo:** https://github.com/prabhakarshukla/CafeDeLeila  
**Branch:** `feat/admin-backend` (development) → `main` (production)

---

## 1. Frontend Deployment (Static Site)

### Netlify (Recommended — Free HTTPS + CDN)

1. **Connect Repository**
   - Netlify Dashboard → "Add new site" → "Import an existing project"
   - Select GitHub → `prabhakarshukla/CafeDeLeila`
   - Branch: `feat/admin-backend` (or `main` after merge)

2. **Build Settings**
   - Build command: *(leave empty — static site)*
   - Publish directory: `.` (root)
   - Functions directory: *(leave empty — using Supabase Edge Functions)*

3. **Environment Variables** (Site settings → Environment variables)
   ```
   VITE_SUPABASE_URL=https://dqzmyahsedhvgbfqprks.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_3KNkfvVPXglN2hVTvBmq2g_2TXtkc8R
   ```

4. **Deploy**
   - Click "Deploy site"
   - Netlify assigns `https://<random-name>.netlify.app`
   - Free HTTPS automatic (Let's Encrypt)

5. **Custom Domain** (Optional)
   - Domain settings → "Add custom domain" → `cafedeleila.com`
   - Netlify DNS or external DNS (CNAME to `<site>.netlify.app`)
   - Netlify provisions SSL automatically (Let's Encrypt)

### Vercel (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```
- Same env vars in Vercel Dashboard → Settings → Environment Variables
- Auto HTTPS, custom domains supported

### GitHub Pages (Static Only)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```
- **Limitation:** No serverless functions, no custom headers for CSP
- **Use only for static demo** — Supabase Edge Functions won't work

---

## 2. Backend (Supabase) — Already Configured

| Component | Status | Notes |
|-----------|--------|-------|
| Database (PostgreSQL) | ✅ | Migrations 001-005 applied |
| Auth (Email/Password) | ✅ | Configured for admin users |
| Storage | ✅ | 3 buckets with policies |
| Edge Functions | ✅ | 4 functions deployed |
| Realtime | ✅ | Orders + Bookings |
| Secrets | ⚠️ | Set in Dashboard → Edge Functions → Settings |

**No additional deployment needed** — Supabase is managed.

---

## 3. CI/CD Pipeline (Optional)

### GitHub Actions for Frontend

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: '.'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
          enable-pull-request-comment: false
          enable-commit-comment: true
          overwrites-pull-request-comment: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Setup:**
1. Netlify → User settings → Applications → Personal access tokens → Generate token
2. Netlify → Site settings → General → Site ID
3. GitHub repo → Settings → Secrets → Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`

---

## 4. HTTPS — Automatic & Free

| Platform | SSL Provider | Cost |
|----------|--------------|------|
| Netlify | Let's Encrypt (auto-renew) | Free |
| Vercel | Let's Encrypt / Vercel CA | Free |
| GitHub Pages | Let's Encrypt | Free |
| Custom server | Certbot / Cloudflare | Free |

**Why this matters:** The old `cafedeleila.com` had a broken HTTPS (privacy error). Deploying to Netlify/Vercel gives free, valid HTTPS automatically — fixing the #1 critical fault from the live site audit.

---

## 5. Post-Deployment Verification

| Check | Command / Action |
|-------|------------------|
| Frontend loads | `curl -I https://your-site.netlify.app` → `200 OK` |
| HTTPS valid | Browser → lock icon, no warnings |
| Supabase functions | `curl -X POST https://.../functions/v1/menu` → JSON response |
| RLS working | Anonymous request to orders → 401/403 |
| Realtime | Open admin dashboard in 2 tabs, place order → live update |
| Admin login | Sign in with admin email → dashboard loads |
| Realtime orders | Place test order → appears in dashboard instantly |

---

## 5. Rollback Plan

| Scenario | Action |
|----------|--------|
| Frontend broken | Netlify: Deploys → "Rollback to previous deploy" |
| Supabase migration bad | `supabase migration repair` + manual SQL fix |
| Edge Function bug | `supabase functions deploy <function>` (previous version) |
| Secrets leaked | Rotate in Supabase Dashboard → Functions → Secrets |

---

## 6. Monitoring & Alerts (Free Tier)

| Tool | What it monitors | Cost |
|------|------------------|------|
| Supabase Dashboard | DB size, API requests, function invocations | Free |
| Netlify Analytics | Page views, bandwidth | Free (100k/mo) |
| UptimeRobot | Uptime monitoring (5-min intervals) | Free (50 monitors) |
| Sentry (optional) | Frontend errors | Free (5k events/mo) |

---

## 6. Cost Summary (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Pro (8GB DB, 2M function invocations) | $25/mo |
| Netlify | Starter (100GB bandwidth, 300 build mins) | Free |
| Domain | `cafedeleila.com` | ~$12/yr |
| **Total** | | **~$25/mo + $1/yr** |

> Free tier sufficient for development; Pro needed for production traffic.

---

## 7. Emergency Contacts

| Role | Contact |
|------|---------|
| Supabase Support | https://supabase.com/support |
| Netlify Support | https://www.netlify.com/support |
| Domain Registrar | Your registrar's support |

---

**Last Updated:** 2026-11-18  
**Next Review:** After production launch