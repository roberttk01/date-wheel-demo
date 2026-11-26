/* Date wheel demo, part 2 of 2: panels and buttons. Changes stay in this browser's localStorage. */
"use strict";
/* ---- panels ---- */
function legLine(label, idx, count){ return label ? '<p class="leg">Leg ' + ((idx || 0) + 1) + ' of ' + count + ': ' + esc(label) + '</p>' : ""; }
function dates(p){
  var out = [];
  if (p.plan && p.plan.date) out.push("Planned " + fmtDay(p.plan.date, true) + (p.plan.start ? " at " + fmtTime(p.plan.start) : ""));
  if (p.pickedAt) out.push((p.direct ? "Chosen without the wheel " : "Spun ") + fmtStamp(p.pickedAt));
  if (p.doneAt) out.push("Done " + fmtStamp(p.doneAt));
  var r = p.local ? L.rolls[p.week] : (D.rolls || {})[p.week];
  if (r) out.push("Dice: Catherine " + r.C + ", Kyle " + r.K);
  return out;
}
function renderResult(){
  var el = $("#result");
  if (S.spinning){ el.innerHTML = '<p class="caption">Spinning...</p>'; return; }
  var i = S.resultId && ideaById(S.resultId);
  if (!i){ el.innerHTML = ""; return; }
  var lg = legOf(i), cur = currentPick(weekKey());
  el.innerHTML = '<div class="ticket" data-who="' + esc(i.who) + '"><p class="eyebrow">The wheel landed on</p><h3>' + esc(i.title) + '</h3>' +
    (lg ? legLine(lg.label, lg.index, lg.count) : "") + (i.note ? '<p>' + esc(i.note) + '</p>' : "") + '<p class="small">' + whoLine(i.who) + '</p>' +
    '<div class="row"><button class="btn primary" type="button" data-act="lock">' + (cur ? "Swap in for this weekend" : "Lock it in") + '</button><button class="btn" type="button" data-act="again">Spin again</button></div></div>';
}
function renderWeek(){
  var w = weekKey(), p = currentPick(w), el = $("#week");
  $("#week-label").textContent = "This weekend" + DOT + fmtDay(w, true);
  if (!p){ el.innerHTML = '<div class="ticket empty"><h3>Nothing picked yet</h3><p>Roll the dice, then spin the wheel.</p></div>'; return; }
  var i = ideaById(p.ideaId);
  el.innerHTML = '<div class="ticket" data-who="' + esc(p.who) + '"><p class="eyebrow">' + (p.local ? "Demo pick, this phone only" : p.status === "done" ? "Done" : "Planned") + '</p><h3>' + esc(p.title) + '</h3>' +
    legLine(p.legLabel, p.legIndex, p.legCount) + '<div class="meta">' + dates(p).map(function(d){ return '<span>' + esc(d) + '</span>'; }).join("") + '</div>' +
    (i && i.note ? '<p class="small">' + esc(i.note) + '</p>' : "") + '<p class="small">' + whoLine(p.who) + '</p>' +
    (p.local ? '<div class="row"><button class="btn sm" type="button" data-act="unlock">Put the real pick back</button></div>' : "") + '</div>';
}
function renderScore(){
  var all = picks(), landed = all.filter(function(p){ return p.status !== "skipped"; }), c = {C:0, K:0, B:0}, total = landed.length;
  landed.forEach(function(p){ if (c[p.who] != null) c[p.who]++; });
  var h = '<div class="score">' + ["C","K","B"].map(function(k){ return '<div><b>' + c[k] + '</b><span><i class="dot ' + k + '"></i>' + NAMES[k] + '</span></div>'; }).join("") + '</div>';
  h += '<div class="bar" role="img" aria-label="Catherine ' + c.C + ', Kyle ' + c.K + ', both ' + c.B + '">' + ["C","K","B"].map(function(k){ return c[k] ? '<i class="' + k + '" style="width:' + (c[k] / total * 100).toFixed(2) + '%"></i>' : ""; }).join("") + '</div>';
  var hist = all.slice().sort(function(a, b){ return b.week.localeCompare(a.week); });
  h += '<ul class="history">' + hist.map(function(p){
    var st = p.local ? "Demo" : p.status === "done" ? "Done" : p.status === "skipped" ? "Skipped" : "Planned";
    return '<li><span class="when">' + esc(fmtDay(p.week, false)) + '</span><div class="what"><span class="t"><i class="dot ' + esc(p.who) + '"></i><span>' +
      esc(p.legLabel ? p.title + ": " + p.legLabel : p.title) + '</span><span class="pill' + (p.status === "done" ? " ok" : "") + '">' + st + '</span></span><span class="d">' + esc(dates(p).join(DOT)) + '</span></div></li>';
  }).join("") + '</ul>';
  $("#score").innerHTML = h;
}
var EVERY = {0:"One time only", 1:"Every week", 2:"Every 2 weeks", 4:"Every month", 6:"Every 6 weeks", 8:"Every 2 months", 12:"Every 3 months", 26:"Every 6 months", 52:"Once a year"};
function hoursChip(h){ return h >= 8 ? "All day" : h < 1 ? Math.round(h * 60) + " min" : h === 1 ? "1 hr" : h + " hrs"; }
function why(i, w){ return !inSeason(i, w) ? "Out of season" : resting(i, w) ? "Resting until " + fmtDay(i.availableFrom, false) : !fits(i) ? "Too long today" : ""; }
function ideaRow(i, w){
  var off = why(i, w), lg = legOf(i), chips = [], body = [], s = seasonOf(i);
  if (typeof i.hours === "number") chips.push(hoursChip(i.hours));
  if (lg) chips.push("Parlay " + (lg.index + 1) + "/" + lg.count);
  if (i.local) chips.push("Added here");
  if (off) chips.push(off);
  if (i.note) body.push('<p>' + esc(i.note) + '</p>');
  if (lg) body.push('<ol>' + i.legs.map(function(x, n){ return '<li>' + esc(x) + (n === lg.index ? ' <strong>(up next)</strong>' : "") + '</li>'; }).join("") + '</ol>');
  if (s) body.push('<p class="muted">Season: ' + mdLabel(s.from) + ' to ' + mdLabel(s.to) + '</p>');
  if (typeof i.every === "number") body.push('<p class="muted">Repeats: ' + (EVERY[i.every] || "Every " + i.every + " weeks") + '</p>');
  if (i.local) body.push('<div><button class="btn sm danger" type="button" data-act="remove" data-id="' + esc(i.id) + '">Remove from demo</button></div>');
  return '<details class="idea' + (off ? " off" : "") + '"><summary><span class="nm">' + esc(i.title) + '</span><span class="chips">' +
    chips.map(function(x){ return '<span class="pill">' + esc(x) + '</span>'; }).join("") + '</span></summary><div class="body">' + (body.join("") || '<p class="muted">No extra notes.</p>') + '</div></details>';
}
function renderIdeas(){
  var w = weekKey(), all = ideas(), h = '<p class="small muted">Tap an idea for details. Grayed-out ideas sit out this week.</p>';
  $("#ideas-h").textContent = "Ideas (" + all.length + ")";
  ["C","K","B"].forEach(function(k){
    var g = all.filter(function(i){ return i.who === k; }).sort(function(a, b){ return (a.order || 0) - (b.order || 0); });
    if (g.length) h += '<div class="group"><h3><i class="dot ' + k + '"></i>' + NAMES[k] + ' (' + g.length + ')</h3>' + g.map(function(i){ return ideaRow(i, w); }).join("") + '</div>';
  });
  $("#ideas").innerHTML = h;
}
function renderStats(){
  var w = weekKey(), n = {C:0, K:0, B:0}, out = ideas().length - pool(w).length;
  S.slices.forEach(function(i){ n[i.who]++; });
  $("#stats").textContent = S.slices.length + " slices" + DOT + n.C + " Catherine" + DOT + n.K + " Kyle" + DOT + n.B + " joint" + (out ? DOT + out + " sitting out this week" : "");
  var cur = currentPick(w);
  $("#caption").textContent = !S.slices.length ? "Nothing fits that time limit. Pick a longer one." : cur ? "This weekend is already locked in. Spin anyway to see what else could come up." : "Tap SPIN in the middle of the wheel.";
}
function render(){ refresh(); renderStats(); renderDice(); renderResult(); renderWeek(); renderScore(); renderIdeas(); $("#spin").disabled = S.spinning || !S.slices.length; }

