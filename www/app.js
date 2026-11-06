// ===== Stocare =====
const store = {
  get(key, def) {
    try { const v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d.split('-').reverse().join('.');

function round1(n) { return Math.round(n * 10) / 10; }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 2600);
}
function esc(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

// ===== Calcule macro =====
function computeTargets(p) {
  const bmr = p.sex === 'm'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age + 5
    : 10 * p.weight + 6.25 * p.height - 5 * p.age - 161;
  const tdee = bmr * p.activity;
  let target = tdee;
  if (p.goal === 'cut') target = tdee * 0.80;
  else if (p.goal === 'bulk') target = tdee * 1.10;
  let protein, fat;
  if (p.goal === 'cut') { protein = 2.0 * p.weight; fat = 0.8 * p.weight; }
  else if (p.goal === 'bulk') { protein = 1.8 * p.weight; fat = 0.9 * p.weight; }
  else { protein = 1.7 * p.weight; fat = 0.85 * p.weight; }
  const carbs = (target - protein * 4 - fat * 9) / 4;
  return {
    bmr: round1(bmr), tdee: round1(tdee), target: round1(target),
    protein: round1(protein), carbs: Math.max(0, round1(carbs)), fat: round1(fat)
  };
}

// ===== Exercitii pe grupe de muschi =====
const MUSCLE_GROUPS = {
  "Piept": ["Împins din piept cu bara", "Împins înclinat cu bara", "Împins înclinat cu gantere", "Fluturări cu gantere", "Fluturări la cablu", "Fluturări la aparat (pec deck)", "Dips (piept)"],
  "Spate": ["Tracțiuni la bară", "Tracțiuni la aparat (lat pulldown)", "Ramat cu bara", "Ramat cu gantera (un braț)", "Ramat la cablu (seated row)", "Îndreptări cu bara (deadlift)", "Ridicări trapez (shrugs)"],
  "Umeri": ["Împins la umeri cu bara", "Împins la umeri cu gantere", "Fluturări laterale", "Fluturări frontale", "Fluturări spate (rear delt)", "Ridicare la bărbie"],
  "Biceps": ["Curl cu bara", "Curl cu gantere alternativ", "Curl ciocan (hammer)", "Curl la cablu", "Curl concentrat"],
  "Triceps": ["Împins triceps la cablu (pushdown)", "Extensii cu bara EZ (skull crusher)", "Extensii cu gantera (peste cap)", "Dips (triceps)", "Flotări cu priză îngustă"],
  "Picioare": ["Genuflexiuni cu bara (squat)", "Împins la presă (leg press)", "Îndreptări românești (RDL)", "Fandări (lunges)", "Extensii cvadriceps", "Flexii biceps femural", "Ridicări pe gambe", "Hip thrust"],
  "Abdomen": ["Abdomene (crunch)", "Plank", "Ridicări de picioare", "Twist rusesc", "Dead bug", "Bird dog"]
};

// ===== Sfaturi pentru executie corecta =====
const TIPS = {
  "Împins din piept cu bara": "Omoplații strânși și retrași, talpa fixă pe sol, coboară bara la nivelul pieptului, coatele la ~45°. Nu balansa șoldurile.",
  "Împins înclinat cu bara": "Banca la 30-45°, coboară bara spre claviculă, coatele sub nivelul umerilor, mișcare controlată.",
  "Împins înclinat cu gantere": "Coboară ganterele până simți întinderea în piept, control la coborâre 2-3 sec, fără balans.",
  "Fluturări cu gantere": "Coatele ușor îndoite și fixe, mișcare de arc larg, nu transforma în împins.",
  "Fluturări la cablu": "Aduci mâinile în față până se ating, strângi pieptul 1 sec, coatele fixe.",
  "Fluturări la aparat (pec deck)": "Spatele lipit de bancă, mișcare lentă și controlată, fără elan.",
  "Dips (piept)": "Înclină trunchiul ușor în față, coboară până la 90° la cot, fără balansare.",
  "Tracțiuni la bară": "Coboară umerii înainte de a trage, duci coatele spre corp, fără balans. Priză puțin mai lată de umeri.",
  "Tracțiuni la aparat (lat pulldown)": "Bara la pieptul superior, nu în spatele gâtului, arcuire ușoară, trage cu coatele.",
  "Ramat cu bara": "Trunchi înclinat ~45°, spate drept, trage bara spre abdomen, strânge omoplații 1 sec.",
  "Ramat cu gantera (un braț)": "Genunchiul și mâna pe bancă, spate drept, trage gantera spre șold, fără rotație.",
  "Ramat la cablu (seated row)": "Trunchi drept, strângi omoplații la final, fără legănarea trunchiului.",
  "Îndreptări cu bara (deadlift)": "Spate neutru, bara aproape de picioare, împinge picioarele în sol, nu trage cu spatele.",
  "Ridicări trapez (shrugs)": "Ridică umerii spre urechi, ține 1 sec sus, fără rotirea umerilor.",
  "Împins la umeri cu bara": "Nu arcui spatele, bara deasupra capului, coatele ușor în față, buric tras.",
  "Împins la umeri cu gantere": "Coboară până la nivelul urechilor, spate drept, fără balans de genunchi.",
  "Fluturări laterale": "Coboară umerii, ridică la nivelul umerilor, coatele ușor îndoite, fără elan.",
  "Fluturări frontale": "Ridică la nivelul umerilor, fără legănarea trunchiului.",
  "Fluturări spate (rear delt)": "Trunchi înclinat, duci coatele în sus și în afară, strângi 1 sec.",
  "Ridicare la bărbie": "Priză lată, ridică spre bărbie, coatele deasupra mâinilor.",
  "Curl cu bara": "Coatele lipite de corp, fără balans de trunchi, coborâre controlată 2-3 sec.",
  "Curl cu gantere alternativ": "Rotește palma în sus în timp ce urci, coatele fixe.",
  "Curl ciocan (hammer)": "Palmele față în față, coatele fixe, mișcare completă.",
  "Curl la cablu": "Tensiune constantă, coatele lângă corp, fără elan.",
  "Curl concentrat": "Sprijină cotul pe coapsă, izolare totală, mișcare lentă.",
  "Împins triceps la cablu (pushdown)": "Coatele lipite de corp, doar antebrațul se mișcă, întinde complet sus.",
  "Extensii cu bara EZ (skull crusher)": "Coboară spre frunte, coatele fixe și apropiate, nu despărți coatele.",
  "Extensii cu gantera (peste cap)": "Gantera deasupra capului, coboară în spate, coatele apropiate de cap.",
  "Dips (triceps)": "Trunchi drept, coboară până la 90° la cot, coatele apropiate.",
  "Flotări cu priză îngustă": "Mâinile sub umeri, coatele spre spate, nu lateral.",
  "Genuflexiuni cu bara (squat)": "Bara pe trapezi, genunchii în direcția vârfurilor, pieptul sus, coboară șoldul, călcâiele pe sol.",
  "Împins la presă (leg press)": "Nu bloca genunchii complet sus, talpa complet pe platformă, mișcare controlată.",
  "Îndreptări românești (RDL)": "Genunchii ușor îndoiți, spate drept, bara alunecă pe coapse, oprește-te la întinderea maximă.",
  "Fandări (lunges)": "Pas lung, genunchiul din față nu trece mult de vârf, trunchi drept.",
  "Extensii cvadriceps": "Întinde complet sus, ține 1 sec, coboară lent.",
  "Flexii biceps femural": "Șoldurile fixe pe bancă, fără ridicarea feselor, mișcare completă.",
  "Ridicări pe gambe": "Întindere completă jos, ridicare completă sus, 1-2 sec pauză sus.",
  "Hip thrust": "Bara peste șolduri, bărbia în piept, împinge cu călcâiele, strânge fesierii 1 sec sus.",
  "Abdomene (crunch)": "Ridică doar umerii, bărbia departe de piept, nu trage de ceafă.",
  "Plank": "Corpul drept ca o scândură, buricul tras, fesierii strânși, respiră normal.",
  "Ridicări de picioare": "Spatele lipit de sol, coboară picioarele lent fără a atinge solul.",
  "Twist rusesc": "Rotește din trunchi, nu doar din brațe, picioarele fixe.",
  "Dead bug": "Spatele lipit de sol, mișcări lente și controlate, fără arcuire lombară.",
  "Bird dog": "Mâna opusă piciorului, corp drept, ține 2 sec în extensie."
};

// ===== Plan de antrenament (5 zile) =====
const TRAINING = {
  Luni: {
    title: "Luni — Push (piept, umeri, triceps)",
    note: "Focus pe forma corectă, control la coborâre.",
    exercises: [
      { e: "Împins din piept cu bara", d: "4 × 6-10" },
      { e: "Împins înclinat cu gantere", d: "3 × 8-12" },
      { e: "Fluturări cu gantere", d: "3 × 12-15" },
      { e: "Împins la umeri cu bara", d: "3 × 8-12" },
      { e: "Fluturări laterale", d: "3 × 12-15" },
      { e: "Împins triceps la cablu (pushdown)", d: "3 × 10-15" }
    ]
  },
  Miercuri: {
    title: "Miercuri — Pull (spate, biceps)",
    note: "Antrenament cheie pentru durerile de spate.",
    exercises: [
      { e: "Tracțiuni la bară", d: "4 × 6-12" },
      { e: "Ramat cu bara", d: "4 × 8-12" },
      { e: "Ramat la cablu (seated row)", d: "3 × 10-12" },
      { e: "Fluturări spate (rear delt)", d: "3 × 12-15" },
      { e: "Curl cu bara", d: "3 × 10-12" },
      { e: "Curl ciocan (hammer)", d: "3 × 10-12" }
    ]
  },
  Joi: {
    title: "Joi — Picioare (posterior predominant)",
    note: "Fesieri + lombar puternici = spate sănătos.",
    exercises: [
      { e: "Genuflexiuni cu bara (squat)", d: "4 × 6-10" },
      { e: "Îndreptări românești (RDL)", d: "4 × 8-12" },
      { e: "Hip thrust", d: "3 × 8-12" },
      { e: "Fandări (lunges)", d: "3 × 10-12" },
      { e: "Ridicări pe gambe", d: "4 × 12-15" }
    ]
  },
  Vineri: {
    title: "Vineri — Upper body (hypertrofie)",
    note: "Volum moderat, timp de sub tensiune.",
    exercises: [
      { e: "Împins înclinat cu gantere", d: "4 × 8-12" },
      { e: "Tracțiuni la aparat (lat pulldown)", d: "4 × 8-12" },
      { e: "Împins la umeri cu gantere", d: "3 × 8-12" },
      { e: "Ramat cu gantera (un braț)", d: "3 × 10-12" },
      { e: "Fluturări laterale", d: "3 × 12-15" },
      { e: "Biceps + Triceps (superset)", d: "3 × 12" }
    ]
  },
  Sâmbătă: {
    title: "Sâmbătă — Picioare + Core",
    note: "Core puternic protejează coloana.",
    exercises: [
      { e: "Împins la presă (leg press)", d: "4 × 10-15" },
      { e: "Fandări (lunges)", d: "3 × 10-12" },
      { e: "Extensii cvadriceps", d: "3 × 12-15" },
      { e: "Flexii biceps femural", d: "3 × 12-15" },
      { e: "Plank", d: "3 × 30-60 sec" },
      { e: "Dead bug", d: "3 × 10" },
      { e: "Bird dog", d: "3 × 10" }
    ]
  }
};
const DOW = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

// ===== Stretching =====
const STRETCHING = [
  { n: "Gât și trapezi", d: "Înclină ușor capul într-o parte, ține 20 sec, apoi cealaltă parte." },
  { n: "Umeri (braț peste piept)", d: "Tragi un braț peste piept, ține 20 sec, apoi celălalt." },
  { n: "Triceps (peste cap)", d: "Cotul îndreptat în sus, împinge ușor, 20 sec fiecare." },
  { n: "Piept (lângă ușă)", d: "Brațul pe tocul ușii, rotești corpul, 20-30 sec." },
  { n: "Spate (poziția copilului)", d: "Pe genunchi, întins în față, 30 sec." },
  { n: "Lombar (genunchi la piept)", d: "Pe spate, aduci genunchii la piept, 30 sec." },
  { n: "Fesier (figura 4)", d: "Glezna pe genunchi, tragi spre piept, 30 sec fiecare." },
  { n: "Hamstring (picior întins)", d: "Întins pe spate sau așezat, atingi vârfurile, 30 sec." },
  { n: "Cvadriceps (călcâi la fesă)", d: "Stând, tragi călcâiul spre fesă, 20 sec fiecare." },
  { n: "Gambe", d: "Piciorul întins în spate, călcâiul pe sol, 20-30 sec fiecare." }
];

// ===== Mobilitate =====
const MOBILITY = [
  { n: "Cat-cow", d: "În patru labe, alternezi arcuirea și rotunjirea spatelui, 10 repetări lente." },
  { n: "World's greatest stretch", d: "Fandare cu rotație de trunchi spre piciorul din față, 8 pe fiecare." },
  { n: "Cercuri de șold", d: "Rotește șoldul în cercuri mari, 10 în fiecare direcție." },
  { n: "Cercuri de brațe", d: "Brațele întinse, cercuri mici apoi mari, 15 în fiecare direcție." },
  { n: "Dislocări de umăr (baston/prosop)", d: "Treci bastonul peste cap din față în spate, 10 repetări." },
  { n: "Rotație toracică", d: "Pe genunchi, rotești trunchiul, 8 pe fiecare parte." },
  { n: "Mobilitate gleznă", d: "Genunchiul spre perete, călcâiul pe sol, 10 repetări fiecare." },
  { n: "Ținut în ghemuit adânc", d: "Cât cobori în squat, ține 30-60 sec." },
  { n: "Spiderman lunge", d: "Fandare cu cotul spre sol, 8 pe fiecare parte." }
];

// ===== Cardio =====
const CARDIO = [
  { n: "Mers rapid (înclinat)", d: "30-45 min, ritm alert, transpiri dar poți vorbi." },
  { n: "Alergare ușoară", d: "20-30 min, ritm constant, intensitate medie." },
  { n: "Alergare intervale (HIIT)", d: "30 sec sprint + 90 sec mers, repetă 8-10 runde." },
  { n: "Bicicletă", d: "30-45 min, rezistență medie." },
  { n: "Coardă (sărituri)", d: "10-15 min, alternând 1 min sărit + 30 sec pauză." },
  { n: "Stepper / scări", d: "20-30 min ritm constant." },
  { n: "Eliptică", d: "30 min, rezistență medie-mare." },
  { n: "Înot", d: "30 min, ritm lejer — excelent pentru spate." }
];

// ===== Recomandare alimente =====
const FOODS = {
  protein: [
    { n: "Piept de pui (150g)", c: 240, p: 46, cb: 0, f: 5 },
    { n: "Ton în apă (1 conservă)", c: 120, p: 27, cb: 0, f: 1 },
    { n: "Ouă (3 buc)", c: 215, p: 18, cb: 2, f: 15 },
    { n: "Whey (1 măsură)", c: 120, p: 24, cb: 3, f: 2 },
    { n: "Brânză cottage (200g)", c: 200, p: 22, cb: 8, f: 8 }
  ],
  carbs: [
    { n: "Orez fiert (150g)", c: 195, p: 4, cb: 42, f: 1 },
    { n: "Ovăz (60g uscat)", c: 230, p: 8, cb: 40, f: 4 },
    { n: "Cartof dulce (200g)", c: 180, p: 3, cb: 41, f: 0 },
    { n: "Pâine integrală (2 felii)", c: 160, p: 6, cb: 30, f: 2 },
    { n: "Banana", c: 105, p: 1, cb: 27, f: 0 }
  ],
  fat: [
    { n: "Nuci (30g)", c: 190, p: 5, cb: 4, f: 18 },
    { n: "Ulei de măsline (1 lingură)", c: 120, p: 0, cb: 0, f: 14 },
    { n: "Avocado (jumătate)", c: 120, p: 1, cb: 6, f: 11 },
    { n: "Unt de arahide (1 lingură)", c: 95, p: 4, cb: 3, f: 8 }
  ]
};

// ===== State =====
function getProfile() { return store.get('profile', null); }
function getLog() {
  const k = todayKey();
  let all = store.get('log', {});
  if (!all[k]) all[k] = { meals: [] };
  return { all, key: k, today: all[k] };
}
function saveLog(all) { store.set('log', all); }

function todayTotals() {
  const { today } = getLog();
  let c = 0, p = 0, cb = 0, f = 0;
  today.meals.forEach(m => { c += m.calories; p += m.protein; cb += m.carbs; f += m.fat; });
  return { c: round1(c), p: round1(p), cb: round1(cb), f: round1(f) };
}

// ===== Evidență exerciții =====
function getExLog() { return store.get('exlog', {}); }
function addSet(name, weight, reps) {
  const log = getExLog();
  if (!log[name]) log[name] = [];
  log[name].push({ date: todayKey(), weight: weight, reps: reps });
  store.set('exlog', log);
}
function lastSet(name) {
  const e = getExLog()[name];
  return (e && e.length) ? e[e.length - 1] : null;
}

// ===== Afișare + navigare =====
function showApp() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderAll();
}
function showSetup() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
}
function renderAll() {
  renderToday(); renderMeals(); renderTraining(); renderProgress(); renderProfile();
}
function renderDate() {
  document.getElementById('today-date').textContent = DOW[new Date().getDay()] + ' · ' + new Date().toLocaleDateString('ro-RO');
}

