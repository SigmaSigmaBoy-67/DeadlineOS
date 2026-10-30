'use strict';
/* DeadlineOS — Orbit Race (part 1): Arena state, deck list, forge + setup screens. */

let arenaState = { screen: 'home', decks: [], quiz: null, players: [], currentIdx: 0, activePlayer: 0, mode: 'solo', answered: false, questionStart: 0 };

function safeParseDecks() {
  try { const d = JSON.parse(localStorage.getItem('deadlineos_quiz_decks_v1') || '[]'); return Array.isArray(d) ? d : []; } catch (e) { return []; }
}
function persistDecks() { try { localStorage.setItem('deadlineos_quiz_decks_v1', JSON.stringify(arenaState.decks)); } catch (e) { showToast('Could not save deck.', 'error'); } }
function initArena() { arenaState.decks = safeParseDecks(); renderArenaHome(); }
function switchArenaScreen(name) {
  arenaState.screen = name;
  ['arena-home', 'arena-forge', 'arena-setup', 'arena-play', 'arena-results'].forEach(function (id) { const el = $(id); if (el) el.classList.add('hidden'); });
  const el = $('arena-' + name);
  if (el) { el.classList.remove('hidden'); el.classList.remove('dlos-page-enter'); void el.offsetWidth; el.classList.add('dlos-page-enter'); }
}
function renderArenaHome() {
  switchArenaScreen('home');
  const list = $('deck-list');
  if (!list) return;
  arenaState.decks = safeParseDecks();
  if (!arenaState.decks.length) { list.innerHTML = '<div class="glass-panel text-center py-10 text-textSecondary text-sm">No decks yet. Forge your first quiz from your notes!</div>'; return; }
  list.innerHTML = '';
  arenaState.decks.forEach(function (deck, idx) {
    const row = document.createElement('div');
    row.className = 'glass-panel p-4 rounded-2xl border border-white/5 flex justify-between items-center gap-3';
    row.innerHTML = '<div class="min-w-0"><div class="font-bold text-sm truncate">' + escapeHTML(deck.topic) + '</div><div class="text-[10px] text-textSecondary">' + deck.questions.length + ' questions &middot; ' + escapeHTML(deck.date || '') + '</div></div><div class="flex gap-2 shrink-0"><button onclick="playDeck(' + idx + ')" class="px-4 py-2 rounded-xl bg-neonGreen/15 border border-neonGreen/30 text-neonGreen text-xs font-bold hover:bg-neonGreen/25 transition">Play</button><button onclick="deleteDeck(' + idx + ')" class="px-3 py-2 rounded-xl bg-bgDark border border-white/10 text-textSecondary hover:text-dangerRed text-xs transition" aria-label="Delete deck">X</button></div>';
    list.appendChild(row);
  });
}
function openForge() { $('forge-input').value = ''; $('forge-status').textContent = ''; switchArenaScreen('forge'); }
function forgeNow() {
  const raw = $('forge-input').value;
  if (!raw || !raw.trim()) { showToast('Paste some notes first.', 'warning'); return; }
  $('forge-status').textContent = 'Forging quiz...';
  const result = generateQuizFromText(raw);
  if (result.error) { $('forge-status').textContent = ''; showToast(result.error, 'error'); return; }
  arenaState.decks = safeParseDecks();
  arenaState.decks.unshift({ id: genId(), topic: result.topic, date: todayKey(), questions: result.questions });
  persistDecks();
  $('forge-status').textContent = '';
  showToast('Forged ' + result.questions.length + ' questions!', 'success');
  arenaState.quiz = { questions: result.questions };
  showSetup();
}
function playDeck(idx) { const d = arenaState.decks[idx]; if (!d) return; arenaState.quiz = { questions: d.questions }; showSetup(); }
function deleteDeck(idx) {
  const d = arenaState.decks[idx]; if (!d) return;
  if (!confirm('Delete deck "' + d.topic + '"?')) return;
  arenaState.decks.splice(idx, 1); persistDecks(); renderArenaHome();
}
function showSetup() { $('setup-count').textContent = arenaState.quiz ? arenaState.quiz.questions.length + ' questions ready' : ''; switchArenaScreen('setup'); }
function startGameSolo() { arenaState.mode = 'solo'; arenaState.players = [{ name: 'You', score: 0, streak: 0 }]; beginOrbitRace(); }
function startGamePassPlay() {
  arenaState.mode = 'passplay';
  const names = [];
  for (var i = 1; i <= 4; i++) { const v = $('pp-name-' + i).value.trim(); if (v) names.push(v); }
  if (names.length < 2) { showToast('Enter at least 2 player names.', 'error'); return; }
  arenaState.players = names.map(function (n) { return { name: n, score: 0, streak: 0 }; });
  beginOrbitRace();
}