'use strict';
const $ = id => document.getElementById(id);
const TIMER_KEY = 'deadlineos_timer_v1';

function safeParse(keys, fallback) {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { const p = JSON.parse(raw); if (p !== null && p !== undefined) return p; }
    catch (e) { try { localStorage.setItem('deadlineos_corrupt_' + Date.now(), raw); } catch (e2) {} }
  }
  return JSON.parse(JSON.stringify(fallback));
}
let assignments = safeParse(['dlos_v5_tasks', 'dlos_v4_tasks'], []);
let stats = safeParse(['dlos_v5_stats', 'dlos_v4_stats'], { focusMinutes: 0, sessions: [], lastBackup: null });
let settings = safeParse(['dlos_v5_settings', 'dlos_v4_settings'], { capacity: 3.0, particleMode: 'balanced', shortBreak: 5, longBreak: 15 });
if (!Array.isArray(assignments)) assignments = [];
if (!Array.isArray(stats.sessions)) stats.sessions = [];
settings.shortBreak = settings.shortBreak || 5;
settings.longBreak = settings.longBreak || 15;
if (settings.capacity === undefined) settings.capacity = 3.0;
assignments = assignments.map(a => ({ subtasks: [], notes: '', priority: 2, duration: 1, completed: false, ...a }));

let currentFocusId = localStorage.getItem('deadlineos_focus_task') || null;
if (currentFocusId && !assignments.some(a => a.id === currentFocusId)) currentFocusId = null;
let topTaskId = null;
let timerInterval = null;
let timerTargetTime = null;
let totalSeconds = 1500;
let remainingSeconds = 1500;
let isTimerRunning = false;
let timerMode = 'quick';
let activeSound = 'silence';
let extractedDraftsCache = [];
let distractionParkingLot = safeParse(['orbitos_parking_lot'], []);
let sessionChecklist = [];
let audioCtx = null;
let noiseNode = null;
let particleEngine = null;
let lastDeleted = null;

function localDateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const todayKey = () => localDateKey(new Date());
function addDays(date, n) { const d = new Date(date.getTime()); d.setDate(d.getDate() + n); return d; }
function dueDateParts(a) { if (!a.dueDate) return null; const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(a.dueDate); return m ? { y: +m[1], mo: +m[2], d: +m[3], h: m[4] ? +m[4] : 0, mi: m[5] ? +m[5] : 0 } : null; }
function dueDateObject(a) { const p = dueDateParts(a); return p ? new Date(p.y, p.mo - 1, p.d, p.h, p.mi) : null; }
function dueDateKey(a) { const p = dueDateParts(a); return p ? p.y + '-' + String(p.mo).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : null; }
function formatDue(a) { const d = dueDateObject(a); return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No due date'; }
function dueBadge(a) {
  const key = dueDateKey(a);
  if (!key) return { label: 'No due date', cls: 'bg-bgDark border-white/10 text-textSecondary' };
  if (key < todayKey()) return { label: 'Overdue', cls: 'bg-dangerRed/15 border-dangerRed/40 text-dangerRed' };
  if (key === todayKey()) return { label: 'Due today', cls: 'bg-statusWarning/15 border-statusWarning/40 text-statusWarning' };
  if (key === localDateKey(addDays(new Date(), 1))) return { label: 'Due tomorrow', cls: 'bg-neonCyan/10 border-neonCyan/40 text-neonCyan' };
  const days = Math.ceil((dueDateObject(a) - new Date()) / 86400000);
  return { label: days === 1 ? '1 day left' : days + ' days left', cls: 'bg-bgDark border-white/10 text-textSecondary' };
}
function genId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
function escapeHTML(str) { if (str === null || str === undefined) return ''; return String(str).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function saveData() {
  try {
    localStorage.setItem('dlos_v5_tasks', JSON.stringify(assignments));
    localStorage.setItem('dlos_v5_stats', JSON.stringify(stats));
    localStorage.setItem('dlos_v5_settings', JSON.stringify(settings));
  } catch (e) { showToast('Storage full — export a backup!', 'error'); }
}

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
});

function updateGreeting() {
  const h = new Date().getHours();
  let g = 'Good evening';
  if (h < 5) g = 'Working late'; else if (h < 12) g = 'Good morning'; else if (h < 18) g = 'Good afternoon';
  $('greeting').textContent = g + '. Ready to make progress?';
}
function showToast(message, type, action) {
  type = type || 'success';
  const container = $('toast-container');
  const toast = document.createElement('div');
  const colors = { success: 'border-neonCyan/40 text-neonCyan', error: 'border-dangerRed/40 text-dangerRed', warning: 'border-statusWarning/40 text-statusWarning' };
  toast.className = 'glass-panel px-4 py-3 rounded-xl border ' + (colors[type] || colors.success) + ' text-xs font-bold toast-animate shadow-xl flex items-center gap-2 pointer-events-auto';
  toast.innerHTML = '<i data-lucide="' + (type === 'success' ? 'check-circle' : 'alert-circle') + '" class="w-4 h-4"></i><span>' + escapeHTML(message) + '</span>';
  if (action && action.label && typeof action.fn === 'function') {
    const btn = document.createElement('button');
    btn.className = 'ml-2 px-2 py-1 rounded-lg bg-elevatedDark border border-white/15 text-textPrimary font-bold text-[10px] hover:border-neonCyan transition';
    btn.textContent = action.label;
    btn.onclick = () => { action.fn(); toast.remove(); };
    toast.appendChild(btn);
  }
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 4200);
}
function checkWelcomeModal() { if (!localStorage.getItem('deadlineos_welcomed')) $('welcome-modal').classList.remove('hidden'); }
function dismissWelcome() { localStorage.setItem('deadlineos_welcomed', 'true'); $('welcome-modal').classList.add('hidden'); }
function checkBackupReminder() {
  const box = $('backup-reminder-box'); if (!box) return;
  if (!stats.lastBackup) { box.textContent = "Reminder: You haven't exported a JSON backup yet."; return; }
  const daysAgo = Math.floor((Date.now() - new Date(stats.lastBackup).getTime()) / 86400000);
  box.textContent = daysAgo > 7 ? 'Reminder: Last backup was ' + daysAgo + ' days ago. Export soon!' : 'Backup status: Up to date.';
}
function updateStudyTodayNav() { const m = (stats.sessions || []).filter(s => s.date === todayKey()).reduce((acc, s) => acc + (s.duration || 0), 0); $('nav-today-study').textContent = m + 'm'; }