function renderToday() {
  const p = getProfile();
  const t = computeTargets(p);
  const tot = todayTotals();
  const rem = t.target - tot.c;
  document.getElementById('remaining-total').textContent =
    (rem >= 0 ? rem + ' kcal rămase' : (Math.abs(rem) + ' kcal peste'));
  const line = (cur, target, unit) => `${round1(cur)} / ${round1(target)}${unit}`;
  document.getElementById('cal-line').textContent = line(tot.c, t.target, ' kcal');
  document.getElementById('prot-line').textContent = line(tot.p, t.protein, ' g');
  document.getElementById('carb-line').textContent = line(tot.cb, t.carbs, ' g');
  document.getElementById('fat-line').textContent = line(tot.f, t.fat, ' g');
  const setBar = (id, cur, target) => {
    document.getElementById(id).style.width = Math.min(100, (cur / target) * 100) + '%';
  };
  setBar('cal-bar', tot.c, t.target);
  setBar('prot-bar', tot.p, t.protein);
  setBar('carb-bar', tot.cb, t.carbs);
  setBar('fat-bar', tot.f, t.fat);
  document.getElementById('recommendation').innerHTML = buildRecommendation(p, t, tot);

  const dow = DOW[new Date().getDay()];
  const tw = document.getElementById('today-workout');
  if (TRAINING[dow]) {
    let html = '<div class="day-title">' + TRAINING[dow].title + '</div>';
    TRAINING[dow].exercises.forEach(x => { html += exerciseHTML(x); });
    html += `<div class="note">${TRAINING[dow].note}</div>`;
    tw.innerHTML = html;
  } else if (dow === 'Marți') {
    tw.innerHTML = '<div class="note">🏃 Fotbal 1h30 — zi de sport, fără sală. Odihnă activă.</div>';
  } else {
    tw.innerHTML = '<div class="note">🚶 Zi de odihnă sau cardio ușor (vezi secțiunea Cardio din tab-ul Sală).</div>';
  }
}

