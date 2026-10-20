/* ================= DATA & LANGUAGES ================= */
/* Hospitals, time slots and the start point are loaded from the backend (see boot()). */
let HOSPITALS = [], TIMES = [], START = 'Gollakoderu, Bhimavaram';
const API = (location.port && location.port !== '3000') ? 'http://localhost:3000' : '';
const LANGS = {
  en:{n:'English',code:'en-IN',tag:'Your Health. Our Support.',hdr:'Smart Healthcare Navigation',ph:'Search hospitals, departments, services...',find:'Find Hospitals',book:'Book Appointment',emg:'Emergency Help',near:'Nearby Hospitals'},
  te:{n:'తెలుగు',code:'te-IN',tag:'మీ ఆరోగ్యం. మా తోడ్పాటు.',hdr:'స్మార్ట్ హెల్త్‌కేర్ నావిగేషన్',ph:'ఆసుపత్రుల కోసం శోధించండి...',find:'ఆసుపత్రులు కనుగొనండి',book:'అపాయింట్‌మెంట్ బుక్ చేయండి',emg:'అత్యవసర సహాయం',near:'సమీప ఆసుపత్రులు'},
  hi:{n:'हिंदी',code:'hi-IN',tag:'आपका स्वास्थ्य। हमारा सहयोग।',hdr:'स्मार्ट हेल्थकेयर नेविगेशन',ph:'अस्पताल खोजें...',find:'अस्पताल खोजें',book:'अपॉइंटमेंट बुक करें',emg:'आपातकालीन सहायता',near:'नज़दीकी अस्पताल'},
  ta:{n:'தமிழ்',code:'ta-IN',tag:'உங்கள் ஆரோக்கியம். எங்கள் ஆதரவு.',hdr:'ஸ்மார்ட் சுகாதார வழிகாட்டி',ph:'மருத்துவமனையை தேடுக...',find:'மருத்துவமனைகள்',book:'முன்பதிவு செய்க',emg:'அவசர உதவி',near:'அருகிலுள்ள மருத்துவமனைகள்'},
  kn:{n:'ಕನ್ನಡ',code:'kn-IN',tag:'ನಿಮ್ಮ ಆರೋಗ್ಯ. ನಮ್ಮ ಬೆಂಬಲ.',hdr:'ಸ್ಮಾರ್ಟ್ ಹೆಲ್ತ್‌ಕೇರ್ ನ್ಯಾವಿಗೇಷನ್',ph:'ಆಸ್ಪತ್ರೆ ಹುಡುಕಿ...',find:'ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ',book:'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ',emg:'ತುರ್ತು ನೆರವು',near:'ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು'}
};
/* Screen order lives here, NOT in the page structure */
const SCREENS = [
  ['home','Home Page','Nearby Hospitals & Emergency'],['login','Login Page','Login'],['list','Hospitals List','Hospitals List'],
  ['details','Hospital Details','Departments & Map'],['book','Book Appointment','Book Appointment'],['voice','Voice & Language','Voice Recognition & Language Selection'],
  ['appts','Appointments & Tracking','Appointments & Token Tracking'],['pharm','Pharmacy & Labs','Pharmacy & Lab Services'],
  ['token','Token Allocation','Token Allocation'],['map','Map View','Nearby Hospitals Map View'],['lang','Multi-Language','Multi-Language Support']
];

/* ================= STATE ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = n => { const d = new Date(); d.setDate(d.getDate()+n); return ymd(d); };
const fmtDate = s => new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const load = (k,f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch(e) { return f; } };
const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
const S = {
  screen:'home', lang:load('sahaaya.lang','en'), user:null, apptsReady:false, twin:{}, twinD:null, twinAI:{}, ai:{q:'',a:'',emg:false,busy:false,err:'',model:''}, care:null, results:null, reg:false, loginMsg:'', after:'', fatal:'', q:'', filter:'All', hid:'h1',
  appts:[], b:{h:'h1',d:'',doc:'',date:addDays(0),time:''}, conf:null, open:null,
  listening:false, vmsg:'', day:0, tk:{h:'h1',d:''}, tkResult:null, mode:'driving', eye:false
};
const T = k => LANGS[S.lang][k];
const hosp = id => HOSPITALS.find(h => h.id === id);
const placeUrl = h => 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(h.name+', '+h.addr);
const mapsUrl = (h,mode) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(START)}&destination=${encodeURIComponent(h.name+', '+h.addr)}&travelmode=${mode}`;
const toast = m => { const t=$('#toast'); t.textContent=m; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.add('hidden'),2600); };
const head = (t,s) => `<div class="mb-4"><h2 class="text-2xl font-extrabold">${t}</h2><p class="text-sm text-slate-500 mt-1">${s}</p></div>`;
const sel = (id,opts,val,ph) => `<select id="${id}" data-bind="${id}" class="w-full rounded-xl border-slate-300 min-h-[48px]">${ph?`<option value="">${ph}</option>`:''}${opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===val?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
const hospOpts = () => HOSPITALS.map(h => [h.id,h.name]);
const deptOpts = h => Object.keys(hosp(h).depts).map(d => [d,d]);

/* ================= BACKEND API ================= */
const SESS = 'sahaaya.session';
const getTok = () => { try { return localStorage.getItem(SESS) || sessionStorage.getItem(SESS); } catch(e) { return null; } };
const setTok = (t, remember) => { try { localStorage.removeItem(SESS); sessionStorage.removeItem(SESS); if (t) (remember ? localStorage : sessionStorage).setItem(SESS, t); } catch(e) {} };
async function api(path, opt = {}) {
  let res;
  try {
    res = await fetch(API + path, { method: opt.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(getTok() ? { Authorization: 'Bearer ' + getTok() } : {}) },
      body: opt.body ? JSON.stringify(opt.body) : undefined });
  } catch (e) {
    const err = new Error('Cannot reach the Sahaaya server. Start the backend (npm start in the backend folder) and open http://localhost:3000');
    err.network = true; throw err;
  }
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    if (res.status === 401 && getTok() && !path.startsWith('/api/auth/login')) { setTok(null); S.user = null; }
    const err = new Error((data && data.error) || 'Request failed (' + res.status + ')'); err.status = res.status; throw err;
  }
  return data;
}
const norm = a => ({ id:a.id, hid:a.hospitalId, hn:a.hospitalName, dept:a.department, doc:a.doctor, date:a.date, time:a.time,
  status:a.status, token:a.token, tokenStatus:a.tokenStatus, ahead:a.ahead, created:a.createdAt });
