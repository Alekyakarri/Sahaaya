'use strict';
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\nSahaaya needs Node.js 22.13 or newer (built-in SQLite). You have ${process.versions.node}.\nInstall the LTS version from https://nodejs.org, then run "npm start" again.\n`);
  process.exit(1);
}
const path = require('path');
const fs = require('fs');
const express = require('express');
require('./database');                       // creates the database file, tables and demo data
const { router: authRoutes } = require('./routes/auth');
const hospitalRoutes = require('./routes/hospitals');
const appointmentRoutes = require('./routes/appointments');
const twinRoutes = require('./routes/twin');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND = path.join(__dirname, '..', 'frontend');
app.disable('x-powered-by');

// Allows the frontend to also work when opened from another local port (e.g. VS Code Live Server)
app.use((req, res, next) => {
  const o = req.get('origin');
  if (o && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
app.use(express.json({ limit: '10kb' }));

app.use('/api', authRoutes);
app.use('/api', hospitalRoutes);
app.use('/api', appointmentRoutes);
app.use('/api', twinRoutes);
app.use('/api', aiRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

if (fs.existsSync(FRONTEND)) app.use(express.static(FRONTEND));   // serves ../frontend at http://localhost:3000

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const hide = status >= 500 && !err.expose;      // real crashes stay hidden; deliberate messages are shown
  if (hide) console.error(err);
  res.status(status).json({ error: hide ? 'Something went wrong on the server.' : (err.type === 'entity.parse.failed' ? 'Invalid JSON.' : err.message) });
});

app.listen(PORT, () => {
  console.log(`\nSahaaya is running:  http://localhost:${PORT}`);
  console.log(`Health check:        http://localhost:${PORT}/api/health`);
  console.log('Demo login:          madhuri@sahaaya.care / demo1234\n');
});