function buildRecommendation(p, t, tot) {
  const remP = t.protein - tot.p, remC = t.carbs - tot.cb, remF = t.fat - tot.f;
  const pctP = remP / t.protein, pctC = remC / t.carbs, pctF = remF / t.fat;
  const gap = Math.max(pctP, pctC, pctF);
  const cat = gap === pctP ? 'protein' : (gap === pctC ? 'carbs' : 'fat');
  if (gap <= 0.05) return '✅ Ți-ai atins practic necesarul pe zi. Ai grijă doar să nu depășești mult.';
  const pick = FOODS[cat].slice(0, 2).map(f => f.n).join(' sau ');
  let text = '';
  if (cat === 'protein') text = `Îți lipsesc ~${round1(remP)}g proteine.`;
  if (cat === 'carbs') text = `Îți lipsesc ~${round1(remC)}g carbohidrați.`;
  if (cat === 'fat') text = `Îți lipsesc ~${round1(remF)}g grăsimi.`;
  return `${text} Încearcă: <b>${pick}</b>.`;
}

function renderMeals() {
  const { today } = getLog();
  const list = document.getElementById('meal-list');
  if (!today.meals.length) { list.innerHTML = '<li class="meal-meta">Nicio masă înregistrată azi.</li>'; return; }
  list.innerHTML = today.meals.map(m => {
    const meta = `${m.calories} kcal · P ${m.protein}g · C ${m.carbs}g · G ${m.fat}g`;
    return `<li><div class="meal-name">${esc(m.name)}</div><div class="meal-meta">${meta}</div></li>`;
  }).join('');
}

