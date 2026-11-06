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
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const addDays = (dstr, n) => {
  const d = new Date(dstr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

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
  if (p.goal === 'cut') { protein = p.sex === 'f' ? 1.8 * p.weight : 2.0 * p.weight; fat = 0.8 * p.weight; }
  else if (p.goal === 'bulk') { protein = 1.8 * p.weight; fat = 0.9 * p.weight; }
  else { protein = 1.7 * p.weight; fat = 0.85 * p.weight; }
  const carbs = (target - protein * 4 - fat * 9) / 4;
  return {
    bmr: round1(bmr), tdee: round1(tdee), target: round1(target),
    protein: round1(protein), carbs: Math.max(0, round1(carbs)), fat: round1(fat)
  };
}

// ===== Sfaturi pentru executie corecta =====
const TIPS = {
  "Împins din piept cu bara": "Omoplații strânși și retrași, talpa fixă pe sol, coboară bara la nivelul pieptului, coatele la ~45°. Nu balansa șoldurile.",
  "Împins din piept cu gantere": "Ganterele la nivelul pieptului, coboară până simți întinderea, coatele la ~45°, fără balans.",
  "Împins înclinat cu bara": "Banca la 30-45°, coboară bara spre claviculă, coatele sub nivelul umerilor, mișcare controlată.",
  "Împins înclinat cu gantere": "Coboară ganterele până simți întinderea în piept, control la coborâre 2-3 sec, fără balans.",
  "Fluturări cu gantere": "Coatele ușor îndoite și fixe, mișcare de arc larg, nu transforma în împins.",
  "Fluturări la cablu": "Aduci mâinile în față până se ating, strângi pieptul 1 sec, coatele fixe.",
  "Fluturări la aparat (pec deck)": "Spatele lipit de bancă, mișcare lentă și controlată, fără elan.",
  "Fluturări la aparat lateral": "Spatele lipit, ridică doar până la nivelul umerilor, fără elan.",
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
  "Face pull la cablu": "Trage sfoara spre frunte cu coatele sus, strânge umerii posteriori 1 sec. Excelent pentru postură.",
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
  "Genuflexiuni frontale cu bara": "Bara pe clavicule, coatele sus, trunchi drept, coboară controlat.",
  "Genuflexiuni la aparat (hack squat)": "Spatele lipit de sprijin, genunchii pe direcția vârfurilor, coboară sub 90° controlat.",
  "Împins la presă (leg press)": "Nu bloca genunchii complet sus, talpa complet pe platformă, mișcare controlată.",
  "Îndreptări românești (RDL)": "Genunchii ușor îndoiți, spate drept, bara alunecă pe coapse, oprește-te la întinderea maximă.",
  "Fandări (lunges)": "Pas lung, genunchiul din față nu trece mult de vârf, trunchi drept.",
  "Fandări bulgărești (split squat)": "Piciorul din spate pe bancă, coboară vertical, genunchiul din față stabil, fără răsucire.",
  "Fandări invers": "Pas înapoi, greutatea pe piciorul din față, trunchi drept — mai ușor pentru genunchi.",
  "Step-up pe bancă": "Urcă cu piciorul din față, fără împins cu cel din spate, coboară controlat.",
  "Extensii cvadriceps": "Întinde complet sus, ține 1 sec, coboară lent.",
  "Flexii biceps femural": "Șoldurile fixe pe bancă, fără ridicarea feselor, mișcare completă.",
  "Ridicări pe gambe": "Întindere completă jos, ridicare completă sus, 1-2 sec pauză sus.",
  "Hip thrust": "Bara peste șolduri, bărbia în piept, împinge cu călcâiele, strânge fesierii 1 sec sus.",
  "Glute bridge cu bara": "Spatele drept pe sol, împinge cu călcâiele, strânge fesierii sus 1 sec.",
  "Kickback la cablu": "Pantoful pe manșă, împinge piciorul înapoi și sus, strânge fesierul 1 sec.",
  "Abducții la aparat": "Ridică picioarele în afară lent, fără elan, control la întoarcere.",
  "Abducții cu bandă elastică": "Banda deasupra genunchilor, despică picioarele lent, ține 1 sec.",
  "Abdomene (crunch)": "Ridică doar umerii, bărbia departe de piept, nu trage de ceafă.",
  "Plank": "Corpul drept ca o scândură, buricul tras, fesierii strânși, respiră normal.",
  "Ridicări de picioare": "Spatele lipit de sol, coboară picioarele lent fără a atinge solul.",
  "Twist rusesc": "Rotește din trunchi, nu doar din brațe, picioarele fixe.",
  "Dead bug": "Spatele lipit de sol, mișcări lente și controlate, fără arcuire lombară.",
  "Bird dog": "Mâna opusă piciorului, corp drept, ține 2 sec în extensie.",
  "Biceps + Triceps (superset)": "Un exercițiu de biceps urmat imediat de unul de triceps, pauză abia după pereche."
};

// ===== Programe de antrenament (se rotesc la 4 saptamani: a / b) =====
const TRAINING_M = {
  Luni: {
    title: "Luni — Push (piept, umeri, triceps)",
    note: "Focus pe forma corectă, control la coborâre.",
    exercises: [
      { a: "Împins din piept cu bara", b: "Împins din piept cu gantere", d: "4 × 6-10" },
      { a: "Împins înclinat cu gantere", b: "Împins înclinat cu bara", d: "3 × 8-12" },
      { a: "Fluturări cu gantere", b: "Fluturări la aparat (pec deck)", d: "3 × 12-15" },
      { a: "Împins la umeri cu bara", b: "Împins la umeri cu gantere", d: "3 × 8-12" },
      { a: "Fluturări laterale", b: "Fluturări la aparat lateral", d: "3 × 12-15" },
      { a: "Împins triceps la cablu (pushdown)", b: "Extensii cu bara EZ (skull crusher)", d: "3 × 10-15" }
    ]
  },
  Miercuri: {
    title: "Miercuri — Pull (spate, biceps)",
    note: "Antrenament cheie pentru durerile de spate.",
    exercises: [
      { a: "Tracțiuni la bară", b: "Tracțiuni la aparat (lat pulldown)", d: "4 × 6-12" },
      { a: "Ramat cu bara", b: "Ramat la cablu (seated row)", d: "4 × 8-12" },
      { a: "Ramat la cablu (seated row)", b: "Ramat cu gantera (un braț)", d: "3 × 10-12" },
      { a: "Fluturări spate (rear delt)", b: "Face pull la cablu", d: "3 × 12-15" },
      { a: "Curl cu bara", b: "Curl cu gantere alternativ", d: "3 × 10-12" },
      { a: "Curl ciocan (hammer)", b: "Curl la cablu", d: "3 × 10-12" }
    ]
  },
  Joi: {
    title: "Joi — Picioare (posterior predominant)",
    note: "Fesieri + lombar puternici = spate sănătos.",
    exercises: [
      { a: "Genuflexiuni cu bara (squat)", b: "Genuflexiuni frontale cu bara", d: "4 × 6-10" },
      { a: "Îndreptări românești (RDL)", b: "Îndreptări cu bara (deadlift)", d: "4 × 8-12" },
      { a: "Hip thrust", b: "Glute bridge cu bara", d: "3 × 8-12" },
      { a: "Fandări (lunges)", b: "Fandări bulgărești (split squat)", d: "3 × 10-12" },
      { a: "Ridicări pe gambe", d: "4 × 12-15" }
    ]
  },
  Vineri: {
    title: "Vineri — Upper body (hypertrofie)",
    note: "Volum moderat, timp de sub tensiune.",
    exercises: [
      { a: "Împins înclinat cu gantere", b: "Împins din piept cu gantere", d: "4 × 8-12" },
      { a: "Tracțiuni la aparat (lat pulldown)", b: "Tracțiuni la bară", d: "4 × 8-12" },
      { a: "Împins la umeri cu gantere", b: "Ridicare la bărbie", d: "3 × 8-12" },
      { a: "Ramat cu gantera (un braț)", b: "Ramat cu bara", d: "3 × 10-12" },
      { a: "Fluturări laterale", b: "Fluturări spate (rear delt)", d: "3 × 12-15" },
      { a: "Biceps + Triceps (superset)", d: "3 × 12" }
    ]
  },
  Sâmbătă: {
    title: "Sâmbătă — Picioare + Core",
    note: "Core puternic protejează coloana.",
    exercises: [
      { a: "Împins la presă (leg press)", b: "Genuflexiuni cu bara (squat)", d: "4 × 10-15" },
      { a: "Fandări (lunges)", b: "Step-up pe bancă", d: "3 × 10-12" },
      { a: "Extensii cvadriceps", b: "Fandări bulgărești (split squat)", d: "3 × 12-15" },
      { a: "Flexii biceps femural", b: "Îndreptări românești (RDL)", d: "3 × 12-15" },
      { a: "Plank", d: "3 × 30-60 sec" },
      { a: "Dead bug", d: "3 × 10" },
      { a: "Bird dog", d: "3 × 10" }
    ]
  }
};

const TRAINING_F = {
  Luni: {
    title: "Luni — Fesieri + Femural",
    note: "Accent pe fesieri, execuție controlată.",
    exercises: [
      { a: "Hip thrust", b: "Glute bridge cu bara", d: "4 × 8-12" },
      { a: "Îndreptări românești (RDL)", b: "Flexii biceps femural", d: "4 × 8-12" },
      { a: "Fandări bulgărești (split squat)", b: "Fandări (lunges)", d: "3 × 10-12" },
      { a: "Abducții la aparat", b: "Abducții cu bandă elastică", d: "3 × 15" },
      { a: "Ridicări pe gambe", d: "4 × 12-15" }
    ]
  },
  Miercuri: {
    title: "Miercuri — Upper body (moderat)",
    note: "Tonifiere piept/spate/umeri, fără volum exagerat.",
    exercises: [
      { a: "Împins din piept cu gantere", b: "Împins din piept cu bara", d: "3 × 8-12" },
      { a: "Tracțiuni la aparat (lat pulldown)", b: "Ramat la cablu (seated row)", d: "3 × 8-12" },
      { a: "Împins la umeri cu gantere", b: "Fluturări laterale", d: "3 × 10-12" },
      { a: "Fluturări spate (rear delt)", b: "Face pull la cablu", d: "3 × 12-15" },
      { a: "Plank", d: "3 × 30-45 sec" }
    ]
  },
  Joi: {
    title: "Joi — Cvadriceps + Fesieri",
    note: "Picioare puternice, genunchi protejați.",
    exercises: [
      { a: "Genuflexiuni cu bara (squat)", b: "Genuflexiuni la aparat (hack squat)", d: "4 × 6-10" },
      { a: "Împins la presă (leg press)", b: "Fandări invers", d: "4 × 10-15" },
      { a: "Extensii cvadriceps", b: "Step-up pe bancă", d: "3 × 12-15" },
      { a: "Hip thrust", b: "Kickback la cablu", d: "3 × 10-12" },
      { a: "Flexii biceps femural", b: "Îndreptări românești (RDL)", d: "3 × 12-15" }
    ]
  },
  Vineri: {
    title: "Vineri — Upper + Core",
    note: "Brațe tonifiate + abdomen stabil.",
    exercises: [
      { a: "Împins înclinat cu gantere", b: "Fluturări la aparat (pec deck)", d: "3 × 10-12" },
      { a: "Ramat cu gantera (un braț)", b: "Ramat cu bara", d: "3 × 10-12" },
      { a: "Fluturări laterale", b: "Ridicare la bărbie", d: "3 × 12-15" },
      { a: "Curl cu gantere alternativ", b: "Curl ciocan (hammer)", d: "2 × 12" },
      { a: "Împins triceps la cablu (pushdown)", b: "Extensii cu gantera (peste cap)", d: "2 × 12" },
      { a: "Dead bug", d: "3 × 10" }
    ]
  },
  Sâmbătă: {
    title: "Sâmbătă — Fesieri + Core",
    note: "Final de săptămână: fesieri și centura abdominală.",
    exercises: [
      { a: "Kickback la cablu", b: "Hip thrust", d: "3 × 12-15" },
      { a: "Fandări invers", b: "Fandări bulgărești (split squat)", d: "3 × 10-12" },
      { a: "Abducții la aparat", b: "Abducții cu bandă elastică", d: "3 × 15" },
      { a: "Ridicări de picioare", b: "Twist rusesc", d: "3 × 12-15" },
      { a: "Plank", d: "3 × 45 sec" }
    ]
  }
};

const DOW = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
function getTraining() {
  const p = getProfile();
  return p && p.sex === 'f' ? TRAINING_F : TRAINING_M;
}

// ===== Periodizare (3 saptamani incarcare + 1 descarcare) =====
function weekInfo() {
  const p = getProfile();
  const start = p.programStart || todayKey();
  const totalWeeks = Math.max(0, Math.floor(daysBetween(start, todayKey()) / 7));
  const weekInMeso = totalWeeks % 4;
  return {
    totalWeeks, weekInMeso,
    meso: Math.floor(totalWeeks / 4) + 1,
    block: Math.floor(totalWeeks / 4) % 2,
    deload: weekInMeso === 3
  };
}
function activeSlotName(slot) {
  const info = weekInfo();
  return (info.block === 0 || !slot.b) ? slot.a : slot.b;
}

// ===== Redenumiri (cand nu ai aparatul din sala) =====
function getRenames() { return store.get('renames', {}); }
function setRename(key, name) {
  const r = getRenames();
  if (name) r[key] = name; else delete r[key];
  store.set('renames', r);
}
function displayName(key) { return getRenames()[key] || key; }

// ===== Ciclu menstrual (profil feminin) =====
function periodInfo() {
  const p = getProfile();
  if (!p || p.sex !== 'f' || !p.cycle || !p.cycle.last) return null;
  const len = p.cycle.len || 28;
  const days = daysBetween(p.cycle.last, todayKey());
  const dayOfCycle = ((days % len) + len) % len;
  return { logged: true, dayOfCycle, inPeriod: dayOfCycle < 5, nextIn: len - dayOfCycle };
}

// ===== Posturi ortodoxe =====
const FASTS = [
  { name: "Postul Crăciunului", start: "2026-11-15", end: "2026-12-24" },
  { name: "Postul Adormirii Maicii Domnului", start: "2027-08-01", end: "2027-08-14" },
  { name: "Postul Paștelui", start: "2027-02-15", end: "2027-05-01" },
  { name: "Postul Sfinților Apostoli", start: "2027-05-31", end: "2027-07-11" },
  { name: "Postul Adormirii Maicii Domnului", start: "2027-08-01", end: "2027-08-14" },
  { name: "Postul Crăciunului", start: "2027-11-15", end: "2027-12-24" }
];
const BLACK_FASTS = ["2027-04-30"]; // Vinerea Mare

function fastInfo(dstr) {
  const range = FASTS.find(f => dstr >= f.start && dstr <= f.end);
  const black = BLACK_FASTS.includes(dstr);
  const dow = new Date(dstr).getDay();
  const wedfri = !range && !black && (dow === 3 || dow === 5);
  return { active: !!range || black || wedfri, name: range ? range.name : null, start: range ? range.start : null, end: range ? range.end : null, black, wedfri };
}

function fastBannerHTML() {
  const ds = todayKey();
  const fi = fastInfo(ds);
  if (fi.black) return '🚫 <b>POST NEGRU</b> azi (Vinerea Mare) — doar apă sau foarte puțin după amiază. La sală: fără efort mare, doar mobilitate / plimbare.';
  if (fi.name) {
    const left = Math.max(0, daysBetween(ds, fi.end)) + 1;
    return `🌿 Ești în <b>${fi.name}</b> — încă ${left} ${left === 1 ? 'zi' : 'zile'} (până pe ${fmtDate(fi.end)}). Deschide planul de post de mai jos ca să-ți păstrezi proteinele.`;
  }
  if (fi.wedfri) return '🌿 Azi e o zi de post (miercuri/vineri) — fără carne, lapte, ouă, pește. Vezi planul de post.';
  const next = FASTS.find(f => f.start > ds);
  if (next) {
    const inDays = daysBetween(ds, next.start);
    if (inDays <= 14) return `✝️ <b>${next.name}</b> începe în ${inDays} ${inDays === 1 ? 'zi' : 'zile'} (${fmtDate(next.start)}).`;
  }
  return '✝️ Azi nu e post obligatoriu. Mănâncă normal, după planul tău.';
}

const FAST_PLAN_HTML = `
<div class="day-title">Proteine în post (ținta ta zilnică)</div>
<div class="exercise"><span class="ex-name">Soia texturată (100g uscată)</span> — <span class="ex-detail">~50g proteine · cea mai bună sursă</span></div>
<div class="exercise"><span class="ex-name">Tofu (200g)</span> — <span class="ex-detail">~20g proteine</span></div>
<div class="exercise"><span class="ex-name">Linte gătită (250g)</span> — <span class="ex-detail">~22g proteine</span></div>
<div class="exercise"><span class="ex-name">Năut gătit (250g)</span> — <span class="ex-detail">~20g proteine</span></div>
<div class="exercise"><span class="ex-name">Fasole gătită (250g)</span> — <span class="ex-detail">~20g proteine</span></div>
<div class="exercise"><span class="ex-name">Quinoa gătită (200g)</span> — <span class="ex-detail">~12g proteine</span></div>
<div class="exercise"><span class="ex-name">Nuci / migdale / semințe (30g)</span> — <span class="ex-detail">~5-9g proteine + grăsimi bune</span></div>
<div class="exercise"><span class="ex-name">Lapte de soia (250ml)</span> — <span class="ex-detail">~8g proteine</span></div>
<div class="day-title">Exemplu de zi de post (cu sală)</div>
<div class="exercise"><span class="ex-name">Mic dejun</span> — <span class="ex-detail">Ovăz + lapte de soia + banană + 30g nuci (~550 kcal)</span></div>
<div class="exercise"><span class="ex-name">Prânz</span> — <span class="ex-detail">Tocăniță de linte cu orez + salată (~600 kcal)</span></div>
<div class="exercise"><span class="ex-name">Gustare</span> — <span class="ex-detail">Iaurt de soia + semințe de dovleac (~250 kcal)</span></div>
<div class="exercise"><span class="ex-name">Cină</span> — <span class="ex-detail">Tofu la grătar cu legume + quinoa (~600 kcal)</span></div>
<div class="exercise"><span class="ex-name">După sală</span> — <span class="ex-detail">Shake proteic din soia/mazăre (~150 kcal)</span></div>
<div class="note">⚠️ <b>Post negru:</b> fără sală grea — doar mobilitate și plimbare. A doua zi reia normal cu greutăți -10%.<br>💪 În post obișnuit, antrenează-te normal — soia texturată și tofu te țin la fel de puternic ca carnea.</div>`;

// ===== Stretching / Mobilitate / Cardio =====
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
  applyTheme();
  renderAll();
}
function showSetup() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('setup-screen').classList.remove('hidden');
}
function renderAll() {
  renderToday(); renderMeals(); renderTraining(); renderProgress(); renderProfile();
  renderTrainCalendar(); renderFastCalendar();
}
function renderDate() {
  document.getElementById('today-date').textContent = DOW[new Date().getDay()] + ' · ' + new Date().toLocaleDateString('ro-RO');
}

