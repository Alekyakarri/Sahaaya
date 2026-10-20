'use strict';
const crypto = require('crypto');
// Passwords are never stored in plain text: scrypt + a random salt per user.
exports.hashPassword = pw => {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
};
exports.verifyPassword = (pw, stored) => {
  const [s, h] = String(stored).split(':');
  if (!s || !h) return false;
  const calc = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), exp = Buffer.from(h, 'hex');
  return calc.length === exp.length && crypto.timingSafeEqual(calc, exp);
};
exports.newToken = () => crypto.randomBytes(32).toString('hex');
// Only a hash of the session token is stored in the database.
exports.hashToken = t => crypto.createHash('sha256').update(t).digest('hex');