/* ============ NAV & MODALS ============ */
function switchTab(tab) {
  ['home', 'assignments', 'focus'].forEach(t => {
    $('page-' + t).classList.add('hidden');
    $('tab-' + t).className = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-textSecondary hover:text-textPrimary whitespace-nowrap transition-all duration-300';
  });
  $('page-' + tab).classList.remove('hidden');
  const active = tab === 'focus' ? 'bg-neonViolet text-white shadow-lg shadow-neonViolet/20' : 'bg-neonCyan text-bgDark shadow-lg shadow-neonCyan/20';
  $('tab-' + tab).className = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ' + active + ' whitespace-nowrap transition-all duration-300';
  document.body.classList.toggle('focus-dim', tab === 'focus');
  if (tab === 'focus') initDeepWorkWorkspace();
}
function toggleModal(id) {
  $(id).classList.toggle('hidden');
  if (id === 'add-modal' && !$('add-modal').classList.contains('hidden')) {
    $('assignment-form').reset(); $('form-edit-id').value = ''; $('modal-title').textContent = 'New Assignment';
  }
}
function toggleCalendarModal() { renderWeeklyCalendar(); $('calendar-modal').classList.toggle('hidden'); }
function openOCRModal() { $('ocr-file-input').value = ''; $('ocr-progress-status').classList.add('hidden'); $('ocr-progress-bar-wrap').classList.add('hidden'); $('ocr-progress-bar').style.width = '0%'; toggleModal('ocr-modal'); }

