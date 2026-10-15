/* Natan Holding GmbH – Interaktionen */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var hdr = $('#hdr');
  var HDR_H = 76;

  /* ---------- Smooth Scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1 });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var loop = function (t) { lenis.raf(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }
  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: el.id === 'top' ? 0 : -HDR_H + 1 });
    else {
      var y = el.id === 'top' ? 0 : el.getBoundingClientRect().top + window.pageYOffset - HDR_H + 1;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* ---------- Menü ---------- */
  var burger = $('.burger');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      var k = open ? 'menuAriaClose' : 'menuAria';
      if (window.NHi18n && window.NHi18n.get(k)) burger.setAttribute('aria-label', window.NHi18n.get(k));
    }
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger && burger.focus(); } });

  /* ---------- Anker ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false);
    scrollToEl(el);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    // Karten-Ziel kurz hervorheben
    if (el.classList.contains('co')) {
      el.animate && el.animate([{ boxShadow: '0 0 0 0 rgba(17,193,198,0)' }, { boxShadow: '0 0 0 3px rgba(17,193,198,.8)' }, { boxShadow: '0 0 0 0 rgba(17,193,198,0)' }], { duration: 1600, delay: 600 });
    }
  });

  /* ---------- Header-Zustand ---------- */
  var lastY = 0;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 24);
      var hide = y > 700 && y > lastY + 2 && !root.classList.contains('menu-open');
      if (y < lastY - 2 || y < 700) hdr.classList.remove('is-hidden'); else if (hide) hdr.classList.add('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (hdr) hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });

  // aktiver Navigationspunkt
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          navLinks.forEach(function (a) { a.classList.remove('is-active'); });
          map[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Hero-Intro ---------- */
  if (hasGsap && !reduce) {
    var g = window.gsap;
    g.from('.h1 .ln > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.25 });
    g.from('.hero-el', { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.55 });
    g.from('.hdr', { y: -30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
  }

  /* ---------- Reveal ---------- */
  var rv = $$('[data-rv]');
  if ('IntersectionObserver' in window && !reduce) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          if (en.target.classList.contains('val')) setTimeout(function () { en.target.classList.add('on'); }, 250);
          rio.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    rv.forEach(function (el) { rio.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); if (el.classList.contains('val')) el.classList.add('on'); });
  }

  /* ---------- Statement Wort für Wort ---------- */
  var stmt = $('.statement');
  var stmtST = null;
  function splitWords(node) {
    $$('.w', node).length && $$('.w', node).forEach(function () {});
    var walker = [];
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) walker.push(c); else if (c.nodeType === 1) walk(c);
      });
    })(node);
    walker.forEach(function (t) {
      var parts = t.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
        else { var s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); }
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
  function setupStatement() {
    if (!stmt) return;
    splitWords(stmt);
    var words = $$('.w', stmt);
    if (reduce || !hasGsap) { words.forEach(function (w) { w.classList.add('on'); }); return; }
    if (stmtST) stmtST.kill();
    stmtST = window.ScrollTrigger.create({
      trigger: stmt, start: 'top 82%', end: 'bottom 45%', scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
      }
    });
    stmtST.refresh();
  }
  setupStatement();

  /* ---------- Zähler (nur [data-count]-Blätter) ---------- */
  function fmt(n, sep) {
    if (!sep) return String(n);
    var lang = window.NHi18n ? window.NHi18n.lang() : 'de';
    var s = String(n), out = '', sepChar = lang === 'pl' ? ' ' : '.';
    while (s.length > 3) { out = sepChar + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }
  var counters = $$('[data-count]').filter(function (el) { return el.children.length === 0; });
  function finalize(el) { el.textContent = fmt(+el.getAttribute('data-count'), el.hasAttribute('data-sep')); }
  function runCounter(el) {
    var to = +el.getAttribute('data-count'), from = +(el.getAttribute('data-from') || 0), sep = el.hasAttribute('data-sep');
    var dur = 1800, t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(from + (to - from) * e), sep);
      if (p < 1) requestAnimationFrame(step); else el.setAttribute('data-done', '1');
    })(t0);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = fmt(+(el.getAttribute('data-from') || 0), el.hasAttribute('data-sep')); cio.observe(el); });
  } else counters.forEach(finalize);

  /* ---------- Leistungskarten ---------- */
  $$('.card').forEach(function (card) {
    var btn = $('.card__btn', card);
    btn.addEventListener('click', function () {
      var open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (hasGsap) setTimeout(function () { window.ScrollTrigger.refresh(); }, 600);
    });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Organigramm-Linien ---------- */
  var org = $('.org');
  function drawOrg() {
    if (!org) return;
    var o = org.getBoundingClientRect();
    var t = $('#n-top').getBoundingClientRect(), d = $('#n-de').getBoundingClientRect(), p = $('#n-pl').getBoundingClientRect();
    function rel(r) { return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top, cx: r.left - o.left + r.width / 2, cy: r.top - o.top + r.height / 2 }; }
    t = rel(t); d = rel(d); p = rel(p);
    function curve(x0, y0, x1, y1) { var my = (y0 + y1) / 2; return 'M' + x0 + ' ' + y0 + ' C' + x0 + ' ' + my + ' ' + x1 + ' ' + my + ' ' + x1 + ' ' + y1; }
    var a = curve(t.cx - 30, t.b, d.cx, d.t), b = curve(t.cx + 30, t.b, p.cx, p.t);
    var c = 'M' + d.r + ' ' + d.cy + ' L' + p.l + ' ' + p.cy;
    var c2 = 'M' + d.r + ' ' + (d.cy + 8) + ' L' + p.l + ' ' + (p.cy + 8);
    $('#ln-a').setAttribute('d', a); $('#fl-a').setAttribute('d', a);
    $('#ln-b').setAttribute('d', b); $('#fl-b').setAttribute('d', b);
    $('#ln-c').setAttribute('d', c); $('#fl-c').setAttribute('d', c); $('#fl-d').setAttribute('d', c2);
    var br = $('#bridge');
    if (br) { br.style.display = ''; br.style.top = (d.cy - 22) + 'px'; br.style.left = ((d.r + p.l) / 2) + 'px'; br.style.display = (p.l - d.r) < br.offsetWidth + 8 ? 'none' : ''; }
  }
  drawOrg();
  var ro;
  if (window.ResizeObserver && org) { ro = new ResizeObserver(drawOrg); ro.observe(org); }
  window.addEventListener('resize', drawOrg);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawOrg(); if (hasGsap) window.ScrollTrigger.refresh(); });

  /* ---------- Timeline ---------- */
  var tl = $('#tl');
  if (tl) {
    var fill = $('.tl__fill', tl), items = $$('li', tl);
    var updateTl = function (p) {
      tl.style.setProperty('--p', p.toFixed(4));
      var rail = $('.tl__rail', tl).getBoundingClientRect();
      var lineY = rail.top + rail.height * p;
      items.forEach(function (li) { li.classList.toggle('on', li.getBoundingClientRect().top + 22 <= lineY + 1); });
    };
    if (hasGsap && !reduce) {
      window.ScrollTrigger.create({ trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: 0.4, onUpdate: function (s) { updateTl(s.progress); } });
    } else { updateTl(1); }
  }

  /* ---------- Sprache gewechselt ---------- */
  document.addEventListener('nh:lang', function () {
    setupStatement();
    counters.forEach(function (el) { if (el.getAttribute('data-done') || reduce || !('IntersectionObserver' in window)) finalize(el); });
    drawOrg();
    if (hasGsap) setTimeout(function () { window.ScrollTrigger.refresh(); }, 50);
  });

  /* ---------- Formular & Danke ---------- */
  var form = $('#form');
  if (form) {
    var next = form.querySelector('input[name="_next"]');
    if (next && /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname)) next.value = location.origin + location.pathname + '#danke';
    form.addEventListener('submit', function (e) {
      var hp = form.querySelector('input[name="_honey"]');
      if (hp && hp.value) { e.preventDefault(); return; }
      var b = form.querySelector('button[type="submit"]');
      if (b) { b.disabled = true; b.style.opacity = '.7'; }
    });
  }
  var toast = $('#toast');
  function showToast() {
    if (!toast) return;
    toast.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { toast.classList.add('show'); }); });
    setTimeout(hideToast, 10000);
  }
  function hideToast() { if (!toast) return; toast.classList.remove('show'); setTimeout(function () { toast.hidden = true; }, 650); }
  if (toast) $('button', toast).addEventListener('click', hideToast);
  function checkDanke() {
    if (location.hash !== '#danke') return;
    showToast();
    if (history.replaceState) history.replaceState(null, '', location.pathname + '#kontakt');
    setTimeout(function () { scrollToEl($('#kontakt')); }, 300);
  }
  checkDanke();
  window.addEventListener('hashchange', checkDanke);
})();