let seq = 0, st;
async function runSearch() {
  const n = ++seq;
  try { const d = await api('/api/hospitals?q=' + encodeURIComponent(S.q) + '&type=' + encodeURIComponent(S.filter)); if (n === seq) S.results = d.hospitals; }
  catch (e) { if (n === seq) { S.results = []; toast(e.message); } }
}
const DEMO = { loc:'Demo data — sample hospitals for Bhimavaram. Hospital availability, waiting time and token information are simulated for this prototype.',
  token:'Demo data — token availability is simulated for this prototype and is not connected to any hospital.',
  book:'Demo slots — your booking is stored in this prototype only and is not sent to any hospital.' };
const demoNote = k => `<div class="text-xs rounded-xl px-3 py-2 my-3" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e"><i class="fa-solid fa-flask mr-1"></i>${DEMO[k]}</div>`;
async function refreshTwin() { try { const d = await api('/api/twin'); S.twin = Object.fromEntries(d.hospitals.map(h => [h.id, h])); } catch (e) {} }
async function refreshTwinDetail() { try { S.twinD = await api('/api/twin/' + encodeURIComponent(S.hid)); } catch (e) {} }
const crowd = { Low:'background:#dcfce7;color:#166534', Moderate:'background:#fef3c7;color:#92400e', High:'background:#fee2e2;color:#b91c1c' };
const twinChip = id => { const t = S.twin[id]; return t ? `<p class="text-xs text-slate-500 mt-1"><i class="fa-regular fa-clock mr-1"></i>Est. wait ~${t.waitMinutes} min <span class="chip" style="${crowd[t.status]}">${t.status} crowding</span> <span class="text-slate-400">(simulated)</span></p>` : ''; };
function twinCard(h) {
  const t = S.twinD && S.twinD.id === h.id ? S.twinD : S.twin[h.id];
  if (!t) return '<div class="text-sm text-slate-500">Loading digital twin...</div>';
  const tile = (v, l, i) => `<div class="rounded-xl bg-brand-50 p-3 text-center"><i class="fa-solid ${i} text-brand-500"></i><div class="text-2xl font-extrabold mt-1">${v}</div><div class="text-xs text-slate-500">${l}</div></div>`;
  const hist = t.history ? `<div class="mt-4"><div class="text-xs font-semibold text-slate-500 mb-1">Waiting trend, last 2 hours (simulated)</div><div class="flex items-end gap-1" style="height:56px" aria-hidden="true">${(mx => t.history.map(p => `<div title="${p.minutesAgo} min ago: ${p.waitMinutes} min wait" style="flex:1;border-radius:4px 4px 0 0;background:${p.minutesAgo?'#bae0fd':'#2563eb'};height:${Math.max(6, Math.round(p.waitMinutes / mx * 56))}px"></div>`).join(''))(Math.max(1, ...t.history.map(p => p.waitMinutes)))}</div></div>` : '';
  const x = S.twinAI[h.id];
  return `<div class="flex flex-wrap items-center justify-between gap-2"><div><h3 class="font-bold text-lg">Digital Twin — Prototype Simulation</h3><p class="text-xs text-slate-500">Walk-in queue, beds and doctors are simulated. Only the tokens booked through Sahaaya (${t.realTokensWaiting} today) are real.</p></div><span class="chip" style="background:#fef3c7;color:#92400e">SIMULATED</span></div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">${tile(t.queue,'People waiting (est.)','fa-people-group')}${tile(t.waitMinutes+' min','Estimated wait','fa-hourglass-half')}${tile(t.bedsFree+'/'+t.bedsTotal,'Beds free (simulated)','fa-bed')}${tile(t.doctorsOnDuty,'Doctors on duty (simulated)','fa-user-doctor')}</div>
  <div class="mt-3"><span class="chip" style="${crowd[t.status]}">${t.status} crowding (simulated)</span></div>${hist}
  <div class="mt-4"><button class="btn-o" data-act="explain"><i class="fa-solid fa-wand-magic-sparkles"></i> Explain with AI</button></div>
  ${x?`<div class="mt-3 rounded-xl border border-slate-200 p-3 text-sm" style="white-space:pre-wrap">${x.busy?'Thinking... small local models can take a few seconds.':esc(x.text)}${x.busy?'':`<div class="text-xs text-slate-400 mt-2">${x.aiUsed?'AI-generated by local model ('+esc(x.model)+'). AI can make mistakes; not medical advice.':'Automatic summary - local AI is unavailable in this environment.'}</div>`}</div>`:''}`;
}
const AI_EX = ['Which hospital has cardiology?', 'Which hospital has the shortest wait now?', 'Where can I get a blood test?'];
function aiAnswer() { const a = S.ai;
  if (a.busy) return '<p class="text-sm text-slate-500 mt-3">Thinking... small local models can take a few seconds.</p>';
  if (a.err) return `<p class="text-sm mt-3" style="color:#b91c1c">${esc(a.err)}</p>`;
  if (!a.a) return '';
  return a.emg ? `<div class="mt-3 rounded-xl p-3 text-sm" style="background:#fef2f2;border:1px solid #fecaca;white-space:pre-wrap"><b style="color:#b91c1c">${esc(a.a)}</b><a class="btn-r w-full mt-3" href="tel:112">Call 112</a></div>`
    : `<div class="mt-3 rounded-xl border border-slate-200 p-3 text-sm" style="white-space:pre-wrap">${esc(a.a)}<div class="text-xs text-slate-400 mt-2">${a.fallback?'Simple keyword search - local AI is unavailable in this environment.':'AI-generated by local model ('+esc(a.model)+'). AI can make mistakes; not medical advice.'}</div></div>`; }
