/* ==========================================================================
   ARDENT-1 · main.js
   Page-load intro · scroll reveals · word-by-word statement · counters ·
   timeline progress · header behavior · mobile menu · parallax · tilt ·
   briefing form. Classic script (works from file://), no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  /* ---------------------------------------------------------------
     0. Safety: clear the head-script fallback timer once we boot
     --------------------------------------------------------------- */
  if (window.__ardentFallback) clearTimeout(window.__ardentFallback);

  /* ---------------------------------------------------------------
     1. Page-load intro
     --------------------------------------------------------------- */
  (function intro() {
    var el = document.getElementById('intro');
    var percentEl = document.getElementById('introPercent');
    var barEl = document.getElementById('introBar');
    var statusEl = document.getElementById('introStatus');
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      body.classList.add('is-loaded');
      body.classList.remove('is-intro');
      if (el) {
        el.classList.add('is-done');
        el.setAttribute('aria-hidden', 'true');
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 1600);
      }
    }

    // Reduced motion / no intro element: show everything immediately
    if (!el || reduceMotion) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      body.classList.add('is-loaded');
      body.classList.remove('is-intro');
      return;
    }

    var duration = 1400;
    var start = performance.now();
    var skipTriggers = ['click', 'keydown', 'wheel', 'touchstart'];
    skipTriggers.forEach(function (evt) {
      el.addEventListener(evt, finish, { once: true, passive: true });
    });

    function tick(now) {
      var t = clamp((now - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var pct = Math.round(eased * 100);
      if (percentEl) percentEl.textContent = pct < 10 ? '0' + pct : String(pct);
      if (barEl) barEl.style.width = pct + '%';
      if (statusEl) {
        statusEl.textContent =
          pct >= 100 ? 'Interface ready' :
          pct > 72 ? 'Aligning trajectory' :
          pct > 38 ? 'Loading telemetry' : 'Establishing connection';
      }
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finish, 280);
      }
    }
    requestAnimationFrame(tick);

    // Hard safety net: never trap the page behind the curtain
    setTimeout(finish, 6000);
  })();

  /* ---------------------------------------------------------------
     2. Scroll reveals (everything below the hero)
     --------------------------------------------------------------- */
  (function reveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------
     3. Statement: word-by-word scroll-linked reveal
     --------------------------------------------------------------- */
  var updateStatement = null;
  (function statement() {
    var el = document.querySelector('[data-words]');
    if (!el) return;

    if (reduceMotion) return; // leave plain text at full opacity

    var text = el.textContent.replace(/\s+/g, ' ').trim();
    var words = text.split(' ');
    el.textContent = '';
    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.className = 'word';
      span.textContent = word;
      span.style.opacity = '0.13';
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    var spans = el.querySelectorAll('.word');

    updateStatement = function () {
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      var start = vh * 0.82;
      var total = rect.height + vh * 0.3;
      var p = clamp((start - rect.top) / total, 0, 1);
      var n = spans.length;
      var ramp = 5;
      for (var i = 0; i < n; i++) {
        var wp = clamp((p * (n + ramp) - i) / ramp, 0, 1);
        spans[i].style.opacity = (0.13 + 0.87 * wp).toFixed(3);
      }
    };
  })();

  /* ---------------------------------------------------------------
     4. Counters
     --------------------------------------------------------------- */
  (function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    function fmt(el, value) {
      var pad = parseInt(el.getAttribute('data-pad') || '0', 10);
      var s = Math.round(value).toLocaleString('en-US');
      while (s.length < pad) s = '0' + s;
      return s;
    }

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (reduceMotion) { el.textContent = fmt(el, target); return; }
      var dur = 1700;
      var t0 = performance.now();
      function step(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(2, -10 * t);
        el.textContent = fmt(el, target * eased);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = fmt(el, target);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, animate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(els, function (el) {
      el.textContent = fmt(el, 0);
      io.observe(el);
    });
  })();

  /* ---------------------------------------------------------------
     5. Scroll-driven UI (header, progress bar, parallax, timeline)
     --------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  var progressBar = document.getElementById('progressBar');
  var timeline = document.getElementById('timeline');
  var heroFigure = document.querySelector('.hero__figure');
  var heroPlanet = document.querySelector('.hero__planet');
  var heroCopy = document.querySelector('.hero__copy');
  var hero = document.querySelector('.hero');
  var lastY = window.scrollY;
  var ticking = false;
  var navCleared = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;

    // Header: frosted once scrolled, hides going down, returns going up
    if (header) {
      header.classList.toggle('is-scrolled', y > 12);
      var menuOpen = body.classList.contains('menu-open');
      if (!menuOpen && y > 260 && y > lastY + 4) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 260) header.classList.remove('is-hidden');
    }

    // Top-of-page scroll progress bar
    if (progressBar) {
      var docH = document.documentElement.scrollHeight - vh;
      progressBar.style.transform = 'scaleX(' + (docH > 0 ? clamp(y / docH, 0, 1) : 0).toFixed(4) + ')';
    }

    // No section active while parked on the hero
    if (y < vh * 0.5 && !navCleared) {
      navCleared = true;
      Array.prototype.forEach.call(document.querySelectorAll('[data-navlink].is-active'), function (l) {
        l.classList.remove('is-active');
      });
    } else if (y >= vh * 0.5) {
      navCleared = false;
    }

    // Timeline fill line
    if (timeline) {
      var tr = timeline.getBoundingClientRect();
      if (tr.top < vh && tr.bottom > 0) {
        var p = clamp((vh * 0.7 - tr.top) / tr.height, 0, 1);
        timeline.style.setProperty('--progress', p.toFixed(4));
      }
    }

    // Hero parallax (transform only, disabled at reduced motion / top of page)
    if (!reduceMotion && body.classList.contains('is-loaded')) {
      if (hero && y < hero.offsetHeight + vh) {
        if (heroFigure) {
          heroFigure.style.transform = y > 2 ? 'translate3d(0,' + (y * 0.13).toFixed(1) + 'px,0)' : '';
        }
        if (heroPlanet) {
          heroPlanet.style.transform = y > 2 ? 'translate3d(0,' + (y * 0.07).toFixed(1) + 'px,0)' : '';
        }
        if (heroCopy && y > 2) {
          heroCopy.style.transform = 'translate3d(0,' + (y * 0.06).toFixed(1) + 'px,0)';
          heroCopy.style.opacity = String(clamp(1 - y / (vh * 0.95), 0, 1));
        } else if (heroCopy) {
          heroCopy.style.transform = '';
          heroCopy.style.opacity = '';
        }
      }
    }

    if (updateStatement) updateStatement();
    lastY = y;
  }

  function requestFrame() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onFrame);
    }
  }
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  requestFrame();

  /* ---------------------------------------------------------------
     6. Active nav link
     --------------------------------------------------------------- */
  (function activeNav() {
    if (!('IntersectionObserver' in window)) return;
    var links = document.querySelectorAll('[data-navlink]');
    var map = {};
    Array.prototype.forEach.call(links, function (link) {
      map[link.getAttribute('href')] = link;
    });
    var sections = document.querySelectorAll('main section[id]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map['#' + entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Array.prototype.forEach.call(links, function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Array.prototype.forEach.call(sections, function (s) { io.observe(s); });
  })();

  /* ---------------------------------------------------------------
     7. Mobile menu
     --------------------------------------------------------------- */
  (function mobileMenu() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;
    var open = false;

    function setOpen(next) {
      open = next;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      body.classList.toggle('menu-open', open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { menu.classList.add('is-open'); });
        });
      } else {
        menu.classList.remove('is-open');
        setTimeout(function () { if (!open) menu.hidden = true; }, 480);
      }
    }

    toggle.addEventListener('click', function () { setOpen(!open); });
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (open && window.innerWidth > 940) setOpen(false);
    });
  })();

  /* ---------------------------------------------------------------
     8. Gallery tilt (fine pointers only)
     --------------------------------------------------------------- */
  (function tilt() {
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    var items = document.querySelectorAll('.gallery__item');
    Array.prototype.forEach.call(items, function (item) {
      item.addEventListener('pointermove', function (e) {
        var r = item.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        item.style.transition = 'transform 0.22s ease-out';
        item.style.transform =
          'perspective(1000px) rotateX(' + (-py * 4.5).toFixed(2) + 'deg) rotateY(' +
          (px * 5.5).toFixed(2) + 'deg)';
      });
      item.addEventListener('pointerleave', function () {
        item.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        item.style.transform = '';
      });
    });
  })();

  /* ---------------------------------------------------------------
     9. Briefing form
     --------------------------------------------------------------- */
  (function form() {
    var el = document.getElementById('briefForm');
    if (!el) return;
    var input = document.getElementById('briefEmail');
    var msg = document.getElementById('briefMsg');
    var label = el.querySelector('[data-label]');

    function showMsg(text, isError) {
      msg.textContent = text;
      msg.classList.toggle('is-error', !!isError);
      msg.classList.add('is-shown');
    }

    input.addEventListener('input', function () {
      el.classList.remove('is-invalid');
      msg.classList.remove('is-shown');
    });

    el.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!valid) {
        el.classList.add('is-invalid');
        showMsg('Uplink address not recognised', true);
        return;
      }
      el.classList.remove('is-invalid');
      el.classList.add('is-success');
      showMsg('Transmitted — welcome aboard', false);
      if (label) {
        label.style.transition = 'opacity 0.25s ease';
        label.style.opacity = '0';
        setTimeout(function () {
          label.textContent = 'Sent ✓';
          label.style.opacity = '1';
        }, 250);
      }
      input.value = '';
      input.blur();
      setTimeout(function () {
        el.classList.remove('is-success');
        msg.classList.remove('is-shown');
        if (label) {
          label.style.opacity = '0';
          setTimeout(function () {
            label.textContent = 'Transmit';
            label.style.opacity = '1';
          }, 250);
        }
      }, 4500);
    });
  })();

  /* ---------------------------------------------------------------
     10. Footer year
     --------------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
