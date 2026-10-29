'use strict';
/* DeadlineOS — Modal Layer: injects all dialog markup before the engine boots. */
(function () {
  document.body.insertAdjacentHTML('beforeend', `
  <!-- SESSION SUMMARY MODAL -->
  <div id="session-summary-modal" class="hidden fixed inset-0 bg-bgDark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-md rounded-3xl p-6 space-y-5 animate-modal-pop border-neonCyan/40 text-center">
      <div class="w-14 h-14 rounded-2xl bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center mx-auto text-neonCyan"><i data-lucide="award" class="w-7 h-7"></i></div>
      <div>
        <h3 class="font-display text-2xl font-bold">Session Complete</h3>
        <p class="text-xs text-textSecondary mt-1">Great focus! Here is your session recap.</p>
      </div>
      <div class="bg-bgDark p-4 rounded-2xl text-left space-y-2 text-xs">
        <div class="flex justify-between"><span class="text-textSecondary">Study Time:</span> <span id="summary-time" class="font-bold text-neonCyan">0 mins</span></div>
        <div class="flex justify-between"><span class="text-textSecondary">Target Assignment:</span> <span id="summary-task" class="font-bold text-textPrimary">None</span></div>
        <div class="flex justify-between"><span class="text-textSecondary">Checklist Progress:</span> <span id="summary-checklist" class="font-bold text-neonViolet">0/0 steps</span></div>
      </div>
      <div class="flex flex-col gap-2 pt-2">
        <button onclick="startBreakAfterSession()" class="py-3 rounded-xl bg-neonCyan/10 border border-neonCyan/30 text-neonCyan font-bold text-xs hover:bg-neonCyan/20 transition">Take a Short Break</button>
        <button onclick="closeSummaryAndContinue()" class="py-3 rounded-xl bg-neonViolet text-white font-bold text-xs hover:opacity-90 transition">Continue Studying</button>
        <button onclick="closeSummaryAndHome()" class="py-3 rounded-xl bg-elevatedDark border border-white/10 text-textSecondary hover:text-white text-xs font-semibold transition">Back to Home</button>
      </div>
    </div>
  </div>

  <!-- WEEKLY CALENDAR MODAL -->
  <div id="calendar-modal" class="hidden fixed inset-0 bg-bgDark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-3xl rounded-3xl p-6 space-y-5 animate-modal-pop max-h-[95vh] overflow-y-auto border-neonCyan/40">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <h3 class="font-display text-xl font-bold">7-Day Study Calendar</h3>
        <button onclick="toggleCalendarModal()" class="text-textSecondary hover:text-white" aria-label="Close calendar"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div id="weekly-calendar-grid" class="grid grid-cols-1 sm:grid-cols-7 gap-3"></div>
    </div>
  </div>

  <!-- ASSIGNMENT DETAIL MODAL -->
  <div id="detail-modal" class="hidden fixed inset-0 bg-bgDark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-lg rounded-3xl p-6 space-y-4 animate-modal-pop max-h-[95vh] overflow-y-auto border-neonViolet/30">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <h3 id="detail-title" class="font-display text-xl font-bold">Assignment Details</h3>
        <button onclick="toggleModal('detail-modal')" class="text-textSecondary hover:text-white" aria-label="Close details"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div id="detail-content" class="space-y-4 text-sm"></div>
    </div>
  </div>

  <!-- SCREENSHOT SCANNING MODAL -->
  <div id="ocr-modal" class="hidden fixed inset-0 bg-bgDark/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-xl rounded-3xl p-6 space-y-5 animate-modal-pop max-h-[95vh] overflow-y-auto border-neonViolet/30">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <div class="flex items-center gap-2"><i data-lucide="scan" class="w-5 h-5 text-neonViolet"></i><h3 class="font-display text-xl font-bold">Screenshot Scanning</h3></div>
        <button onclick="toggleModal('ocr-modal')" class="text-textSecondary hover:text-white" aria-label="Close"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div id="ocr-drop-zone" class="p-8 rounded-2xl border-2 border-dashed border-neonViolet/50 bg-neonViolet/5 text-center space-y-4 relative overflow-hidden">
        <i data-lucide="camera" class="w-12 h-12 text-neonViolet mx-auto"></i>
        <div>
          <div class="font-bold text-sm text-textPrimary">Upload an assignment screenshot</div>
          <div class="text-xs text-textSecondary mt-1">PNG, JPG, WEBP — runs fully offline in your browser</div>
        </div>
        <label class="inline-block px-6 py-3 rounded-xl bg-neonViolet text-white font-bold text-xs cursor-pointer hover:opacity-90 shadow-lg shadow-neonViolet/30 transition">
          Browse Image File
          <input type="file" id="ocr-file-input" accept="image/*" onchange="handleOCRFileUpload(event)" class="hidden">
        </label>
        <div id="ocr-progress-status" class="text-xs font-mono font-bold text-neonCyan hidden">Scanning screenshot...</div>
        <div id="ocr-progress-bar-wrap" class="hidden w-3/4 mx-auto h-1.5 rounded-full bg-bgDark overflow-hidden"><div id="ocr-progress-bar" class="h-full w-0 bg-neonCyan transition-all duration-300 rounded-full"></div></div>
      </div>
    </div>
  </div>

  <!-- SCREENSHOT SCANNING REVIEW MODAL -->
  <div id="ocr-review-modal" class="hidden fixed inset-0 bg-bgDark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-2xl rounded-3xl p-6 space-y-5 animate-modal-pop max-h-[95vh] overflow-y-auto border-neonCyan/40">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <div>
          <h3 class="font-display text-xl font-bold text-neonCyan">Screenshot Scanning</h3>
          <p class="text-xs text-textSecondary mt-0.5">Review and fix each item before saving. Nothing is added until you confirm.</p>
        </div>
        <button onclick="toggleModal('ocr-review-modal')" class="text-textSecondary hover:text-white" aria-label="Close review"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div id="ocr-drafts-list" class="space-y-4 max-h-[55vh] overflow-y-auto pr-1"></div>
      <div class="flex justify-between items-center pt-3 border-t border-white/5">
        <button onclick="toggleModal('ocr-review-modal')" class="px-4 py-2.5 rounded-xl bg-bgDark text-xs font-semibold text-textSecondary hover:text-white">Cancel</button>
        <button onclick="commitSelectedDrafts()" class="px-6 py-3 rounded-xl bg-neonCyan text-bgDark font-bold text-xs hover:opacity-90 transition shadow-lg shadow-neonCyan/30 flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4"></i> Add Selected Assignments</button>
      </div>
    </div>
  </div>

  <!-- ADD / EDIT ASSIGNMENT MODAL -->
  <div id="add-modal" class="hidden fixed inset-0 bg-bgDark/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-modal-pop">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <h3 id="modal-title" class="font-display text-xl font-bold">New Assignment</h3>
        <button onclick="toggleModal('add-modal')" class="text-textSecondary hover:text-white" aria-label="Close"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <form id="assignment-form" onsubmit="handleSaveAssignment(event)" class="space-y-4">
        <input type="hidden" id="form-edit-id" value="">
        <div>
          <label class="block text-xs font-semibold text-textSecondary mb-1" for="form-title">Title *</label>
          <input type="text" id="form-title" required placeholder="e.g. Calculus Problem Set" class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none text-textPrimary">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-textSecondary mb-1" for="form-subject">Subject *</label>
            <input type="text" id="form-subject" required placeholder="e.g. Mathematics" class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none text-textPrimary">
          </div>
          <div>
            <label class="block text-xs font-semibold text-textSecondary mb-1" for="form-priority">Priority</label>
            <select id="form-priority" class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none text-textPrimary">
              <option value="1">Low</option>
              <option value="2" selected>Medium</option>
              <option value="3">High</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-textSecondary mb-1" for="form-duedate">Due Date &amp; Time *</label>
            <input type="datetime-local" id="form-duedate" required class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none text-textPrimary">
          </div>
          <div>
            <label class="block text-xs font-semibold text-textSecondary mb-1" for="form-duration">Est. Duration (Hours) *</label>
            <input type="number" step="0.5" min="0.5" id="form-duration" required placeholder="1.5" class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none text-textPrimary">
          </div>
        </div>
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="text-xs font-semibold text-textSecondary" for="form-notes">Instructions / Subtask Template</label>
            <button type="button" onclick="applyEssayTemplate()" class="text-[10px] text-neonViolet hover:underline">Apply Essay Template</button>
          </div>
          <textarea id="form-notes" placeholder="Additional details or instructions..." class="w-full px-4 py-2.5 rounded-xl bg-bgDark border border-white/10 text-sm focus:border-neonCyan outline-none h-20 resize-none text-textPrimary"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" onclick="toggleModal('add-modal')" class="px-4 py-2.5 rounded-xl bg-bgDark text-xs font-semibold text-textSecondary hover:text-white">Cancel</button>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-neonCyan text-bgDark font-bold text-xs hover:opacity-90 transition">Save Assignment</button>
        </div>
      </form>
    </div>
  </div>

  <!-- SETTINGS & INSIGHTS MODAL -->
  <div id="settings-modal" class="hidden fixed inset-0 bg-bgDark/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-5 animate-modal-pop max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center pb-3 border-b border-white/5">
        <h3 class="font-display text-xl font-bold">Settings &amp; Study Insights</h3>
        <button onclick="toggleModal('settings-modal')" class="text-textSecondary hover:text-white" aria-label="Close settings"><i data-lucide="x" class="w-6 h-6"></i></button>
      </div>
      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-textSecondary mb-1 font-semibold" for="setting-capacity">Daily Study Capacity (Hours)</label>
          <input type="number" step="0.5" min="0.5" id="setting-capacity" onchange="updateCapacitySetting(event)" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary" value="3.0">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-textSecondary mb-1 font-semibold" for="setting-break-short">Short Break (minutes)</label>
            <input type="number" min="1" max="30" id="setting-break-short" onchange="updateDurationSetting(event, 'shortBreak')" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary">
          </div>
          <div>
            <label class="block text-textSecondary mb-1 font-semibold" for="setting-break-long">Long Break (minutes)</label>
            <input type="number" min="5" max="60" id="setting-break-long" onchange="updateDurationSetting(event, 'longBreak')" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textPrimary">
          </div>
        </div>
        <label class="flex items-center justify-between p-3 rounded-xl bg-bgDark border border-white/5 cursor-pointer">
          <span class="text-textSecondary font-semibold">Browser notification when a session ends</span>
          <input type="checkbox" id="setting-notif" onchange="toggleNotifSetting(event)" class="accent-neonCyan w-4 h-4">
        </label>
        <div class="p-4 rounded-xl bg-bgDark border border-white/5 space-y-2">
          <div class="font-bold text-textPrimary">Study Insights</div>
          <div class="flex justify-between text-textSecondary"><span>Total Study Time:</span> <span id="insight-time" class="text-neonCyan font-bold">0 mins</span></div>
          <div class="flex justify-between text-textSecondary"><span>This Week:</span> <span id="insight-week" class="text-neonCyan font-bold">0 mins</span></div>
          <div class="flex justify-between text-textSecondary"><span>Completed Assignments:</span> <span id="insight-completed" class="text-neonViolet font-bold">0</span></div>
          <div id="backup-reminder-box" class="text-[10px] text-statusWarning pt-1"></div>
        </div>
        <div class="space-y-2 pt-2 border-t border-white/5">
          <label class="block text-textSecondary font-semibold">Visual Effects &amp; Particle Density</label>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="setParticleMode('performance')" id="mode-perf" class="py-2 px-3 rounded-lg bg-bgDark border border-white/15 text-textSecondary hover:text-white font-semibold">Performance</button>
            <button onclick="setParticleMode('balanced')" id="mode-bal" class="py-2 px-3 rounded-lg bg-neonViolet text-white font-semibold">Balanced</button>
          </div>
          <button onclick="setParticleMode('cinematic')" id="mode-cine" class="w-full py-2 px-3 rounded-lg bg-bgDark border border-white/15 text-textSecondary hover:text-white font-semibold">Cinematic (Max Particles)</button>
        </div>
        <div class="space-y-2 pt-2 border-t border-white/5">
          <label class="block text-textSecondary font-semibold">Data Backup &amp; Recovery</label>
          <div class="grid grid-cols-2 gap-3">
            <button onclick="exportData()" class="py-2.5 rounded-xl bg-bgDark border border-white/10 hover:border-neonCyan text-textPrimary font-semibold flex items-center justify-center gap-2"><i data-lucide="download" class="w-4 h-4"></i> Export JSON</button>
            <label class="py-2.5 rounded-xl bg-bgDark border border-white/10 hover:border-neonGreen text-textPrimary font-semibold flex items-center justify-center gap-2 cursor-pointer text-center"><i data-lucide="git-merge" class="w-4 h-4"></i> Import (Merge)<input type="file" accept=".json" onchange="importData(event, true)" class="hidden"></label>
          </div>
          <label class="block py-2.5 rounded-xl bg-bgDark border border-white/10 hover:border-dangerRed text-dangerRed font-semibold flex items-center justify-center gap-2 cursor-pointer text-center"><i data-lucide="upload" class="w-4 h-4"></i> Import (Replace All)<input type="file" accept=".json" onchange="importData(event, false)" class="hidden"></label>
        </div>
      </div>
    </div>
  </div>
  `);
})();