/* ============ DEEP WORK CONTEXT ============ */
function populateDeepWorkTaskSelector() {
  const sel = $('dw-task-selector');
  sel.innerHTML = '<option value="">General Session (No specific task)</option>';
  assignments.filter(a => !a.completed).forEach(a => { sel.innerHTML += '<option value="' + escapeHTML(a.id) + '">' + escapeHTML(a.title) + ' (' + escapeHTML(a.subject) + ')</option>'; });
  sel.value = currentFocusId && assignments.some(a => a.id === currentFocusId) ? currentFocusId : '';
}
function selectDeepWorkTask(id) {
  currentFocusId = id || null;
  localStorage.setItem('deadlineos_focus_task', currentFocusId || '');
  const task = assignments.find(a => a.id === id);
  if (task) { $('dw-active-task-label').textContent = 'Target: ' + task.subject; $('dw-task-title').textContent = task.title; sessionChecklist = (task.subtasks || []).map(st => ({ ...st })); }
  else { $('dw-active-task-label').textContent = 'General Focus Session'; $('dw-task-title').textContent = 'Deep Work Environment'; sessionChecklist = []; }
  renderDeepWorkChecklist();
}
function initDeepWorkWorkspace() {
  populateDeepWorkTaskSelector();
  const task = assignments.find(a => a.id === currentFocusId);
  if (task) { $('dw-active-task-label').textContent = 'Target: ' + task.subject; $('dw-task-title').textContent = task.title; sessionChecklist = (task.subtasks || []).map(st => ({ ...st })); }
  else if (!currentFocusId) { $('dw-active-task-label').textContent = 'No Assignment Selected'; $('dw-task-title').textContent = 'Deep Work Environment'; }
  renderDeepWorkChecklist(); renderParkingLot(); updateTimerDisplay();
}
function syncChecklistToTask() {
  if (!currentFocusId) return;
  const task = assignments.find(a => a.id === currentFocusId);
  if (task) task.subtasks = sessionChecklist.map(st => ({ ...st }));
  saveData();
}
function renderDeepWorkChecklist() {
  const c = $('dw-checklist-items'); c.innerHTML = '';
  if (!sessionChecklist.length) { c.innerHTML = '<div class="text-xs text-textSecondary italic">No checklist items.</div>'; return; }
  sessionChecklist.forEach((st, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between text-xs';
    row.innerHTML = '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" ' + (st.done ? 'checked' : '') + ' onchange="toggleCheck(' + idx + ', this.checked)" class="accent-neonCyan rounded"><span class="' + (st.done ? 'line-through text-textSecondary opacity-50' : 'text-textPrimary') + '">' + escapeHTML(st.title) + '</span></label><button onclick="removeCheck(' + idx + ')" class="text-textSecondary hover:text-dangerRed" aria-label="Remove step">&times;</button>';
    c.appendChild(row);
  });
}
function toggleCheck(idx, done) { sessionChecklist[idx].done = done; syncChecklistToTask(); }
function removeCheck(idx) { sessionChecklist.splice(idx, 1); syncChecklistToTask(); renderDeepWorkChecklist(); }
function addDeepWorkChecklist() {
  const input = $('dw-new-check-input'); if (!input.value.trim()) return;
  sessionChecklist.push({ title: input.value.trim(), done: false }); input.value = ''; syncChecklistToTask(); renderDeepWorkChecklist();
}
function saveSessionNotesDraft() { localStorage.setItem('deadlineos_session_notes', $('dw-session-notes').value); }
function renderParkingLot() {
  const c = $('parking-lot-items'); if (!c) return; c.innerHTML = '';
  if (!distractionParkingLot.length) { c.innerHTML = '<div class="text-xs text-textSecondary italic">Parking lot is clear.</div>'; return; }
  distractionParkingLot.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-bgDark p-2 rounded-lg border border-white/5';
    row.innerHTML = '<span>' + escapeHTML(item.text) + ' <span class="text-[10px] text-textSecondary">(' + escapeHTML(item.time || '') + ')</span></span><button onclick="removeParking(' + idx + ')" class="text-textSecondary hover:text-white" aria-label="Remove">&times;</button>';
    c.appendChild(row);
  });
}
function removeParking(idx) { distractionParkingLot.splice(idx, 1); localStorage.setItem('orbitos_parking_lot', JSON.stringify(distractionParkingLot)); renderParkingLot(); }
function parkThought() {
  const input = $('parking-input'); if (!input.value.trim()) return;
  distractionParkingLot.push({ text: input.value.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  input.value = ''; localStorage.setItem('orbitos_parking_lot', JSON.stringify(distractionParkingLot)); renderParkingLot(); showToast('Thought parked safely.', 'success');
}

/* ============ TIMER ============ */
function setTimerPreset(mode) {
  timerMode = mode;
  if (isTimerRunning) { isTimerRunning = false; clearInterval(timerInterval); }
  const presets = { quick: 25, deep: 50, extended: 90, stopwatch: 0 };
  ['quick', 'deep', 'extended', 'stopwatch'].forEach(m => {
    const btn = $('preset-' + m);
    if (btn) btn.className = m === mode ? 'px-4 py-2 rounded-xl text-xs font-bold transition bg-neonViolet text-white' : 'px-4 py-2 rounded-xl text-xs font-bold transition text-textSecondary hover:text-white';
  });
  totalSeconds = presets[mode] * 60; remainingSeconds = totalSeconds;
  $('timer-status-text').textContent = mode === 'stopwatch' ? 'Stopwatch' : 'Ready';
  updateTimerDisplay(); localStorage.removeItem(TIMER_KEY);
}
function applyCustomDuration() {
  const v = parseInt($('dw-custom-mins').value, 10);
  if (!v || v < 1 || v > 240) { showToast('Enter minutes between 1 and 240.', 'error'); return; }
  timerMode = 'custom';
  totalSeconds = v * 60; remainingSeconds = totalSeconds;
  ['quick', 'deep', 'extended', 'stopwatch'].forEach(m => { const b = $('preset-' + m); if (b) b.className = 'px-4 py-2 rounded-xl text-xs font-bold transition text-textSecondary hover:text-white'; });
  $('timer-status-text').textContent = 'Ready'; updateTimerDisplay(); localStorage.removeItem(TIMER_KEY);
  showToast('Custom session: ' + v + ' minutes.', 'success');
}
function toggleTimer() { if (isTimerRunning) pauseTimer(); else startTimer(); }
function startTimer() {
  isTimerRunning = true;
  $('timer-btn-text').textContent = 'Pause'; $('timer-status-text').textContent = timerMode === 'break' ? 'Break' : 'In Progress';
  if (timerMode !== 'stopwatch') timerTargetTime = Date.now() + remainingSeconds * 1000;
  persistTimerState();
  timerInterval = setInterval(() => {
    if (timerMode === 'stopwatch') { remainingSeconds++; updateTimerDisplay(); if (remainingSeconds % 15 === 0) persistTimerState(); }
    else {
      remainingSeconds = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000)); updateTimerDisplay();
      if (remainingSeconds <= 0) { if (timerMode === 'break') endBreak(); else completeFocusSession(); }
    }
  }, 1000);
}
function pauseTimer() { isTimerRunning = false; clearInterval(timerInterval); persistTimerState(); $('timer-btn-text').textContent = 'Resume'; $('timer-status-text').textContent = timerMode === 'break' ? 'Break Paused' : 'Paused'; }
function resetTimer() {
  if (isTimerRunning) { isTimerRunning = false; clearInterval(timerInterval); }
  localStorage.removeItem(TIMER_KEY);
  remainingSeconds = totalSeconds > 0 ? totalSeconds : 0;
  $('timer-btn-text').textContent = 'Start Focus'; $('timer-status-text').textContent = timerMode === 'stopwatch' ? 'Stopwatch' : 'Ready';
  updateTimerDisplay();
}
function persistTimerState() {
  localStorage.setItem(TIMER_KEY, JSON.stringify({ mode: timerMode, total: totalSeconds, target: timerMode !== 'stopwatch' && isTimerRunning ? timerTargetTime : null, elapsed: timerMode === 'stopwatch' ? remainingSeconds : (totalSeconds - remainingSeconds), running: isTimerRunning, taskId: currentFocusId || null, savedAt: Date.now() }));
}
function recoverActiveTimer() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null'); } catch (e) { saved = null; }
  if (!saved) return;
  if (saved.taskId && assignments.some(a => a.id === saved.taskId)) currentFocusId = saved.taskId;
  timerMode = saved.mode || 'quick';
  totalSeconds = saved.total || 1500;
  if (timerMode === 'stopwatch') {
    remainingSeconds = saved.elapsed || 0;
    if (saved.running) { remainingSeconds += Math.floor((Date.now() - (saved.savedAt || Date.now())) / 1000); startTimer(); showToast('Recovered running stopwatch.', 'success'); }
    else { updateTimerDisplay(); $('timer-btn-text').textContent = 'Resume'; $('timer-status-text').textContent = 'Paused'; }
  } else if (saved.running && saved.target) {
    remainingSeconds = Math.max(0, Math.ceil((saved.target - Date.now()) / 1000));
    if (remainingSeconds > 0) { timerTargetTime = saved.target; startTimer(); showToast(timerMode === 'break' ? 'Restored running break.' : 'Restored active Deep Work session.', 'success'); }
    else {
      if (timerMode === 'break') { showToast('Break finished while you were away.', 'success'); setTimerPreset('quick'); return; }
      const elapsedSec = Math.min(saved.total, Math.floor((saved.savedAt - (saved.target - saved.total * 1000)) / 1000));
      const mins = Math.round(elapsedSec / 60);
      if (mins > 0) { logCompletedSession(mins); showToast('Session ran while tab was closed — ' + mins + 'm credited.', 'success'); }
      setTimerPreset('quick');
    }
  } else {
    remainingSeconds = Math.max(0, saved.total - (saved.elapsed || 0));
    updateTimerDisplay();
    if (remainingSeconds > 0) { $('timer-btn-text').textContent = 'Resume'; $('timer-status-text').textContent = timerMode === 'break' ? 'Break Paused' : 'Paused'; }
  }
}
function completeFocusSession() {
  if (isTimerRunning) { isTimerRunning = false; clearInterval(timerInterval); }
  localStorage.removeItem(TIMER_KEY);
  playChime();
  notifySessionEnd('Focus session complete', 'Great work. Time for a break.');
  const workedMins = Math.round(totalSeconds / 60);
  logCompletedSession(workedMins); showSessionSummary(workedMins);
  remainingSeconds = totalSeconds;
  $('timer-btn-text').textContent = 'Start Focus'; $('timer-status-text').textContent = 'Ready';
  updateTimerDisplay();
}
function endBreak() {
  if (isTimerRunning) { isTimerRunning = false; clearInterval(timerInterval); }
  localStorage.removeItem(TIMER_KEY);
  playChime();
  notifySessionEnd('Break over', 'Back to focus — pick up where you left off.');
  setTimerPreset('quick');
  showToast('Break finished — ready for another session?', 'success');
}
function finishSessionEarly() {
  if (timerMode === 'break') { endBreak(); return; }
  const workedMins = timerMode === 'stopwatch' ? Math.round(remainingSeconds / 60) : Math.round((totalSeconds - remainingSeconds) / 60);
  if (isTimerRunning) { isTimerRunning = false; clearInterval(timerInterval); }
  localStorage.removeItem(TIMER_KEY);
  if (workedMins > 0) { logCompletedSession(workedMins); showSessionSummary(workedMins); }
  else showToast('No focus time recorded yet.', 'warning');
  remainingSeconds = totalSeconds > 0 ? totalSeconds : 0;
  $('timer-btn-text').textContent = 'Start Focus'; $('timer-status-text').textContent = timerMode === 'stopwatch' ? 'Stopwatch' : 'Ready';
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const m = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const s = (remainingSeconds % 60).toString().padStart(2, '0');
  $('timer-display').textContent = m + ':' + s;
  const r = $('timer-ring');
  if (r) r.style.strokeDashoffset = totalSeconds > 0 ? 289.02 - (remainingSeconds / totalSeconds) * 289.02 : 0;
}
function toggleFullscreen() { const ws = $('deep-work-workspace'); if (!document.fullscreenElement) { if (ws.requestFullscreen) ws.requestFullscreen().catch(() => {}); } else document.exitFullscreen(); }
function logCompletedSession(mins) {
  if (mins <= 0) return;
  stats.focusMinutes = (stats.focusMinutes || 0) + mins;
  stats.sessions.push({ date: todayKey(), duration: mins, taskId: currentFocusId, notes: $('dw-session-notes').value.trim(), parked: distractionParkingLot.map(p => p.text) });
  saveData(); updateStudyTodayNav();
}
function showSessionSummary(mins) {
  $('summary-time').textContent = mins + ' mins';
  const task = assignments.find(a => a.id === currentFocusId);
  $('summary-task').textContent = task ? task.title : 'General Session';
  syncChecklistToTask();
  const done = sessionChecklist.filter(s => s.done).length;
  $('summary-checklist').textContent = done + '/' + sessionChecklist.length + ' steps';
  $('session-summary-modal').classList.remove('hidden');
}
function startBreakAfterSession() { $('session-summary-modal').classList.add('hidden'); timerMode = 'break'; totalSeconds = settings.shortBreak * 60; remainingSeconds = totalSeconds; $('timer-status-text').textContent = 'Short Break'; updateTimerDisplay(); startTimer(); showToast('Short break started (' + settings.shortBreak + 'm).', 'success'); }
function startLongBreakAfterSession() { $('session-summary-modal').classList.add('hidden'); timerMode = 'break'; totalSeconds = settings.longBreak * 60; remainingSeconds = totalSeconds; $('timer-status-text').textContent = 'Long Break'; updateTimerDisplay(); startTimer(); showToast('Long break started (' + settings.longBreak + 'm).', 'success'); }
function closeSummaryAndContinue() { $('session-summary-modal').classList.add('hidden'); resetTimer(); }
function closeSummaryAndHome() { $('session-summary-modal').classList.add('hidden'); resetTimer(); switchTab('home'); }
function notifySessionEnd(title, body) { if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body: body }); } catch (e) {} } }
function toggleNotifSetting(e) {
  if (!e.target.checked) return;
  if (!('Notification' in window)) { e.target.checked = false; showToast('Notifications not supported in this browser.', 'error'); return; }
  Notification.requestPermission().then(p => { if (p !== 'granted') { e.target.checked = false; showToast('Notification permission denied.', 'error'); } });
}
function updateDurationSetting(e, key) { const v = parseFloat(e.target.value); if (isNaN(v) || v < 1) { showToast('Enter a valid number of minutes.', 'error'); e.target.value = settings[key]; return; } settings[key] = v; saveData(); showToast('Break duration updated.', 'success'); }

