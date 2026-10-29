'use strict';
/* DeadlineOS FX layer — upgrades the base particle field to a living constellation
   and adds motion polish. Loads after app.js and overrides initParticles. */

(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Enhanced particle field ---------- */
  const baseInit = initParticles;
  initParticles = function () {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas || !canvas.getContext) { baseInit(); return; }
    if (particleEngine) { particleEngine.stop(); particleEngine = null; }
    const ctx = canvas.getContext('2d');
    const counts = { performance: 90, balanced: 170, cinematic: 300 };
    const target = counts[settings.particleMode] || counts.balanced;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const particles = [];
    const LINK_DIST = 110;
    const linkCap = Math.min(target, 110); /* bound the O(n^2) line checks */
    for (let i = 0; i < target; i++) {
      const hx = Math.random() * canvas.width, hy = Math.random() * canvas.height;
      particles.push({ hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, size: Math.random() * 1.8 + 0.6, cyan: Math.random() > 0.4, ph: Math.random() * Math.PI * 2, drift: 0.12 + Math.random() * 0.25 });
    }
    let mouse = { x: null, y: null }, raf = null, running = true, t = 0;
    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const onMove = ev => { mouse.x = ev.clientX; mouse.y = ev.clientY; };
    const onOut = () => { mouse.x = null; mouse.y = null; };
    function draw() {
      const alpha = 0.55;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.cyan ? 'rgba(0,229,255,' + alpha + ')' : 'rgba(168,85,247,' + alpha + ')';
      ctx.fill();
    }
    function animate() {
      if (!running) return;
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const strength = document.body.classList.contains('focus-dim') ? 1.1 : 4;
      for (const p of particles) {
        /* organic drift of home positions */
        const hx = p.hx + Math.sin(t * p.drift + p.ph) * 14;
        const hy = p.hy + Math.cos(t * p.drift * 0.8 + p.ph) * 14;
        let fx = 0.06 * (hx - p.x), fy = 0.06 * (hy - p.y);
        if (mouse.x !== null) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 19600 && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = ((140 - dist) / 140) * strength * 3;
            fx += (dx / dist) * force; fy += (dy / dist) * force;
          }
        }
        p.vx = (p.vx + fx) * 0.86; p.vy = (p.vy + fy) * 0.86;
        p.x += p.vx; p.y += p.vy;
        /* twinkle */
        const alpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.cyan ? 'rgba(0, 229, 255, ' + alpha + ')' : 'rgba(168, 85, 247, ' + alpha + ')';
        ctx.fill();
      }
      /* constellation lines */
      ctx.lineWidth = 0.6;
      for (let i = 0; i < linkCap; i++) {
        const a = particles[i];
        for (let j = i + 1; j < linkCap; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const near = 1 - Math.sqrt(d2) / LINK_DIST;
            ctx.strokeStyle = (a.cyan || b.cyan) ? 'rgba(0, 229, 255, ' + (near * 0.14) + ')' : 'rgba(168, 85, 247, ' + (near * 0.12) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(animate);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onOut);
    if (!reduceMotion) animate();
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.cyan ? 'rgba(0,229,255,0.55)' : 'rgba(168,85,247,0.55)'; ctx.fill(); }); }
    particleEngine = { stop: function () { running = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMove); document.removeEventListener('mouseleave', onOut); } };
  };

  /* ---------- Page-switch transition ---------- */
  const baseSwitchTab = switchTab;
  switchTab = function (tab) {
    baseSwitchTab(tab);
    if (reduceMotion) return;
    const page = document.getElementById('page-' + tab);
    if (page) { page.classList.remove('dlos-page-enter'); void page.offsetWidth; page.classList.add('dlos-page-enter'); }
  };

  /* ---------- Staggered list entrances ---------- */
  const obs = new MutationObserver(mutations => {
    if (reduceMotion) return;
    for (const m of mutations) {
      Array.prototype.forEach.call(m.addedNodes, (node, i) => {
        if (node.nodeType === 1 && !node.classList.contains('dlos-enter')) {
          node.style.animationDelay = Math.min(i * 45, 360) + 'ms';
          node.classList.add('dlos-enter');
          node.addEventListener('animationend', () => { node.style.animationDelay = ''; node.classList.remove('dlos-enter'); }, { once: true });
        }
      });
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    ['full-assignment-list', 'home-queue-list', 'home-stats-row', 'today-study-plan-list', 'weekly-calendar-grid', 'ocr-drafts-list'].forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el, { childList: true });
    });
  });

  /* ---------- Timer glow flag ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => { document.body.classList.toggle('timer-running', isTimerRunning); }, 1000);
  });
})();