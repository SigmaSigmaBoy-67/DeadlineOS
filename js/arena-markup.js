'use strict';
/* DeadlineOS — Arena markup: injected with the page shell (screens for Orbit Race). */
(function () {
  const el = document.getElementById('page-arena');
  if (!el) return;
  el.innerHTML = `
  <div id="arena-home" class="space-y-6 max-w-3xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="font-display text-3xl font-bold">The Arena</h1>
        <p class="text-textSecondary text-sm mt-1">Turn your notes into a race. Solo or with friends on one device.</p>
      </div>
      <button onclick="openForge()" class="px-5 py-3 rounded-xl bg-neonGreen text-bgDark font-bold text-sm flex items-center gap-2 hover:opacity-90 transition shadow-lg shadow-neonGreen/20"><i data-lucide="sparkles" class="w-5 h-5"></i> Forge New Quiz</button>
    </div>
    <div class="glass-panel p-5 rounded-2xl border-neonGreen/30 space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-neonGreen/10 border border-neonGreen/30 flex items-center justify-center text-neonGreen"><i data-lucide="rocket" class="w-5 h-5"></i></div>
        <div><div class="font-bold text-sm">Orbit Race</div><div class="text-[10px] text-textSecondary">The only game mode &mdash; fast answers earn more, streaks stack bonuses.</div></div>
      </div>
    </div>
    <h3 class="font-display text-base font-bold">Your Quiz Decks</h3>
    <div id="deck-list" class="space-y-3"></div>
  </div>

  <div id="arena-forge" class="hidden space-y-5 max-w-2xl mx-auto">
    <div class="flex justify-between items-center">
      <h2 class="font-display text-2xl font-bold">Quiz Forge</h2>
      <button onclick="raceHome()" class="text-textSecondary hover:text-white text-xs font-semibold">&larr; Back</button>
    </div>
    <div class="glass-panel p-5 rounded-2xl space-y-3">
      <label class="block text-xs font-semibold text-textSecondary">Paste your notes, a reading, or class material</label>
      <textarea id="forge-input" rows="10" placeholder="Paste anything: class notes, a textbook section, definitions... The Forge finds key terms and builds a multiple-choice quiz, offline, instantly." class="w-full px-4 py-3 rounded-xl bg-bgDark border border-white/10 text-sm text-textPrimary outline-none focus:border-neonGreen resize-y"></textarea>
      <div id="forge-status" class="text-xs text-neonGreen font-mono font-bold"></div>
      <button onclick="forgeNow()" class="px-5 py-3 rounded-xl bg-neonGreen text-bgDark font-bold text-sm hover:opacity-90 transition shadow-lg shadow-neonGreen/20">Forge Quiz</button>
    </div>
  </div>

  <div id="arena-setup" class="hidden space-y-6 max-w-2xl mx-auto">
    <div class="flex justify-between items-center">
      <div><h2 class="font-display text-2xl font-bold">Launch Race</h2><div id="setup-count" class="text-xs text-textSecondary mt-1"></div></div>
      <button onclick="raceHome()" class="text-textSecondary hover:text-white text-xs font-semibold">&larr; Back</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="glass-panel p-5 rounded-2xl space-y-3 border-neonCyan/30">
        <h3 class="font-bold text-sm">Solo Run</h3>
        <p class="text-xs text-textSecondary">Race the clock. Beat your personal best.</p>
        <button onclick="startGameSolo()" class="w-full py-3 rounded-xl bg-neonCyan text-bgDark font-bold text-xs hover:opacity-90 transition">Launch Solo</button>
      </div>
      <div class="glass-panel p-5 rounded-2xl space-y-3 border-neonViolet/30">
        <h3 class="font-bold text-sm">Pass &amp; Play (2-4)</h3>
        <p class="text-xs text-textSecondary">Share one device &mdash; each player answers on their turn.</p>
        <div class="space-y-2">
          <input type="text" id="pp-name-1" placeholder="Player 1 name" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-xs text-textPrimary outline-none focus:border-neonViolet">
          <input type="text" id="pp-name-2" placeholder="Player 2 name" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-xs text-textPrimary outline-none focus:border-neonViolet">
          <input type="text" id="pp-name-3" placeholder="Player 3 name (optional)" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-xs text-textPrimary outline-none focus:border-neonViolet">
          <input type="text" id="pp-name-4" placeholder="Player 4 name (optional)" class="w-full px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-xs text-textPrimary outline-none focus:border-neonViolet">
        </div>
        <button onclick="startGamePassPlay()" class="w-full py-3 rounded-xl bg-neonViolet text-white font-bold text-xs hover:opacity-90 transition">Launch Pass &amp; Play</button>
      </div>
    </div>
  </div>

  <div id="arena-play" class="hidden max-w-2xl mx-auto">
    <div class="glass-panel p-6 sm:p-8 rounded-3xl border-neonGreen/30 space-y-6 text-center">
      <div class="flex justify-between text-xs font-bold">
        <span id="race-progress" class="text-textSecondary">Q1/10</span>
        <span id="race-player" class="text-neonCyan">You</span>
      </div>
      <h3 id="race-question" class="font-display text-xl font-bold leading-snug px-2">Question</h3>
      <div id="race-choices" class="space-y-3"></div>
      <div id="race-feedback" class="text-sm font-bold min-h-[20px]"></div>
    </div>
    <div class="glass-panel p-4 rounded-2xl mt-4 space-y-2 text-sm max-w-xs mx-auto" id="race-scores-wrap">
      <div class="text-[10px] uppercase tracking-widest text-textSecondary font-bold">Scores</div>
      <div id="race-scores"></div>
    </div>
  </div>

  <div id="arena-results" class="hidden max-w-md mx-auto text-center space-y-5">
    <div class="glass-panel p-8 rounded-3xl border-neonGreen/40 space-y-5">
      <div class="w-16 h-16 rounded-2xl bg-neonGreen/10 border border-neonGreen/30 flex items-center justify-center mx-auto text-neonGreen"><i data-lucide="trophy" class="w-8 h-8"></i></div>
      <h2 id="results-title" class="font-display text-2xl font-bold">Race complete!</h2>
      <div id="results-board" class="space-y-2 text-left"></div>
      <div id="results-best" class="text-xs text-neonGreen font-bold"></div>
      <div class="flex flex-col gap-2 pt-2">
        <button onclick="raceRematch()" class="py-3 rounded-xl bg-neonGreen text-bgDark font-bold text-xs hover:opacity-90 transition">Rematch</button>
        <button onclick="racePlayAgain()" class="py-3 rounded-xl bg-elevatedDark border border-white/10 text-textPrimary font-semibold text-xs hover:text-white transition">Back to Setup</button>
        <button onclick="raceHome()" class="py-3 rounded-xl bg-bgDark text-textSecondary font-semibold text-xs hover:text-white transition">Arena Home</button>
      </div>
    </div>
  </div>
  `;
})();