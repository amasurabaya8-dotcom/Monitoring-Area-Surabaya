// DCLite — runtime kecil untuk template {{hole}}, <sc-for>, <sc-if>, onClick/onChange
// Dipakai supaya tampilan sama persis dengan desain canvas.
(function () {
  var SVG = 'http://www.w3.org/2000/svg';

  function lookup(scope, expr) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var parts = expr.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  var ONE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  function interp(scope, str) {
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (_, e) {
      var v = lookup(scope, e);
      return v == null ? '' : String(v);
    });
  }
  function child(scope, key, val, i) {
    var s = Object.create(scope);
    s[key] = val; s.$index = i;
    return s;
  }

  function render(node, scope, parent, svg) {
    if (node.nodeType === 3) { parent.appendChild(document.createTextNode(interp(scope, node.nodeValue))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.nodeName.toLowerCase();
    var kids = node.childNodes, i;
    if (tag === 'sc-for') {
      var m = ONE.exec(node.getAttribute('list') || ''), list = m ? lookup(scope, m[1]) : [];
      var as = node.getAttribute('as') || 'item';
      (list || []).forEach(function (it, idx) {
        var s = child(scope, as, it, idx);
        for (i = 0; i < kids.length; i++) render(kids[i], s, parent, svg);
      });
      return;
    }
    if (tag === 'sc-if') {
      var mv = ONE.exec(node.getAttribute('value') || '');
      if (mv && lookup(scope, mv[1])) for (i = 0; i < kids.length; i++) render(kids[i], scope, parent, svg);
      return;
    }
    var isSvg = svg || tag === 'svg';
    var el = isSvg ? document.createElementNS(SVG, node.nodeName) : document.createElement(tag);
    var deferredValue;
    for (i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i], name = a.name, raw = a.value, one = ONE.exec(raw);
      if (name.indexOf('hint-') === 0) continue;
      if (/^on[A-Z]/.test(name)) {
        var fn = one ? lookup(scope, one[1]) : null;
        if (typeof fn === 'function') el.addEventListener(name.slice(2).toLowerCase(), fn);
        continue;
      }
      var val = one ? lookup(scope, one[1]) : interp(scope, raw);
      if (name === 'value' && tag === 'select') { deferredValue = val; continue; }
      if (val === false && name.indexOf('aria-') !== 0) continue;
      el.setAttribute(name, val == null ? '' : String(val));
    }
    for (i = 0; i < kids.length; i++) render(kids[i], scope, el, isSvg);
    if (deferredValue !== undefined) el.value = deferredValue == null ? '' : String(deferredValue);
    parent.appendChild(el);
  }

  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  window.DCLogic.prototype.setState = function (o) { Object.assign(this.state, o); if (this._render) this._render(); };
  window.DCLogic.prototype.forceUpdate = function () { if (this._render) this._render(); };

  window.DCLite = {
    mount: async function (root, templateUrl, props) {
      try {
        var res = await fetch(templateUrl);
        var doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
        if (doc.getElementsByTagName('parsererror').length) throw new Error('template tidak valid');
        if (typeof window.loadProgress === 'function') {
          try { await window.loadProgress(); } catch (e) { console.warn('Progress Supabase tidak dimuat:', e); }
        }
        // eslint-disable-next-line no-undef
        var comp = new Component(props); // class dari component.js (global lexical)
        var tpl = doc.documentElement;
        comp._render = function () {
          var focusId = document.activeElement && document.activeElement.id;
          var frag = document.createDocumentFragment();
          var vals = comp.renderVals();
          for (var i = 0; i < tpl.childNodes.length; i++) render(tpl.childNodes[i], vals, frag, false);
          root.replaceChildren(frag);
          if (focusId) { var f = document.getElementById(focusId); if (f) f.focus(); }
        };
        comp._render();
      } catch (e) {
        root.textContent = 'Gagal memuat aplikasi: ' + e.message;
      }
    }
  };
})();