// Tema in functie de sex (fata = roz neon + mov)
function applyTheme() {
  const p = getProfile();
  document.body.classList.toggle('theme-f', !!(p && p.sex === 'f'));
}

// Calendar periodizare (Sală)
function renderTrainCalendar() {
  const p = getProfile();
  const el = document.getElementById('train-cal');
  const st = document.getElementById('train-status');
  if (!el) return;
  const info = weekInfo();
  const startWeek = info.totalWeeks - info.weekInMeso;
  let html = '';
  for (let i = 0; i < 8; i++) {
    const wk = startWeek + i;
    const meso = Math.floor(wk / 4) + 1;
    const wIn = wk % 4;
    const isDel = wIn === 3;
    const cur = wk === info.totalWeeks;
    let pmark = '';
    if (p.sex === 'f' && p.cycle && p.cycle.last) {
      for (let k = 0; k < 4; k++) {
        const ps = addDays(p.cycle.last, k * (p.cycle.len || 28));
        const wStart = addDays(p.programStart, wk * 7);
        const wEnd = addDays(p.programStart, wk * 7 + 6);
        if (ps >= wStart && ps <= wEnd) { pmark = '<br>🌸'; break; }
      }
    }
    html += `<div class="cal-cell week ${isDel ? 'deload' : 'load'} ${cur ? 'today' : ''}">M${meso} S${wIn + 1}${pmark}</div>`;
  }
  el.innerHTML = html;
  let txt = `Săptămâna <b>${info.weekInMeso + 1}</b> din Mesociclul <b>${info.meso}</b> — `;
  txt += info.deload
    ? '🟡 <b>DESCĂRCARE</b>: volum -40%, greutăți -10%. Lasă corpul să-și facă rezervele — NU e lene, e știință.'
    : '🔵 <b>ÎNCĂRCARE</b>: progresiv — adaugă 1-2 kg la exercițiile principale față de săptămâna trecută.';
  if (info.weekInMeso === 2 && !info.deload) txt += ' Săptămâna cea mai greă — dă totul!';
  txt += `<br>🔄 Program: varianta ${info.block === 0 ? 'A' : 'B'} — se schimbă automat la fiecare 4 săptămâni.`;
  const pi = periodInfo();
  if (pi && pi.inPeriod) txt += '<br>🌸 <b>Perioadă menstruală</b>: antrenamente ușoare-moderate (2-3 serii, fără efort maxim). Dacă nu te simți bine, doar mobilitate.';
  const fi = fastInfo(todayKey());
  if (fi.black) txt += '<br>🚫 <b>Post negru</b> azi: fără sală grea — doar mobilitate/cardio foarte ușor.';
  else if (fi.name && fi.name === "Postul Paștelui" && daysBetween(todayKey(), "2027-04-30") <= 0 && daysBetween(todayKey(), "2027-04-30") > -3) txt += '<br>🚫 Aproape de Vinerea Mare — păstrează forța, nu face eforturi maxime.';
  st.innerHTML = txt;
  document.getElementById('btn-period').classList.toggle('hidden', p.sex !== 'f');
}

