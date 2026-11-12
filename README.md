# Monitoring Area Surabaya

Stack: **GitHub → Cloudflare Workers (auto deploy) → Supabase**

```
public/index.html          web utama: menu Program (mekanisme brief) + KPI PROMOTOR
public/peta-trial.html     peta penetrasi trial (Leaflet + tiles Esri)
public/status.html         cek koneksi Worker ↔ Supabase
public/app/                runtime, template, logika & data (tanpa data pribadi)
public/data/               data titik trial untuk peta
supabase/schema.sql        tabel + RLS (anon hanya baca)
supabase/seed.sql          data awal: 63 baris progress per rayon, volume, promotor, titik trial
src/index.js               Worker: /api/health, /api/data/<tabel>
wrangler.jsonc             konfigurasi Cloudflare
```

## Setup koneksi (sekali saja)

1. **Supabase** → buat/pilih project → *SQL Editor*: jalankan `supabase/schema.sql`, lalu `supabase/seed.sql` (aman dijalankan ulang).
   Lalu *Project Settings > API*: salin **Project URL** dan **anon / publishable key**.
   Input realisasi: *Table Editor → progress_rayon* (kolom `realisasi`, `status`, `pic`, `update_terakhir`, `catatan`, `link_bukti`).
2. **Cloudflare** → *Workers & Pages > Create > Import a repository* → pilih `amasurabaya8-dotcom/Monitoring-Area-Surabaya`, branch `main`.
   - Build command: *(kosongkan)* · Deploy command: `npx wrangler deploy`
3. Setelah worker jadi → *Settings > Variables and Secrets*:
   - `SUPABASE_URL` (Text) = Project URL
   - `SUPABASE_ANON_KEY` (Secret) = anon key
4. Buka `https://monitoring-area-surabaya.<akun>.workers.dev/status.html` → semua status harus ✓.
   Web utama di `/`, peta di `/peta-trial.html`. Realisasi di web otomatis terbaca dari tabel `progress_rayon`.

Setiap push ke `main` otomatis deploy ulang.

## API
- `GET /api/health` — cek koneksi
- `GET /api/data/<tabel>?select=*&limit=100` — baca tabel Supabase (perlu RLS policy `select` untuk role `anon`)

---
Develop Program By Nurman Catra
