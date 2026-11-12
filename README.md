# Monitoring Area Surabaya

Stack: **GitHub → Cloudflare Workers (auto deploy) → Supabase**

```
public/        halaman web (static assets)
src/index.js   Worker: /api/health, /api/data/<tabel>
wrangler.jsonc konfigurasi Cloudflare
```

## Setup koneksi (sekali saja)

1. **Supabase** → buat/pilih project → *Project Settings > API*: salin **Project URL** dan **anon / publishable key**.
2. **Cloudflare** → *Workers & Pages > Create > Import a repository* → pilih `amasurabaya8-dotcom/Monitoring-Area-Surabaya`, branch `main`.
   - Build command: *(kosongkan)* · Deploy command: `npx wrangler deploy`
3. Setelah worker jadi → *Settings > Variables and Secrets*:
   - `SUPABASE_URL` (Text) = Project URL
   - `SUPABASE_ANON_KEY` (Secret) = anon key
4. Buka `https://monitoring-area-surabaya.<akun>.workers.dev` → semua status harus ✓.

Setiap push ke `main` otomatis deploy ulang.

## API
- `GET /api/health` — cek koneksi
- `GET /api/data/<tabel>?select=*&limit=100` — baca tabel Supabase (perlu RLS policy `select` untuk role `anon`)

---
Develop Program By Nurman Catra
