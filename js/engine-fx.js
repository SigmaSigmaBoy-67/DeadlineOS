'use strict';
/* DeadlineOS — Engine Part 4: command palette, backup, boot, particles + transitions */

/* ---------- Command palette ---------- */
function toggleCommandPalette() {
  const cp = $('command-palette'); cp.classList.toggle('hidden');
  if (!cp.classList.contains('hidden')) { $('cmd-input').value = ''; $('cmd-input').focus(); handleCommandSearch(); }
}
function handleCommandSearch() {
  const q = $('cmd-input').value.toLowerCase().trim();
  const res = $('cmd-results');
  const commands = [
    { label: 'Go to Home', icon: 'home', run: "switchTab('home')" },
    { label: 'Go to Assignments', icon: 'layers', run: "switchTab('assignments')" },
    { label: 'Open Deep Work', icon: 'crosshair', run: "switchTab('focus')" },
    { label: 'Add Assignment', icon: 'plus', run: "toggleModal('add-modal')" },
    { label: 'Screenshot Scanning', icon: 'scan', run: "openOCRModal()" },
    { label: 'Open 7-Day Calendar', icon: 'calendar-days', run: "toggleCalendarModal()" },
    { label: 'Open Settings', icon: 'settings', run: "toggleModal('settings-modal')" },
    { label: 'Export backup', icon: 'download', run: "exportData()" }
  ];
  const items = commands.filter(c => !q || c.label.toLowerCase().includes(q));
  const tasks = q ? assignments.filter(a => !a.completed && (a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q))).slice(0, 5) : [];
  let html = items.map(c => '<div onclick="' + c.run + '; toggleCommandPalette();" class="p-2.5 rounded-xl bg-bgDark hover:bg-elevatedDark cursor-pointer text-sm flex items-center gap-2"><i data-lucide="' + c.icon + '" class="w-4 h-4 text-neonCyan"></i>' + escapeHTML(c.label) + '</div>').join('');
  html += tasks.map(t => '<div onclick="openAssignmentDetail(\'' + escapeHTML(t.id) + '\'); toggleCommandPalette();" class="p-2.5 rounded-xl bg-bgDark hover:bg-elevatedDark cursor-pointer text-sm flex items-center gap-2"><i data-lucide="file-text" class="w-4 h-4 text-neonViolet"></i>' + escapeHTML(t.title) + ' <span class="text-[10px] text-textSecondary">— open details</span></div>').join('');
  res.innerHTML = html || '<div class="p-2.5 text-xs text-textSecondary">No matches.</div>';
  lucide.createIcons();
}
function handleCommandKeydown(e) { if (e.key === 'Enter') { const first = $('cmd-results').querySelector('.cursor-pointer'); if (first) first.click(); } }

/* ---------- Backup ---------- */
function exportData() {
  stats.lastBackup = new Date().toISOString(); saveData();
  const payload = JSON.stringify({ app: 'DeadlineOS', version: 5, exportedAt: new Date().toISOString(), assignments: assignments, stats: stats, settings: settings }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dl = document.createElement('a');
  dl.href = url; dl.download = 'DeadlineOS_Backup_' + todayKey() + '.json';
  document.body.appendChild(dl); dl.click(); dl.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('Backup exported successfully!', 'success'); updateStudyInsights();
}
function importData(e, mergeMode) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!parsed || !Array.isArray(parsed.assignments)) throw new Error('bad');
      const incoming = parsed.assignments;
      const proceed = () => {
        if (mergeMode) {
          const keys = new Set(assignments.map(a => (a.title + '|' + a.dueDate).toLowerCase()));
          let merged = 0, skipped = 0;
          incoming.forEach(a => {
            const k = ((a.title || '') + '|' + (a.dueDate || '')).toLowerCase();
            if (keys.has(k)) { skipped++; return; }
            assignments.push({ subtasks: [], notes: '', priority: 2, duration: 1, completed: false, ...a });
            keys.add(k); merged++;
          });
          showToast(merged + ' merged, ' + skipped + ' duplicates skipped.', 'success');
        } else {
          assignments = incoming.map(a => ({ subtasks: [], notes: '', priority: 2, duration: 1, completed: false, ...a }));
          showToast('Data replaced (' + assignments.length + ' assignments).', 'success');
        }
        if (parsed.stats) {
          stats.sessions = (parsed.stats.sessions || []).concat(stats.sessions || []);
          stats.focusMinutes = (parsed.stats.focusMinutes || 0) + (stats.focusMinutes || 0);
          if (parsed.stats.lastBackup) stats.lastBackup = parsed.stats.lastBackup;
        }
        if (parsed.settings && !mergeMode) settings = Object.assign(settings, parsed.settings);
        saveData(); renderAll(); updateStudyInsights();
      };
      if (!mergeMode && assignments.length) {
        try { localStorage.setItem('deadlineos_preimport_snapshot', JSON.stringify({ assignments: assignments, stats: stats, settings: settings })); } catch (err) {}
        if (!confirm('Replace ALL current data (' + assignments.length + ' assignments) with the backup (' + incoming.length + ' assignments)?\n\nA safety snapshot is stored first.')) { showToast('Import cancelled.', 'warning'); return; }
      }
      proceed();
    } catch (err) { showToast('Invalid backup file.', 'error'); }
  };
  reader.readAsText(file); e.target.value = '';
}
function checkWelcomeModal() { if (!localStorage.getItem('deadlineos_welcomed')) $('welcome-modal').classList.remove('hidden'); }
function dismissWelcome() { localStorage.setItem('deadlineos_welcomed', 'true'); $('welcome-modal').classList.add('hidden'); }
function showToast(message, type) {
  type = type || 'success';
  const container = $('toast-container');
  const toast = document.createElement('div');
  const colors = { success: 'border-neonCyan/40 text-neonCyan', error: 'border-dangerRed/40 text-dangerRed', warning: 'border-statusWarning/40 text-statusWarning' };
  toast.className = 'glass-panel px-4 py-3 rounded-xl border ' + (colors[type] || colors.success) + ' text-xs font-bold toast-animate shadow-xl flex items-center gap-2 pointer-events-auto';
  toast.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '" class="w-4 h-4"></i><span>' + escapeHTML(message) + '</span>';
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 3500);
}

