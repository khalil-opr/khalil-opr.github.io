/* =========================================================
   Muhammad Khalil — cinematic portfolio
   Scroll-driven scenes: flying objects, pinned stories,
   letter-by-letter reveals. No libraries.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = innerWidth, H = innerHeight, MOB = W < 760;

  /* ---------- math ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eout(t) { return 1 - Math.pow(1 - t, 3); }
  function range(p, a, b) { return c01((p - a) / (b - a)); }
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ---------- text splitting ---------- */
  function split(el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var chars = [];
    var frag = doc.createDocumentFragment();
    function addText(text, parent) {
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { parent.appendChild(doc.createTextNode(' ')); return; }
        var w = doc.createElement('span');
        w.className = 'word';
        Array.from(part).forEach(function (ch) {
          var c = doc.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          c._r = [rnd(), rnd(), rnd()];
          w.appendChild(c);
          chars.push(c);
        });
        parent.appendChild(w);
      });
    }
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) addText(n.textContent, frag);
      else if (n.nodeType === 1) {
        var clone = n.cloneNode(false);
        addText(n.textContent, clone);
        frag.appendChild(clone);
      }
    });
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', label);
    Array.prototype.slice.call(el.childNodes).forEach(function (c) { if (c.nodeType === 1) c.setAttribute('aria-hidden', 'true'); });
    return chars;
  }

  /* =========================================================
     HERO — chapters + flying objects
     ========================================================= */
  var hero = $('[data-scene="hero"]');
  var portrait = $('#portrait');
  var glow = $('#heroGlow');
  var flyersEl = $('#flyers');
  var cue = $('#scrollCue');

  var chapters = $$('.chap').map(function (el, idx) {
    var inner = doc.createElement('div');
    inner.className = 'chap-inner';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
    var head = $('[data-split]', inner);
    var chars = head ? split(head) : [];
    var others = Array.prototype.slice.call(inner.children).filter(function (c) { return c !== head; });
    return { el: el, chars: chars, others: others, idx: idx, lastIn: -1, lastOut: -1 };
  });
  // in / out windows on hero progress (chapter 0 enters on page load)
  var CH = [
    { inA: null, inB: null, outA: .09, outB: .19 },
    { inA: .16, inB: .29, outA: .40, outB: .49 },
    { inA: .46, inB: .58, outA: .68, outB: .76 },
    { inA: .76, inB: .9, outA: null, outB: null }
  ];

  function renderChapter(ch, inP, outP) {
    if (Math.abs(inP - ch.lastIn) < .0005 && Math.abs(outP - ch.lastOut) < .0005) return;
    ch.lastIn = inP; ch.lastOut = outP;
    var visible = inP > 0.001 && outP < .999;
    ch.el.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) return;
    var n = ch.chars.length;
    for (var j = 0; j < n; j++) {
      var c = ch.chars[j], r = c._r;
      var k = n > 1 ? j / (n - 1) : 0;
      var e = eout(c01(inP * 1.8 - k * .8));
      var o = ease(c01(outP * 1.8 - k * .8));
      if (e >= 1 && o <= 0) {
        if (c._rest) continue;
        c.style.transform = ''; c.style.opacity = ''; c.style.filter = ''; c._rest = true; continue;
      }
      c._rest = false;
      var ty = (1 - e) * 70 - o * (40 + r[0] * 140);
      var tx = o * (r[1] - .5) * 200;
      var rot = (1 - e) * (r[2] * 36 - 18) + o * (r[2] - .5) * 80;
      var bl = (1 - e) * 14 + o * 10;
      c.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotate(' + rot.toFixed(1) + 'deg)';
      c.style.opacity = (e * (1 - o)).toFixed(3);
      c.style.filter = bl > .4 ? 'blur(' + bl.toFixed(1) + 'px)' : '';
    }
    for (var m = 0; m < ch.others.length; m++) {
      var el = ch.others[m];
      var ee = eout(c01(inP * 1.6 - .25 - m * .12));
      var oo = ease(c01(outP * 1.4));
      var b2 = (1 - ee) * 10 + oo * 8;
      el.style.transform = 'translate3d(0,' + ((1 - ee) * 34 - oo * 50).toFixed(1) + 'px,0)';
      el.style.opacity = (ee * (1 - oo)).toFixed(3);
      el.style.filter = b2 > .4 ? 'blur(' + b2.toFixed(1) + 'px)' : '';
    }
  }

  /* --- flying objects --- */
  var TYPES = {
    doc: [90, 108], sheet: [124, 103], coin: [64, 64], note: [140, 70], cal: [82, 82], gear: [72, 72],
    clock: [74, 74], chart: [104, 95], receipt: [58, 100], check: [80, 107], router: [112, 75], key: [70, 70]
  };
  var ORDER = ['doc', 'sheet', 'coin', 'note', 'cal', 'gear', 'clock', 'chart', 'receipt', 'check', 'router', 'key',
    'coin', 'doc', 'sheet', 'gear', 'coin', 'note', 'cal', 'check'];
  var flyers = ORDER.map(function (t, i) {
    var el = doc.createElement('div');
    el.className = 'fly fly-' + t;
    el.innerHTML = '<svg><use href="#o-' + t + '"></use></svg>';
    flyersEl.appendChild(el);
    return { el: el, type: t, i: i, a: rnd(), b: rnd(), c: rnd(), d: rnd(), delay: rnd(), w: 0, h: 0, st: {} };
  });

  var P = {}; // portrait states
  var KF = [[0, 'A'], [.12, 'A'], [.3, 'B'], [.4, 'B'], [.58, 'C'], [.68, 'C'], [.86, 'D'], [1, 'D']];

  function S(x, y, s, r, ry, o, b) { return { x: x, y: y, s: s, r: r, ry: ry, o: o, b: b }; }

  function layoutHero() {
    var k = MOB ? .62 : clamp(W / 1440, .7, 1.15);
    flyers.forEach(function (f) { var d = TYPES[f.type]; f.w = d[0] * k; f.h = d[1] * k; f.el.style.width = f.w + 'px'; f.el.style.height = f.h + 'px'; });

    if (MOB) {
      P.A = S(0, -.2 * H, 1, 0, 0, 1, 0);
      P.B = S(0, -.23 * H, .9, 0, 0, 1, 0);
      P.C = S(0, -.2 * H, .9, 0, 0, .13, 0);
      P.D = S(0, -.2 * H, .92, 0, 0, 1, 0);
    } else {
      P.A = S(.2 * W, .04 * H, 1, 0, 0, 1, 0);
      P.B = S(-.2 * W, .04 * H, 1.02, 0, 0, 1, 0);
      P.C = S(-.28 * W, .06 * H, .92, 0, 0, .12, 0);
      P.D = S(0, -.13 * H, .78, 0, 0, 1, 0);
    }

    var n = flyers.length;
    // grid order: group identical types together
    var sorted = flyers.slice().sort(function (p, q) { return p.type < q.type ? -1 : p.type > q.type ? 1 : p.i - q.i; });

    flyers.forEach(function (f, i) {
      var th = i / n * Math.PI * 2 + (f.a - .5) * .5;
      var near = i % 7 === 0;
      var A, B, F, C;
      if (MOB) {
        var rx = (.36 + f.b * .12) * W, ry = (.17 + f.c * .08) * H;
        A = S(Math.cos(th) * rx, clamp(P.A.y + Math.sin(th) * ry, -.47 * H, .0 * H), .75 + f.b * .35, (f.c - .5) * 50, (f.a - .5) * 40, 1, 0);
        B = S((f.a - .5) * 1.05 * W, -.5 * H + f.b * .5 * H, .8 + f.c * .5, (f.c - .5) * 120, (f.a - .5) * 90, 1, 0);
        if (i % 4 === 0) { B.s = 1.5 + f.c * .5; B.b = 4; }
      } else {
        var rx2 = (.2 + f.b * .08) * W, ry2 = (.3 + f.c * .12) * H;
        var ax = P.A.x + Math.cos(th) * rx2;
        if (ax < .03 * W) ax = .03 * W + f.a * .05 * W;
        A = S(Math.min(ax, .46 * W), clamp(P.A.y + Math.sin(th) * ry2, -.44 * H, .44 * H), .62 + f.b * .45, (f.c - .5) * 50, (f.a - .5) * 40, 1, 0);
        if (near) { A.s *= 1.6; A.b = 2.5; }
        B = S(-.5 * W + f.a * .64 * W, (f.b - .5) * .92 * H, .72 + f.c * .45, (f.c - .5) * 120, (f.a - .5) * 90, 1, 0);
        if (i % 4 === 0) {
          B.s = 1.7 + f.c * .6; B.b = 5;
          B.y = (f.b < .5 ? -1 : 1) * (.36 + f.d * .1) * H;
          B.x = (f.a - .3) * W;
        }
      }
      // falling-in start (like leaves dropping in)
      F = S(A.x + (f.d - .5) * .3 * W, -.75 * H - f.b * .6 * H, A.s, A.r + (f.c - .5) * 260, (f.a - .5) * 180, 1, 0);

      // ordered grid
      var gi = sorted.indexOf(f), col = gi % 5, row = Math.floor(gi / 5);
      var cellW, cellH, gx, gy;
      if (MOB) { cellW = .18 * W; cellH = .105 * H; gx = 0; gy = -.25 * H; }
      else { cellW = .078 * W; cellH = .19 * H; gx = .25 * W; gy = .02 * H; }
      var target = Math.min(cellW, cellH) * .74;
      C = S(gx + (col - 2) * cellW, gy + (row - 1.5) * cellH, target / Math.max(f.w, f.h), 0, 0, 1, 0);

      f.st.F = F; f.st.A = A; f.st.B = B; f.st.C = C;
    });
  }

  function stateD(f, t) {
    var ring = f.i % 2;
    var th = f.i / flyers.length * Math.PI * 2;
    var phi = th + t * (ring ? .16 : .22) + (ring ? .4 : 0);
    var d = Math.sin(phi);
    var rx, ry, cx, cy;
    if (MOB) { rx = (ring ? .5 : .38) * W; ry = (ring ? .07 : .05) * H; cx = 0; cy = P.D.y + (ring ? -.05 : .1) * H; }
    else { rx = (ring ? .42 : .3) * W; ry = (ring ? .11 : .07) * H; cx = 0; cy = P.D.y + (ring ? -.04 : .08) * H; }
    var base = (MOB ? .8 : .85) * (ring ? 1 : .85);
    return {
      x: cx + Math.cos(phi) * rx,
      y: cy + d * ry,
      s: base * (.72 + .38 * d),
      r: Math.cos(phi) * 20,
      ry: Math.cos(phi) * 50,
      o: .5 + .5 * (d + 1) / 2,
      b: d > .6 ? (d - .6) * 9 : 0,
      z: d > 0 ? 30 : 10
    };
  }

  function mixS(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: lerp(a.s, b.s, t), r: lerp(a.r, b.r, t), ry: lerp(a.ry, b.ry, t), o: lerp(a.o, b.o, t), b: lerp(a.b, b.b, t), z: t < .5 ? a.z : b.z };
  }

  var introStart = 0, introT = RM ? 1 : 0, introStarted = RM;
  var mx = 0, my = 0, tmx = 0, tmy = 0;

  function heroState(f, name, time) {
    if (name === 'D') return stateD(f, time);
    var s = f.st[name];
    if (name === 'A') {
      var e = eout(c01(introT * 1.5 - f.delay * .5));
      s = mixS(f.st.F, f.st.A, e);
      s.o = c01(e * 3);
    }
    if (s.z === undefined) s.z = (s.s > 1.3 ? 30 : 10);
    return s;
  }

  function renderHero(hp, time) {
    var seg = 0;
    for (var i = 0; i < KF.length - 1; i++) { if (hp >= KF[i][0] && hp <= KF[i + 1][0]) { seg = i; break; } }
    var k0 = KF[seg], k1 = KF[seg + 1];
    var t = c01((hp - k0[0]) / (k1[0] - k0[0]));
    var still = k0[1] === k1[1];
    var amp = (k0[1] === 'C' && k1[1] === 'C') ? .2 : 1;
    if (RM) amp = 0;
    var cx = W / 2, cy = H / 2;

    for (var j = 0; j < flyers.length; j++) {
      var f = flyers[j];
      var a = heroState(f, k0[1], time);
      var s;
      if (still) s = a;
      else {
        var b = heroState(f, k1[1], time);
        var ti = ease(c01(t * 1.5 - f.delay * .5));
        s = mixS(a, b, ti);
      }
      var dx = Math.sin(time * .7 + j * 1.7) * 10 * amp + mx * 16 * s.s;
      var dy = Math.cos(time * .55 + j * 2.3) * 14 * amp + my * 12 * s.s;
      var dr = Math.sin(time * .5 + j) * 7 * amp;
      var x = cx + s.x - f.w / 2 + dx, y = cy + s.y - f.h / 2 + dy;
      f.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) perspective(700px) rotate(' + (s.r + dr).toFixed(1) + 'deg) rotateY(' + s.ry.toFixed(1) + 'deg) scale(' + s.s.toFixed(3) + ')';
      f.el.style.opacity = s.o.toFixed(3);
      f.el.style.filter = s.b > .4 ? 'blur(' + s.b.toFixed(1) + 'px)' : '';
      f.el.style.zIndex = s.z;
    }

    // portrait
    var pa = P[k0[1]], pb = P[k1[1]];
    var pt = ease(t);
    var px = lerp(pa.x, pb.x, pt), py = lerp(pa.y, pb.y, pt), ps = lerp(pa.s, pb.s, pt), po = lerp(pa.o, pb.o, pt);
    var pIntro = eout(c01(introT * 1.3));
    py += (1 - pIntro) * 60 + (RM ? 0 : Math.sin(time * .6) * 6);
    px -= mx * 10;
    portrait.style.transform = 'translate(-50%,-50%) translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) scale(' + ps.toFixed(3) + ')';
    portrait.style.opacity = (po * pIntro).toFixed(3);
    glow.style.transform = 'translate3d(' + (px * .9).toFixed(1) + 'px,' + (py * .9).toFixed(1) + 'px,0)';

    // chapters
    for (var c = 0; c < chapters.length; c++) {
      var w = CH[c];
      var inP = w.inA === null ? eout(c01(introT * 1.1 - .1)) : range(hp, w.inA, w.inB);
      var outP = w.outA === null ? 0 : range(hp, w.outA, w.outB);
      renderChapter(chapters[c], inP, outP);
    }
    if (cue) cue.style.opacity = (c01(introT * 2 - 1) * (1 - range(hp, 0, .04))).toFixed(3);
  }

  /* =========================================================
     EXPERIENCE — cards fly in from depth, fling away
     ========================================================= */
  var expScene = $('[data-scene="exp"]');
  var roles = $$('.role', expScene).map(function (el) { return { el: el, head: $('.role-head', el), card: $('.role-card', el), ghost: $('.role-ghost', el) }; });
  var railItems = $$('#expRail li');
  var railFill = $('#expRailFill');
  var lastRail = -1;

  function renderExp(raw) {
    var N = roles.length;
    var u = raw * (N - .6);
    for (var j = 0; j < N; j++) {
      var r = roles[j];
      var ein = eout(c01((u - (j - .5)) / .5));
      var cin = eout(c01(((u - (j - .5)) / .5) * 1.25 - .25));
      var eo = j < N - 1 ? ease(c01((u - (j + .5)) / .5)) : 0;
      var vis = ein > 0.001 && eo < .999;
      r.el.style.opacity = vis ? 1 : 0;
      r.el.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis) continue;
      var hb = (1 - ein) * 12 + eo * 10;
      r.head.style.transform = 'translate3d(' + ((1 - ein) * -90 - eo * 140).toFixed(1) + 'px,' + ((1 - ein) * 70 - eo * H * .3).toFixed(1) + 'px,0) rotate(' + ((1 - ein) * -4 - eo * 6).toFixed(2) + 'deg)';
      r.head.style.opacity = (ein * (1 - eo)).toFixed(3);
      r.head.style.filter = hb > .4 ? 'blur(' + hb.toFixed(1) + 'px)' : '';
      var cb = (1 - cin) * 14 + eo * 12;
      var sc = .62 + .38 * cin + eo * .18;
      r.card.style.transform = 'translate3d(' + ((1 - cin) * W * .22 - eo * W * .12).toFixed(1) + 'px,' + ((1 - cin) * H * .4 - eo * H * .55).toFixed(1) + 'px,0) rotate(' + ((1 - cin) * 12 - eo * 10).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      r.card.style.opacity = (cin * (1 - eo)).toFixed(3);
      r.card.style.filter = cb > .4 ? 'blur(' + cb.toFixed(1) + 'px)' : '';
      if (r.ghost) r.ghost.style.transform = 'translate3d(0,' + ((u - j) * -60).toFixed(1) + 'px,0)';
    }
    var active = clamp(Math.round(u), 0, N - 1);
    if (active !== lastRail) {
      railItems.forEach(function (li, i) { li.classList.toggle('on', i === active); });
      lastRail = active;
    }
    if (railFill) railFill.style.transform = 'scaleY(' + c01(u / (N - 1)).toFixed(3) + ')';
  }

  /* =========================================================
     ACHIEVEMENTS — figures zoom in, then settle into place
     ========================================================= */
  var achScene = $('[data-scene="ach"]');
  var achStage = $('.stage', achScene);
  var achSlots = $$('.ach-slot', achScene).map(function (slot) {
    var counters = $$('[data-count]', slot).map(function (el) { return { el: el, to: +el.getAttribute('data-count'), last: -1 }; });
    return { slot: slot, card: $('.ach-card', slot), counters: counters, ox: 0, oy: 0 };
  });
  var coinsEl = $('#coins');
  var coins = [];
  (function makeCoins() {
    for (var i = 0; i < 18; i++) {
      var t = i % 5 === 0 ? 'note' : 'coin';
      var el = doc.createElement('div');
      el.className = 'fly';
      el.innerHTML = '<svg><use href="#o-' + t + '"></use></svg>';
      coinsEl.appendChild(el);
      coins.push({ el: el, t: t, a: rnd(), b: rnd(), c: rnd(), d: rnd(), sz: 0 });
    }
  })();

  function measureAch() {
    var sr = achStage.getBoundingClientRect();
    achSlots.forEach(function (s) {
      s.card.style.transform = '';
      var r = s.slot.getBoundingClientRect();
      s.ox = sr.left + sr.width / 2 - (r.left + r.width / 2);
      s.oy = sr.top + sr.height * .56 - (r.top + r.height / 2);
    });
    coins.forEach(function (c) {
      var base = c.t === 'note' ? 120 : 56;
      c.sz = base * (.6 + c.b * .8) * (MOB ? .7 : 1);
      c.el.style.width = c.sz + 'px';
      c.el.style.height = (c.t === 'note' ? c.sz / 2 : c.sz) + 'px';
    });
  }

  function renderAch(raw) {
    var u = raw * 3.3 - .15;
    for (var k = 0; k < achSlots.length; k++) {
      var s = achSlots[k];
      var l = u - k;
      var e1 = eout(c01(l / .5));
      var e2 = ease(c01((l - .55) / .45));
      var vis = e1 > 0.001;
      s.card.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis) continue;
      var sc = lerp(2.3, 1.3, e1);
      sc = lerp(sc, 1, e2);
      var bl = (1 - e1) * 16;
      s.card.style.transform = 'translate3d(' + (s.ox * (1 - e2)).toFixed(1) + 'px,' + (s.oy * (1 - e2)).toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
      s.card.style.opacity = e1.toFixed(3);
      s.card.style.filter = bl > .4 ? 'blur(' + bl.toFixed(1) + 'px)' : '';
      s.card.style.zIndex = e2 < 1 ? 5 : 1;
      for (var q = 0; q < s.counters.length; q++) {
        var cn = s.counters[q];
        var v = Math.round(cn.to * e1);
        if (v !== cn.last) { cn.el.textContent = v; cn.last = v; }
      }
    }
    // coin rain during the cash figure
    var cr = (u - .9) / 1.7;
    var show = cr > 0 && cr < 1;
    coinsEl.style.visibility = show ? 'visible' : 'hidden';
    if (!show) return;
    for (var i = 0; i < coins.length; i++) {
      var c = coins[i];
      var local = cr * (1.3 + c.c * .7) - c.d * .3;
      var y = lerp(-.25 * H - c.a * .4 * H, 1.25 * H, local);
      var x = c.a * W + Math.sin(local * 6 + i) * 30;
      var flip = Math.cos(local * 14 + i);
      c.el.style.transform = 'translate3d(' + (x - c.sz / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (local * 400 * (c.b - .5)).toFixed(1) + 'deg) scaleX(' + flip.toFixed(3) + ')';
      c.el.style.opacity = c.b < .35 ? .55 : 1;
      c.el.style.filter = c.b > .85 ? 'blur(3px)' : '';
    }
  }

  /* =========================================================
     Scrubbed blocks: skills assembly, contact headline, about photo
     ========================================================= */
  var assembles = $$('[data-assemble]').map(function (el) {
    var chips = $$('.chip', el).map(function (c) { return { el: c, dx: (rnd() - .5) * 1.1, dy: 200 + rnd() * 500, r: (rnd() - .5) * 70, rest: false }; });
    var bars = $$('[data-level]', el).map(function (b) { return { el: b, lv: +b.getAttribute('data-level') / 100 }; });
    return { el: el, chips: chips, bars: bars };
  });

  var scatterEl = $('[data-scatter]');
  var scatterChars = scatterEl ? split(scatterEl) : [];
  scatterChars.forEach(function (c) { c._s = { dx: (rnd() - .5) * 900, dy: (rnd() - .5) * 600, r: (rnd() - .5) * 180 }; });

  var aboutFrame = $('.about-photo-inner');
  var aboutImg = $('[data-parallax]');
  var marquee = $('#marquee');

  function renderScrubs() {
    for (var a = 0; a < assembles.length; a++) {
      var A = assembles[a];
      var rect = A.el.getBoundingClientRect();
      if (rect.top > H * 1.2 || rect.bottom < -H * .2) continue;
      var e = c01((H * .95 - rect.top) / (H * .6));
      var n = A.chips.length;
      for (var j = 0; j < n; j++) {
        var ch = A.chips[j];
        var k = n > 1 ? j / (n - 1) : 0;
        var l = eout(c01(e * 1.6 - k * .6));
        if (l >= 1) { if (!ch.rest) { ch.el.style.transform = ''; ch.el.style.opacity = ''; ch.rest = true; } continue; }
        ch.rest = false;
        ch.el.style.transform = 'translate3d(' + (ch.dx * W * (1 - l)).toFixed(1) + 'px,' + (ch.dy * (1 - l)).toFixed(1) + 'px,0) rotate(' + (ch.r * (1 - l)).toFixed(1) + 'deg) scale(' + (.6 + .4 * l).toFixed(3) + ')';
        ch.el.style.opacity = l.toFixed(3);
      }
      var lb = c01(e * 1.4 - .4);
      for (var b = 0; b < A.bars.length; b++) A.bars[b].el.style.setProperty('--lv', (A.bars[b].lv * eout(lb)).toFixed(3));
    }

    if (scatterEl) {
      var sr = scatterEl.getBoundingClientRect();
      if (sr.top < H * 1.2 && sr.bottom > -H * .2) {
        var se = c01((H * .95 - sr.top) / (H * .55));
        var m = scatterChars.length;
        for (var i = 0; i < m; i++) {
          var c = scatterChars[i], s = c._s;
          var kk = m > 1 ? i / (m - 1) : 0;
          var ll = eout(c01(se * 1.5 - kk * .5));
          if (ll >= 1) { if (!c._rest) { c.style.transform = ''; c.style.opacity = ''; c.style.filter = ''; c._rest = true; } continue; }
          c._rest = false;
          c.style.transform = 'translate3d(' + (s.dx * (1 - ll)).toFixed(1) + 'px,' + (s.dy * (1 - ll)).toFixed(1) + 'px,0) rotate(' + (s.r * (1 - ll)).toFixed(1) + 'deg)';
          c.style.opacity = ll.toFixed(3);
          c.style.filter = ll < .96 ? 'blur(' + ((1 - ll) * 10).toFixed(1) + 'px)' : '';
        }
      }
    }

    if (aboutFrame) {
      var ar = aboutFrame.getBoundingClientRect();
      if (ar.top < H * 1.2 && ar.bottom > -H * .2) {
        var ae = eout(c01((H - ar.top) / (H * .75)));
        aboutFrame.style.clipPath = 'inset(' + ((1 - ae) * 100).toFixed(2) + '% 0 0 0 round 400px 400px 20px 20px)';
        var pp = c01((H - ar.top) / (H + ar.height));
        aboutImg.style.transform = 'translate3d(0,' + ((pp - .5) * -14 - 8).toFixed(2) + '%,0) scale(' + (1.15 - ae * .15).toFixed(3) + ')';
      }
    }
  }

  /* =========================================================
     Scene bookkeeping + mode
     ========================================================= */
  var scenes = [
    { el: hero, render: function (p) { heroP = p; }, pinAlways: true },
    { el: expScene, render: renderExp, raw: true },
    { el: achScene, render: renderAch }
  ];
  var heroP = 0;

  function applyMode() {
    [expScene, achScene].forEach(function (sc) {
      var stat = MOB;
      sc.classList.toggle('static', stat);
      if (stat) {
        $$('.role, .role-head, .role-card, .role-ghost, .ach-card', sc).forEach(function (el) {
          el.style.transform = ''; el.style.opacity = ''; el.style.filter = ''; el.style.visibility = ''; el.style.zIndex = '';
        });
        $$('[data-count]', sc).forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      }
    });
    achSlots.forEach(function (s) { s.counters.forEach(function (c) { c.last = -1; }); });
  }

  function measure() {
    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      s.top = r.top + scrollY;
      s.h = s.el.offsetHeight;
    });
  }

  function onResize() {
    var nw = innerWidth, nh = innerHeight;
    var widthChanged = nw !== W;
    if (!widthChanged && Math.abs(nh - H) < 120 && measured) return;
    W = nw; H = nh; MOB = W < 760;
    applyMode();
    layoutHero();
    measure();
    if (!MOB) measureAch();
    chapters.forEach(function (c) { c.lastIn = -1; });
    sizeEmbers();
    measured = true;
  }
  var measured = false;

  /* =========================================================
     Header, progress, nav, cursor
     ========================================================= */
  var header = $('#siteHeader');
  var bar = $('#scrollBar');
  var navLinks = $$('.main-nav a');
  var sections = navLinks.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
  var lastY = scrollY;
  var menuOpen = false;

  function renderChrome(y) {
    var max = doc.documentElement.scrollHeight - H;
    bar.style.transform = 'scaleX(' + c01(y / max).toFixed(4) + ')';
    header.classList.toggle('scrolled', y > 40);
    if (!menuOpen) header.classList.toggle('hide', y > 300 && y > lastY + 2 ? true : (y < lastY - 2 ? false : header.classList.contains('hide')));
    lastY = y;
    var cur = -1;
    for (var i = 0; i < sections.length; i++) { if (sections[i] && sections[i].getBoundingClientRect().top < H * .45) cur = i; }
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    if (marquee) marquee.style.transform = 'translate3d(' + (-((y * .4) % (marquee.scrollWidth / 2))).toFixed(1) + 'px,0,0)';
  }

  var toggle = $('#navToggle');
  var mnav = $('#mobileNav');
  function setMenu(open) {
    menuOpen = open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.classList.toggle('open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open) header.classList.remove('hide');
  }
  toggle.addEventListener('click', function () { setMenu(!menuOpen); });
  $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  var cursor = $('#cursor');
  var cx = -100, cy = -100, tcx = -100, tcy = -100;
  var finePointer = window.matchMedia && matchMedia('(pointer: fine)').matches;
  window.addEventListener('mousemove', function (e) {
    tcx = e.clientX; tcy = e.clientY;
    tmx = (e.clientX / W - .5) * 2; tmy = (e.clientY / H - .5) * 2;
    if (finePointer) cursor.classList.add('on');
  }, { passive: true });
  doc.addEventListener('mouseleave', function () { cursor.classList.remove('on'); });
  doc.addEventListener('mouseover', function (e) {
    var t = e.target.closest && e.target.closest('a, button, .chips .chip, input, textarea');
    cursor.classList.toggle('hover', !!t);
  });

  /* ---------- reveal on view ---------- */
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !RM) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rvs.forEach(function (el) {
      var sib = el.parentElement ? $$(':scope > .rv', el.parentElement) : [el];
      el.style.setProperty('--d', (Math.max(0, sib.indexOf(el)) * .08) + 's');
      io.observe(el);
    });
  } else rvs.forEach(function (el) { el.classList.add('in'); });

  /* =========================================================
     Embers — warm dust drifting through every scene
     ========================================================= */
  var cv = $('#embers');
  var ctx = cv.getContext && cv.getContext('2d');
  var parts = [], DPR = 1;
  function sizeEmbers() {
    if (!ctx) return;
    DPR = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = MOB ? 34 : 70;
    parts = [];
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .9, r: .6 + Math.random() * 1.8, ph: Math.random() * 6.28, vy: -(.1 + Math.random() * .35) });
  }
  function drawEmbers(time, vel) {
    if (!ctx || RM) return;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y += p.vy * p.z - vel * .12 * p.z;
      p.x += Math.sin(time * .5 + p.ph) * .25 * p.z;
      if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      var tw = .45 + .55 * Math.sin(time * 1.3 + p.ph * 3);
      var rr = p.r * p.z;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(242,190,110,' + (.06 * tw).toFixed(3) + ')';
      ctx.arc(p.x, p.y, rr * 4, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,220,160,' + (.55 * tw * p.z).toFixed(3) + ')';
      ctx.arc(p.x, p.y, rr, 0, 6.283);
      ctx.fill();
    }
  }

  /* =========================================================
     Main loop — smoothed scroll drives every scene
     ========================================================= */
  var sy = scrollY, prevSy = sy, t0 = performance.now();
  function frame(now) {
    var time = RM ? 0 : (now - t0) / 1000;
    var ty = scrollY;
    sy += (ty - sy) * (RM ? 1 : .12);
    if (Math.abs(ty - sy) < .1) sy = ty;
    var vel = sy - prevSy; prevSy = sy;

    if (introStarted && introT < 1) introT = c01((now - introStart) / 1700);
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;

    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (!s.pinAlways && s.el.classList.contains('static')) continue;
      var span = Math.max(1, s.h - H);
      var raw = (sy - s.top) / span;
      if (raw < -1.2 || raw > 1.2) continue;
      s.render(s.raw ? Math.min(raw, 1) : c01(raw));
    }
    if (sy < hero.offsetHeight + H) renderHero(heroP, time);
    renderScrubs();
    renderChrome(ty);
    drawEmbers(time, vel);

    if (finePointer) {
      cx += (tcx - cx) * .2; cy += (tcy - cy) * .2;
      cursor.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(frame);
  }

  /* ---------- loader → intro ---------- */
  var loader = $('#loader');
  function startIntro() {
    introStarted = true;
    introStart = performance.now() + 150;
  }
  if (RM || !loader) { if (loader) loader.style.display = 'none'; startIntro(); introT = 1; }
  else {
    var lb = $('#loaderBar'), lc = $('#loaderCount'), ls = performance.now();
    (function tick(now) {
      var p = c01((now - ls) / 1100);
      var e = eout(p);
      lb.style.transform = 'scaleX(' + e.toFixed(3) + ')';
      lc.textContent = ('00' + Math.round(e * 100)).slice(-3);
      if (p < 1) requestAnimationFrame(tick);
      else {
        loader.classList.add('done');
        setTimeout(startIntro, 250);
        setTimeout(function () { loader.style.display = 'none'; }, 1300);
      }
    })(ls);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('load', function () { measured = false; onResize(); });
  onResize();
  requestAnimationFrame(frame);

  /* =========================================================
     Contact form — WhatsApp + email prefill
     ========================================================= */
  var form = $('#contactForm');
  var ok = $('#formSuccess');
  var WHATSAPP = '923221304398', EMAIL = 'khankhalil142@gmail.com';
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.name.value.trim(), email = form.email.value.trim(), subject = form.subject.value.trim(), message = form.message.value.trim();
    if (!name || !email || !subject || !message) { form.reportValidity(); return; }
    var wa = 'Hi Muhammad, my name is ' + name + '.\n\nSubject: ' + subject + '\n\n' + message + '\n\n(Reply to: ' + email + ')';
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(wa), '_blank', 'noopener');
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
    if (ok) ok.hidden = false;
    form.reset();
  });

  var yr = $('#year');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
