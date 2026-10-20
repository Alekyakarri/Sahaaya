'use strict';
// Opens the SQLite database (created automatically), builds the tables and adds demo data.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./security');

const dbFile = process.env.SAHAAYA_DB || path.join(__dirname, 'data', 'sahaaya.db');
if (dbFile !== ':memory:') fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Government','Private')),
  address TEXT NOT NULL,
  km REAL NOT NULL,
  hours TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (hospital_id, name)
);
CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS hospital_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS care_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('pharmacy','lab')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  department TEXT NOT NULL,
  doctor TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed','Cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  hospital_id TEXT NOT NULL REFERENCES hospitals(id),
  date TEXT NOT NULL,
  seq INTEGER NOT NULL,
  token_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting','Cancelled')),
  UNIQUE (hospital_id, date, seq)
);
CREATE INDEX IF NOT EXISTS idx_appt_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_token_day ON tokens(hospital_id, date);
`);

function seed() {
  if (db.prepare('SELECT COUNT(*) AS n FROM hospitals').get().n > 0) return;
  // ALL NAMES, DOCTORS AND ADDRESSES BELOW ARE SAMPLE DATA FOR THE PROTOTYPE.
  const data = [
    ['h1','Sri Sai Hospital','Private','Rao Gopal Rao Rd, Bhimavaram',1.2,'Mon-Sat 9 AM-9 PM, Sun 9 AM-2 PM',
      {'General Medicine':['Dr. S. Ramesh'],'Pediatrics':['Dr. V. Prasad'],'Cardiology':['Dr. K. Anitha'],'Orthopedics':['Dr. M. Rao'],'Gynecology':['Dr. L. Devi']},
      ['Emergency OPD','Lab Services','Pharmacy']],
    ['h2','Government General Hospital','Government','Main Rd, Bhimavaram',2.3,'Sample timings: open 24 hours',
      {'General Medicine':['Dr. P. Kumar'],'Pediatrics':['Dr. S. Lakshmi'],'Orthopedics':['Dr. R. Babu']},
      ['Emergency OPD','Lab Services','Pharmacy']],
    ['h3','Area Hospital','Government','Station Rd, Bhimavaram',3.1,'Sample timings: 8 AM-8 PM',
      {'General Medicine':['Dr. T. Naidu'],'Gynecology':['Dr. A. Sundari']},['Lab Services','Pharmacy']],
    ['h4','City Care Hospital','Private','NH16, Bhimavaram',2.8,'Sample timings: 9 AM-8 PM',
      {'General Medicine':['Dr. N. Varma'],'Cardiology':['Dr. B. Reddy'],'Pediatrics':['Dr. C. Priya']},['Lab Services','Pharmacy']]
  ];
  const care = [
    ['pharmacy','Prescription medicines',"Bring your doctor's prescription to the hospital pharmacy.",'fa-prescription-bottle-medical'],
    ['pharmacy','Over-the-counter items','Common medicines available at in-house pharmacies.','fa-pills'],
    ['pharmacy','Prescription records','Keep your prescriptions handy for each visit.','fa-file-medical'],
    ['lab','Blood tests','Complete blood count, sugar and more.','fa-vial'],
    ['lab','Scans','X-ray and ultrasound where available.','fa-x-ray'],
    ['lab','Diagnostics','Ask the hospital for the full test list.','fa-microscope']
  ];
  db.exec('BEGIN');
  try {
    for (const [id, name, type, addr, km, hours, depts, svcs] of data) {
      db.prepare('INSERT INTO hospitals(id,name,type,address,km,hours) VALUES(?,?,?,?,?,?)').run(id, name, type, addr, km, hours);
      for (const [dn, docs] of Object.entries(depts)) {
        const did = Number(db.prepare('INSERT INTO departments(hospital_id,name) VALUES(?,?)').run(id, dn).lastInsertRowid);
        for (const d of docs) db.prepare('INSERT INTO doctors(department_id,name) VALUES(?,?)').run(did, d);
      }
      for (const s of svcs) db.prepare('INSERT INTO hospital_services(hospital_id,name) VALUES(?,?)').run(id, s);
    }
    for (const c of care) db.prepare('INSERT INTO care_services(kind,title,description,icon) VALUES(?,?,?,?)').run(...c);
    // Demo account so you can log in immediately: madhuri@sahaaya.care / demo1234
    db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash) VALUES(?,?,?)').run('Madhuri', 'madhuri@sahaaya.care', hashPassword('demo1234'));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
seed();
module.exports = db;