/* ============ AUDIO ============ */
function setSound(type) {
  activeSound = type;
  ['silence', 'rain', 'brown', 'white'].forEach(s => { const b = $('sound-' + s); if (b) b.className = s === type ? 'px-3 py-1.5 rounded-lg bg-bgDark text-xs font-semibold text-neonCyan border border-neonCyan/30' : 'px-3 py-1.5 rounded-lg bg-bgDark text-xs font-semibold text-textSecondary hover:text-white'; });
  if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode = null; }
  if (type === 'silence') { if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; } return; }
  try {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const bufSize = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const out = buf.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') { out[i] = white * 0.05; }
      else { out[i] = (lastOut + 0.02 * white) / 1.02; lastOut = out[i]; out[i] *= (type === 'brown' ? 3.5 : 2.5); }
    }
    noiseNode = audioCtx.createBufferSource(); noiseNode.buffer = buf; noiseNode.loop = true;
    const gain = audioCtx.createGain(); gain.gain.value = 0.25;
    noiseNode.connect(gain); gain.connect(audioCtx.destination); noiseNode.start();
    showToast('Ambient ' + type + ' sound active.', 'success');
  } catch (e) { showToast('Audio initialization failed.', 'error'); }
}
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.start(); o.stop(ctx.currentTime + 1.2);
    setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1500);
  } catch (e) {}
}

