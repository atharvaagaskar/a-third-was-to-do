const ical = require('node-ical');

function eventsInRange(icsText, from, to) {
  const data = ical.sync.parseICS(icsText);
  const out = [];
  const push = (e, start, end, allDay) => {
    if (end <= from || start >= to) return;
    out.push({ title: e.summary || '(no title)', start: +start, end: +end, allDay, location: e.location || '' });
  };

  for (const e of Object.values(data)) {
    if (e.type !== 'VEVENT' || !e.start) continue;
    if (e.status === 'CANCELLED') continue;
    const allDay = e.datetype === 'date';
    const dur = (e.end ? +e.end : +e.start + (allDay ? 864e5 : 0)) - +e.start;

    if (!e.rrule) { push(e, e.start, new Date(+e.start + dur), allDay); continue; }

    const pad = 864e5 * 2;
    const dates = e.rrule.between(new Date(+from - pad - dur), new Date(+to + pad), true);
    for (const d of dates) {
      let t = +d;
      if (allDay) t = +new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      // With a TZID, rrule returns dates whose UTC fields are the true instant's
      // fields in the machine's local zone; rebuild the real instant from them.
      else if (e.rrule.origOptions && e.rrule.origOptions.tzid) {
        t = +new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
      }
      const key = d.toISOString().slice(0, 10);
      if (e.exdate && Object.values(e.exdate).some(x => +x === t || x.toISOString().slice(0, 10) === key)) continue;
      const o = e.recurrences && (e.recurrences[key] || Object.values(e.recurrences).find(r => r.recurrenceid && +r.recurrenceid === t));
      if (o && o.start) push(o, o.start, o.end || new Date(+o.start + dur), o.datetype === 'date');
      else push(e, new Date(t), new Date(t + dur), allDay);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

async function fetchEvents(url, from, to) {
  const res = await fetch(url.replace(/^webcal:/i, 'https:'));
  if (!res.ok) throw new Error('Calendar link returned ' + res.status);
  return eventsInRange(await res.text(), from, to);
}

module.exports = { eventsInRange, fetchEvents };
