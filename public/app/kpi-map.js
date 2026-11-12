// Peta sebaran trial (Leaflet + tiles Esri) di menu KPI PROMOTOR.
// Dipanggil DCLite setiap selesai render; peta dibuat ulang karena DOM diganti.
(function () {
  var TILES = {
    terang: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    gelap: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
  };
  var tema = 'terang';
  try { tema = localStorage.getItem('peta_tema') || 'terang'; } catch (e) {}
  var map = null, view = null, lastKey = '';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  window.afterRender = function (vals) {
    var el = document.getElementById('kpi-map');
    if (map) { view = { c: map.getCenter(), z: map.getZoom() }; map.remove(); map = null; }
    if (!el || !window.L || !vals || !vals.kpi) return;
    var pts = vals.kpi.mapPts || [];
    var key = pts.map(function (p) { return p.lat + ',' + p.lng; }).join('|');

    map = L.map(el, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer(TILES[tema], { maxZoom: 16, attribution: 'Tiles &copy; Esri' }).addTo(map);

    var maxN = Math.max.apply(null, [1].concat(pts.map(function (p) { return p.n; })));
    pts.forEach(function (p) {
      L.circleMarker([p.lat, p.lng], {
        radius: 14 + Math.sqrt(p.n / maxN) * 20,
        color: '#FFFFFF', weight: 2, fillColor: p.color, fillOpacity: 0.85
      })
        .bindTooltip(esc(p.nama) + ' · ' + p.n + ' head')
        .bindPopup('<b>' + esc(p.nama) + '</b><br>' + p.n + ' head trial · ' + esc(p.lokasi || '-') +
          '<br><a href="' + p.url + '" target="_blank" rel="noopener">Buka di Google Maps</a>')
        .addTo(map);
    });

    // pertahankan posisi zoom kalau titiknya sama (mis. hanya ganti tema); kalau filter berubah, fokus ke titik
    if (view && key === lastKey) map.setView(view.c, view.z);
    else if (pts.length) map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.5), { maxZoom: 14 });
    else map.setView([-7.30, 112.71], 11);
    lastKey = key;

    var sel = document.getElementById('kpi-map-tema');
    if (sel) {
      sel.value = tema;
      sel.onchange = function () {
        tema = sel.value;
        try { localStorage.setItem('peta_tema', tema); } catch (e) {}
        window.afterRender(vals);
      };
    }
  };
})();
