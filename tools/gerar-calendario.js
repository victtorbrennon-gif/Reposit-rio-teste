// Gera rotina.ics e agua.ics a partir de plan.js (rotina sugerida).
// Uso: node tools/gerar-calendario.js
// Rode de novo sempre que mudar PRESET_ITEMS ou WATER_TIMES em plan.js.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { uid: () => 'x' };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'plan.js'), 'utf8') + ';this.P={PRESET_ITEMS,WATER_TIMES};', ctx);
const { PRESET_ITEMS, WATER_TIMES } = ctx.P;

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const BASE = new Date(Date.UTC(2026, 10, 23)); // segunda, 23/11/2026
const STAMP = '20261124T120000Z';

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
function fold(line) {
  const out = [];
  let buf = Buffer.from(line, 'utf8');
  while (buf.length > 75) {
    let cut = 75;
    while ((buf[cut] & 0xc0) === 0x80) cut--; // não cortar no meio de um caractere
    out.push(buf.subarray(0, cut).toString('utf8'));
    buf = Buffer.concat([Buffer.from(' '), buf.subarray(cut)]);
  }
  out.push(buf.toString('utf8'));
  return out.join('\r\n');
}
function firstDate(days) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(BASE.getTime() + i * 86400000);
    if (days.includes(d.getUTCDay())) return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
}
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);

function calendar(name, color, events) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Minha Rotina//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${name}`, 'X-WR-TIMEZONE:America/Manaus', `X-APPLE-CALENDAR-COLOR:${color}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H'];
  for (const e of events) {
    const [h, m] = e.time.split(':').map(Number);
    const end = new Date(Date.UTC(2000, 0, 1, h, m + (e.minutes || 10)));
    const endT = `${String(end.getUTCHours()).padStart(2, '0')}${String(end.getUTCMinutes()).padStart(2, '0')}00`;
    const date = firstDate(e.days);
    L.push('BEGIN:VEVENT',
      `UID:${e.uid}@minha-rotina`,
      `DTSTAMP:${STAMP}`,
      `DTSTART:${date}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`,
      `DTEND:${date}T${endT}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${e.days.map((d) => BYDAY[d]).join(',')}`,
      `SUMMARY:${esc(e.title)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

// Rotina: só atividades com horário (as sem horário, como o turno de sábado, ficam no app)
const routine = PRESET_ITEMS.filter(([time]) => time).map(([time, , title, days]) => ({
  uid: `rotina-${days.join('')}-${time.replace(':', '')}-${slug(title)}`, time, title, days,
}));
const water = WATER_TIMES.flatMap(([days, times]) => times.map((time) => ({
  uid: `agua-${days.join('')}-${time.replace(':', '')}`, time, title: '💧 Beber água (1 copo)', days, minutes: 5,
})));

fs.writeFileSync(path.join(root, 'rotina.ics'), calendar('Minha Rotina', '#4F46E5', routine));
fs.writeFileSync(path.join(root, 'agua.ics'), calendar('Água', '#0EA5E9', water));
console.log(`rotina.ics: ${routine.length} eventos · agua.ics: ${water.length} eventos`);
