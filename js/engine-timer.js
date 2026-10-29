'use strict';
/* DeadlineOS — Engine Part 1b: Deep Work context, timer, audio */

/* ---------- Deep Work context ---------- */
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

/* ---------- Timer ---------- */
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
  $('timer-btn-text').textContent = 'Pause'; $('timer-status-text').textContent = 'In Progress';
  if (timerMode !== 'stopwatch') timerTargetTime = Date.now() + remainingSeconds * 1000;
  persistTimerState();
  timerInterval = setInterval(() => {
    if (timerMode === 'stopwatch') { remainingSeconds++; updateTimerDisplay(); if (remainingSeconds % 15 === 0) persistTimerState(); }
    else {
      remainingSeconds = Math.max(0, Math.ceil((timerTargetTime - Date.now()) / 1000)); updateTimerDisplay();
      if (remainingSeconds <= 0) completeFocusSession();
    }
  }, 1000);
}
function pauseTimer() { isTimerRunning = false; clearInterval(timerInterval); persistTimerState(); $('timer-btn-text').textContent = 'Resume'; $('timer-status-text').textContent = 'Paused'; }
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
    if (remainingSeconds > 0) { timerTargetTime = saved.target; startTimer(); showToast('Restored active Deep Work session.', 'success'); }
    else {
      const elapsedSec = Math.min(saved.total, Math.floor((saved.savedAt - (saved.target - saved.total * 1000)) / 1000));
      const mins = Math.round(elapsedSec / 60);
      if (mins > 0) { logCompletedSession(mins); showToast('Session ran while tab was closed — ' + mins + 'm credited.', 'success'); }
      resetTimer();
    }
  } else {
    remainingSeconds = Math.max(0, saved.total - (saved.elapsed || 0));
    updateTimerDisplay();
    if (remainingSeconds > 0) { $('timer-btn-text').textContent = 'Resume'; $('timer-status-text').textContent = 'Paused'; }
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
function finishSessionEarly() {
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
function startBreakAfterSession() { $('session-summary-modal').classList.add('hidden'); timerMode = 'break'; totalSeconds = settings.shortBreak * 60; remainingSeconds = totalSeconds; $('timer-status-text').textContent = 'Break'; updateTimerDisplay(); startTimer(); showToast('Short break started (' + settings.shortBreak + 'm).', 'success'); }
function closeSummaryAndContinue() { $('session-summary-modal').classList.add('hidden'); resetTimer(); }
function closeSummaryAndHome() { $('session-summary-modal').classList.add('hidden'); resetTimer(); switchTab('home'); }
function notifySessionEnd(title, body) { if ('Notification' in window && Notification.permission === 'granted') { try { new Notification(title, { body: body }); } catch (e) {} } }
function toggleNotifSetting(e) {
  if (!e.target.checked) return;
  if (!('Notification' in window)) { e.target.checked = false; showToast('Notifications not supported in this browser.', 'error'); return; }
  Notification.requestPermission().then(p => { if (p !== 'granted') { e.target.checked = false; showToast('Notification permission denied.', 'error'); } });
}
function updateDurationSetting(e, key) { const v = parseFloat(e.target.value); if (isNaN(v) || v < 1) { showToast('Enter a valid number of minutes.', 'error'); e.target.value = settings[key]; return; } settings[key] = v; saveData(); showToast('Break duration updated.', 'success'); }

/* ---------- Audio ---------- */
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