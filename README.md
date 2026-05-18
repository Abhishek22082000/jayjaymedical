# JAY-JAY MEDICAL — Tablet Inventory

Track tablets, batches, quantities and expiry across multiple clients. The same project
contains **two** independent implementations:

| Stack | Location | Database | When to use |
|---|---|---|---|
| **Next.js (Node.js)** | `pages/`, `lib/`, `components/`, `data/database.json` | JSON file | Run on a Node host or local dev — Vercel-friendly UI but writes don't persist on Vercel. |
| **PHP (legacy)** | `index.php`, `tablet_form.php`, `grouped.php`, `db.php` | MySQL (WAMP) | Original. Runs on the shop's local WAMP at `http://localhost/medical/`. |

The PHP files are not used by the Node.js version and are excluded from Vercel via `.vercelignore`.

---

## Running the Next.js app locally

```bash
# from C:\wamp64\www\medical
npm install
npm run dev
```

Then open <http://localhost:3000>.

Pages:
- `/`         — Dashboard (search, filter, stats, expiring banner, paginated list)
- `/form`     — Add / Edit a tablet (use `?id=<uuid>` for edit)
- `/grouped`  — By Tablet view (same product grouped across clients)

API endpoints:
- `GET    /api/tablets`        — list all tablets
- `POST   /api/tablets`        — create
- `PUT    /api/tablets/[id]`   — update
- `DELETE /api/tablets/[id]`   — delete

Data lives in `data/database.json`. Delete the file and restart the dev server to reset.

## Deploying

### Where it works (writes persist)

- **Any Node host with a persistent disk** — Hostinger Premium (Node app), Railway, Render,
  a small VPS. Run `npm run build && npm run start`. The `data/database.json` file will
  persist between requests.

### Deploying to Vercel with persistent saves (Upstash Redis / Vercel KV)

`lib/db.js` auto-detects KV credentials. When `KV_REST_API_URL` and `KV_REST_API_TOKEN`
(or the `UPSTASH_*` equivalents) are set, it uses Redis. Otherwise it falls back to
the local JSON file — so `npm run dev` keeps working with no setup.

To connect KV to the deployed site:

1. Open https://vercel.com/dashboard → your project → **Storage** tab.
2. Click **Create Database** → choose **Upstash** → **KV (Redis)**.
3. Pick the free tier, create the store, then **Connect Project** so the env vars
   are injected into the production deployment.
4. Go to **Deployments** → the latest one → **Redeploy** (or push a new commit) so
   the env vars take effect.
5. Open the site and try saving a tablet — it should persist now.

## Running the legacy PHP version

Already works on WAMP at <http://localhost/medical/index.php>. See the PHP files at the
project root. The MySQL schema is in `setup.sql` (initial) and `migrate_v2.sql` (added
manufacturer / quantity / manufacturing_date columns).