// Calendar posturi (Mâncare)
function renderFastCalendar() {
  const el = document.getElementById('fast-cal');
  if (!el) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  let html = '';
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fi = fastInfo(ds);
    const isToday = ds === todayKey();
    html += `<div class="cal-cell ${fi.black ? 'black' : (fi.active ? 'fast' : '')} ${isToday ? 'today' : ''}">${d}</div>`;
  }
  el.innerHTML = html;
  document.getElementById('fast-banner').innerHTML = fastBannerHTML();
  const plan = document.getElementById('fast-plan');
  if (plan) plan.innerHTML = FAST_PLAN_HTML;
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
  const TRAIN = getTraining();
  const tw = document.getElementById('today-workout');
  const info = weekInfo();
  const pi = periodInfo();
  const fi = fastInfo(todayKey());
  let status = '';
  status += info.deload
    ? '<div class="note">🟡 Săptămână de <b>DESCĂRCARE</b> — volum -40%, greutăți -10%.</div>'
    : `<div class="note">🔵 Săptămână de <b>ÎNCĂRCARE</b> (S${info.weekInMeso + 1}/4) — progresiv.</div>`;
  if (pi && pi.inPeriod) status += '<div class="note">🌸 <b>Menstruație</b> — azi ușor: 2-3 serii, fără efort maxim.</div>';
  if (fi.black) status += '<div class="note">🚫 <b>Post negru</b> — azi fără sală grea, doar mișcare ușoară.</div>';

  if (TRAIN[dow]) {
    let html = '<div class="day-title">' + TRAIN[dow].title + '</div>' + status;
    TRAIN[dow].exercises.forEach(slot => { html += exerciseHTML(slot); });
    html += `<div class="note">${TRAIN[dow].note}</div>`;
    tw.innerHTML = html;
  } else if (dow === 'Marți') {
    tw.innerHTML = status + '<div class="note">🏃 Fotbal 1h30 — zi de sport, fără sală. Odihnă activă.</div>';
  } else {
    tw.innerHTML = status + '<div class="note">🚶 Zi de odihnă sau cardio ușor (vezi secțiunea Cardio din tab-ul Sală).</div>';
  }
}

