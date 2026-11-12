// Monitoring Area Surabaya — Cloudflare Worker
// Static files dari /public, API di /api/* (proxy ke Supabase REST)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function supabase(env, path, init = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY belum di-set di Cloudflare");
  }
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      // key lama (JWT eyJ…) juga dikirim sebagai Bearer; key baru sb_publishable_ cukup di header apikey
      ...(env.SUPABASE_ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` } : {}),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Cek koneksi GitHub → Cloudflare → Supabase
    if (url.pathname === "/api/health") {
      const out = {
        worker: "ok",
        supabase_url_set: !!env.SUPABASE_URL,
        supabase_key_set: !!env.SUPABASE_ANON_KEY,
        supabase: "skip",
      };
      if (out.supabase_url_set && out.supabase_key_set) {
        try {
          // cek lewat tabel kecil (root /rest/v1/ bisa ditolak untuk publishable key)
          const r = await supabase(env, "rayon?select=id&limit=1");
          out.supabase = r.ok ? "ok" : `error ${r.status}`;
        } catch (e) {
          out.supabase = `error: ${e.message}`;
        }
      }
      return json(out);
    }

    // Baca tabel: GET /api/data/<nama_tabel>?select=*&limit=100
    const m = url.pathname.match(/^\/api\/data\/([a-zA-Z0-9_]+)$/);
    if (m && request.method === "GET") {
      try {
        const qs = url.search || "?select=*";
        const r = await supabase(env, `${m[1]}${qs}`);
        return new Response(await r.text(), {
          status: r.status,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