// Un exercitiu = nume + serie/reps + sfat + casuta kg/reps + istoric
function exerciseHTML(x) {
  const log = getExLog()[x.e] || [];
  const last = lastSet(x.e);
  const hist = [...log].slice(-3).reverse().map(s =>
    `<div class="log-entry">${fmtDate(s.date)} — <b>${s.weight}kg × ${s.reps}</b></div>`
  ).join('');
  const tips = TIPS[x.e] ? `<div class="ex-tips">💡 ${TIPS[x.e]}</div>` : '';
  return `<div class="exercise-item">
    <div class="ex-name">${esc(x.e)}</div>
    <div class="ex-detail">${esc(x.d)}${last ? ' · <b>ultimul: ' + last.weight + 'kg × ' + last.reps + '</b>' : ''}</div>
    ${tips}
    <div class="ex-log" data-name="${esc(x.e)}">
      <div class="inline-form log-form">
        <input type="number" class="log-weight" inputmode="decimal" placeholder="kg" />
        <input type="number" class="log-reps" inputmode="numeric" placeholder="reps" />
        <button class="log-add">➕</button>
      </div>
      <div class="log-history">${hist || '<div class="meal-meta">Nicio serie salvată încă.</div>'}</div>
    </div>
  </div>`;
}

function renderTraining() {
  const el = document.getElementById('training-plan');

  let html = '<h3 class="section-h">🏋️ Antrenament (5 zile)</h3>';
  html += Object.keys(TRAINING).map(k => {
    const d = TRAINING[k];
    let h = `<div class="day-block"><div class="day-title">${d.title}</div>`;
    d.exercises.forEach(x => { h += exerciseHTML(x); });
    h += `<div class="note">${d.note}</div></div>`;
    return h;
  }).join('');
  html += '<div class="note">➜ Marțea: fotbal. Duminica: cardio (vezi secțiunea Cardio).</div>';
  html += '<div class="note">💡 Completează kg și reps sub fiecare exercițiu — se salvează și vezi istoricul.</div>';

  html += '<h3 class="section-h">🧘 Stretching (după antrenament)</h3>';
  html += STRETCHING.map(s =>
    `<div class="exercise"><div class="ex-name">${s.n}</div><div class="ex-detail">${s.d}</div></div>`
  ).join('');

  html += '<h3 class="section-h">🤸 Mobilitate (înainte de antrenament)</h3>';
  html += MOBILITY.map(s =>
    `<div class="exercise"><div class="ex-name">${s.n}</div><div class="ex-detail">${s.d}</div></div>`
  ).join('');

  html += '<h3 class="section-h">🏃 Cardio</h3>';
  html += CARDIO.map(s =>
    `<div class="exercise"><div class="ex-name">${s.n}</div><div class="ex-detail">${s.d}</div></div>`
  ).join('');

  el.innerHTML = html;
}

