'use strict';
/* DeadlineOS — Engine Part 3: Screenshot Scanning (OCR + parsing + review) */

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
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const MONTH_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
function parseOCRToAssignments(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 1);
  const drafts = []; const seen = new Set(); const now = new Date();
  for (const line of lines) {
    if (/^(due|submitted|status|points|grade|category|instructions|description|class|posted|avail|late|available|attempt)/i.test(line)) continue;
    let date = null, time = null;
    let m = line.match(new RegExp('\\b(' + MONTH_RE + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b', 'i'));
    if (m) date = { mo: MONTHS[m[1].toLowerCase().slice(0, 4)] || MONTHS[m[1].toLowerCase().slice(0, 3)], d: +m[2], y: m[3] ? +m[3] : null };
    if (!date) {
      m = line.match(new RegExp('\\b(\\d{1,2})\\s+(' + MONTH_RE + ')\\.?(?:,?\\s*(\\d{4}))?\\b', 'i'));
      if (m) date = { mo: MONTHS[m[2].toLowerCase().slice(0, 4)] || MONTHS[m[2].toLowerCase().slice(0, 3)], d: +m[1], y: m[3] ? +m[3] : null };
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