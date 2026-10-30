'use strict';
/* DeadlineOS — Engine Part 1a: state, storage, date helpers, navigation */
const $ = id => document.getElementById(id);
const TIMER_KEY = 'deadlineos_timer_v1';
const TAB_IDS = ['home', 'assignments', 'focus', 'arena'];

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

/* ---------- Local date helpers (no UTC drift) ---------- */
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

/* ---------- Navigation (home / assignments / deep work / arena) ---------- */
const TAB_INACTIVE = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-textSecondary hover:text-textPrimary whitespace-nowrap transition-all duration-300';
function switchTab(tab) {
  TAB_IDS.forEach(t => {
    const pg = $('page-' + t); if (pg) pg.classList.add('hidden');
    const tb = $('tab-' + t); if (tb) tb.className = TAB_INACTIVE;
  });
  const pg = $('page-' + tab);
  if (pg) pg.classList.remove('hidden');
  const tb = $('tab-' + tab);
  if (tb) {
    const active = tab === 'focus' ? 'bg-neonViolet text-white shadow-lg shadow-neonViolet/20'
      : tab === 'arena' ? 'bg-neonGreen text-bgDark shadow-lg shadow-neonGreen/20'
      : 'bg-neonCyan text-bgDark shadow-lg shadow-neonCyan/20';
    tb.className = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ' + active + ' whitespace-nowrap transition-all duration-300';
  }
  document.body.classList.toggle('focus-dim', tab === 'focus');
  if (tab === 'focus') initDeepWorkWorkspace();
  if (tab === 'arena' && typeof initArena === 'function') initArena();
}
function toggleModal(id) {
  $(id).classList.toggle('hidden');
  if (id === 'add-modal' && !$('add-modal').classList.contains('hidden')) {
    $('assignment-form').reset(); $('form-edit-id').value = ''; $('modal-title').textContent = 'New Assignment';
  }
}
function toggleCalendarModal() { renderWeeklyCalendar(); $('calendar-modal').classList.toggle('hidden'); }
function openOCRModal() { $('ocr-file-input').value = ''; $('ocr-progress-status').classList.add('hidden'); $('ocr-progress-bar-wrap').classList.add('hidden'); $('ocr-progress-bar').style.width = '0%'; toggleModal('ocr-modal'); }