/* ============ RENDERING ============ */
function getSortedAssignments() {
  const now = Date.now();
  return assignments.filter(a => !a.completed).map(task => {
    const due = dueDateObject(task);
    const dueTime = due ? due.getTime() : now;
    const hoursUntilDue = Math.max(0.1, (dueTime - now) / 3600000);
    return { ...task, score: (task.duration / hoursUntilDue) * (task.priority || 2), overdue: dueTime < now };
  }).sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return b.score - a.score;
  });
}
function renderAll() { renderHome(); renderAssignments(); renderDailyStudyPlan(); renderWeeklyWorkload(); updateStudyInsights(); populateDeepWorkTaskSelector(); }
function renderHome() {
  const sorted = getSortedAssignments();
  const top = sorted[0];
  topTaskId = top ? top.id : null;
  const startBtn = $('start-focus-btn'), viewBtn = $('view-task-btn');
  if (top) {
    $('next-title').textContent = top.title; $('next-subject').textContent = top.subject; $('next-duration').textContent = top.duration + ' hrs'; $('next-duedate').textContent = formatDue(top);
    const badge = dueBadge(top);
    $('next-countdown').textContent = top.overdue ? 'OVERDUE' : badge.label;
    $('next-countdown').className = 'font-display text-sm font-bold ' + (top.overdue ? 'text-dangerRed' : 'text-textPrimary');
    $('next-reason').textContent = top.overdue ? 'This is overdue — clear it now to get back on track.' : 'Highest urgency in your backlog right now.';
    startBtn.disabled = false; startBtn.classList.remove('opacity-50', 'cursor-not-allowed'); viewBtn.disabled = false;
  } else {
    $('next-title').textContent = 'No active assignments'; $('next-subject').textContent = 'CLEAR'; $('next-duration').textContent = '--'; $('next-duedate').textContent = '--';
    $('next-countdown').textContent = '--'; $('next-countdown').className = 'font-display text-sm font-bold text-textPrimary';
    $('next-reason').textContent = 'Add homework to initialize your study scheduler.';
    startBtn.disabled = true; startBtn.classList.add('opacity-50', 'cursor-not-allowed'); viewBtn.disabled = true;
  }
  renderHomeStats(); renderHomeQueue(); lucide.createIcons();
}
function renderHomeStats() {
  const active = assignments.filter(a => !a.completed);
  const overdue = active.filter(a => { const d = dueDateObject(a); return d && d < new Date(); });
  const dueToday = active.filter(a => dueDateKey(a) === todayKey());
  const weekMins = (stats.sessions || []).filter(s => s.date >= localDateKey(addDays(new Date(), -6))).reduce((acc, s) => acc + s.duration, 0);
  const items = [
    { label: 'Active', value: active.length, cls: 'text-neonCyan' },
    { label: 'Overdue', value: overdue.length, cls: overdue.length ? 'text-dangerRed' : 'text-textPrimary' },
    { label: 'Due today', value: dueToday.length, cls: dueToday.length ? 'text-statusWarning' : 'text-textPrimary' },
    { label: 'Studied (7d)', value: (Math.round(weekMins / 6) / 10) + 'h', cls: 'text-neonViolet' }
  ];
  $('home-stats-row').innerHTML = items.map(i => '<div class="glass-panel p-4 rounded-xl"><div class="text-[10px] uppercase tracking-wider text-textSecondary">' + i.label + '</div><div class="font-display text-xl font-bold ' + i.cls + '">' + i.value + '</div></div>').join('');
}
function renderHomeQueue() {
  const c = $('home-queue-list'); c.innerHTML = '';
  const sorted = getSortedAssignments().slice(0, 5);
  if (!sorted.length) { c.innerHTML = '<div class="text-xs text-textSecondary italic py-4">Nothing coming up. Add an assignment to get started.</div>'; return; }
  sorted.forEach(task => {
    const badge = dueBadge(task);
    const item = document.createElement('div');
    item.className = 'p-3 rounded-xl bg-bgDark border border-white/5 flex justify-between items-center gap-3';
    item.innerHTML = '<div onclick="openAssignmentDetail(\'' + escapeHTML(task.id) + '\')" class="cursor-pointer flex-1 min-w-0"><div class="font-semibold text-sm truncate">' + escapeHTML(task.title) + '</div><div class="text-xs text-textSecondary">' + escapeHTML(task.subject) + ' &bull; ' + task.duration + 'h est.</div></div><span class="text-[10px] px-2 py-1 rounded-lg border shrink-0 ' + badge.cls + '">' + badge.label + '</span><button onclick="toggleComplete(\'' + escapeHTML(task.id) + '\')" class="p-2 rounded-lg bg-elevatedDark hover:bg-neonGreen/20 text-neonGreen transition shrink-0" aria-label="Complete"><i data-lucide="check" class="w-4 h-4"></i></button>';
    c.appendChild(item);
  });
  lucide.createIcons();
}
function renderDailyStudyPlan() {
  const c = $('today-study-plan-list'); c.innerHTML = '';
  const sorted = getSortedAssignments();
  if (!sorted.length) { c.innerHTML = '<div class="text-xs text-textSecondary italic">No study blocks needed today.</div>'; return; }
  let hour = Math.max(16, new Date().getHours() + 1);
  sorted.slice(0, 3).forEach(task => {
    const start = hour; hour += Math.ceil(task.duration);
    const row = document.createElement('div');
    row.className = 'p-3 rounded-xl bg-bgDark border border-white/5 flex justify-between items-center';
    row.innerHTML = '<div><div class="font-bold text-textPrimary">' + escapeHTML(task.title) + '</div><div class="text-[10px] text-textSecondary">' + start + ':00 – ' + hour + ':00 &bull; ' + escapeHTML(task.subject) + '</div></div><button onclick="quickStartTask(\'' + escapeHTML(task.id) + '\')" class="px-2.5 py-1 rounded-lg bg-neonViolet/20 text-neonViolet font-bold text-[10px] hover:bg-neonViolet hover:text-white transition">Start</button>';
    c.appendChild(row);
  });
}
function renderWeeklyWorkload() {
  const c = $('weekly-workload'); if (!c) return;
  const active = assignments.filter(a => !a.completed);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = addDays(new Date(), i); days.push({ key: localDateKey(d), label: 'SMTWTFS'[d.getDay()], count: active.filter(a => dueDateKey(a) === localDateKey(d)).length }); }
  const max = Math.max(1, ...days.map(d => d.count));
  c.innerHTML = days.map(d => '<div class="flex-1 flex flex-col items-center justify-end gap-1" title="' + d.count + ' deadline(s)"><div class="w-full rounded-t-md ' + (d.count ? 'bg-neonViolet/70' : 'bg-white/5') + '" style="height:' + Math.max(8, (d.count / max) * 48) + 'px"></div><span class="text-[9px] ' + (d.key === todayKey() ? 'text-neonCyan font-bold' : 'text-textSecondary') + '">' + d.label + '</span></div>').join('');
}
function renderWeeklyCalendar() {
  const grid = $('weekly-calendar-grid'); grid.innerHTML = '';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = addDays(new Date(), i);
    const key = localDateKey(d);
    const dayTasks = assignments.filter(a => !a.completed && dueDateKey(a) === key);
    const col = document.createElement('div');
    col.className = 'glass-panel p-3 rounded-2xl border border-white/5 space-y-2 min-h-[140px]' + (i === 0 ? ' border-neonCyan/40' : '');
    col.innerHTML = '<div class="font-bold text-xs ' + (i === 0 ? 'text-neonCyan' : 'text-textPrimary') + ' border-b border-white/5 pb-1">' + names[d.getDay()] + ' ' + d.getDate() + (i === 0 ? ' • Today' : '') + '</div><div class="space-y-1">' + (dayTasks.length === 0 ? '<div class="text-[10px] text-textSecondary italic">No deadlines</div>' : dayTasks.map(t => '<div onclick="openAssignmentDetail(\'' + escapeHTML(t.id) + '\')" class="p-1.5 rounded bg-bgDark text-[10px] text-textPrimary cursor-pointer hover:border-neonViolet border border-transparent truncate" title="' + escapeHTML(t.title) + '">' + escapeHTML(t.title) + '</div>').join('') + (dayTasks.length ? '<div class="text-[9px] text-textSecondary pt-0.5">' + dayTasks.reduce((a, t) => a + (t.duration || 0), 0) + 'h estimated</div>' : '')) + '</div>';
    grid.appendChild(col);
  }
}
function renderAssignments() {
  const container = $('full-assignment-list');
  const search = $('search-input').value.toLowerCase();
  const statusFilter = $('filter-status').value;
  const sortBy = $('sort-by').value;
  let filtered = assignments.filter(a => {
    const ms = a.title.toLowerCase().includes(search) || a.subject.toLowerCase().includes(search);
    const mst = statusFilter === 'all' || (statusFilter === 'active' && !a.completed) || (statusFilter === 'completed' && a.completed);
    return ms && mst;
  });
  filtered.sort((a, b) => {
    if (sortBy === 'dueDate') { const da = dueDateObject(a), db = dueDateObject(b); return (da ? da.getTime() : Infinity) - (db ? db.getTime() : Infinity); }
    if (sortBy === 'priority') return (b.priority || 2) - (a.priority || 2);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    const urgencyOrder = getSortedAssignments();
    return urgencyOrder.findIndex(x => x.id === a.id) - urgencyOrder.findIndex(x => x.id === b.id);
  });
  if (!filtered.length) { container.innerHTML = '<div class="glass-panel text-center py-12 text-textSecondary text-sm">No matching assignments found. Add one to get started.</div>'; return; }
  container.innerHTML = '';
  filtered.forEach(task => {
    const badge = dueBadge(task);
    const card = document.createElement('div');
    card.className = 'glass-panel p-5 rounded-2xl border border-white/5 space-y-3' + (task.completed ? ' opacity-50 grayscale' : '');
    card.innerHTML = '<div class="flex justify-between items-start gap-3"><div class="space-y-1 cursor-pointer min-w-0" onclick="openAssignmentDetail(\'' + escapeHTML(task.id) + '\')"><div class="flex items-center gap-2 flex-wrap"><span class="text-[10px] px-2 py-0.5 rounded bg-bgDark text-neonCyan font-medium border border-neonCyan/20">' + escapeHTML(task.subject) + '</span><h4 class="font-bold text-base ' + (task.completed ? 'line-through' : '') + '">' + escapeHTML(task.title) + '</h4><span class="text-[10px] px-2 py-0.5 rounded-lg border ' + badge.cls + '">' + badge.label + '</span></div><div class="text-xs text-textSecondary">Due: ' + formatDue(task) + ' &bull; ' + task.duration + ' hrs &bull; Priority: ' + (task.priority === 3 ? 'High' : task.priority === 2 ? 'Medium' : 'Low') + '</div></div><div class="flex items-center gap-2 shrink-0"><button onclick="editAssignment(\'' + escapeHTML(task.id) + '\')" class="p-2 rounded-xl bg-bgDark hover:border-neonCyan text-textSecondary hover:text-white transition border border-white/5" aria-label="Edit"><i data-lucide="edit-3" class="w-4 h-4"></i></button><button onclick="toggleComplete(\'' + escapeHTML(task.id) + '\')" class="p-2 rounded-xl bg-bgDark hover:border-neonGreen text-neonGreen transition border border-white/5" aria-label="Toggle complete"><i data-lucide="' + (task.completed ? 'rotate-ccw' : 'check') + '" class="w-4 h-4"></i></button><button onclick="deleteAssignment(\'' + escapeHTML(task.id) + '\')" class="p-2 rounded-xl bg-bgDark hover:border-dangerRed text-textSecondary hover:text-dangerRed transition border border-white/5" aria-label="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
    container.appendChild(card);
  });
  lucide.createIcons();
}
function openAssignmentDetail(id) {
  const task = assignments.find(a => a.id === id); if (!task) return;
  $('detail-title').textContent = task.title;
  const badge = dueBadge(task);
  const subtasks = (task.subtasks || []).map((st, i) => '<label class="flex items-center gap-2 p-2 rounded-lg bg-bgDark text-xs"><input type="checkbox" ' + (st.done ? 'checked' : '') + ' onchange="toggleSubtask(\'' + escapeHTML(task.id) + '\',' + i + ', this.checked)" class="accent-neonCyan"><span class="' + (st.done ? 'line-through text-textSecondary' : 'text-textPrimary') + '">' + escapeHTML(st.title) + '</span></label>').join('') || '<div class="text-xs text-textSecondary italic">No checklist items.</div>';
  $('detail-content').innerHTML = '<div class="space-y-3"><div class="flex justify-between items-center"><span class="text-xs px-2.5 py-1 rounded-lg border ' + badge.cls + '">' + badge.label + '</span><span class="text-xs text-textSecondary">Priority: ' + (task.priority === 3 ? 'High' : task.priority === 2 ? 'Medium' : 'Low') + '</span></div><div><div class="text-textSecondary text-xs mb-1">Subject</div><div class="font-bold">' + escapeHTML(task.subject) + '</div></div><div><div class="text-textSecondary text-xs mb-1">Due Date</div><div class="font-bold">' + formatDue(task) + '</div></div><div><div class="text-textSecondary text-xs mb-1">Est. Duration</div><div class="font-bold">' + task.duration + ' hrs</div></div><div><div class="text-textSecondary text-xs mb-1">Checklist</div><div class="space-y-1.5">' + subtasks + '</div></div><div><div class="text-textSecondary text-xs mb-1">Instructions / Notes</div><div class="p-3 rounded-xl bg-bgDark mt-1 text-xs text-textSecondary whitespace-pre-line">' + escapeHTML(task.notes || 'None') + '</div></div><div class="flex gap-2 pt-2"><button onclick="toggleModal(\'detail-modal\'); editAssignment(\'' + escapeHTML(task.id) + '\')" class="flex-1 py-2 rounded-xl bg-elevatedDark border border-white/10 text-xs font-bold hover:text-white">Edit Assignment</button><button onclick="toggleModal(\'detail-modal\'); quickStartTask(\'' + escapeHTML(task.id) + '\')" class="flex-1 py-2 rounded-xl bg-neonViolet text-xs font-bold text-white">Start Deep Work</button></div></div>';
  $('detail-modal').classList.remove('hidden');
}
function toggleSubtask(taskId, idx, done) {
  const task = assignments.find(a => a.id === taskId);
  if (task && task.subtasks && task.subtasks[idx]) { task.subtasks[idx].done = done; saveData(); if (currentFocusId === taskId) { sessionChecklist = task.subtasks.map(st => ({ ...st })); renderDeepWorkChecklist(); } }
}

