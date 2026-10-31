/* ==========================================================================
   ARDENT-1 · starfield.js
   Lightweight canvas star field for the hero: layered drift, subtle twinkle,
   occasional shooting star. Static single frame when reduced motion is set.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('starfield');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stars = [];
  var shooter = null;
  var w = 0, h = 0, dpr = 1;
  var rafId = null;
  var lastTime = 0;
  var visible = true;
  var nextShotAt = 0;

  var COLORS = ['#ffffff', '#ffffff', '#cfe0ff', '#ffe9d2'];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduce) drawFrame(0, 0);
  }

  function seed() {
    var count = Math.min(320, Math.max(110, Math.round((w * h) / 5200)));
    stars = new Array(count);
    for (var i = 0; i < count; i++) {
      var layer = i % 3; // 0 far, 1 mid, 2 near
      stars[i] = {
        x: Math.random() * w,
        y: Math.random() * h,
        r: (0.5 + layer * 0.45) * rand(0.6, 1.25),
        a: rand(0.22, 0.85),
        c: COLORS[layer === 2 ? (Math.random() < 0.3 ? 3 : 2) : layer === 1 ? 2 : 0],
        phase: Math.random() * Math.PI * 2,
        tw: rand(0.0006, 0.0016),
        vx: -rand(0.003, 0.008) * (1 + layer * 0.6),
        vy: rand(0.001, 0.004) * (1 + layer * 0.5)
      };
    }
    nextShotAt = performance.now() + rand(4000, 9000);
  }

  function spawnShooter() {
    var fromLeft = Math.random() < 0.5;
    shooter = {
      x: fromLeft ? rand(-60, w * 0.4) : rand(w * 0.6, w + 60),
      y: rand(h * 0.05, h * 0.4),
      vx: (fromLeft ? 1 : -1) * rand(0.55, 0.9),
      vy: rand(0.22, 0.4),
      life: 1,
      decay: 0.0016
    };
  }

  function drawShooter(dt) {
    if (!shooter) return;
    shooter.x += shooter.vx * dt;
    shooter.y += shooter.vy * dt;
    shooter.life -= shooter.decay * dt;
    if (shooter.life <= 0 || shooter.x < -120 || shooter.x > w + 120) {
      shooter = null;
      return;
    }
    var tailX = shooter.x - shooter.vx * 110;
    var tailY = shooter.y - shooter.vy * 110;
    var grad = ctx.createLinearGradient(shooter.x, shooter.y, tailX, tailY);
    grad.addColorStop(0, 'rgba(255,255,255,' + (0.85 * shooter.life).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
  }

  function drawFrame(dt, now) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (dt) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < -2) s.x = w + 2;
        if (s.x > w + 2) s.x = -2;
        if (s.y > h + 2) s.y = -2;
      }
      var twinkle = dt ? 0.74 + 0.26 * Math.sin(now * s.tw + s.phase) : 1;
      ctx.globalAlpha = s.a * twinkle;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (dt) {
      if (!shooter && now >= nextShotAt) {
        spawnShooter();
        nextShotAt = now + rand(6500, 13000);
      }
      drawShooter(dt);
    }
  }

  function loop(now) {
    rafId = null;
    if (!visible || document.hidden) return;
    var dt = Math.min(now - lastTime, 60);
    lastTime = now;
    drawFrame(dt, now);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (reduce || rafId !== null) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Pause when hero is off-screen or tab is hidden
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  start();
})();