function renderProgress() {
  const w = store.get('weights', []);
  const list = document.getElementById('weight-list');
  if (!w.length) { list.innerHTML = '<li class="meal-meta">Nicio înregistrare încă.</li>'; return; }
  list.innerHTML = [...w].reverse().map(x =>
    `<li><span class="meal-name">${x.weight} kg</span> <span class="meal-meta">· ${fmtDate(x.date)}</span></li>`
  ).join('');
}

function renderProfile() {
  const p = getProfile();
  const t = computeTargets(p);
  document.getElementById('profile-view').innerHTML = `
    <b>${p.height} cm</b> · <b>${p.weight} kg</b> · <b>${p.age} ani</b> · ${p.sex === 'm' ? 'M' : 'F'}<br>
    Obiectiv: <b>${p.goal === 'cut' ? 'Slăbire + definire' : p.goal === 'bulk' ? 'Masă' : 'Menținere'}</b><br>
    BMR: <b>${t.bmr} kcal</b> · TDEE: <b>${t.tdee} kcal</b><br>
    Ținta zilnică: <b>${t.target} kcal</b><br>
    Proteine <b>${t.protein}g</b> · Carbo <b>${t.carbs}g</b> · Grăsimi <b>${t.fat}g</b>
  `;
}

// ===== Gemini =====
function analyzeMeal(base64) {
  const p = getProfile();
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
  const prompt = `Ești un nutriționist. Analizează această poză cu mâncare și/sau eticheta nutrițională. 
Estimează caloriile și macro-urile (proteine, carbohidrați, grăsimi) pentru toată porția din poză.
Dacă e o etichetă, folosește valorile de pe ea și raportează-le la porția consumată.
Răspunde DOAR cu un obiect JSON cu exact aceste chei:
{
  "name": "numele scurt al mesei",
  "calories": numar,
  "protein": numar,
  "carbs": numar,
  "fat": numar,
  "portion": "descrierea porției",
  "confidence": "high|medium|low",
  "notes": "1-2 propoziții despre calitatea alimentului"
}`;
  const body = {
    contents: [{ parts: [ { text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } } ] }],
    generationConfig: { responseMimeType: 'application/json' }
  };
  return fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json()).then(data => {
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('Răspuns gol de la Gemini');
    return JSON.parse(txt.replace(/```json|```/g, '').trim());
  });
}

