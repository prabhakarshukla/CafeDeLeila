# Open the café on your laptop and publish it

## What this part does

Your laptop can show the shop window. A deploy puts a version on a web host like Vercel. A real test order also needs waiters and kitchen records configured for that version.

## How it works, step by step

1. Run `python -m http.server 8080` from the repository and open `http://localhost:8080/`. The same server shows the office at `/admin/`.
2. Run `npm ci` and `npm run audit:mobile` to practice without writing live data. The mocked browser pages use pretend responses. The normal site reads the project in `data/config.json`.
3. A branch is a separate line of work, like a draft menu sheet. A commit is a saved group of source changes. Push the feature branch and review its changes on GitHub before merging.
4. For a new project, a migration is a numbered database change. Apply 001–004, 006, then 007. Apply the sample seed separately when appropriate. The existing project already has that schema as recorded in the verification report.
5. On Vercel, use the root folder as static output. Check a preview from the feature branch, including `/staff`. Follow the setup guide if you need a new Supabase project or Edge Function deployment.

## Which files are involved

| File | What it does in simple words |
|---|---|
| `README.md` | Shows the local command and links to setup. |
| `docs/SETUP_SUPABASE.md` | Lists the kitchen setup in order. |
| `supabase/config.toml` | Names the five waiters. |
| `vercel.json` | Redirects the short staff URL to the office. |
| `docs/VERIFY_SUPABASE.md` | Explains checks before any hosted writes. |

## What can go wrong and what to check

A file may open from disk while browser requests fail. Use the local HTTP server. A Vercel preview can load while its origin is absent from the Supabase allowlist. The preview for this branch is UNVERIFIED.

## Try it yourself

Start the local server and open `/admin/` without signing in. Close the server when you finish.
