/* Natan Holding GmbH – Hero-Globus (Canvas 2D, ohne externe Bibliotheken) */
(function () {
  'use strict';
  var canvas = document.getElementById('globe');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var land = window.NH_LAND || [];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var D = Math.PI / 180;

  var TEAL = [17, 193, 198];
  var PLACES = [
    { key: 'sb', lon: 6.996, lat: 49.234 },
    { key: 'ow', lon: 7.163, lat: 49.401 },
    { key: 'pl', lon: 19.4, lat: 52.1 }
  ];
  var LABELS = {
    de: { sb: 'Saarbrücken', ow: 'Ottweiler', pl: 'Polen' },
    pl: { sb: 'Saarbrücken', ow: 'Ottweiler', pl: 'Polska' }
  };

  // Punkte vorbereiten (Einheitsvektoren + Abstand zum Saarland für das Intro)
  var N = land.length / 2;
  var px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), pd = new Float32Array(N);
  function vec(lon, lat) {
    var cl = Math.cos(lat * D);
    return [cl * Math.sin(lon * D), Math.sin(lat * D), cl * Math.cos(lon * D)];
  }
  var origin = vec(7.05, 49.3);
  for (var i = 0; i < N; i++) {
    var v = vec(land[i * 2], land[i * 2 + 1]);
    px[i] = v[0]; py[i] = v[1]; pz[i] = v[2];
    pd[i] = Math.acos(Math.max(-1, Math.min(1, v[0] * origin[0] + v[1] * origin[1] + v[2] * origin[2]))) / Math.PI;
  }
  var placeV = PLACES.map(function (p) { return vec(p.lon, p.lat); });

  // Großkreis-Bogen Saarland -> Polen
  function slerp(a, b, t) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    var om = Math.acos(Math.min(1, dot)), so = Math.sin(om);
    var k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
  var ARC = [], ARC2 = [];
  for (var s = 0; s <= 64; s++) {
    var t = s / 64, p = slerp(placeV[0], placeV[2], t), h = 1 + 0.3 * Math.sin(Math.PI * t);
    ARC.push([p[0] * h, p[1] * h, p[2] * h]);
  }
  for (s = 0; s <= 24; s++) {
    var t2 = s / 24, q = slerp(placeV[1], placeV[2], t2), h2 = 1 + 0.12 * Math.sin(Math.PI * t2);
    ARC2.push([q[0] * h2, q[1] * h2, q[2] * h2]);
  }

  // Graticule
  var GRAT = [];
  for (var la = -60; la <= 75; la += 15) { var line = []; for (var lo = -180; lo <= 180; lo += 4) line.push(vec(lo, la)); GRAT.push(line); }
  for (lo = -180; lo < 180; lo += 20) { var m = []; for (la = -80; la <= 80; la += 4) m.push(vec(lo, la)); GRAT.push(m); }

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, mobile = false;
  var lam0 = 13, phi0 = 34, cosL = 1, sinL = 0, cosP = 1, sinP = 0;
  var pointerX = 0, pointerY = 0, tx = 0, ty = 0;

  function layout() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    mobile = W < 1100;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (mobile) {
      R = Math.min(W * 0.34, 230);
      cx = W / 2; cy = 80 + R * 1.18;
    } else {
      R = Math.min(H * 0.34, W * 0.22);
      cx = W * 0.72; cy = H * 0.5;
    }
  }

  function rot(v) {
    // Drehung um Y (Länge), dann um X (Breite)
    var x = v[0] * cosL - v[2] * sinL;
    var z1 = v[0] * sinL + v[2] * cosL;
    var y = v[1] * cosP - z1 * sinP;
    var z = v[1] * sinP + z1 * cosP;
    return [x, y, z];
  }

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }

  var start = performance.now(), last = start, running = false, raf = 0, lang = 'de';

  function drawSwoosh(time, intro, layer) {
    // Ellipsen-Orbit wie im Logo, geneigt
    var ang = -24 * D, ca = Math.cos(ang), sa = Math.sin(ang);
    var rx = R * 1.34, ry = R * 0.36;
    var swooshes = [
      { len: 3.4, w: R * 0.07, speed: 0.22, off: 0, a: 1 },
      { len: 2.3, w: R * 0.035, speed: 0.22, off: -0.5, a: 0.75 }
    ];
    swooshes.forEach(function (sw, idx) {
      var head = (reduce ? 1.2 : time * sw.speed) + sw.off + 1.15;
      var len = sw.len * ease((intro - 0.15 - idx * 0.15) / 0.9);
      if (len <= 0.01) return;
      var steps = 70;
      for (var k = 0; k < steps; k++) {
        var u0 = k / steps, u1 = (k + 1) / steps;
        var t0 = head - len * (1 - u0), t1 = head - len * (1 - u1);
        var back = Math.sin((t0 + t1) / 2) < 0;
        if ((layer === 'back') !== back) continue;
        var e0x = rx * Math.cos(t0), e0y = ry * Math.sin(t0);
        var e1x = rx * Math.cos(t1), e1y = ry * Math.sin(t1);
        var x0 = cx + e0x * ca - e0y * sa, y0 = cy + e0x * sa + e0y * ca;
        var x1 = cx + e1x * ca - e1y * sa, y1 = cy + e1x * sa + e1y * ca;
        var taper = Math.pow(u0, 1.6) * (u0 > 0.92 ? (1 - u0) / 0.08 * 0.6 + 0.4 : 1);
        ctx.lineWidth = Math.max(0.6, sw.w * taper);
        var alpha = sw.a * (0.15 + 0.85 * u0) * (back ? 0.35 : 1);
        ctx.strokeStyle = 'rgba(' + (idx ? '120,230,233,' : '17,193,198,') + alpha.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    });
  }

  function proj(v, alt) {
    var r = rot(v);
    return { x: cx + R * r[0], y: cy - R * r[1], z: r[2] };
  }

  function frame(now) {
    raf = 0;
    var time = (now - start) / 1000;
    var intro = reduce ? 3 : time / 2.2;
    tx += (pointerX - tx) * 0.04; ty += (pointerY - ty) * 0.04;
    var l = 13 + (reduce ? 0 : Math.sin(time * 0.09) * 14) + tx * 10;
    var p = 34 + ty * 6;
    lam0 = l; phi0 = p;
    cosL = Math.cos(lam0 * D); sinL = Math.sin(lam0 * D);
    cosP = Math.cos(phi0 * D); sinP = Math.sin(phi0 * D);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';

    var gIn = ease(intro);
    // Atmosphäre
    var atm = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.5);
    atm.addColorStop(0, 'rgba(17,193,198,' + (0.32 * gIn) + ')');
    atm.addColorStop(0.35, 'rgba(17,193,198,' + (0.08 * gIn) + ')');
    atm.addColorStop(1, 'rgba(17,193,198,0)');
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

    drawSwoosh(time, intro, 'back');

    // Ozean
    var oc = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    oc.addColorStop(0, 'rgba(14,92,128,' + (0.95 * gIn) + ')');
    oc.addColorStop(0.55, 'rgba(0,63,93,' + (0.92 * gIn) + ')');
    oc.addColorStop(1, 'rgba(2,24,40,' + (0.96 * gIn) + ')');
    ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // Graticule
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(127,227,230,' + (0.1 * gIn) + ')';
    ctx.beginPath();
    for (var g = 0; g < GRAT.length; g++) {
      var pen = false, ln = GRAT[g];
      for (var j = 0; j < ln.length; j++) {
        var q = proj(ln[j]);
        if (q.z > 0) { if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); pen = true; } else pen = false;
      }
    }
    ctx.stroke();

    // Landpunkte in Helligkeits-Buckets
    var buckets = [[], [], [], [], [], []];
    var reveal = intro * 1.25;
    var base = Math.max(1, R / 210);
    for (var i = 0; i < N; i++) {
      if (pd[i] > reveal) continue;
      var x = px[i] * cosL - pz[i] * sinL;
      var z1 = px[i] * sinL + pz[i] * cosL;
      var y = py[i] * cosP - z1 * sinP;
      var z = py[i] * sinP + z1 * cosP;
      if (z <= 0.02) continue;
      var b = Math.min(5, (z * 6) | 0);
      buckets[b].push(cx + R * x, cy - R * y, z);
    }
    for (var bi = 0; bi < 6; bi++) {
      var arr = buckets[bi];
      if (!arr.length) continue;
      ctx.fillStyle = 'rgba(17,193,198,' + (0.28 + bi * 0.14) + ')';
      ctx.beginPath();
      for (var a = 0; a < arr.length; a += 3) {
        var rr = base * (0.55 + arr[a + 2] * 0.85);
        ctx.moveTo(arr[a] + rr, arr[a + 1]);
        ctx.arc(arr[a], arr[a + 1], rr, 0, 6.2832);
      }
      ctx.fill();
    }

    // Glanz/Terminator
    var sh = ctx.createRadialGradient(cx + R * 0.55, cy + R * 0.5, R * 0.2, cx + R * 0.2, cy + R * 0.2, R * 1.2);
    sh.addColorStop(0, 'rgba(1,10,18,0.55)');
    sh.addColorStop(1, 'rgba(1,10,18,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(127,227,230,' + (0.35 * gIn) + ')';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

    // Verbindungsbögen
    var arcIn = ease((intro - 0.75) / 0.6);
    if (arcIn > 0) {
      drawArc(ARC, arcIn, time, 2.2, 0);
      drawArc(ARC, arcIn, time, 0, Math.PI);
    }

    drawSwoosh(time, intro, 'front');

    // Orte
    var pin = ease((intro - 1.1) / 0.5);
    if (pin > 0) drawPlaces(time, pin);

    if (!reduce && running) raf = requestAnimationFrame(frame);
  }

  function drawArc(pts, prog, time, w, phase) {
    var n = Math.max(2, Math.floor(pts.length * prog));
    var P = [];
    for (var i = 0; i < n; i++) P.push(proj(pts[i]));
    ctx.lineWidth = w;
    for (i = 1; w > 0 && i < n; i++) {
      var vis = P[i].z > -0.05;
      if (!vis) continue;
      var t = i / (pts.length - 1);
      ctx.strokeStyle = 'rgba(160,245,247,' + (0.35 + 0.5 * Math.sin(Math.PI * t)).toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(P[i - 1].x, P[i - 1].y); ctx.lineTo(P[i].x, P[i].y); ctx.stroke();
    }
    if (prog >= 1 && !reduce) {
      // wandernder Lichtpunkt (hin und zurück)
      var tt = (Math.sin(time * 0.9 + phase) + 1) / 2;
      var idx = Math.round(tt * (pts.length - 1)), q = P[idx];
      if (q && q.z > -0.05) {
        var gl = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 14);
        gl.addColorStop(0, 'rgba(220,255,255,0.95)'); gl.addColorStop(1, 'rgba(17,193,198,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(q.x, q.y, 14, 0, 6.2832); ctx.fill();
      }
    }
  }

  function drawPlaces(time, a) {
    var L = LABELS[lang] || LABELS.de;
    var fs = mobile ? 11 : 12.5;
    ctx.font = '600 ' + fs + 'px "Manrope Variable", Manrope, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    var offs = { sb: [-1, 1], ow: [-1, -1], pl: [1, -1] };
    PLACES.forEach(function (p, i) {
      var q = proj(placeV[i]);
      if (q.z <= 0.05) return;
      var pulse = reduce ? 0.5 : (time * 0.6 + i * 0.33) % 1;
      ctx.strokeStyle = 'rgba(17,193,198,' + ((1 - pulse) * 0.8 * a) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(q.x, q.y, 3 + pulse * 14, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = 'rgba(235,255,255,' + a + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, 6.2832); ctx.fill();
      // Beschriftung mit Führungslinie
      var o = offs[p.key], lx = q.x + o[0] * (mobile ? 26 : 38), ly = q.y + o[1] * (mobile ? 18 : 24);
      ctx.strokeStyle = 'rgba(160,245,247,' + 0.6 * a + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(lx, ly); ctx.stroke();
      var txt = L[p.key], tw = ctx.measureText(txt).width, padX = 8, hh = fs + 10;
      var bx = o[0] < 0 ? lx - tw - padX * 2 : lx;
      ctx.fillStyle = 'rgba(3,18,31,' + 0.82 * a + ')';
      roundRect(bx, ly - hh / 2, tw + padX * 2, hh, hh / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(17,193,198,' + 0.55 * a + ')'; ctx.stroke();
      ctx.fillStyle = 'rgba(232,244,247,' + a + ')';
      ctx.fillText(txt, bx + padX, ly + 0.5);
    });
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function play() {
    if (reduce) { frame(performance.now()); return; }
    if (running) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  layout();
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible && !document.hidden) play(); else pause();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else if (visible) play(); });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layout(); if (reduce || !running) frame(performance.now()); }, 120);
  });
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  window.NHGlobe = {
    setLang: function (l) { lang = l; if (reduce || !running) frame(performance.now()); },
    relayout: function () { layout(); if (reduce || !running) frame(performance.now()); }
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) frame(performance.now()); });
  play();
})();