function buildRecommendation(p, t, tot) {
  const remP = t.protein - tot.p, remC = t.carbs - tot.cb, remF = t.fat - tot.f;
  const pctP = remP / t.protein, pctC = remC / t.carbs, pctF = remF / t.fat;
  const gap = Math.max(pctP, pctC, pctF);
  const cat = gap === pctP ? 'protein' : (gap === pctC ? 'carbs' : 'fat');
  const fi = fastInfo(todayKey());
  if (fi.active && cat === 'protein') {
    return `Îți lipsesc ~${round1(remP)}g proteine. <b>Post</b>: ia soia texturată, tofu sau linte (vezi planul de post în tab-ul Mâncare).`;
  }
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

// Un exercitiu = nume (redenumibil) + serie/reps + sfat + casuta kg/reps + istoric
function exerciseHTML(slot) {
  const key = activeSlotName(slot);
  const label = displayName(key);
  const log = getExLog()[key] || [];
  const last = lastSet(key);
  const hist = [...log].slice(-3).reverse().map(s =>
    `<div class="log-entry">${fmtDate(s.date)} — <b>${s.weight}kg × ${s.reps}</b></div>`
  ).join('');
  const tips = TIPS[key] ? `<div class="ex-tips">💡 ${TIPS[key]}</div>` : '';
  const info = weekInfo();
  const del = info.deload ? ' · <span class="dl">descărcare: mai puține serii, -10% kg</span>' : '';
  return `<div class="exercise-item">
    <div class="ex-head"><div class="ex-name">${esc(label)}</div><button class="ex-rename" data-key="${esc(key)}" title="Redenumește">✏️</button></div>
    <div class="ex-detail">${esc(slot.d)}${last ? ' · <b>ultimul: ' + last.weight + 'kg × ' + last.reps + '</b>' : ''}${del}</div>
    ${tips}
    <div class="ex-log" data-key="${esc(key)}">
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
  const TRAIN = getTraining();
  const info = weekInfo();

  let html = `<h3 class="section-h">🏋️ Antrenament (5 zile) — varianta ${info.block === 0 ? 'A' : 'B'}</h3>`;
  html += Object.keys(TRAIN).map(k => {
    const d = TRAIN[k];
    let h = `<div class="day-block"><div class="day-title">${d.title}</div>`;
    d.exercises.forEach(slot => { h += exerciseHTML(slot); });
    h += `<div class="note">${d.note}</div></div>`;
    return h;
  }).join('');
  html += '<div class="note">➜ Marțea: fotbal / odihnă activă. Duminica: cardio opțional.</div>';
  html += '<div class="note">✏️ Dacă sala ta nu are aparatul, apasă creionul lângă exercițiu și redenumește-l.</div>';
  html += '<div class="note">🔄 La fiecare 4 săptămâni exercițiile se schimbă automat (varianta A ↔ B).</div>';

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
    <b>${p.height} cm</b> · <b>${p.weight} kg</b> · <b>${p.age} ani</b> · ${p.sex === 'm' ? 'Băiat' : 'Fată'}<br>
    Obiectiv: <b>${p.goal === 'cut' ? 'Slăbire + definire' : p.goal === 'bulk' ? 'Masă' : 'Menținere'}</b><br>
    BMR: <b>${t.bmr} kcal</b> · TDEE: <b>${t.tdee} kcal</b><br>
    Ținta zilnică: <b>${t.target} kcal</b><br>
    Proteine <b>${t.protein}g</b> · Carbo <b>${t.carbs}g</b> · Grăsimi <b>${t.fat}g</b>
  `;
}

// ===== Gemini (incearca mai multe modele automat) =====
const AI_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];

