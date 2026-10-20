'use strict';
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; }   // expose: message is safe to show
}
// Wraps a route handler so any thrown error goes to the error middleware.
const wrap = fn => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function validDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  return !isNaN(d) && `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === s;
}
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
module.exports = { HttpError, wrap, today, validDate, addDays };