function aiCard() { return `<div class="max-w-xl mx-auto card mt-3"><div class="flex items-center justify-between"><h3 class="font-bold text-lg">Sahaaya Assistant</h3><span class="chip t">Local AI</span></div>
  <p class="text-xs text-slate-500 mt-1">Ask about hospitals, departments and waiting times. It runs on a model on this computer (LM Studio). Small models make mistakes, and it never gives medical advice.</p>
  <div class="flex flex-wrap gap-2 mt-3">${AI_EX.map((q, i) => `<button class="fchip" data-act="aiex" data-id="${i}">${esc(q)}</button>`).join('')}</div>
  <div class="flex gap-2 mt-3"><input id="aiq" maxlength="300" value="${esc(S.ai.q)}" placeholder="Ask in ${LANGS[S.lang].n} or English..." class="flex-1 rounded-xl border-slate-300 min-h-[48px]"><button class="btn" data-act="ask">Ask</button></div>
  <div id="aians" aria-live="polite">${aiAnswer()}</div></div>`; }

const LOAD = {
  home: refreshTwin,
  details: async () => { await Promise.all([refreshTwin(), refreshTwinDetail()]); },
  list: async () => { await Promise.all([runSearch(), refreshTwin()]); },
  appts: async () => { if (!S.user) { S.appts = []; S.apptsReady = true; return; }
    try { S.appts = (await api('/api/appointments')).appointments.map(norm); } catch (e) { toast(e.message); }
    S.apptsReady = true; },
  pharm: async () => { try { S.care = (await api('/api/care-services')).services; } catch (e) { toast(e.message); } }
};
function enter(id) { const f = LOAD[id]; if (f) f().then(() => { if (S.screen === id) render(); }); }
const fatalCard = () => `<div class="max-w-xl mx-auto card text-center"><i class="fa-solid fa-plug-circle-xmark text-2xl" style="color:#b91c1c"></i>
  <h2 class="text-xl font-extrabold mt-2">Cannot reach the Sahaaya server</h2><p class="text-sm text-slate-600 mt-2">${esc(S.fatal)}</p>
  <button class="btn mt-4" data-act="retry">Try again</button></div>`;
async function boot() {
  $('#view').innerHTML = '<div class="card text-center text-slate-500">Loading Sahaaya...</div>';
  try {
    const [m, h] = await Promise.all([api('/api/meta'), api('/api/hospitals')]);
    TIMES = m.slots; START = m.startPoint; HOSPITALS = h.hospitals;
    if (HOSPITALS.length) { S.hid = HOSPITALS[0].id; S.b.h = S.hid; S.tk.h = S.hid; }
    if (getTok()) { try { S.user = (await api('/api/auth/me')).user; } catch (e) { setTok(null); } }
    S.fatal = ''; await refreshTwin();
  } catch (e) { S.fatal = e.message; }
  render(); if (!S.fatal) enter(S.screen);
}

/* ================= NAVIGATION (index based) ================= */
function go(id){ if (!SCREENS.some(s=>s[0]===id)) return; if(id!=='book') S.conf=null; S.screen=id;
  if(location.hash!=='#'+id) location.hash=id; render(); enter(id); window.scrollTo({top:0}); }
function step(d){ const i = SCREENS.findIndex(s=>s[0]===S.screen); go(SCREENS[(i+d+SCREENS.length)%SCREENS.length][0]); }

