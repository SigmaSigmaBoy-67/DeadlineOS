'use strict';
/* DeadlineOS — Engine Part 2: rendering, assignment CRUD, dashboard */

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
  const task = assignments.find(a => a.id === id); if (!task) return;
  if (confirm('Delete "' + task.title + '"? This cannot be undone.')) { assignments = assignments.filter(a => a.id !== id); saveData(); renderAll(); showToast('Assignment deleted.', 'warning'); }
}
function applyEssayTemplate() { $('form-notes').value = 'Essay Template:\n- Outline & Thesis\n- First Draft\n- Revision & Editing\n- Final Proofread'; showToast('Applied essay subtask template.', 'success'); }
function quickStartTask(id) { currentFocusId = id; localStorage.setItem('deadlineos_focus_task', id); switchTab('focus'); selectDeepWorkTask(id); }
function startDeepWorkOnTopTask() { if (topTaskId) quickStartTask(topTaskId); }
function viewTopTaskDetails() { if (topTaskId) openAssignmentDetail(topTaskId); }
function updateStudyTodayNav() { const m = (stats.sessions || []).filter(s => s.date === todayKey()).reduce((acc, s) => acc + (s.duration || 0), 0); $('nav-today-study').textContent = m + 'm'; }
function updateStudyInsights() {
  const totalMins = stats.focusMinutes || 0;
  const weekMins = (stats.sessions || []).filter(s => s.date >= localDateKey(addDays(new Date(), -6))).reduce((acc, s) => acc + s.duration, 0);
  $('insight-time').textContent = Math.floor(totalMins / 60) + 'h ' + (totalMins % 60) + 'm';
  $('insight-week').textContent = Math.floor(weekMins / 60) + 'h ' + (weekMins % 60) + 'm';
  $('insight-completed').textContent = assignments.filter(a => a.completed).length;
  checkBackupReminder();
}
function checkBackupReminder() {
  const box = $('backup-reminder-box'); if (!box) return;
  if (!stats.lastBackup) { box.textContent = "Reminder: You haven't exported a JSON backup yet."; return; }
  const daysAgo = Math.floor((Date.now() - new Date(stats.lastBackup).getTime()) / 86400000);
  box.textContent = daysAgo > 7 ? 'Reminder: Last backup was ' + daysAgo + ' days ago. Export soon!' : 'Backup status: Up to date.';
}
function updateGreeting() {
  const h = new Date().getHours();
  let g = 'Good evening';
  if (h < 5) g = 'Working late'; else if (h < 12) g = 'Good morning'; else if (h < 18) g = 'Good afternoon';
  $('greeting').textContent = g + '. Ready to make progress?';
}
function updateCapacitySetting(e) { const v = parseFloat(e.target.value); if (isNaN(v) || v <= 0) { showToast('Enter a valid capacity.', 'error'); e.target.value = settings.capacity; return; } settings.capacity = v; saveData(); showToast('Capacity updated.', 'success'); }