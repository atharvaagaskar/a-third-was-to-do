const $ = s => document.querySelector(s);
const HOURS_BACK = 1, HOURS_AHEAD = 5, H = 3600e3;

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => showTab(b.dataset.tab));
function showTab(t) {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.dataset.tab === t));
  $('#cal').hidden = t !== 'cal'; $('#todo').hidden = t !== 'todo';
  if (t === 'cal') loadCal(); else $('#new').focus();
  try { localStorage.tab = t; } catch {}
}

// ---------- calendar ----------
let events = [], loaded = 0;
const fmt = d => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();

async function loadCal() {
  if (Date.now() - loaded < 60e3 && loaded) return draw();
  const now = Date.now();
  const r = await api.events(now - 24 * H, now + 24 * H);
  if (r.needsSetup) { $('#calmsg').textContent = 'Tap Link (top right) to connect Google Calendar.'; events = []; return draw(); }
  if (r.error) { $('#calmsg').textContent = "Couldn't reach your calendar. " + r.error; return draw(); }
  $('#calmsg').textContent = ''; events = r.events; loaded = now; draw();
}

function draw() {
  const now = Date.now();
  const start = Math.floor((now - HOURS_BACK * H) / (H / 2)) * (H / 2); // snap to the half hour
  const end = now + HOURS_AHEAD * H;
  const span = end - start;
  const pct = t => ((t - start) / span) * 100;
  $('#calday').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  const today = new Date().setHours(0, 0, 0, 0);
  const ad = events.filter(e => e.allDay && e.start <= today && e.end > today);
  $('#allday').innerHTML = ad.map(e => `<span class="chip"></span>`).join('');
  [...$('#allday').children].forEach((c, i) => c.textContent = ad[i].title);

  const g = $('#grid'); g.innerHTML = '';
  for (let t = Math.ceil(start / H) * H; t <= end; t += H) {
    const l = document.createElement('div'); l.className = 'hr'; l.style.top = pct(t) + '%';
    const s = document.createElement('span');
    s.textContent = new Date(t).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '').toLowerCase();
    l.append(s); g.append(l);
  }
  const vis = events.filter(e => !e.allDay && e.end > start && e.start < end);
  // simple side-by-side columns for overlaps
  const cols = []; vis.forEach(e => { let c = cols.findIndex(x => x <= e.start); if (c < 0) c = cols.length; cols[c] = e.end; e.col = c; });
  vis.forEach(e => {
    const n = Math.max(...vis.filter(o => o.start < e.end && o.end > e.start).map(o => o.col)) + 1;
    const d = document.createElement('div'); d.className = 'ev' + (e.end < now ? ' past' : '');
    const top = Math.max(0, pct(e.start)), bot = Math.min(100, pct(e.end));
    Object.assign(d.style, { top: top + '%', height: `calc(${bot - top}% - 2px)`, left: `calc(6px + ${e.col / n * 100}%)`, width: `calc(${100 / n}% - 6px)`, right: 'auto' });
    d.innerHTML = '<b></b><i></i>';
    d.firstChild.textContent = e.title;
    d.lastChild.textContent = fmt(e.start) + ' – ' + fmt(e.end) + (e.location ? ' · ' + e.location : '');
    g.append(d);
  });
  const nl = document.createElement('div'); nl.id = 'now'; nl.style.top = pct(now) + '%'; g.append(nl);
}
setInterval(() => { if (!$('#cal').hidden) { loaded && Date.now() - loaded > 300e3 ? loadCal() : draw(); } }, 30e3);
api.onShown(() => { if (!$('#cal').hidden) loadCal(); });

// ---------- calendar link setup ----------
$('#gear').onclick = async () => { $('#url').value = (await api.getCfg()).icalUrl || ''; $('#setup').hidden = false; $('#url').focus(); };
$('#cancel').onclick = () => $('#setup').hidden = true;
$('#save').onclick = async () => { await api.setCfg({ icalUrl: $('#url').value.trim() }); loaded = 0; $('#setup').hidden = true; loadCal(); };

// ---------- to-do ----------
let todos = [];
try { todos = JSON.parse(localStorage.todos || '[]'); } catch {}
const save = () => { try { localStorage.todos = JSON.stringify(todos); } catch {} };
const uid = () => Math.random().toString(36).slice(2);

function render() {
  const ol = $('#list'); ol.innerHTML = '';
  todos.forEach(t => {
    const li = document.createElement('li'); li.draggable = true; li.dataset.id = t.id; li.className = t.done ? 'done' : '';
    li.innerHTML = '<span class="box"></span><span class="txt"></span><button class="del" title="Delete">&times;</button>';
    const txt = li.querySelector('.txt'); txt.textContent = t.text;
    li.querySelector('.box').onclick = () => { t.done = !t.done; save(); render(); };
    li.querySelector('.del').onclick = () => { todos = todos.filter(x => x !== t); save(); render(); };
    txt.ondblclick = () => { li.draggable = false; txt.contentEditable = true; txt.focus(); };
    const finish = () => { txt.contentEditable = false; li.draggable = true; const v = txt.textContent.trim(); if (v) t.text = v; else todos = todos.filter(x => x !== t); save(); render(); };
    txt.onblur = finish;
    txt.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); txt.blur(); } };
    ol.append(li);
  });
  const left = todos.filter(t => !t.done).length;
  $('#count').textContent = todos.length ? `${left} left` : 'Nothing yet';
}

$('#add').onsubmit = e => {
  e.preventDefault(); const v = $('#new').value.trim(); if (!v) return;
  todos.push({ id: uid(), text: v, done: false }); $('#new').value = ''; save(); render();
  $('#list').scrollTop = 1e9;
};
$('#clear').onclick = () => { todos = todos.filter(t => !t.done); save(); render(); };

// drag to reorder
let dragEl = null;
$('#list').addEventListener('dragstart', e => { dragEl = e.target.closest('li'); dragEl.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
$('#list').addEventListener('dragover', e => {
  e.preventDefault(); if (!dragEl) return;
  const over = e.target.closest('li'); if (!over || over === dragEl) return;
  const r = over.getBoundingClientRect();
  over.parentNode.insertBefore(dragEl, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
});
$('#list').addEventListener('drop', e => e.preventDefault());
$('#list').addEventListener('dragend', () => {
  if (!dragEl) return; dragEl.classList.remove('drag'); dragEl = null;
  const order = [...$('#list').children].map(li => li.dataset.id);
  todos.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)); save(); render();
});

render();
let tab = 'cal'; try { tab = localStorage.tab || 'cal'; } catch {}
showTab(tab);
