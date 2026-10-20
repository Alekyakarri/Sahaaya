'use strict';
// Digital twin of each hospital: a live "virtual copy" of crowding, beds and doctors.
// The walk-in load, beds and doctors are SIMULATED (a smooth, repeatable function of the clock).
// The number of tokens waiting through Sahaaya is REAL (read from the database).
const db = require('./database');
const { today } = require('./util');

const CFG = {   // sample capacity per hospital: beds, doctors, typical peak walk-ins, minutes per patient
  h1: { beds: 60,  doctors: 9,  base: 14, service: 15, seed: 1.3 },
  h2: { beds: 200, doctors: 18, base: 30, service: 18, seed: 4.1 },
  h3: { beds: 120, doctors: 12, base: 20, service: 16, seed: 2.7 },
  h4: { beds: 80,  doctors: 10, base: 16, service: 14, seed: 5.9 }
};
const demand = d => { const h = d.getHours() + d.getMinutes() / 60;   // two daily peaks: ~11 AM and ~6 PM
  return 0.35 + 0.65 * Math.max(Math.exp(-((h - 11) ** 2) / 6), 0.8 * Math.exp(-((h - 18) ** 2) / 5)); };
const wobble = (seed, t) => (Math.sin(t / 7 + seed) + 0.5 * Math.sin(t / 3.1 + seed * 2.3)) / 1.5;   // smooth noise in [-1, 1]
const statusOf = wait => wait < 15 ? 'Low' : wait < 30 ? 'Moderate' : 'High';

function simulate(id, date, realWaiting = 0) {
  const c = CFG[id]; if (!c) return null;
  const t = date.getTime() / 60000, d = demand(date), h = date.getHours();
  const walkIn = Math.max(0, Math.round(c.base * d * (1 + 0.25 * wobble(c.seed, t))));
  const bedsUsed = Math.min(c.beds, Math.max(0, Math.round(c.beds * (0.55 + 0.3 * d + 0.06 * wobble(c.seed + 1, t / 6)))));
  const doctors = (h >= 8 && h < 21) || id === 'h2' ? c.doctors : Math.ceil(c.doctors * 0.4);
  const queue = walkIn + realWaiting;
  const waitMinutes = Math.ceil(queue * c.service / Math.max(1, doctors));
  return { queue, simulatedWalkIns: walkIn, realTokensWaiting: realWaiting, waitMinutes, status: statusOf(waitMinutes),
           bedsTotal: c.beds, bedsFree: c.beds - bedsUsed, doctorsOnDuty: doctors, doctorsTotal: c.doctors };
}
const realWaiting = id => db.prepare(`SELECT COUNT(*) AS n FROM tokens WHERE hospital_id=? AND date=? AND status='Waiting'`).get(id, today()).n;

function snapshot(h, withHistory) {
  const now = new Date(), s = simulate(h.id, now, realWaiting(h.id));
  if (!s) return null;
  const out = { id: h.id, name: h.name, ...s, simulated: true, updatedAt: now.toISOString(),
    note: 'Walk-in queue, beds and doctors are simulated. Only the Sahaaya token count is real.' };
  if (withHistory) out.history = Array.from({ length: 12 }, (_, i) => {   // last 2 hours, every 10 minutes (simulated walk-ins)
    const m = (11 - i) * 10, past = simulate(h.id, new Date(now.getTime() - m * 60000), 0);
    return { minutesAgo: m, queue: past.queue, waitMinutes: past.waitMinutes };
  });
  return out;
}
module.exports = { snapshot };