/* ============ ASSIGNMENT CRUD ============ */
function handleSaveAssignment(e) {
  e.preventDefault();
  const editId = $('form-edit-id').value;
  const title = $('form-title').value.trim();
  const subject = $('form-subject').value.trim();
  const priority = parseInt($('form-priority').value, 10);
  const dueDate = $('form-duedate').value;
  const duration = parseFloat($('form-duration').value);
  const notes = $('form-notes').value.trim();
  if (!title || !subject || !dueDate || isNaN(duration) || duration <= 0) { showToast('Please fill in all required fields correctly.', 'error'); return; }
  if (editId) {
    assignments = assignments.map(a => a.id === editId ? { ...a, title, subject, priority, dueDate, duration, notes } : a);
    showToast('Assignment updated!', 'success');
  } else {
    const steps = notes.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(l => l.length > 2);
    assignments.push({ id: genId(), title, subject, priority, dueDate, duration, notes, completed: false, subtasks: steps.map(t => ({ title: t, done: false })) });
    showToast('Assignment added!', 'success');
  }
  saveData(); toggleModal('add-modal'); renderAll();
}
function editAssignment(id) {
  const task = assignments.find(a => a.id === id); if (!task) return;
  $('form-edit-id').value = task.id; $('form-title').value = task.title; $('form-subject').value = task.subject;
  $('form-priority').value = task.priority; $('form-duedate').value = task.dueDate; $('form-duration').value = task.duration; $('form-notes').value = task.notes || '';
  $('modal-title').textContent = 'Edit Assignment';
  $('add-modal').classList.remove('hidden');
}
function toggleComplete(id) { const task = assignments.find(a => a.id === id); if (!task) return; task.completed = !task.completed; if (task.completed) showToast('Completed: ' + task.title, 'success'); saveData(); renderAll(); }
function deleteAssignment(id) {
  const idx = assignments.findIndex(a => a.id === id); if (idx === -1) return;
  const task = assignments[idx];
  if (!confirm('Delete "' + task.title + '"? You can undo right after.')) return;
  lastDeleted = { task: task, idx: idx };
  assignments.splice(idx, 1);
  saveData(); renderAll();
  showToast('Assignment deleted.', 'warning', { label: 'Undo', fn: restoreDeleted });
}
function restoreDeleted() {
  if (!lastDeleted) return;
  assignments.splice(Math.min(lastDeleted.idx, assignments.length), 0, lastDeleted.task);
  lastDeleted = null;
  saveData(); renderAll();
  showToast('Deletion undone.', 'success');
}
function applyEssayTemplate() { $('form-notes').value = 'Essay Template:\n- Outline & Thesis\n- First Draft\n- Revision & Editing\n- Final Proofread'; showToast('Applied essay subtask template.', 'success'); }
function quickStartTask(id) { currentFocusId = id; localStorage.setItem('deadlineos_focus_task', id); switchTab('focus'); selectDeepWorkTask(id); }
function startDeepWorkOnTopTask() { if (topTaskId) quickStartTask(topTaskId); }
function viewTopTaskDetails() { if (topTaskId) openAssignmentDetail(topTaskId); }

