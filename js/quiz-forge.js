'use strict';
/* DeadlineOS — Quiz Forge: offline question generator from pasted notes. */

function forgeSplitSentences(text) {
  return text.replace(/\n+/g, ' ').split('. ').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 25 && s.length < 300; });
}
var FORGE_STOP = new Set(['the','a','an','of','in','on','to','is','are','was','were','be','been','and','or','but','for','with','as','by','at','from','that','this','it','its','than','then','also','can','will','would','should','has','have','had','do','does','did','not','no','so','if','when','while','because','which','who','their','there','they','them','we','our','you','your','i','he','she','his','her','him','us','me','my','one','all','any','some','only','same','just','about','after','before','between','during','through','under','over','up','down','out','off','here','how','what','where','why','both','few','more','most','now']);
function forgeKeyTerms(text) {
  var words = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  var freq = {};
  for (var i = 0; i < words.length; i++) { var w = words[i]; if (!FORGE_STOP.has(w)) freq[w] = (freq[w] || 0) + 1; }
  return Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).filter(function (w) { return w.length >= 4; });
}
function forgeExtractTopic(text) {
  var terms = forgeKeyTerms(text);
  return terms.length ? terms[0].charAt(0).toUpperCase() + terms[0].slice(1) : 'My Notes';
}
function forgeRegexEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function forgeCloze(sentences, termPool) {
  var out = [];
  var seen = new Set();
  for (var si = 0; si < sentences.length; si++) {
    var sent = sentences[si];
    if (out.length >= 12) break;
    var lower = sent.toLowerCase();
    var term = null;
    for (var ti = 0; ti < termPool.length; ti++) { if (lower.indexOf(termPool[ti]) !== -1) { term = termPool[ti]; break; } }
    if (!term) continue;
    var blanked = sent.replace(new RegExp('\\b' + forgeRegexEscape(term) + '\\b', 'i'), '______');
    if (blanked === sent) continue;
    var key = blanked.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    var pool = termPool.filter(function (t) { return t !== term && lower.indexOf(t) === -1 && Math.abs(t.length - term.length) <= 5; });
    var picks = pool.slice().sort(function () { return 0.5 - Math.random(); }).slice(0, 3);
    if (picks.length < 3) continue;
    var choices = [term].concat(picks).sort(function () { return 0.5 - Math.random(); });
    out.push({ q: blanked.charAt(0).toUpperCase() + blanked.slice(1), choices: choices, answer: term, source: 'Notes' });
  }
  return out;
}
function forgeDefinitions(text) {
  var out = [];
  var seen = new Set();
  var sentences = forgeSplitSentences(text);
  for (var i = 0; i < sentences.length; i++) {
    var sent = sentences[i];
    if (out.length >= 8) break;
    var m = sent.match(/^(.{3,60}?)\s+(?:is|are|means|refers to)\s+(.{10,160})$/i);
    if (!m) m = sent.match(/^(.{3,40}?)\s*[:\u2013\u2014]\s*(.{10,160})$/);
    if (!m) continue;
    var term = m[1].trim().replace(/^(the|a|an)\s+/i, '');
    var def = m[2].trim().replace(/[.;]$/, '');
    if (term.split(' ').length > 6) continue;
    var key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ term: term, def: def });
  }
  return out;
}
function forgeDefQuestions(defs, termPool) {
  var out = [];
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    if (out.length >= 8) break;
    var lower = d.term.toLowerCase();
    var pool = termPool.filter(function (t) { return t !== lower && Math.abs(t.length - lower.length) <= 6; }).slice().sort(function () { return 0.5 - Math.random(); }).slice(0, 3);
    if (pool.length < 3) continue;
    var choices = [d.term].concat(pool).sort(function () { return 0.5 - Math.random(); });
    out.push({ q: 'Which term matches: "' + d.def + '"?', choices: choices, answer: d.term, source: 'Definitions' });
  }
  return out;
}
function forgeTrueFalse(sentences) {
  var out = [];
  for (var i = 0; i < sentences.length; i++) {
    if (out.length >= 4) break;
    if (Math.random() < 0.5) continue;
    out.push({ q: sentences[i], choices: ['True', 'False'], answer: 'True', source: 'Notes' });
  }
  return out;
}
function generateQuizFromText(rawText) {
  var text = rawText.replace(/\r/g, '');
  if (text.length < 80) return { error: 'Paste at least a few sentences of notes (80+ characters).' };
  var sentences = forgeSplitSentences(text);
  if (sentences.length < 3) return { error: 'Not enough full sentences found. Try pasting more material.' };
  var termPool = forgeKeyTerms(text);
  if (termPool.length < 5) return { error: 'Not enough distinct terms found to build questions.' };
  var questions = [];
  questions = questions.concat(forgeDefQuestions(forgeDefinitions(text), termPool));
  questions = questions.concat(forgeCloze(sentences, termPool));
  if (questions.length < 8) questions = questions.concat(forgeTrueFalse(sentences));
  if (questions.length < 5) return { error: 'Could not build 5 solid questions from this text. Try richer notes with clear terms and definitions.' };
  if (questions.length > 15) questions = questions.slice(0, 15);
  questions.sort(function () { return 0.5 - Math.random(); });
  return { questions: questions, topic: forgeExtractTopic(text) };
}