function resizeImage(file, maxDim, cb) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) {
      const s = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * s); h = Math.round(h * s);
    }
    const cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    cnv.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cb(cnv.toDataURL('image/jpeg', 0.82).split(',')[1]);
  };
  img.onerror = () => { URL.revokeObjectURL(url); cb(null); };
  img.src = url;
}

// ===== Evenimente =====
document.getElementById('btn-setup').addEventListener('click', () => {
  const apikey = document.getElementById('in-apikey').value.trim();
  if (!apikey) { toast('Introdu cheia API Gemini'); return; }
  const p = {
    height: parseFloat(document.getElementById('in-height').value) || 186,
    weight: parseFloat(document.getElementById('in-weight').value) || 98,
    age: parseInt(document.getElementById('in-age').value) || 27,
    sex: document.getElementById('in-sex').value,
    goal: document.getElementById('in-goal').value,
    activity: parseFloat(document.getElementById('in-activity').value),
    apiKey: apikey
  };
  store.set('profile', p);
  showApp();
  toast('Profil salvat!');
});

document.getElementById('btn-photo').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  const status = document.getElementById('photo-status');
  status.textContent = '📡 Analizez cu Gemini...';
  resizeImage(file, 1024, (base64) => {
    if (!base64) { status.textContent = 'Eroare la încărcarea imaginii.'; return; }
    analyzeMeal(base64).then(res => {
      const { all, today } = getLog();
      today.meals.push({
        name: res.name, calories: res.calories || 0,
        protein: res.protein || 0, carbs: res.carbs || 0, fat: res.fat || 0,
        portion: res.portion || '', confidence: res.confidence || 'medium', notes: res.notes || ''
      });
      saveLog(all);
      renderToday(); renderMeals();
      status.textContent = `✅ ${res.name} — ${res.calories} kcal (${res.confidence}). ${res.notes || ''}`;
      toast(res.name + ' adăugat!');
    }).catch(err => {
      status.textContent = '❌ ' + err.message + ' Verifică cheia API la Setări.';
    });
  });
  ev.target.value = '';
});