/* ================= SCREENS ================= */
function hospCard(h, compact){
  return `<div class="card"><div class="flex items-start justify-between gap-2"><div><h3 class="font-bold text-lg">${esc(h.name)}</h3>
  <p class="text-sm text-slate-500 mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i>${esc(h.addr)} - ${h.km} km</p>${twinChip(h.id)}</div><span class="chip ${h.type==='Government'?'t':''}">${h.type}</span></div>
  <div class="flex flex-wrap gap-1.5 mt-3">${Object.keys(h.depts).map(d=>`<span class="chip">${d}</span>`).join('')}</div>
  <div class="grid grid-cols-2 gap-2 mt-4">${compact
    ? `<button class="btn-o" data-act="route" data-id="${h.id}"><i class="fa-solid fa-route"></i> Route</button><button class="btn-o" data-act="details" data-id="${h.id}">View Details</button>`
    : `<button class="btn-o" data-act="details" data-id="${h.id}">View Details</button><button class="btn" data-act="bookfor" data-id="${h.id}">Book Visit</button>`}</div></div>`;
}
const V = {
  home(){ const near=[...HOSPITALS].sort((a,b)=>a.km-b.km).slice(0,2);
    return `<section class="card" style="background:#f0f7ff"><div class="chip t inline-block mb-3">${T('hdr')}</div>
    <h1 class="text-3xl md:text-4xl font-extrabold">${S.user?'Hello, '+esc(S.user.name)+'. ':''}Find the right care, faster.</h1>
    <p class="text-slate-600 mt-2 max-w-xl">Search hospitals, departments and services, book a visit and get directions.</p>
    <div class="flex flex-col sm:flex-row gap-2 mt-5"><input id="homeq" value="${esc(S.q)}" placeholder="${esc(T('ph'))}" class="flex-1 rounded-xl border-slate-300 min-h-[52px] text-base">
    <button class="btn" data-act="homesearch"><i class="fa-solid fa-magnifying-glass"></i> Search</button></div></section>
    <div class="grid md:grid-cols-3 gap-3 mt-3">
      <button class="card text-left" data-go="list"><i class="fa-solid fa-hospital text-brand-500 text-2xl"></i><div class="font-bold mt-2">${T('find')}</div><div class="text-xs text-slate-500">Explore by location and department</div></button>
      <button class="card text-left" data-go="book"><i class="fa-solid fa-calendar-check text-teal-600 text-2xl"></i><div class="font-bold mt-2">${T('book')}</div><div class="text-xs text-slate-500">Pick a doctor, date and time slot</div></button>
      <a class="card text-left" style="background:#fef2f2;border-color:#fecaca" href="tel:112"><i class="fa-solid fa-truck-medical text-red-600 text-2xl"></i><div class="font-bold mt-2 text-red-700">${T('emg')}</div><div class="text-xs text-red-600">Tap to call 112 (ambulance 108)</div></a></div>
    ${demoNote('loc')}<div class="flex items-center justify-between mt-3 mb-3"><h2 class="text-xl font-extrabold">${T('near')}</h2><button class="text-sm font-bold text-brand-600" data-go="list">View all</button></div>
    <div class="grid md:grid-cols-2 gap-3">${near.map(h=>hospCard(h,true)).join('')}</div>`; },
  login(){ const reg=S.reg; return `<div class="max-w-md mx-auto card">${head(reg?'Create your account':'Login to your account',reg?'Your demo account is saved in the Sahaaya database on this computer.':'Log in to book appointments and see your tokens. Demo user: madhuri@sahaaya.care / demo1234')}
    ${S.loginMsg?`<div class="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-900">${esc(S.loginMsg)}</div>`:''}
    ${S.user?`<div class="rounded-xl bg-teal-50 border border-teal-200 p-3 mb-4 text-sm flex items-center justify-between gap-2"><span>Logged in as <b>${esc(S.user.email)}</b></span><button class="btn-s" data-act="logout">Logout</button></div>`:''}
    ${reg?`<label class="lbl" for="nm">Name</label><input id="nm" autocomplete="name" placeholder="Alekya Karri" class="w-full rounded-xl border-slate-300 min-h-[48px] mb-4">`:''}
    <label class="lbl" for="em">Email</label><input id="em" type="email" autocomplete="email" value="${esc(S.user?S.user.email:'')}" placeholder="you@example.com" class="w-full rounded-xl border-slate-300 min-h-[48px]">
    <label class="lbl mt-4" for="pw">Password</label><div class="relative"><input id="pw" type="${S.eye?'text':'password'}" autocomplete="${reg?'new-password':'current-password'}" class="w-full rounded-xl border-slate-300 min-h-[48px] pr-12"><button class="absolute right-3 top-3 text-slate-400" data-act="eye" aria-label="Show password"><i class="fa-regular ${S.eye?'fa-eye-slash':'fa-eye'}"></i></button></div>
    <label class="flex items-center gap-2 mt-4 text-sm"><input id="rem" type="checkbox" checked class="rounded"> Remember Me</label>
    <p id="lerr" class="text-sm text-red-600 mt-3 hidden"></p>
    <button class="btn w-full mt-5" data-act="login">${reg?'Create account':'Login'}</button>
    <p class="text-sm text-center mt-4">${reg?'Already have an account?':"Don't have an account yet?"} <button class="font-bold text-brand-600" data-act="regmode">${reg?'Login':'Signup'}</button></p>
    <p class="text-xs text-slate-500 text-center mt-3">Passwords are stored as secure hashes. This is a prototype - do not use a real password.</p></div>`; },
  list(){ return `${head('Hospitals List','Sample hospitals - verify details with the hospital before visiting.')}${demoNote('loc')}
    <input id="listq" value="${esc(S.q)}" placeholder="${esc(T('ph'))}" class="w-full rounded-xl border-slate-300 min-h-[52px]">
    <div class="flex flex-wrap gap-2 my-3">${['All','Government','Private'].map(f=>`<button class="fchip ${S.filter===f?'on':''}" data-act="filter" data-id="${f}">${f}</button>`).join('')}${S.q?`<button class="btn-s ml-auto" data-act="clear"><i class="fa-solid fa-xmark"></i> Clear search</button>`:''}</div>
    <div id="results" class="grid md:grid-cols-2 gap-3">${results()}</div>`; },
  details(){ const h=hosp(S.hid);
    return `<button class="btn-s mb-3" data-go="list"><i class="fa-solid fa-arrow-left"></i> Back to Hospitals List</button>
    <div class="grid lg:grid-cols-3 gap-3"><div class="lg:col-span-2 card"><div class="flex justify-between gap-2"><div><h2 class="text-2xl font-extrabold">${esc(h.name)}</h2><p class="text-sm text-slate-500 mt-1"><i class="fa-solid fa-location-dot mr-1"></i>${esc(h.addr)}</p></div><span class="chip ${h.type==='Government'?'t':''}">${h.type}</span></div>
      <h3 class="font-bold mt-5 mb-2">Departments</h3><div class="grid sm:grid-cols-2 gap-2">${Object.entries(h.depts).map(([d,docs])=>`<div class="rounded-xl border border-slate-200 p-3"><div class="font-semibold">${d}</div><div class="text-xs text-slate-500">${docs.join(', ')}</div></div>`).join('')}</div>
      <h3 class="font-bold mt-5 mb-2">Available services</h3><div class="flex flex-wrap gap-1.5">${h.services.map(s=>`<span class="chip t">${s}</span>`).join('')}</div>
      <p class="text-sm text-slate-600 mt-4"><i class="fa-regular fa-clock mr-1"></i>${esc(h.hours)}</p>
      <p class="text-sm text-slate-600 mt-1"><i class="fa-solid fa-phone mr-1"></i>Phone: not shown (sample data)</p>
      <div class="grid sm:grid-cols-2 gap-2 mt-5"><button class="btn" data-act="bookfor" data-id="${h.id}">Book Appointment</button><button class="btn-o" data-act="route" data-id="${h.id}"><i class="fa-solid fa-route"></i> Get Directions</button></div></div>
    <div class="card"><h3 class="font-bold mb-2">Location preview</h3>${mapBox(h,220)}<a class="btn-o w-full mt-3" target="_blank" rel="noopener" href="${placeUrl(h)}">Open in Google Maps</a></div></div>
    <div id="twin" class="card mt-3">${twinCard(h)}</div>`; },
  book(){ const b=S.b, h=hosp(b.h), docs=b.d&&h.depts[b.d]?h.depts[b.d]:[];
    return `<div class="max-w-2xl mx-auto">${S.conf?confirmCard():''}<div class="card">${head('Book Appointment','Choose hospital, department, doctor, date and time.')}
    <div class="grid sm:grid-cols-2 gap-4"><div><label class="lbl" for="b.h">Hospital</label>${sel('b.h',hospOpts(),b.h)}</div>
    <div><label class="lbl" for="b.d">Department</label>${sel('b.d',deptOpts(b.h),b.d,'Select department')}</div>
    <div><label class="lbl" for="b.doc">Doctor</label>${sel('b.doc',docs.map(d=>[d,d]),b.doc,docs.length?'Select doctor':'Choose department first')}</div>
    <div><label class="lbl" for="b.date">Date</label><input id="b.date" data-bind="b.date" type="date" min="${addDays(0)}" value="${b.date}" class="w-full rounded-xl border-slate-300 min-h-[48px]"></div></div>
    <label class="lbl mt-4">Time slot</label><div class="flex flex-wrap gap-2">${TIMES.map(t=>`<button class="slot ${b.time===t?'on':''}" data-act="slot" data-id="${t}">${t}</button>`).join('')}</div>
    <p class="text-xs text-slate-500 mt-3">${DEMO.book}</p>${S.user?'':'<p class="text-xs text-slate-500 mt-1">You will be asked to log in before confirming.</p>'}<p id="berr" class="text-sm text-red-600 mt-3 hidden"></p><button class="btn w-full mt-5" data-act="confirm">Confirm Appointment</button></div></div>`; },
  voice(){ return `<div class="max-w-xl mx-auto card text-center">${head('Voice Search & Language','Pick a language, tap the microphone and say what you need, e.g. "cardiology".')}
    <div class="flex flex-wrap justify-center gap-2 mb-5">${langBtns()}</div>
    <button class="w-24 h-24 rounded-full ${S.listening?'bg-red-50 text-red-600':'bg-brand-500 text-white'} text-3xl mx-auto grid place-items-center" data-act="mic" aria-label="Start voice search"><i class="fa-solid fa-microphone"></i></button>
    <div class="h-10 flex items-center justify-center gap-1 mt-4">${S.listening?'<span class="wave"></span><span class="wave"></span><span class="wave"></span><span class="wave"></span>':''}</div>
    <p class="text-sm text-slate-600 min-h-[40px]" role="status">${S.listening?'Listening in '+LANGS[S.lang].n+'...':esc(S.vmsg||'Tap the microphone to start.')}</p></div>${aiCard()}`; },
  appts(){ const list=S.appts;
    if(!S.user) return `<div class="card text-center text-slate-600 max-w-xl mx-auto">Log in to see your appointments and tokens.<div class="mt-4"><button class="btn" data-act="needlogin">Login</button></div></div>`;
    if(!S.apptsReady) return '<div class="card text-center text-slate-500">Loading your appointments...</div>';
    return `<div class="flex items-center justify-between mb-4"><h2 class="text-2xl font-extrabold">My Appointments</h2><button class="btn" data-go="book">+ New Appointment</button></div>
    ${list.length?`<div class="grid md:grid-cols-2 gap-3">${list.map(apptCard).join('')}</div>`:`<div class="card text-center text-slate-600">You have no appointments yet.<div class="mt-4"><button class="btn" data-go="book">Book your first appointment</button></div></div>`}
    <p class="text-xs text-slate-500 mt-3">Appointments and tokens are saved in the Sahaaya demo database. Queue positions count only bookings made through Sahaaya, not live hospital data.</p>`; },
  pharm(){ const c=s=>`<div class="card"><i class="fa-solid ${esc(s.icon)} text-teal-600 text-xl"></i><div class="font-bold mt-2">${esc(s.title)}</div><div class="text-sm text-slate-500">${esc(s.description)}</div></div>`;
    const grp=k=>S.care?`<div class="grid sm:grid-cols-3 gap-3">${S.care.filter(x=>x.kind===k).map(c).join('')}</div>`:'<div class="card text-sm text-slate-500">Loading...</div>';
    return `${head('Pharmacy & Lab Services','Sample service information. Ordering and test booking are not connected in this prototype.')}
    <h3 class="font-bold mb-2">Pharmacy</h3>${grp('pharmacy')}<h3 class="font-bold mt-6 mb-2">Laboratory</h3>${grp('lab')}
    <div class="mt-5"><button class="btn" data-act="labnote">Find hospitals with Lab Services</button></div>`; },
  token(){ const date=addDays(S.day), h=hosp(S.tk.h), r=S.tkResult;
    return `<div class="max-w-2xl mx-auto card">${head('Token Allocation','Demo capacity (40 tokens per department per day) minus tokens booked through Sahaaya - not live hospital data.')}${demoNote('token')}
    <div class="flex gap-2 mb-4">${['Today','Tomorrow'].map((t,i)=>`<button class="fchip ${S.day===i?'on':''}" data-act="day" data-id="${i}">${t}</button>`).join('')}<span class="ml-auto self-center text-sm text-slate-600">${fmtDate(date)}</span></div>
    <div class="grid sm:grid-cols-2 gap-4"><div><label class="lbl" for="tk.h">Hospital</label>${sel('tk.h',hospOpts(),S.tk.h)}</div><div><label class="lbl" for="tk.d">Department</label>${sel('tk.d',deptOpts(S.tk.h),S.tk.d,'Select department')}</div></div>
    <button class="btn w-full mt-4" data-act="check">Check Availability</button>
    ${r?`<div class="mt-4 rounded-xl p-4 ${r.left?'bg-teal-50 border border-teal-200':'bg-red-50 border border-red-200'}"><div class="font-bold">${r.left?r.left+' of '+r.total+' demo tokens left':'Demo tokens are full for this day'}</div><div class="text-sm text-slate-600 mt-1">${esc(h.name)} - ${esc(r.d)} - ${fmtDate(date)} (demo numbers)</div>
    <button class="btn mt-3" data-act="booktoken">${r.left?'Book this slot':'Try the other day'}</button></div>`:''}</div>`; },
  map(){ const h=hosp(S.hid), sp={driving:30,bicycling:15,walking:5}, mn=m=>Math.max(1,Math.round(h.km/sp[m]*60));
    const mb=(m,i,l)=>`<button class="flex-1 slot ${S.mode===m?'on':''}" data-act="mode" data-id="${m}"><i class="fa-solid ${i}"></i> ${l}<div class="text-[11px] font-normal">${mn(m)} min (est.)</div></button>`;
    return `<div class="grid lg:grid-cols-3 gap-3"><div class="lg:col-span-2 card"><div class="flex items-center justify-between mb-3"><h2 class="text-xl font-extrabold">Route Preview</h2><span class="chip" style="background:#fef3c7;color:#92400e">DEMO MAP - no live traffic or GPS</span></div>${mapBox(h,320,true)}</div>
    <div class="card"><p class="text-sm"><span class="text-slate-500">From:</span> <b>${START}</b> (demo start point)</p><label class="lbl mt-4" for="hid">To (destination hospital)</label>${sel('hid',hospOpts(),S.hid)}
    <div class="flex gap-2 mt-4">${mb('driving','fa-car','Car')}${mb('bicycling','fa-motorcycle','Bike')}${mb('walking','fa-person-walking','Walk')}</div>
    <p class="text-xs text-slate-500 mt-2">${h.km} km. Times are rough estimates from distance only.</p>
    <a class="btn w-full mt-4" target="_blank" rel="noopener" href="${mapsUrl(h,S.mode)}">Navigate in Google Maps</a>
    <a class="btn-o w-full mt-2" target="_blank" rel="noopener" href="${placeUrl(h)}">Open in Google Maps</a>
    <button class="btn-o w-full mt-2" data-act="bookfor" data-id="${h.id}">Book Appointment</button></div></div>`; },
  lang(){ const s={en:'Find Hospitals',te:'ఆసుపత్రులు కనుగొనండి',hi:'अस्पताल खोजें',ta:'மருத்துவமனைகள்',kn:'ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ'};
    return `${head('Multi-Language Support','Choose a language. The header and main labels change right away.')}
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${Object.entries(LANGS).map(([k,l])=>`<button class="card text-left" style="${S.lang===k?'border-color:#2563eb;box-shadow:0 0 0 3px #bae0fd':''}" data-act="lang" data-id="${k}">
    <div class="flex justify-between"><b class="text-lg">${l.n}</b>${S.lang===k?'<i class="fa-solid fa-circle-check text-brand-500"></i>':''}</div><div class="text-sm mt-2">${l.hdr}</div><div class="text-sm text-slate-600 mt-1">${l.find}</div><div class="text-sm text-red-600 font-semibold mt-1">${l.emg}</div></button>`).join('')}</div>
    <p class="text-xs text-slate-500 mt-3">Translations cover main labels only. Please have a native speaker review them before publishing.</p>`; }
};
function results(){ if(!S.results) return '<div class="card md:col-span-2 text-center text-slate-500">Loading hospitals...</div>'; const l=S.results; return l.length?l.map(h=>hospCard(h,false)).join(''):`<div class="card md:col-span-2 text-center text-slate-600">No hospitals match "${esc(S.q)}". Try a department such as "cardiology" or clear the search.</div>`; }
function mapBox(h,ht,big){ return `<div class="map" style="height:${ht}px"><div class="absolute left-[18%] top-[65%] text-xs font-semibold bg-white rounded-lg px-2 py-1 shadow"><i class="fa-solid fa-circle text-brand-500 mr-1"></i>${big?'Start: ':''}Demo start</div>
  <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M22 72 Q 45 12 82 28" stroke="#2563eb" stroke-width="4" stroke-dasharray="8 6" fill="none" vector-effect="non-scaling-stroke"/></svg>
  <div class="absolute right-[6%] top-[14%] max-w-[62%] truncate text-xs font-semibold bg-white rounded-lg px-2 py-1 shadow"><i class="fa-solid fa-location-dot text-red-600 mr-1"></i>${esc(h.name)}</div>
  <div class="absolute bottom-2 left-2 text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">DEMO MAP</div></div>`; }