/* ---------- Boot ---------- */
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateGreeting();
  initParticles();
  updateStudyTodayNav();
  checkWelcomeModal();
  checkBackupReminder();
  $('setting-capacity').value = settings.capacity;
  $('setting-break-short').value = settings.shortBreak;
  $('setting-break-long').value = settings.longBreak;
  if ('Notification' in window && Notification.permission === 'granted') $('setting-notif').checked = true;
  highlightParticleModeBtn(settings.particleMode);
  $('dw-session-notes').value = localStorage.getItem('deadlineos_session_notes') || '';
  recoverActiveTimer();
  renderParkingLot();
  renderAll();
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleCommandPalette(); }
    if (e.key === 'Escape') {
      if (!$('command-palette').classList.contains('hidden')) { $('command-palette').classList.add('hidden'); return; }
      const openModals = ['add-modal', 'detail-modal', 'calendar-modal', 'ocr-modal', 'ocr-review-modal', 'settings-modal', 'session-summary-modal', 'welcome-modal'];
      for (const id of openModals) { const el = $(id); if (el && !el.classList.contains('hidden')) { el.classList.add('hidden'); return; } }
    }
    if (e.key === ' ' && !$('page-focus').classList.contains('hidden') && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].indexOf(document.activeElement.tagName) === -1) { e.preventDefault(); toggleTimer(); }
  });
  window.addEventListener('beforeunload', () => { if (isTimerRunning) persistTimerState(); });
  /* body flag for timer glow CSS */
  setInterval(() => { document.body.classList.toggle('timer-running', isTimerRunning); }, 1000);
});

/* ---------- Enhanced particle field: constellations, drift, twinkle ---------- */
function initParticles() {
  const canvas = $('particle-canvas');
  if (!canvas || !canvas.getContext) return;
  if (particleEngine) { particleEngine.stop(); particleEngine = null; }
  const ctx = canvas.getContext('2d');
  const counts = { performance: 90, balanced: 170, cinematic: 300 };
  const target = counts[settings.particleMode] || counts.balanced;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = [];
  const LINK_DIST = 110;
  const linkCap = Math.min(target, 110);
  for (let i = 0; i < target; i++) {
    const hx = Math.random() * canvas.width, hy = Math.random() * canvas.height;
    particles.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, size: Math.random() * 1.8 + 0.6, cyan: Math.random() > 0.4, ph: Math.random() * Math.PI * 2, drift: 0.12 + Math.random() * 0.25 });
  }
  let mouse = { x: null, y: null }, raf = null, running = true, t = 0;
  const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  const onMove = ev => { mouse.x = ev.clientX; mouse.y = ev.clientY; };
  const onOut = () => { mouse.x = null; mouse.y = null; };
  function animate() {
    if (!running) return;
    t += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strength = document.body.classList.contains('focus-dim') ? 1.1 : 4;
    for (const p of particles) {
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
      const alpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.ph));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.cyan ? 'rgba(0, 229, 255, ' + alpha + ')' : 'rgba(168, 85, 247, ' + alpha + ')';
      ctx.fill();
    }
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
}
function setParticleMode(mode) {
  settings.particleMode = mode; saveData();
  highlightParticleModeBtn(mode); initParticles();
  showToast('Particle mode: ' + mode, 'success');
}
function highlightParticleModeBtn(mode) {
  const base = 'py-2 px-3 rounded-lg bg-bgDark border border-white/15 text-textSecondary hover:text-white font-semibold';
  const activeCls = 'py-2 px-3 rounded-lg bg-neonViolet text-white font-semibold';
  const map = { performance: 'mode-perf', balanced: 'mode-bal', cinematic: 'mode-cine' };
  ['mode-perf', 'mode-bal', 'mode-cine'].forEach(id => { if ($(id)) $(id).className = base; });
  const el = $(map[mode] || 'mode-bal'); if (el) el.className = activeCls;
}

/* ---------- Page-switch transition wrapper ---------- */
const _baseSwitchTab = switchTab;
switchTab = function (tab) {
  _baseSwitchTab(tab);
  const page = $('page-' + tab);
  if (page) { page.classList.remove('dlos-page-enter'); void page.offsetWidth; page.classList.add('dlos-page-enter'); }
};

/* ---------- Staggered entrance animations for rendered lists ---------- */
const FX_OBS = new MutationObserver(mutations => {
  for (const m of mutations) {
    m.addedNodes.forEach((node, i) => {
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
    const el = $(id);
    if (el) FX_OBS.observe(el, { childList: true });
  });
});