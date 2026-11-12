// Ambil realisasi per rayon dari Supabase (lewat Worker /api/data/progress_rayon)
// lalu tempel ke DATA. Kalau Supabase belum tersambung, web tetap jalan dengan data brief.
window.loadProgress = async function () {
  var RAYON = { sby_timur: 'Surabaya Timur', sby_barat: 'Surabaya Barat', sda_timur: 'Sidoarjo Timur', sda_barat: 'Sidoarjo Barat', gresik: 'Gresik' };
  var r = await fetch('/api/data/progress_rayon?select=sub_program_id,rayon_id,realisasi&realisasi=not.is.null', { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var rows = await r.json();
  if (!Array.isArray(rows)) return;
  var map = {};
  rows.forEach(function (x) { (map[x.sub_program_id] = map[x.sub_program_id] || {})[RAYON[x.rayon_id] || x.rayon_id] = Number(x.realisasi); });
  DATA.briefs.forEach(function (b) {
    b.subs.forEach(function (s) {
      var m = map[s.id];
      if (!m) return;
      if (s.tingkat === 'rayon') s.alokasi.forEach(function (a) { if (m[a.rayon] != null) a.real = m[a.rayon]; });
      else s.areaReal = m;
    });
  });
};