function langBtns(){ return Object.entries(LANGS).map(([k,l])=>`<button class="fchip ${S.lang===k?'on':''}" data-act="lang" data-id="${k}">${l.n}</button>`).join(''); }
function confirmCard(){ const a=S.conf; return `<div class="card mb-3" style="background:#f0fdfa;border-color:#99f6e4"><div class="font-extrabold text-teal-700"><i class="fa-solid fa-circle-check"></i> Appointment confirmed</div>
  <p class="text-sm mt-2">${esc(a.hn)} - ${esc(a.dept)} - ${esc(a.doc)}<br>${fmtDate(a.date)} at ${a.time}</p><div class="text-3xl font-extrabold text-brand-600 mt-2">Token ${a.token}</div>
  <p class="text-xs text-slate-500 mt-1">Saved in the Sahaaya demo database. This token is not registered with any real hospital.</p><button class="btn-o mt-3" data-go="appts">View in My Appointments</button></div>`; }
function apptCard(a){ const c=a.status==='Cancelled', ahead=a.ahead, op=S.open===a.id;
  return `<div class="card" style="${c?'opacity:.7':''}"><div class="flex justify-between gap-2"><div><h3 class="font-bold">${esc(a.hn)}</h3><p class="text-sm text-slate-500">${esc(a.dept)} - ${esc(a.doc)}</p></div>
  <span class="chip ${c?'':'t'}" ${c?'style="background:#fee2e2;color:#b91c1c"':''}>${a.status}</span></div>
  <p class="text-sm mt-3"><i class="fa-regular fa-calendar mr-1"></i>${fmtDate(a.date)} - ${a.time}</p>
  <div class="mt-2 flex items-center justify-between rounded-xl bg-brand-50 p-3"><span class="text-sm">Token</span><b class="text-xl text-brand-600">${a.token}</b></div>
  <p class="text-xs text-slate-500 mt-1">${c?'Token released (status: Cancelled)':'Token status: '+a.tokenStatus+' - '+ahead+' ahead of you in the Sahaaya prototype queue'}</p>
  ${op?`<div class="text-sm mt-3 rounded-xl border border-slate-200 p-3">Booking ID: ${a.id}<br>Booked: ${new Date(a.created).toLocaleString('en-IN')}<br>Address: ${esc(hosp(a.hid).addr)}</div>`:''}
  <div class="grid grid-cols-2 gap-2 mt-3"><button class="btn-o" data-act="toggle" data-id="${a.id}">${op?'Hide':'View'} Details</button>${c?'<span></span>':`<button class="btn-o" style="color:#b91c1c;border-color:#fecaca" data-act="cancel" data-id="${a.id}">Cancel</button>`}</div></div>`; }