function analyzeMeal(base64) {
  const p = getProfile();
  const fi = fastInfo(todayKey());
  const fastLine = fi.black ? "ATENȚIE: azi e post negru (foarte puțină mâncare) - estimează doar ce e în poză."
    : (fi.active ? "Context: persoana ține post ortodox (fără carne, lapte, ouă, pește azi)." : "");
  const prompt = `Ești un nutriționist. Analizează această poză cu mâncare și/sau eticheta nutrițională. 
Estimează caloriile și macro-urile (proteine, carbohidrați, grăsimi) pentru toată porția din poză.
Dacă e o etichetă, folosește valorile de pe ea și raportează-le la porția consumată.
${fastLine}
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

  const tryModel = (i) => {
    if (i >= AI_MODELS.length) {
      return Promise.reject(new Error('Toate modelele AI sunt ocupate acum. Încearcă peste câteva minute.'));
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS[i]}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(r => r.json()).then(data => {
      if (data.error) {
        if ([404, 429, 500, 503].includes(data.error.code)) return tryModel(i + 1);
        throw new Error(data.error.message || 'Eroare de la Gemini');
      }
      const txt = (data.candidates?.[0]?.content?.parts || []).map(pt => pt.text || '').join('');
      if (!txt) return tryModel(i + 1);
      try {
        return JSON.parse(txt.replace(/```json|```/g, '').trim());
      } catch (e) {
        return tryModel(i + 1);
      }
    });
  };
  return tryModel(0);
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
  const old = getProfile();
  const p = {
    height: parseFloat(document.getElementById('in-height').value) || 186,
    weight: parseFloat(document.getElementById('in-weight').value) || 98,
    age: parseInt(document.getElementById('in-age').value) || 27,
    sex: document.getElementById('in-sex').value,
    goal: document.getElementById('in-goal').value,
    activity: parseFloat(document.getElementById('in-activity').value),
    apiKey: apikey
  };
  p.programStart = (old && old.programStart) ? old.programStart : todayKey();
  p.cycle = (old && old.cycle) ? old.cycle : { last: null, len: 28 };
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
      status.textContent = '❌ ' + err.message;
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

document.getElementById('btn-period').addEventListener('click', () => {
  const p = getProfile();
  if (!p.cycle) p.cycle = { last: null, len: 28 };
  p.cycle.last = todayKey();
  store.set('profile', p);
  renderTrainCalendar(); renderToday();
  toast('Înregistrat — aplicarea calculează perioadele următoare 🌸');
});

document.getElementById('btn-fast-plan').addEventListener('click', () => {
  document.getElementById('fast-plan').classList.toggle('hidden');
});

document.getElementById('btn-key-help').addEventListener('click', () => {
  document.getElementById('key-help').classList.toggle('hidden');
});

// Preview tema cand selectezi sexul in setup
document.getElementById('in-sex').addEventListener('change', () => {
  document.body.classList.toggle('theme-f', document.getElementById('in-sex').value === 'f');
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

// Delegare: buton ➕ = salvează seria; ✏️ = redenumește
document.addEventListener('click', (ev) => {
  const renBtn = ev.target.closest('.ex-rename');
  if (renBtn) {
    const key = renBtn.dataset.key;
    const cur = displayName(key);
    const nn = prompt('Noul nume al exercițiului (aparatul tău din sală):', cur);
    if (nn !== null && nn.trim()) {
      setRename(key, nn.trim());
      renderTraining(); renderToday();
      toast('Exercițiu redenumit ✏️');
    }
    return;
  }
  const addBtn = ev.target.closest('.log-add');
  if (addBtn) {
    const log = addBtn.closest('.ex-log');
    const key = log.dataset.key;
    const w = parseFloat(log.querySelector('.log-weight').value);
    const r = parseInt(log.querySelector('.log-reps').value);
    if (!w || w <= 0 || !r || r <= 0) { toast('Completează kg și reps'); return; }
    addSet(key, w, r);
    renderTraining(); renderToday();
    toast(`${displayName(key)}: ${w}kg × ${r} salvat!`);
  }
});

// init
function ensureProfileFields() {
  const p = getProfile();
  if (!p) return;
  let ch = false;
  if (!p.programStart) { p.programStart = todayKey(); ch = true; }
  if (!p.cycle) { p.cycle = { last: null, len: 28 }; ch = true; }
  if (ch) store.set('profile', p);
}
renderDate();
ensureProfileFields();
applyTheme();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
if (getProfile()) showApp(); else showSetup();
