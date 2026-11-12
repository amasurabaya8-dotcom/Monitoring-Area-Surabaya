// Logika tampilan (sama dengan desain canvas)
class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { bi: 0, sid: null, ry: 'all', wk: 'auto', view: 'program', pr: 'all' };
  }
  renderVals() {
    var self = this;
    var accent = this.props.accent ?? '#0F766E';
    var showChart = this.props.showChart ?? true;
    var weeks = DATA.weeks;
    var today = new Date().toISOString().slice(0, 10);
    var nowIdx = -1;
    for (var i = 0; i < weeks.length; i++) { if (today >= weeks[i].s && today <= weeks[i].e) nowIdx = i; }
    if (nowIdx < 0) { for (var j = 0; j < weeks.length; j++) { if (DATA.tanggal >= weeks[j].s && DATA.tanggal <= weeks[j].e) nowIdx = j; } }
    var nowKey = nowIdx >= 0 ? weeks[nowIdx].k : null;
    var wIndex = {}; weeks.forEach(function (w, k) { wIndex[w.k] = k; });
    var wLabel = function (k) { var w = weeks[wIndex[k]]; return w ? w.l : k; };
    var fmt = function (d) { if (!d) return '—'; var p = d.split('-'); var m = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(p[1], 10) - 1]; return parseInt(p[2], 10) + ' ' + m; };
    var todayRef = nowIdx >= 0 ? (today >= weeks[0].s && today <= weeks[weeks.length - 1].e ? today : DATA.tanggal) : DATA.tanggal;
    // pilihan minggu (dropdown): 'auto' = minggu hari ini
    var autoIdx = nowIdx;
    var wk = this.state.wk;
    if (wk !== 'auto' && wIndex[wk] != null) { nowIdx = wIndex[wk]; nowKey = wk; todayRef = weeks[nowIdx].s; }
    var weekOpts = [{ v: 'auto', l: 'Otomatis' + (autoIdx >= 0 ? ' (' + weeks[autoIdx].l + ')' : '') }].concat(weeks.map(function (w) { return { v: w.k, l: w.l + ' · ' + fmt(w.s) + '–' + fmt(w.e) }; }));
    var pickWeek = function (e) { self.setState({ wk: e && e.target ? e.target.value : 'auto' }); };
    var phaseDates = function (a, b) { if (!a) return '—'; if (todayRef < a) return 'Belum mulai'; if (b && todayRef > b) return 'Periode selesai'; return 'Berjalan'; };
    var phaseOf = function (s) {
      if (s.berlaku === 'tidak') return 'Tidak berlaku';
      if (s.minggu.length) {
        var a = wIndex[s.minggu[0]], b = wIndex[s.minggu[s.minggu.length - 1]];
        if (nowIdx < a) return 'Belum mulai · ' + wLabel(s.minggu[0]);
        if (nowIdx > b) return 'Periode selesai';
        return 'Berjalan · minggu ' + (nowIdx - a + 1) + '/' + s.minggu.length;
      }
      if (s.mulai && /^\d{4}-\d{2}-\d{2}$/.test(s.mulai)) return phaseDates(s.mulai, s.selesai);
      if (s.mulai) return 'Mulai ' + wLabel(s.mulai);
      return 'Periode tidak disebut';
    };
    var chip = {
      ya: ['Berlaku', '#E6F4F1', '#0F5F58'],
      tidak: ['Tidak berlaku', '#EEF0F3', '#4B5563'],
      belum: ['Belum dirinci', '#FDF0E6', '#9A3412']
    };
    var chipStyle = function (b) { return 'font-size: 11px; font-weight: 600; white-space: nowrap; border-radius: 999px; padding: 3px 8px; background: ' + chip[b][1] + '; color: ' + chip[b][2]; };

    var bi = this.state.bi;
    var brief = DATA.briefs[bi];
    var cnt = { ya: 0, tidak: 0, belum: 0 };
    brief.subs.forEach(function (s) { cnt[s.berlaku]++; });
    var briefTabs = DATA.briefs.map(function (b, k) {
      var sel = k === bi;
      var n = b.subs.filter(function (s) { return s.berlaku !== 'tidak'; }).length;
      return {
        nama: b.nama.replace(/^Brief (Launching )?/, '').replace(/^Briefing /, ''),
        count: n + ' sub-program aktif',
        pick: function () { self.setState({ bi: k, sid: null }); },
        style: 'min-height: 44px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 14px; border-radius: 10px; cursor: pointer; text-align: left; ' + (sel ? 'background: ' + accent + '; color: #FFFFFF; border: 1px solid ' + accent : 'background: #FFFFFF; color: #111827; border: 1px solid #D5DAE1')
      };
    });

    var order = { ya: 0, belum: 1, tidak: 2 };
    var subs = brief.subs.slice().sort(function (a, b) { return order[a.berlaku] - order[b.berlaku]; });
    var sid = this.state.sid || subs[0].id;
    var s = brief.subs.filter(function (x) { return x.id === sid; })[0] || subs[0];

    var num = function (v) { return v == null ? '—' : String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var RAYON = ['Surabaya Timur', 'Surabaya Barat', 'Sidoarjo Timur', 'Sidoarjo Barat', 'Gresik'];
    var ry = this.state.ry;
    var ryName = ry === 'all' ? 'Semua rayon' : ry;
    var rayonOpts = [{ v: 'all', l: 'Semua rayon' }].concat(RAYON.map(function (r) { return { v: r, l: r }; }));
    var pickRayon = function (e) { self.setState({ ry: e && e.target ? e.target.value : 'all' }); };
    // baris per rayon: level rayon dari brief; level area dibagi rata 5 rayon
    var rowsOf = function (x) {
      var rows = [];
      if (x.tingkat === 'rayon') rows = x.alokasi.map(function (a) { return { rayon: a.rayon, target: a.target, satuan: a.satuan, real: a.real, extra: a.extra, bagi: false }; });
      else if (x.tingkat === 'area' && x.area && typeof x.area.nilai === 'number') {
        var per = Math.round(x.area.nilai / RAYON.length * 10) / 10;
        rows = RAYON.map(function (r) { var ar = x.areaReal || {}; return { rayon: r, target: per, satuan: x.area.satuan, real: ar[r] == null ? null : ar[r], extra: '', bagi: true }; });
      }
      return ry === 'all' ? rows : rows.filter(function (r) { return r.rayon === ry; });
    };
    var hasAlok = function (x) { return x.tingkat === 'rayon' || (x.tingkat === 'area' && x.area && typeof x.area.nilai === 'number'); };

    var subList = subs.map(function (x) {
      var sel = x.id === s.id;
      var rr = rowsOf(x);
      var tgt = rr.reduce(function (a, r) { return a + r.target; }, 0);
      var none = ry !== 'all' && x.berlaku !== 'tidak' && hasAlok(x) && rr.length === 0;
      var show = ry !== 'all' && x.berlaku !== 'tidak' && hasAlok(x);
      return {
        ryTxt: none ? 'Tidak ada alokasi di ' + ry : (show ? 'Target ' + ry + ': ' + num(Math.round(tgt * 10) / 10) + ' ' + (rr[0] ? rr[0].satuan : '') + (rr[0] && rr[0].bagi ? ' (bagi rata)' : '') : ''),
        ryStyle: show ? 'font-size: 12px; font-weight: 600; text-align: left; color: ' + (none ? '#4B5563' : accent) : 'display: none',
        nama: x.nama, kategori: x.kategori, phase: phaseOf(x),
        chipText: chip[x.berlaku][0], chipStyle: chipStyle(x.berlaku),
        pick: function () { self.setState({ sid: x.id }); },
        style: 'min-height: 44px; display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 10px; cursor: pointer; width: 100%; ' + (sel ? 'background: #F0F7F6; border: 1px solid ' + accent : 'background: #FFFFFF; border: 1px solid transparent') + (x.berlaku === 'tidak' ? '; opacity: 0.7' : '')
      };
    });

    var sRows = rowsOf(s);
    var sTarget = Math.round(sRows.reduce(function (a, r) { return a + r.target; }, 0) * 10) / 10;
    var sReal = sRows.reduce(function (a, r) { return a + (r.real || 0); }, 0);
    var alokasi = sRows.map(function (a) {
      var pct = a.real == null || !a.target ? 0 : Math.min(100, Math.round(a.real / a.target * 100));
      return {
        rayon: a.rayon, extra: a.bagi ? 'Dibagi rata dari total area' : a.extra, hasExtra: a.bagi || !!a.extra,
        label: (a.real == null ? 'belum diisi' : num(a.real)) + ' / ' + num(a.target) + ' ' + a.satuan + (a.real == null ? '' : ' · ' + pct + '%'),
        barStyle: 'height: 100%; width: ' + pct + '%; background: ' + accent + '; border-radius: 999px'
      };
    });
    var ms = s.milestone.map(function (m) { return { t: m.t, range: fmt(m.d) + (m.e && m.e !== m.d ? ' – ' + fmt(m.e) : ''), st: phaseDates(m.d, m.e || m.d) }; });
    var periodeRange = s.minggu.length ? wLabel(s.minggu[0]) + ' – ' + wLabel(s.minggu[s.minggu.length - 1]) + ' (' + s.minggu.length + ' minggu)'
      : (s.mulai ? (/^\d{4}-/.test(s.mulai) && s.mulai.length === 10 ? fmt(s.mulai) + ' – ' + fmt(s.selesai) : wLabel(s.mulai) + (s.selesai ? ' – ' + wLabel(s.selesai) : ' – (tanpa akhir)')) : '—');
    var sub = {
      nama: s.nama, kategori: s.kategori, tujuan: s.tujuan, hasTujuan: !!s.tujuan,
      isTidak: s.berlaku === 'tidak', alasan: s.alasan,
      chipText: chip[s.berlaku][0], chipStyle: chipStyle(s.berlaku).replace('font-size: 11px', 'font-size: 12px').replace('padding: 3px 8px', 'padding: 4px 10px'),
      phase: phaseOf(s),
      hasPeriode: s.berlaku !== 'tidak' && (!!s.periodeTeks || !!s.mulai), periodeTeks: s.periodeTeks || '—', periodeRange: periodeRange,
      hasRayon: alokasi.length > 0, alokasi: alokasi, ryLabel: ryName,
      noRayon: s.berlaku !== 'tidak' && hasAlok(s) && alokasi.length === 0,
      hasArea: s.tingkat === 'area' && !!s.area, area: s.area || { nilai: '', satuan: '', rincian: '' }, areaNilai: s.area ? num(s.area.nilai) : '',
      targetTotal: num(sTarget), realTxt: num(sReal),
      hasMilestone: ms.length > 0, milestone: ms,
      hasMek: s.mekanisme.length > 0, mekanisme: s.mekanisme,
      hasSk: s.sk.length > 0, sk: s.sk,
      infoAll: s.info.concat(s.approval), hasInfo: s.info.length + s.approval.length > 0,
      hasToko: s.toko.length > 0, toko: s.toko,
      hasCatatan: s.catatan.length > 0, catatan: s.catatan
    };

    var gridStyle = 'display: grid; grid-template-columns: 220px repeat(' + weeks.length + ', minmax(36px, 1fr)); gap: 3px; align-items: center';
    var weekHead = weeks.map(function (w, k) {
      return { l: w.l, style: 'font-size: 11px; text-align: center; padding: 4px 0; border-radius: 4px; ' + (k === nowIdx ? 'background: #DCE7F7; color: #1E3A5F; font-weight: 700' : 'color: #4B5563') };
    });
    var ganttSubs = subs.filter(function (x) { return x.minggu.length || x.chart.length; });
    var ganttRows = ganttSubs.map(function (x) {
      var setT = {}, setC = {};
      x.minggu.forEach(function (k) { setT[k] = 1; });
      if (showChart) x.chart.forEach(function (k) { setC[k] = 1; });
      var sel = x.id === s.id;
      return {
        nama: x.nama,
        pick: function () { self.setState({ sid: x.id }); },
        labelStyle: 'font-size: 12px; text-align: left; background: none; border: none; padding: 6px 4px; min-height: 32px; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; ' + (sel ? 'font-weight: 700; text-decoration: underline' : 'font-weight: 500'),
        cells: weeks.map(function (w, k) {
          var t = !!setT[w.k], c = !!setC[w.k];
          var bg = t ? accent : (c ? '#FDF0E6' : (k === nowIdx ? '#DCE7F7' : '#F4F5F7'));
          var bd = (!t && c) ? '1px dashed #C2410C' : '1px solid transparent';
          return { style: 'height: 22px; border-radius: 4px; box-sizing: border-box; background: ' + bg + '; border: ' + bd + (k === nowIdx && t ? '; box-shadow: inset 0 0 0 2px #DCE7F7' : ''), tip: w.l + ' (' + w.s + ' s/d ' + w.e + ')' + (t ? ' · periode' : '') + (c ? ' · chart' : '') };
        })
      };
    });

    var volList = brief.vol.map(function (v) {
      var sum = v.rows.reduce(function (a, r) { return a + r.target; }, 0);
      return {
        nama: v.nama, total: num(v.total), avg: (Math.round(sum / v.rows.length * 10) / 10).toString().replace('.', ','),
        rows: v.rows.map(function (r) {
          var isNow = r.w === nowKey;
          return { l: wLabel(r.w), target: String(r.target).replace('.', ','), realTxt: r.real == null ? '—' : r.real, style: 'flex: 1 1 0; min-width: 56px; display: flex; flex-direction: column; gap: 2px; align-items: center; padding: 8px 4px; border-radius: 8px; ' + (isNow ? 'background: #DCE7F7' : 'background: #F7F8FA') };
        })
      };
    });

    // ===== KPI PROMOTOR =====
    var view = this.state.view;
    var navBtn = function (on) { return 'min-height: 32px; padding: 4px 10px; font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer; ' + (on ? 'background: #FFFFFF; color: #0F1B2D; border: 1px solid #FFFFFF' : 'background: transparent; color: #FFFFFF; border: 1px solid #A7B4C6'); };
    var pct = function (a, t) { return t ? Math.round(a / t * 1000) / 10 : 0; };
    var pctTxt = function (a, t) { return t ? String(pct(a, t)).replace('.', ',') + '%' : '—'; };
    var short = function (n) { var w = n.split(' '); return w[0].length <= 2 && w[1] ? w[0] + ' ' + w[1] : w[0]; };
    var promRayon = KPI.promotor.filter(function (p) { return ry === 'all' || p.rayon === ry; });
    var pr = this.state.pr;
    if (pr !== 'all' && !promRayon.some(function (p) { return p.id === pr; })) pr = 'all';
    var proms = promRayon.filter(function (p) { return pr === 'all' || p.id === pr; });
    var ids = {}; proms.forEach(function (p) { ids[p.id] = 1; });
    var sum = function (f) { return proms.reduce(function (a, p) { return a + (p[f] || 0); }, 0); };
    var aT = sum('aTrial'), tTD = sum('tTrialTD'), tCY = sum('tTrialCY'), dsP = sum('dsPack'), dsR = sum('dsRp'), aC = sum('aCall'), tC = sum('tCall'), sbA = sum('sbPasang'), sbT = sum('tSB');
    var aktif = proms.filter(function (p) { return p.aTrial > 0; }).length;
    var subCol = function (v) { return 'font-size: 12px; color: ' + (v >= 100 ? '#15803D' : v < 50 ? '#B45309' : '#374151'); };
    var ic = function (c) { return 'width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; background: ' + c; };
    var I = {
      user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
      target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
      bag: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
      pin: 'M12 22s8-7.5 8-13a8 8 0 0 0-16 0c0 5.5 8 13 8 13zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
      store: 'M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6',
      team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
      focus: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
      up: 'M3 17l6-6 4 4 8-8M14 7h7v7',
      check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7'
    };
    var cards = [
      { label: 'Aktual Trial', value: num(aT) + ' head', sub: 'Target s/d hari ini ' + num(tTD) + ' · ' + pctTxt(aT, tTD), subStyle: subCol(pct(aT, tTD)), icon: I.user, iconStyle: ic('#2563EB') },
      { label: 'Pencapaian vs Target CY', value: pctTxt(aT, tCY), sub: 'Target CY ' + num(tCY) + ' head', subStyle: subCol(pct(aT, tCY)), icon: I.target, iconStyle: ic('#059669') },
      { label: 'Direct Selling', value: num(dsP) + ' pack', sub: 'Rp ' + num(dsR), subStyle: 'font-size: 12px; color: #374151', icon: I.bag, iconStyle: ic('#7C3AED') },
      { label: 'Aktual Call', value: num(aC) + ' / ' + num(tC), sub: 'Ach ' + pctTxt(aC, tC), subStyle: subCol(pct(aC, tC)), icon: I.pin, iconStyle: ic('#EA580C') },
      { label: 'Sunblind Terpasang', value: num(sbA) + ' / ' + num(sbT), sub: 'Ach ' + pctTxt(sbA, sbT), subStyle: subCol(pct(sbA, sbT)), icon: I.store, iconStyle: ic('#0891B2') },
      { label: 'Promotor Aktif Trial', value: aktif + ' / ' + proms.length, sub: 'sudah ada trial di cycle ini', subStyle: 'font-size: 12px; color: #374151', icon: I.team, iconStyle: ic('#4F46E5') }
    ];
    var mx = Math.max.apply(null, [1].concat(proms.map(function (p) { return Math.max(p.aTrial, p.tTrialTD || 0); })));
    var bar = function (v, c) { return 'width: 18px; height: ' + Math.max(2, Math.round(v / mx * 170)) + 'px; background: ' + c + '; border-radius: 4px 4px 0 0'; };
    var bars = proms.map(function (p) { return { nama: short(p.nama), a: p.aTrial, t: p.tTrialTD || 0, aStyle: bar(p.aTrial, '#2563EB'), tStyle: bar(p.tTrialTD || 0, '#F59E0B') }; });
    var bc = {}; proms.forEach(function (p) { Object.keys(p.brands).forEach(function (b) { bc[b] = (bc[b] || 0) + p.brands[b]; }); });
    var pal = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#0891B2', '#64748B'];
    var bl = Object.keys(bc).sort(function (a, b) { return bc[b] - bc[a]; });
    var tb = bl.reduce(function (a, b) { return a + bc[b]; }, 0);
    var acc = 0, stops = [];
    var brandLeg = bl.map(function (b, i) {
      var c = pal[i % pal.length], p0 = acc / tb * 100; acc += bc[b]; var p1 = acc / tb * 100;
      stops.push(c + ' ' + p0.toFixed(2) + '% ' + p1.toFixed(2) + '%');
      return { b: b, h: bc[b], p: pctTxt(bc[b], tb), dot: 'width: 12px; height: 12px; border-radius: 3px; flex: 0 0 auto; background: ' + c };
    });
    var donutStyle = 'width: 160px; height: 160px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; background: ' + (stops.length ? 'conic-gradient(' + stops.join(', ') + ')' : '#EEF0F3');
    var rows = proms.map(function (p, i) {
      var t = p.tTrialTD || 0, v = pct(p.aTrial, t);
      var st = p.aTrial === 0 ? ['Belum ada trial', '#FEE2E2', '#991B1B'] : v >= 100 ? ['On Track', '#DCFCE7', '#166534'] : v >= 50 ? ['Perlu dorong', '#FEF3C7', '#92400E'] : ['Perlu perhatian', '#FFEDD5', '#9A3412'];
      return { no: i + 1, nama: p.nama, rayon: p.rayon, t: num(t), a: num(p.aTrial), ach: pctTxt(p.aTrial, t), gap: num(p.aTrial - t), ds: num(p.dsPack) + ' / Rp ' + num(p.dsRp), sb: num(p.sbPasang) + ' / ' + num(p.tSB), st: st[0], stStyle: 'font-size: 12px; font-weight: 600; white-space: nowrap; border-radius: 999px; padding: 3px 10px; background: ' + st[1] + '; color: ' + st[2] };
    });
    var dmap = {}, dord = [];
    KPI.daily.forEach(function (d) { if (!ids[d.p]) return; if (!dmap[d.d]) { dmap[d.d] = { t: 0, a: 0 }; dord.push(d.d); } dmap[d.d].t += d.tT || 0; dmap[d.d].a += d.aT || 0; });
    var trend = dord.sort().map(function (k) { return { tgl: fmt(k), t: num(dmap[k].t), a: num(dmap[k].a), ach: pctTxt(dmap[k].a, dmap[k].t) }; });
    var det = KPI.detail.filter(function (r) { return ids[r[0]]; });
    var tc = function (s) { return s.split(' ').map(function (w) { return w ? w[0].toUpperCase() + w.slice(1) : w; }).join(' '); };
    var cnt1 = function (idx, raw) { var m = {}; det.forEach(function (r) { var k = r[idx] ? (raw ? String(r[idx]) : tc(String(r[idx]).toLowerCase())) : '—'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).map(function (k) { return { k: k, n: m[k] }; }); };
    var bumo = cnt1(1, true).slice(0, 5).map(function (x, i) { return { no: i + 1, b: x.k, n: x.n, p: pctTxt(x.n, det.length) }; });
    var shades = [['#1D4ED8', '#FFFFFF'], ['#60A5FA', '#0F1B2D'], ['#BFDBFE', '#0F1B2D'], ['#E5E7EB', '#0F1B2D']];
    var persepsi = [['Rasa', 2], ['Kemasan', 3], ['Harga', 4]].map(function (q) {
      return { k: q[0], seg: cnt1(q[1]).map(function (x, i) { var w = x.n / (det.length || 1) * 100, s = shades[Math.min(i, 3)]; return { lbl: w >= 18 ? x.k + ' ' + Math.round(w) + '%' : '', tip: x.k + ': ' + x.n + ' responden', style: 'width: ' + w.toFixed(2) + '%; background: ' + s[0] + '; color: ' + s[1] + '; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden' }; }) };
    });
    var nol = proms.filter(function (p) { return p.aTrial === 0; }).map(function (p) { return short(p.nama); });
    var uo = bc['3UO16'] || 0;
    var insights = [
      { t: 'Fokus', icon: I.focus, d: nol.length ? nol.length + ' dari ' + proms.length + ' promotor belum ada trial: ' + nol.join(', ') + '.' : 'Semua promotor terpilih sudah ada trial.' },
      { t: 'Peluang', icon: I.up, d: bl.length ? 'Trial terbanyak di ' + bl[0] + ' (' + bc[bl[0]] + ' head, ' + pctTxt(bc[bl[0]], tb) + '). 3UO16 baru ' + uo + ' head.' : 'Belum ada data trial per brand.' },
      { t: 'Tindak lanjut', icon: I.check, d: sbA === 0 ? 'Sunblind terpasang 0 dari ' + num(sbT) + '. Cek pengisian form sunblind & POSM oleh promotor.' : 'Sunblind ' + num(sbA) + ' / ' + num(sbT) + ' (' + pctTxt(sbA, sbT) + ').' },
      { t: 'Target', icon: I.flag, d: 'Gap ke target s/d hari ini ' + num(aT - tTD) + ' head; sisa target CY ' + num(Math.max(0, tCY - aT)) + ' head.' }
    ];
    // ----- peta sebaran trial
    var B = { n: -7.08, s: -7.52, w: 112.55, e: 112.85 };
    var px = function (lat, lng) { return { x: Math.min(98, Math.max(2, (lng - B.w) / (B.e - B.w) * 100)), y: Math.min(98, Math.max(2, (B.n - lat) / (B.n - B.s) * 100)) }; };
    var pcol = ['#E0B341', '#8FB3BD', '#5B6290', '#7FB2E0', '#D9822B', '#4F9D69', '#B05FA0', '#9A8C7A'];
    var colOf = {}; KPI.promotor.forEach(function (p, i) { colOf[p.id] = pcol[i % pcol.length]; });
    var nmOf = {}; KPI.promotor.forEach(function (p) { nmOf[p.id] = p.nama; });
    var gmap = function (la, lo) { return 'https://www.google.com/maps?q=' + la + ',' + lo; };
    var geo = det.filter(function (r) { return r[7] != null && r[8] != null; });
    var cl = {}, clOrd = [];
    geo.forEach(function (r) {
      var k = r[0] + '|' + r[7].toFixed(3) + '|' + r[8].toFixed(3);
      if (!cl[k]) { cl[k] = { p: r[0], n: 0, la: 0, lo: 0, lok: {} }; clOrd.push(k); }
      var c = cl[k]; c.n++; c.la += r[7]; c.lo += r[8]; if (r[10]) c.lok[r[10]] = 1;
    });
    var dots = clOrd.map(function (k) {
      var c = cl[k], la = Math.round(c.la / c.n * 10000) / 10000, lo = Math.round(c.lo / c.n * 10000) / 10000, q = px(la, lo);
      var sz = Math.round(20 + Math.min(20, Math.sqrt(c.n) * 4));
      return { n: c.n, url: gmap(la, lo), tip: nmOf[c.p] + ' · ' + c.n + ' head · ' + Object.keys(c.lok).join(', ') + ' · ' + la + ', ' + lo,
        style: 'position: absolute; left: ' + q.x.toFixed(2) + '%; top: ' + q.y.toFixed(2) + '%; width: ' + sz + 'px; height: ' + sz + 'px; margin: -' + (sz / 2) + 'px 0 0 -' + (sz / 2) + 'px; border-radius: 50%; background: ' + colOf[c.p] + '; border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(15,27,45,0.35); color: #FFFFFF; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; text-decoration: none; box-sizing: border-box' };
    });
    var refs = [['Gresik', -7.1554, 112.6540], ['Surabaya', -7.2575, 112.7521], ['Sidoarjo', -7.4478, 112.7183]].map(function (r) {
      var q = px(r[1], r[2]);
      return { n: r[0], style: 'position: absolute; left: ' + q.x.toFixed(2) + '%; top: ' + q.y.toFixed(2) + '%; transform: translate(-4px, -50%); display: flex; gap: 5px; align-items: center; font-size: 11px; font-weight: 600; color: #4B5563; white-space: nowrap' };
    });
    var km = function (a, b, c, d) { var R = 6371, t = Math.PI / 180, dl = (c - a) * t, dg = (d - b) * t; var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dg / 2) * Math.sin(dg / 2); return 2 * R * Math.asin(Math.sqrt(h)); };
    var reach = proms.map(function (p) {
      var g = geo.filter(function (r) { return r[0] === p.id; });
      var dot = 'width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; background: ' + colOf[p.id];
      if (!g.length) return { nama: p.nama, rayon: p.rayon, h: 0, loc: 0, rad: '—', url: '', has: false, none: true, dot: dot };
      var la = g.reduce(function (a, r) { return a + r[7]; }, 0) / g.length, lo = g.reduce(function (a, r) { return a + r[8]; }, 0) / g.length;
      var rad = Math.max.apply(null, g.map(function (r) { return km(la, lo, r[7], r[8]); }));
      var loc = clOrd.filter(function (k) { return cl[k].p === p.id; }).length;
      return { nama: p.nama, rayon: p.rayon, h: g.length, loc: loc, rad: rad < 0.1 ? '< 0,1 km' : String(Math.round(rad * 10) / 10).replace('.', ',') + ' km', url: gmap(Math.round(la * 10000) / 10000, Math.round(lo * 10000) / 10000), has: true, none: false, dot: dot };
    });
    var kmPct = (5 / (111.32 * Math.cos(7.3 * Math.PI / 180))) / (B.e - B.w) * 100;

    var kpi = {
      dots: dots, refs: refs, reach: reach,
      mapPts: clOrd.map(function (k) { var c = cl[k], la = Math.round(c.la / c.n * 100000) / 100000, lo = Math.round(c.lo / c.n * 100000) / 100000; return { lat: la, lng: lo, n: c.n, color: colOf[c.p], nama: nmOf[c.p], lokasi: Object.keys(c.lok).join(', '), url: gmap(la, lo) }; }),
      mapLeg: proms.map(function (p) { return { n: short(p.nama), dot: 'width: 10px; height: 10px; border-radius: 50%; background: ' + colOf[p.id] }; }),
      mapInfo: geo.length + ' head di ' + clOrd.length + ' titik lokasi · ' + proms.filter(function (p) { return geo.some(function (r) { return r[0] === p.id; }); }).length + ' dari ' + proms.length + ' promotor',
      mapStyle: 'position: relative; width: 100%; max-width: 560px; margin: 0 auto; aspect-ratio: 30 / 44; box-sizing: border-box; background-color: #F3F6FA; background-image: linear-gradient(#E3E8EF 1px, transparent 1px), linear-gradient(90deg, #E3E8EF 1px, transparent 1px); background-size: 10% 6.818%; border: 1px solid #D5DAE1; border-radius: 10px; overflow: hidden',
      scaleBox: 'position: absolute; left: 12px; bottom: 12px; width: ' + kmPct.toFixed(2) + '%; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #374151',
      cycle: KPI.cycle, sampai: fmt(KPI.dataSampai) + ' ' + KPI.dataSampai.slice(0, 4), src: KPI.src,
      rayonLabel: ryName,
      promSel: pr, pickProm: function (e) { self.setState({ pr: e && e.target ? e.target.value : 'all' }); },
      promOpts: [{ v: 'all', l: 'Semua promotor (' + promRayon.length + ')' }].concat(promRayon.map(function (p) { return { v: p.id, l: p.nama }; })),
      cards: cards, bars: bars, brandLeg: brandLeg, donutStyle: donutStyle, totalHead: num(tb), noBrand: bl.length === 0,
      rows: rows, trend: trend, bumo: bumo, persepsi: persepsi, insights: insights
    };

    return {
      isProgram: view !== 'kpi', isKpi: view === 'kpi', kpi: kpi,
      goProgram: function () { self.setState({ view: 'program' }); }, goKpi: function () { self.setState({ view: 'kpi' }); },
      navProgramStyle: navBtn(view !== 'kpi'), navKpiStyle: navBtn(view === 'kpi'),
      accent: accent, showChart: showChart,
      tanggal: fmt(DATA.tanggal) + ' 2026', nowLabel: nowIdx >= 0 ? weeks[nowIdx].l + ' · ' + fmt(weeks[nowIdx].s) + '–' + fmt(weeks[nowIdx].e) : '—',
      briefTabs: briefTabs, brief: brief, cnt: cnt, subList: subList, sub: sub,
      rayonOpts: rayonOpts, rayonSel: ry, pickRayon: pickRayon,
      weekOpts: weekOpts, weekSel: wk, pickWeek: pickWeek,
      gridStyle: gridStyle, weekHead: weekHead, ganttRows: ganttRows, hasGantt: ganttRows.length > 0, noGantt: ganttRows.length === 0,
      volList: volList, hasVol: volList.length > 0
    };
  }
}