/* ============ SCREENSHOT SCANNING ============ */
async function handleOCRFileUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const status = $('ocr-progress-status'), barWrap = $('ocr-progress-bar-wrap'), bar = $('ocr-progress-bar');
  status.classList.remove('hidden'); barWrap.classList.remove('hidden'); status.textContent = 'Scanning screenshot...';
  try {
    const worker = await Tesseract.createWorker('eng');
    const result = await worker.recognize(file, {}, m => { if (m.status === 'recognizing text' && m.progress) bar.style.width = Math.round(m.progress * 100) + '%'; });
    await worker.terminate();
    bar.style.width = '100%';
    const rawText = (result.data && result.data.text) || '';
    if (!rawText.trim()) { status.textContent = 'No text found in this image.'; showToast('No text detected. Try a clearer screenshot.', 'warning'); return; }
    extractedDraftsCache = parseOCRToAssignments(rawText);
    if (!extractedDraftsCache.length) { status.textContent = 'No assignments detected in this screenshot.'; showToast('No assignments detected. Add manually or try again.', 'warning'); return; }
    $('ocr-modal').classList.add('hidden');
    renderOCRReviewScreen();
    $('ocr-review-modal').classList.remove('hidden');
    showToast('Scanning complete — review before saving.', 'success');
  } catch (err) {
    status.textContent = 'Scanning failed — try again or add manually.';
    bar.style.width = '0%'; showToast('Screenshot scanning failed.', 'error');
  }
}
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MONTH_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
function parseOCRToAssignments(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1);
  const drafts = []; const seen = new Set(); const now = new Date();
  for (const line of lines) {
    if (/^(due|submitted|status|points|grade|category|instructions|description|class|posted|avail|late|available|attempt)/i.test(line)) continue;
    let date = null, time = null;
    let m = line.match(new RegExp('\\b(' + MONTH_RE + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b', 'i'));
    if (m) date = { mo: MONTHS[m[1].toLowerCase().slice(0, 3)], d: +m[2], y: m[3] ? +m[3] : null };
    if (!date) {
      m = line.match(new RegExp('\\b(\\d{1,2})\\s+(' + MONTH_RE + ')\\.?(?:,?\\s*(\\d{4}))?\\b', 'i'));
      if (m) date = { mo: MONTHS[m[2].toLowerCase().slice(0, 3)], d: +m[1], y: m[3] ? +m[3] : null };
    }
    if (!date) { m = line.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/); if (m) date = { mo: +m[2], d: +m[1], y: m[3] ? +m[3] : null }; }
    if (!date) { m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); if (m) date = { y: +m[1], mo: +m[2], d: +m[3] }; }
    if (date) {
      m = line.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
      if (m) {
        let h = +m[1];
        if (m[3] && m[3].toLowerCase() === 'pm' && h < 12) h += 12;
        if (m[3] && m[3].toLowerCase() === 'am' && h === 12) h = 0;
        time = { h: h, mi: +m[2] };
      }
    }
    let title = line;
    let subject = 'General';
    const sm = line.match(/\b(math(?:ematics)?|calc(?:ulus)?|bio(?:logy)?|chem(?:istry)?|physic(?:s)?|history|english|lit(?:erature)?|geography|computer science|economics|psych(?:ology)?|french|spanish|german|latin|science)\b/i);
    if (sm) subject = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
    if (date) {
      title = line.replace(new RegExp('\\b(' + MONTH_RE + ')(\\.?[\\s,]*\\d{1,2}(st|nd|rd|th)?(,?\\s*\\d{4})?)?\\b', 'i'), ' ');
      title = title.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ');
      title = title.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi, ' ').replace(/[-–—:]\s*$/, ' ').replace(/\s{2,}/g, ' ').trim();
    }
    if (!title || title.length < 3) title = 'Scanned Assignment';
    if (title.length > 80) title = title.slice(0, 80).trim();
    const dupKey = title.toLowerCase().replace(/\s+/g, '');
    if (seen.has(dupKey)) continue;
    if (assignments.some(a => a.title.toLowerCase().replace(/\s+/g, '') === dupKey)) continue;
    seen.add(dupKey);
    let dueDateValue = null;
    if (date) {
      let y = date.y || now.getFullYear();
      if (!date.y) { const cand = new Date(y, date.mo - 1, date.d); if (cand < addDays(now, -30)) y++; }
      dueDateValue = y + '-' + String(date.mo).padStart(2, '0') + '-' + String(date.d).padStart(2, '0') + 'T' + String(time ? time.h : 23).padStart(2, '0') + ':' + String(time ? time.mi : 59).padStart(2, '0');
    }
    drafts.push({ title: title, subject: subject, dueDate: dueDateValue, duration: 1, priority: 2, notes: line, uncertain: !date || !time, selected: true });
  }
  return drafts;
}
function renderOCRReviewScreen() {
  const container = $('ocr-drafts-list'); container.innerHTML = '';
  if (!extractedDraftsCache.length) { container.innerHTML = '<div class="text-xs text-textSecondary italic py-4">No drafts to review.</div>'; return; }
  extractedDraftsCache.forEach((draft, idx) => {
    const row = document.createElement('div');
    row.className = 'glass-panel p-4 rounded-2xl border border-neonCyan/30 space-y-3' + (draft.selected ? '' : ' opacity-60');
    row.innerHTML = '<div class="flex items-center justify-between"><div class="flex items-center gap-3"><input type="checkbox" ' + (draft.selected ? 'checked' : '') + ' onchange="extractedDraftsCache[' + idx + '].selected = this.checked; renderOCRReviewScreen()" class="accent-neonCyan"><span class="text-xs font-bold text-neonCyan uppercase">Draft ' + (idx + 1) + '</span>' + (draft.uncertain ? '<span class="text-[10px] px-2 py-0.5 rounded bg-statusWarning/15 border border-statusWarning/40 text-statusWarning">Check fields</span>' : '') + '</div><button onclick="extractedDraftsCache.splice(' + idx + ',1); renderOCRReviewScreen();" class="text-textSecondary hover:text-dangerRed text-xs">Remove</button></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><div class="sm:col-span-2"><label class="block text-textSecondary mb-1">Title</label><input type="text" value="' + escapeHTML(draft.title) + '" onchange="extractedDraftsCache[' + idx + '].title = this.value" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary"></div><div><label class="block text-textSecondary mb-1">Subject</label><input type="text" value="' + escapeHTML(draft.subject) + '" onchange="extractedDraftsCache[' + idx + '].subject = this.value" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary"></div><div><label class="block text-textSecondary mb-1">Due Date &amp; Time</label><input type="datetime-local" value="' + escapeHTML(draft.dueDate || '') + '" onchange="extractedDraftsCache[' + idx + '].dueDate = this.value" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary"></div></div><div class="text-[10px] text-textSecondary">' + (draft.dueDate ? 'Date extracted from screenshot' : 'No date detected — set it before saving') + '</div>';
    container.appendChild(row);
  });
}
function commitSelectedDrafts() {
  const chosen = extractedDraftsCache.filter(d => d.selected);
  if (!chosen.length) { showToast('No drafts selected.', 'warning'); return; }
  let added = 0; let missingDate = false;
  chosen.forEach(d => {
    if (!d.title.trim()) return;
    if (!d.dueDate) { missingDate = true; return; }
    assignments.push({ id: genId(), title: d.title.trim(), subject: d.subject.trim() || 'General', priority: 2, dueDate: d.dueDate, duration: 1, notes: d.notes, completed: false, subtasks: [] });
    added++;
  });
  if (missingDate) { showToast('Some drafts have no due date — set them first.', 'error'); if (!added) return; }
  if (added) {
    saveData(); extractedDraftsCache = [];
    $('ocr-review-modal').classList.add('hidden');
    renderAll();
    showToast(added + ' assignment' + (added > 1 ? 's' : '') + ' imported!', 'success');
  }
}