/* ---- actions ---- */
var tt = null;
function toast(m){ var t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(function(){ t.hidden = true; }, 3000); }
function lock(){
  var i = ideaById(S.resultId); if (!i) return;
  var w = weekKey(), lg = legOf(i), p = {week:w, ideaId:i.id, title:i.title, short:i.short || shortOf(i.title), who:i.who, status:"planned", pickedAt:new Date().toISOString(), local:true};
  if (lg){ p.legLabel = lg.label; p.legIndex = lg.index; p.legCount = lg.count; }
  L.picks = L.picks.filter(function(x){ return x.week !== w; }).concat([p]); save();
  S.resultId = null; render(); toast("Locked in on this phone only.");
  var el = $("#week"); if (el.scrollIntoView) el.scrollIntoView({behavior:reduced ? "auto" : "smooth", block:"center"});
}
document.addEventListener("click", function(e){
  var b = e.target.closest ? e.target.closest("[data-act]") : null; if (!b) return;
  var a = b.getAttribute("data-act"), w = weekKey();
  if (a === "roll") roll();
  else if (a === "lock") lock();
  else if (a === "again") spin();
  else if (a === "unlock"){ L.picks = L.picks.filter(function(p){ return p.week !== w; }); save(); render(); }
  else if (a === "remove"){
    var id = b.getAttribute("data-id");
    L.added = L.added.filter(function(i){ return i.id !== id; }); L.picks = L.picks.filter(function(p){ return p.ideaId !== id; });
    if (S.resultId === id) S.resultId = null; save(); render();
  }
});
$("#spin").addEventListener("click", spin);
$("#limit").value = String(L.limit || 0);
$("#limit").addEventListener("change", function(){ L.limit = +this.value || 0; S.resultId = null; save(); render(); });
$("#add").addEventListener("submit", function(e){
  e.preventDefault();
  var t = $("#add-title").value.replace(/\s+/g, " ").trim(), who = $("#add-who").value, hv = $("#add-hours").value;
  if (!t || !NAMES[who]) return;
  var idea = {id:"d-" + Date.now().toString(36), title:t, short:shortOf(t), who:who, order:Date.now(), status:"active", local:true};
  if (hv) idea.hours = +hv;
  L.added.push(idea); save(); $("#add-title").value = ""; render(); toast("Added to the wheel on this phone.");
});
$("#reset").addEventListener("click", function(){
  var b = this;
  if (!S.confirm){ S.confirm = true; b.textContent = "Tap again to reset"; setTimeout(function(){ S.confirm = false; b.textContent = "Reset demo"; }, 4000); return; }
  S.confirm = false; b.textContent = "Reset demo"; L = fresh();
  try { localStorage.removeItem(KEY); } catch (e) {}
  S.resultId = null; S.rotation = 0; $("#limit").value = "0"; render(); toast("Back to the snapshot.");
});
if (window.ResizeObserver) new ResizeObserver(function(){ if (!S.spinning) draw(); }).observe(cv);
if (window.matchMedia) { var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", draw); }
render();
