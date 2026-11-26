/* Date wheel demo, part 1 of 2: data helpers, wheel and dice. Static snapshot, no network calls. */
"use strict";
var D = window.DW || {ideas:[], picks:[], rolls:{}, colors:{}};
var KEY = "dateWheelDemo.v1", TZ = "America/Chicago", TAU = Math.PI * 2, DOT = " \u00b7 ";
var NAMES = {C:"Catherine", K:"Kyle", B:"Both"};
var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
function $(s){ return document.querySelector(s); }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

/* ---- local state (this browser only) ---- */
function fresh(){ return {added:[], picks:[], rolls:{}, limit:0}; }
function load(){
  try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.added) && Array.isArray(s.picks)) { s.rolls = s.rolls || {}; return s; } } catch (e) {}
  return fresh();
}
var L = load(), warned = false;
function save(){ try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) { if (!warned) { warned = true; toast("This browser won't keep changes, so they reset on reload."); } } }

/* ---- dates ---- */
function pad(n){ return (n < 10 ? "0" : "") + n; }
function isoOf(d){ return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseIso(s){ var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addDays(d, n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function satOf(d){ var day = d.getDay(); return addDays(d, day === 0 ? -1 : 6 - day); }
/* A week runs Monday to Sunday and is named by its Saturday. */
function weekKey(){ return isoOf(satOf(new Date())); }
function fmtDay(iso, wd){ return parseIso(iso).toLocaleDateString("en-US", wd ? {weekday:"short", month:"short", day:"numeric"} : {month:"short", day:"numeric"}); }
function fmtStamp(ts){ try { return new Date(ts).toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", timeZone:TZ}); } catch (e) { return ""; } }
function fmtTime(hm){ var p = hm.split(":").map(Number); return (p[0] % 12 || 12) + ":" + pad(p[1]) + (p[0] < 12 ? " AM" : " PM"); }
function mdLabel(md){ var p = md.split("-"); return MON[+p[0] - 1] + " " + (+p[1]); }
function mmdd(d){ return pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function mod(a, n){ return ((a % n) + n) % n; }
function rand(){ try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
function seeded(seed){
  var h = 2166136261; for (var i = 0; i < seed.length; i++){ h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function(){ h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shortOf(t){ if (t.length <= 20) return t; var cut = t.slice(0, 20), sp = cut.lastIndexOf(" "); return (sp > 8 ? cut.slice(0, sp) : cut) + "\u2026"; }

/* ---- colors ---- */
var DEF = {C:"#FFB6C1", K:"#9FE2BF", B:"#4169E1"}, SLICE = {};
function lum(hex){
  var n = parseInt(hex.slice(1), 16);
  var c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function(v){ v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function inkFor(hex){ var x = lum(hex), dk = lum("#1A1F3A"); return (x + 0.05) / (dk + 0.05) >= 1.05 / (x + 0.05) ? "#1A1F3A" : "#FFFFFF"; }
["C","K","B"].forEach(function(k){
  var c = (D.colors || {})[k]; c = /^#[0-9a-f]{6}$/i.test(c || "") ? c : DEF[k];
  SLICE[k] = {fill:c, ink:inkFor(c)};
  document.documentElement.style.setProperty("--" + k, c);
  document.documentElement.style.setProperty("--ink-" + k, SLICE[k].ink);
});

/* ---- data ---- */
function ideas(){ return D.ideas.concat(L.added); }
function ideaById(id){ var a = ideas(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
function picks(){
  var mine = {}; L.picks.forEach(function(p){ mine[p.week] = 1; });
  return D.picks.filter(function(p){ return !mine[p.week]; }).concat(L.picks);
}
function currentPick(w){
  var l = picks().filter(function(p){ return p.week === w && p.status !== "skipped"; });
  l.sort(function(a, b){ return (b.pickedAt || "").localeCompare(a.pickedAt || ""); });
  return l[0] || null;
}
function rollFor(w){ return L.rolls[w] || (D.rolls || {})[w] || null; }
function seasonOf(i){ var s = i.season; return s && /^\d\d-\d\d$/.test(s.from || "") && /^\d\d-\d\d$/.test(s.to || "") ? s : null; }
function inRange(md, s){ return s.from <= s.to ? (md >= s.from && md <= s.to) : (md >= s.from || md <= s.to); }
/* An idea is in season if Fri, Sat or Sun of the weekend falls inside its range. */
function inSeason(i, w){ var s = seasonOf(i), sat = parseIso(w); return !s || [-1, 0, 1].some(function(o){ return inRange(mmdd(addDays(sat, o)), s); }); }
function resting(i, w){ return !!(i.availableFrom && i.availableFrom > w); }
function fits(i){ var lim = +L.limit || 0; return !lim || (typeof i.hours === "number" && i.hours <= lim); }
function pool(w){ return ideas().filter(function(i){ return i.status !== "done" && inSeason(i, w) && !resting(i, w) && fits(i); }); }
function legOf(i){ if (!i || !i.legs || !i.legs.length) return null; var n = Math.min(i.leg || 0, i.legs.length - 1); return {index:n, count:i.legs.length, label:i.legs[n]}; }
function whoLine(w){ return w === "B" ? "Joint idea" : NAMES[w] + "'s idea"; }

/* Same slice layout as the real wheel: shuffled per week, spread evenly, joint ideas twice. */
function buildSlices(list, seed){
  var r = seeded(seed), g = {C:[], K:[], B:[]}, items = [];
  list.slice().sort(function(a, b){ return (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id); }).forEach(function(i){ if (g[i.who]) g[i.who].push(i); });
  Object.keys(g).forEach(function(k){ var a = g[k]; for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } });
  g.B = g.B.concat(g.B);
  Object.keys(g).forEach(function(k){ var a = g[k], n = a.length; if (!n) return; var off = r() / n; a.forEach(function(idea, i){ items.push({idea:idea, pos:mod(i / n + off, 1)}); }); });
  items.sort(function(a, b){ return a.pos - b.pos; });
  return items.map(function(x){ return x.idea; });
}

/* ---- wheel ---- */
var S = {slices:[], sig:"", rotation:0, spinning:false, resultId:null, rolling:false, rollView:null, confirm:false};
var cv = $("#wheel");
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function fitText(ctx, t, max){ if (ctx.measureText(t).width <= max) return t; while (t.length > 1 && ctx.measureText(t + "\u2026").width > max) t = t.slice(0, -1); return t + "\u2026"; }
function draw(){
  var size = Math.max(200, Math.round(cv.getBoundingClientRect().width || 340)), dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cv.width !== Math.round(size * dpr)){ cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
  var ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
  var c = size / 2, R = c - 9, sep = cssVar("--surface"), n = S.slices.length;
  ctx.beginPath(); ctx.arc(c, c, R + 7, 0, TAU); ctx.fillStyle = cssVar("--ink"); ctx.fill();
  if (!n){ ctx.beginPath(); ctx.arc(c, c, R, 0, TAU); ctx.fillStyle = cssVar("--sunk"); ctx.fill(); return; }
  var a = TAU / n, i;
  ctx.save(); ctx.translate(c, c); ctx.rotate(S.rotation);
  for (i = 0; i < n; i++){ var st = -Math.PI / 2 + i * a; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, st, st + a); ctx.closePath(); ctx.fillStyle = SLICE[S.slices[i].who].fill; ctx.fill(); }
  if (n > 1){ ctx.strokeStyle = sep; ctx.lineWidth = Math.max(1.5, size / 240); for (i = 0; i < n; i++){ var an = -Math.PI / 2 + i * a; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * R, Math.sin(an) * R); ctx.stroke(); } }
  var fs = Math.max(9, Math.min(17, (TAU * R * 0.62 / n) * 0.68));
  ctx.font = "700 " + fs.toFixed(1) + "px " + cssVar("--label"); ctx.textBaseline = "middle"; ctx.textAlign = "right";
  for (i = 0; i < n; i++){ ctx.save(); ctx.rotate(-Math.PI / 2 + (i + 0.5) * a); ctx.fillStyle = SLICE[S.slices[i].who].ink; ctx.fillText(fitText(ctx, S.slices[i].short || S.slices[i].title, R * 0.6), R - 12, 0); ctx.restore(); }
  ctx.restore();
}
function refresh(){
  if (S.spinning) return;
  var w = weekKey(), p = pool(w);
  var sig = w + "|" + p.map(function(i){ return i.id + ":" + i.who + ":" + (i.short || ""); }).sort().join(",");
  if (sig !== S.sig){ S.sig = sig; S.slices = buildSlices(p, w); }
  draw(); cv.setAttribute("aria-label", "Date wheel with " + S.slices.length + " slices");
}
function spin(){
  if (S.spinning || !S.slices.length) return;
  var n = S.slices.length, k = Math.floor(rand() * n), f = 0.18 + rand() * 0.64, a = TAU / n, from = S.rotation;
  var to = from + (reduced ? 1 : 6) * TAU + mod(mod(-(k + f) * a, TAU) - mod(from, TAU), TAU);
  var dur = reduced ? 700 : 5200, t0 = performance.now();
  S.spinning = true; S.resultId = null; renderResult(); $("#spin").disabled = true;
  function frame(t){
    var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
    S.rotation = from + (to - from) * e; draw();
    if (p < 1){ requestAnimationFrame(frame); return; }
    S.rotation = mod(to, TAU); S.spinning = false; S.resultId = S.slices[k].id; render();
  }
  requestAnimationFrame(frame);
}

/* ---- dice ---- */
function dieSVG(v){
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon class="d-face" points="50,4 90,27 90,73 50,96 10,73 10,27"/>' +
    '<path class="d-lines" d="M50,24 L76,68 L24,68 Z M50,4 L50,24 M90,27 L50,24 M10,27 L50,24 M90,27 L76,68 M90,73 L76,68 M50,96 L76,68 M50,96 L24,68 M10,73 L24,68 M10,27 L24,68"/>' +
    '<text class="d-num" x="50" y="61" text-anchor="middle">' + (v == null ? "?" : v) + '</text></svg>';
}
function renderDice(){
  var v = S.rollView || rollFor(weekKey()), win = (!S.rolling && v && v.C !== v.K) ? (v.C > v.K ? "C" : "K") : null, mid;
  function die(k){ return '<div class="die die-' + k + (S.rolling ? " rolling" : "") + (win ? (win === k ? " win" : " lose") : "") + '">' + dieSVG(v ? v[k] : null) + '<span class="d-name">' + NAMES[k] + '</span></div>'; }
  if (S.rolling) mid = '<strong>Rolling...</strong>';
  else if (win){
    var lose = win === "C" ? "K" : "C", x = [];
    if (v.ties && v.ties.length) x.push("Tied on " + v.ties.join(", then ") + ", so they rolled again.");
    if (v[win] === 20) x.push("Natural 20!");
    if (v[lose] === 1) x.push("Natural 1 for " + NAMES[lose] + ".");
    if (v.at) x.push("Rolled " + fmtStamp(v.at) + ".");
    mid = '<strong>' + NAMES[win] + ' spins</strong><span class="small muted">' + esc(x.join(" ")) + '</span><button class="btn sm" type="button" data-act="roll">Roll again</button>';
  } else mid = '<span class="small muted">Highest d20 spins this week</span><button class="btn sm primary" type="button" data-act="roll">Roll</button>';
  $("#dice").innerHTML = '<div class="dice">' + die("C") + '<div class="dice-mid" aria-live="polite">' + mid + '</div>' + die("K") + '</div>';
}
function roll(){
  if (S.rolling) return;
  var w = weekKey(), c = d20(), k = d20(), ties = [];
  function d20(){ return 1 + Math.floor(rand() * 20); }
  while (c === k){ ties.push(c); c = d20(); k = d20(); }
  S.rolling = true; S.rollView = {C:d20(), K:d20()}; renderDice();
  var iv = setInterval(function(){ S.rollView = {C:d20(), K:d20()}; renderDice(); }, 70);
  setTimeout(function(){ clearInterval(iv); S.rolling = false; S.rollView = null; L.rolls[w] = {C:c, K:k, ties:ties, at:new Date().toISOString()}; save(); renderDice(); }, reduced ? 300 : 1300);
}