document.getElementById('btn-weight').addEventListener('click', () => {
  const v = parseFloat(document.getElementById('weight-input').value);
  if (!v || v <= 0) { toast('Introdu o greutate validă'); return; }
  const w = store.get('weights', []);
  w.push({ date: todayKey(), weight: v });
  const p = getProfile(); p.weight = v; store.set('profile', p);
  store.set('weights', w);
  document.getElementById('weight-input').value = '';
  renderProgress(); renderProfile(); renderToday();
  toast('Greutate salvată!');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Ștergi toate datele (profil, istoric, mese, antrenamente)?')) {
    localStorage.clear(); showSetup(); toast('Date șterse.');
  }
});

document.getElementById('btn-edit-profile').addEventListener('click', () => {
  const p = getProfile();
  document.getElementById('in-height').value = p.height;
  document.getElementById('in-weight').value = p.weight;
  document.getElementById('in-age').value = p.age;
  document.getElementById('in-sex').value = p.sex;
  document.getElementById('in-goal').value = p.goal;
  document.getElementById('in-activity').value = String(p.activity);
  document.getElementById('in-apikey').value = p.apiKey;
  showSetup();
});

// Navigare tab-uri
document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// Delegare: buton ➕ = salvează seria
document.addEventListener('click', (ev) => {
  const addBtn = ev.target.closest('.log-add');
  if (!addBtn) return;
  const log = addBtn.closest('.ex-log');
  const name = log.dataset.name;
  const w = parseFloat(log.querySelector('.log-weight').value);
  const r = parseInt(log.querySelector('.log-reps').value);
  if (!w || w <= 0 || !r || r <= 0) { toast('Completează kg și reps'); return; }
  addSet(name, w, r);
  renderTraining();
  renderToday();
  toast(`${name}: ${w}kg × ${r} salvat!`);
});

// init
renderDate();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
if (getProfile()) showApp(); else showSetup();