/* ================= RENDER ================= */
function render(){
  const i=SCREENS.findIndex(s=>s[0]===S.screen);
  document.documentElement.lang=S.lang; $('#tag').textContent=T('tag'); $('#title').textContent=`${i+1}. ${SCREENS[i][2]}`;
  $('#tabs').innerHTML=SCREENS.map((s,n)=>`<button class="tab ${n===i?'on':''}" data-go="${s[0]}" ${n===i?'aria-current="page"':''}>${n+1}. ${s[1]}</button>`).join('');
  $('#view').innerHTML=S.fatal?fatalCard():V[S.screen]();
  const on=$('#tabs .on'); if(on) on.scrollIntoView({inline:'center',block:'nearest'});
}

/* ================= ACTIONS ================= */
const A = {
  prev:()=>step(-1), next:()=>step(1),
  homesearch(){ S.q=$('#homeq').value; S.results=null; go('list'); },
  async filter(id){ S.filter=id; await runSearch(); render(); },
  async clear(){ S.q=''; S.filter='All'; await runSearch(); render(); },
  details(id){ S.hid=id; go('details'); },
  route(id){ S.hid=id; go('map'); },
  bookfor(id){ S.b.h=id; S.b.d=''; S.b.doc=''; S.conf=null; go('book'); },
  slot(t){ S.b.time=t; render(); },
  mode(m){ S.mode=m; render(); },
  eye(){ const e=$('#em').value, p=$('#pw').value, r=$('#rem').checked, n=$('#nm')?$('#nm').value:''; S.eye=!S.eye; render(); $('#em').value=e; $('#pw').value=p; $('#rem').checked=r; if($('#nm')) $('#nm').value=n; $('#pw').focus(); },
  regmode(){ S.reg=!S.reg; S.loginMsg=''; render(); },
  needlogin(){ S.after='appts'; S.loginMsg=''; go('login'); },
  retry(){ boot(); },
  async explain(){ const id=S.hid; S.twinAI[id]={busy:true}; $('#twin').innerHTML=twinCard(hosp(id));
    try{ const d=await api('/api/ai/explain-twin',{method:'POST',body:{hospitalId:id,language:S.lang}}); S.twinAI[id]={text:d.explanation,aiUsed:d.aiUsed,model:d.model}; }
    catch(e){ S.twinAI[id]={text:e.message,aiUsed:false}; }
    if(S.screen==='details'&&S.hid===id) $('#twin').innerHTML=twinCard(hosp(id)); },
  aiex(i){ S.ai.q=AI_EX[+i]; $('#aiq').value=S.ai.q; A.ask(); },
  async ask(){ const q=$('#aiq').value.trim(); S.ai.q=q; const box=()=>{ const e=$('#aians'); if(e) e.innerHTML=aiAnswer(); };
    if(q.length<2){ S.ai={...S.ai,a:'',err:'Please type a question.',busy:false}; box(); return; }
    S.ai={...S.ai,busy:true,err:'',a:''}; box();
    try{ const d=await api('/api/ai/chat',{method:'POST',body:{message:q,language:S.lang,hospitalId:S.screen==='details'?S.hid:undefined}}); S.ai={q,a:d.answer,emg:d.emergency,fallback:!d.emergency&&d.aiUsed===false,busy:false,err:'',model:d.model}; }
    catch(e){ S.ai={q,a:'',emg:false,busy:false,err:e.message,model:''}; }
    box(); },
  lang(k){ S.lang=k; save('sahaaya.lang',k); render(); toast('Language: '+LANGS[k].n); },
  day(i){ S.day=+i; S.tkResult=null; render(); },
  toggle(id){ S.open=S.open===id?null:id; render(); },
  labnote(){ S.q='Lab Services'; S.filter='All'; S.results=null; go('list'); },
  async login(){ const em=$('#em').value.trim(), pw=$('#pw').value, er=$('#lerr'), nm=$('#nm')?$('#nm').value.trim():'';
    const bad=m=>{ er.textContent=m; er.classList.remove('hidden'); };
    if(S.reg&&nm.length<2) return bad('Please enter Alekya Karri.');
    if(!/^\S+@\S+\.\S+$/.test(em)) return bad('Please enter a valid email address.');
    if(pw.length<(S.reg?6:1)) return bad(S.reg?'Password must be at least 6 characters.':'Please enter your password.');
    try{ const d=await api(S.reg?'/api/auth/register':'/api/auth/login',{method:'POST',body:S.reg?{name:nm,email:em,password:pw}:{email:em,password:pw}});
      setTok(d.token,$('#rem').checked); S.user=d.user; S.apptsReady=false; S.loginMsg=''; S.reg=false; S.eye=false; toast(S.after==='book'?'Logged in. You can confirm now.':'Welcome, '+d.user.name);
      const to=S.after||'home'; S.after=''; go(to);
    }catch(e){ bad(e.message); } },
  async logout(){ try{ await api('/api/auth/logout',{method:'POST'}); }catch(e){} setTok(null); S.user=null; S.appts=[]; S.apptsReady=false; S.conf=null; toast('Logged out'); render(); },
  async confirm(){ const b=S.b, er=$('#berr'); const bad=m=>{ er.textContent=m; er.classList.remove('hidden'); };
    if(!S.user){ S.after='book'; S.loginMsg='Please log in to confirm your appointment. Your selections are kept.'; go('login'); return; }
    if(!b.d||!b.doc||!b.date||!b.time) return bad('Please choose a department, doctor, date and time slot.');
    try{ const d=await api('/api/appointments',{method:'POST',body:{hospitalId:b.h,department:b.d,doctor:b.doc,date:b.date,time:b.time}});
      S.conf=norm(d.appointment); S.b.time=''; toast('Appointment confirmed'); render(); window.scrollTo({top:0});
    }catch(e){ if(e.status===401){ S.user=null; S.after='book'; S.loginMsg='Your session ended. Please log in again.'; go('login'); } else bad(e.message); } },
  async cancel(id){ if(!confirm('Cancel this appointment?')) return;
    try{ await api('/api/appointments/'+encodeURIComponent(id)+'/cancel',{method:'POST'}); await LOAD.appts(); toast('Appointment cancelled'); }catch(e){ toast(e.message); } render(); },
  async check(){ if(!S.tk.d){ toast('Select a department first'); return; }
    try{ const d=await api('/api/tokens/availability?hospitalId='+encodeURIComponent(S.tk.h)+'&department='+encodeURIComponent(S.tk.d)+'&date='+addDays(S.day));
      S.tkResult={total:d.capacity,left:d.remaining,d:S.tk.d}; render(); }catch(e){ toast(e.message); } },
  booktoken(){ if(S.tkResult&&!S.tkResult.left){ S.day=S.day?0:1; S.tkResult=null; render(); return; }
    S.b.h=S.tk.h; S.b.d=S.tk.d; S.b.doc=''; S.b.date=addDays(S.day); S.conf=null; go('book'); },
  mic(){ const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ S.vmsg='Voice search is not supported in this browser. Please use Chrome or Edge, or type your search on the Hospitals List.'; render(); return; }
    if(S.listening) return;
    try{ const r=new SR(); r.lang=LANGS[S.lang].code; r.interimResults=false;
      r.onresult=e=>{ S.q=e.results[0][0].transcript; S.vmsg='Heard: "'+S.q+'"'; S.listening=false; S.results=null; go('list'); };
      r.onerror=e=>{ S.listening=false; S.vmsg=e.error==='not-allowed'?'Microphone permission was blocked. Allow microphone access and try again.':'Could not hear you ('+e.error+'). Please try again.'; render(); };
      r.onend=()=>{ if(S.listening){ S.listening=false; S.vmsg='No speech heard. Tap the microphone and try again.'; render(); } };
      S.listening=true; render(); r.start(); }catch(err){ S.listening=false; S.vmsg='Voice search could not start. Please try again.'; render(); } }
};