/* ============ COMMAND PALETTE ============ */
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

/* ============ BACKUP ============ */
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
function updateStudyInsights() {
  const totalMins = stats.focusMinutes || 0;
  const weekMins = (stats.sessions || []).filter(s => s.date >= localDateKey(addDays(new Date(), -6))).reduce((acc, s) => acc + s.duration, 0);
  $('insight-time').textContent = Math.floor(totalMins / 60) + 'h ' + (totalMins % 60) + 'm';
  $('insight-week').textContent = Math.floor(weekMins / 60) + 'h ' + (weekMins % 60) + 'm';
  $('insight-completed').textContent = assignments.filter(a => a.completed).length;
  checkBackupReminder();
}
function updateCapacitySetting(e) { const v = parseFloat(e.target.value); if (isNaN(v) || v <= 0) { showToast('Enter a valid capacity.', 'error'); e.target.value = settings.capacity; return; } settings.capacity = v; saveData(); showToast('Capacity updated.', 'success'); }

/* ============ PARTICLES (base fallback; fx.js upgrades to constellations) ============ */
function initParticles() {
  const canvas = $('particle-canvas');
  if (!canvas || !canvas.getContext) return;
  if (particleEngine) { particleEngine.stop(); particleEngine = null; }
  const ctx = canvas.getContext('2d');
  const counts = { performance: 100, balanced: 220, cinematic: 400 };
  const target = counts[settings.particleMode] || counts.balanced;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = [];
  for (let i = 0; i < target; i++) {
    const hx = Math.random() * canvas.width, hy = Math.random() * canvas.height;
    particles.push({ hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, size: Math.random() * 1.8 + 0.6, cyan: Math.random() > 0.4 });
  }
  let mouse = { x: null, y: null }, raf = null, running = true;
  const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  const onMove = ev => { mouse.x = ev.clientX; mouse.y = ev.clientY; };
  const onOut = () => { mouse.x = null; mouse.y = null; };
  function animate() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strength = document.body.classList.contains('focus-dim') ? 1.2 : 4;
    particles.forEach(p => {
      let fx = 0.08 * (p.hx - p.x), fy = 0.08 * (p.hy - p.y);
      if (mouse.x !== null) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14400 && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = ((120 - dist) / 120) * strength * 3;
          fx += (dx / dist) * force; fy += (dy / dist) * force;
        }
      }
      p.vx = (p.vx + fx) * 0.85; p.vy = (p.vy + fy) * 0.85;
      p.x += p.vx; p.y += p.vy;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.cyan ? 'rgba(0, 229, 255, 0.6)' : 'rgba(168, 85, 247, 0.6)'; ctx.fill();
    });
    raf = requestAnimationFrame(animate);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMove);
  document.addEventListener('mouseleave', onOut);
  if (!reduceMotion) { animate(); }
  else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.cyan ? 'rgba(0, 229, 255, 0.6)' : 'rgba(168, 85, 247, 0.6)'; ctx.fill(); });
  }
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