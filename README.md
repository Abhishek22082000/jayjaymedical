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

### Where it does NOT work (writes lost on every deploy)

- **Vercel** — Vercel's filesystem is read-only at runtime. The site will *render* fine,
  but saving a new tablet would either fail or only live until the function instance is
  recycled. For Vercel, swap `lib/db.js` over to **Vercel KV** (free hobby tier, no card
  required), Vercel Postgres, or a managed DB like Supabase.

### Swapping JSON for Vercel KV (when ready)

1. In the Vercel dashboard, attach a **KV** store to the project.
2. `npm install @vercel/kv`
3. Replace the body of `lib/db.js` with `kv.get('tablets') / kv.set('tablets', …)`.
4. No other code changes needed — every page calls only `lib/db.js`.

## Running the legacy PHP version

Already works on WAMP at <http://localhost/medical/index.php>. See the PHP files at the
project root. The MySQL schema is in `setup.sql` (initial) and `migrate_v2.sql` (added
manufacturer / quantity / manufacturing_date columns).