/* ================= EVENTS ================= */
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]'); if(g){ go(g.dataset.go); return; }
  const a=e.target.closest('[data-act]'); if(a&&A[a.dataset.act]) A[a.dataset.act](a.dataset.id);
});
document.addEventListener('change',e=>{ const k=e.target.dataset.bind; if(!k) return;
  const v=e.target.value;
  if(k==='b.h'){ S.b.h=v; S.b.d=''; S.b.doc=''; } else if(k==='b.d'){ S.b.d=v; S.b.doc=''; } else if(k==='b.doc') S.b.doc=v; else if(k==='b.date') S.b.date=v;
  else if(k==='tk.h'){ S.tk.h=v; S.tk.d=''; S.tkResult=null; } else if(k==='tk.d'){ S.tk.d=v; S.tkResult=null; } else if(k==='hid') S.hid=v;
  render(); });
document.addEventListener('input',e=>{ if(e.target.id==='homeq') S.q=e.target.value; if(e.target.id==='aiq') S.ai.q=e.target.value; if(e.target.id==='listq'){ S.q=e.target.value; clearTimeout(st); st=setTimeout(async()=>{ await runSearch(); const r=$('#results'); if(r&&S.screen==='list') r.innerHTML=results(); },200); } });
document.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; if(e.target.id==='homeq') A.homesearch(); else if(e.target.id==='pw'||e.target.id==='em') A.login(); else if(e.target.id==='aiq') A.ask(); });
const h0 = location.hash.slice(1); if (SCREENS.some(s=>s[0]===h0)) S.screen = h0;
window.addEventListener('hashchange',()=>{ const id=location.hash.slice(1); if (SCREENS.some(s=>s[0]===id) && id!==S.screen){ S.screen=id; if(id!=='book') S.conf=null; render(); enter(id); } });
boot();
setInterval(async()=>{ if(S.screen!=='details'||S.fatal) return; await refreshTwinDetail(); const el=$('#twin'); if(el&&!(S.twinAI[S.hid]&&S.twinAI[S.hid].busy)) el.innerHTML=twinCard(hosp(S.hid)); },10000);
