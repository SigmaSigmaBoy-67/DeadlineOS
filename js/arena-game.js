'use strict';
/* DeadlineOS — Orbit Race (part 2): question flow, scoring, results. */

function beginOrbitRace() {
  arenaState.currentIdx = 0; arenaState.activePlayer = 0;
  switchArenaScreen('play');
  renderQuestion();
}
function renderQuestion() {
  const q = arenaState.quiz.questions[arenaState.currentIdx];
  const player = arenaState.players[arenaState.activePlayer];
  if (!q) return;
  arenaState.answered = false;
  arenaState.questionStart = Date.now();
  $('race-progress').textContent = 'Q' + (arenaState.currentIdx + 1) + '/' + arenaState.quiz.questions.length;
  $('race-player').textContent = arenaState.mode === 'passplay' ? player.name + "'s turn" : 'You';
  $('race-question').textContent = q.q;
  const wrap = $('race-choices');
  wrap.innerHTML = '';
  q.choices.forEach(function (choice, i) {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left px-4 py-3.5 rounded-2xl bg-bgDark border border-white/10 text-sm font-semibold text-textPrimary hover:border-neonCyan transition';
    btn.textContent = choice;
    btn.onclick = function () { answerRace(i); };
    wrap.appendChild(btn);
  });
  renderRaceScores();
}
function answerRace(choiceIdx) {
  if (arenaState.answered) return;
  arenaState.answered = true;
  const q = arenaState.quiz.questions[arenaState.currentIdx];
  const correct = q.choices[choiceIdx] === q.answer;
  const secs = Math.max(1, Math.round((Date.now() - arenaState.questionStart) / 1000));
  const player = arenaState.players[arenaState.activePlayer];
  const buttons = $('race-choices').querySelectorAll('button');
  buttons.forEach(function (b) { b.disabled = true; });
  buttons.forEach(function (b, i) {
    if (q.choices[i] === q.answer) b.className = 'w-full text-left px-4 py-3.5 rounded-2xl bg-neonGreen/15 border border-neonGreen/50 text-sm font-bold text-neonGreen';
    else if (i === choiceIdx) b.className = 'w-full text-left px-4 py-3.5 rounded-2xl bg-dangerRed/15 border border-dangerRed/50 text-sm font-bold text-dangerRed';
    else b.className = 'w-full text-left px-4 py-3.5 rounded-2xl bg-bgDark border border-white/5 text-sm font-semibold text-textSecondary opacity-50';
  });
  if (correct) {
    const base = secs <= 10 ? 150 : secs <= 20 ? 120 : 100;
    const streakBonus = Math.min(player.streak * 10, 50);
    const gained = base + streakBonus;
    player.score += gained;
    player.streak++;
    $('race-feedback').textContent = 'Correct! +' + gained + (streakBonus > 0 ? ' (streak x' + player.streak + ')' : '');
    $('race-feedback').className = 'text-center text-sm font-bold text-neonGreen';
    playChime();
  } else {
    player.streak = 0;
    $('race-feedback').textContent = 'Answer: ' + q.answer;
    $('race-feedback').className = 'text-center text-sm font-bold text-dangerRed';
  }
  renderRaceScores();
  setTimeout(function () {
    $('race-feedback').textContent = '';
    arenaState.currentIdx++;
    if (arenaState.currentIdx >= arenaState.quiz.questions.length) { showResults(); return; }
    if (arenaState.mode === 'passplay') arenaState.activePlayer = (arenaState.activePlayer + 1) % arenaState.players.length;
    renderQuestion();
  }, 1100);
}
function renderRaceScores() {
  const c = $('race-scores');
  if (!c) return;
  c.innerHTML = arenaState.players.map(function (p, i) {
    const act = arenaState.mode === 'passplay' && i === arenaState.activePlayer;
    return '<div class="flex justify-between ' + (act ? 'text-neonCyan' : '') + '"><span class="font-semibold">' + escapeHTML(p.name) + (act ? ' &#9656;' : '') + '</span><span class="font-bold">' + p.score + '</span></div>';
  }).join('');
}
function showResults() {
  const sorted = arenaState.players.slice().sort(function (a, b) { return b.score - a.score; });
  const winner = sorted[0];
  $('results-title').textContent = arenaState.mode === 'passplay' ? winner.name + ' wins the race!' : 'Race complete!';
  const c = $('results-board');
  c.innerHTML = sorted.map(function (p, i) {
    return '<div class="flex justify-between items-center p-3 rounded-xl ' + (i === 0 ? 'bg-neonGreen/10 border border-neonGreen/30' : 'bg-bgDark border border-white/5') + '"><div class="flex items-center gap-3"><span class="font-display font-bold text-lg ' + (i === 0 ? 'text-neonGreen' : 'text-textSecondary') + '">' + (i + 1) + '</span><span class="font-bold">' + escapeHTML(p.name) + '</span></div><span class="font-display font-bold">' + p.score + '</span></div>';
  }).join('');
  if (arenaState.mode === 'solo') {
    try {
      const best = parseInt(localStorage.getItem('deadlineos_best_score') || '0', 10);
      if (winner.score > best) { localStorage.setItem('deadlineos_best_score', String(winner.score)); $('results-best').textContent = 'New personal best: ' + winner.score + '!'; }
      else $('results-best').textContent = 'Personal best: ' + best;
    } catch (e) { $('results-best').textContent = ''; }
  } else $('results-best').textContent = '';
  switchArenaScreen('results');
}
function raceHome() { renderArenaHome(); }
function racePlayAgain() { showSetup(); }
function raceRematch() { arenaState.players.forEach(function (p) { p.score = 0; p.streak = 0; }); beginOrbitRace(); }