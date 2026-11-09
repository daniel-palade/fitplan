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

// ===== Sistem de programe (splits) — personalizate pe obiectiv =====
const POOL = {
  chest: [
    { a: "Împins din piept cu bara", b: "Împins din piept cu gantere", d: "4 × 6-10" },
    { a: "Împins înclinat cu gantere", b: "Împins înclinat cu bara", d: "3 × 8-12" },
    { a: "Fluturări cu gantere", b: "Fluturări la cablu", d: "3 × 12-15" },
    { a: "Fluturări la aparat (pec deck)", b: "Dips (piept)", d: "3 × 12-15" }
  ],
  back: [
    { a: "Tracțiuni la bară", b: "Tracțiuni la aparat (lat pulldown)", d: "4 × 6-12" },
    { a: "Ramat cu bara", b: "Ramat la cablu (seated row)", d: "4 × 8-12" },
    { a: "Ramat cu gantera (un braț)", b: "Îndreptări cu bara (deadlift)", d: "3 × 8-12" },
    { a: "Ridicări trapez (shrugs)", d: "3 × 12-15" }
  ],
  shoulders: [
    { a: "Împins la umeri cu bara", b: "Împins la umeri cu gantere", d: "3 × 8-12" },
    { a: "Fluturări laterale", b: "Ridicare la bărbie", d: "3 × 12-15" },
    { a: "Împins la umeri cu gantere", b: "Fluturări la aparat lateral", d: "3 × 10-12" }
  ],
  triceps: [
    { a: "Împins triceps la cablu (pushdown)", b: "Extensii cu bara EZ (skull crusher)", d: "3 × 10-15" },
    { a: "Dips (triceps)", b: "Flotări cu priză îngustă", d: "3 × 10-12" },
    { a: "Extensii cu gantera (peste cap)", b: "Împins triceps la cablu (pushdown)", d: "3 × 12-15" }
  ],
  biceps: [
    { a: "Curl cu bara", b: "Curl cu gantere alternativ", d: "3 × 10-12" },
    { a: "Curl ciocam (hammer)", b: "Curl la cablu", d: "3 × 10-12" },
    { a: "Curl concentrat", b: "Curl cu gantere alternativ", d: "3 × 12" }
  ],
  rear: [
    { a: "Fluturări spate (rear delt)", b: "Face pull la cablu", d: "3 × 12-15" },
    { a: "Face pull la cablu", b: "Fluturări spate (rear delt)", d: "3 × 15" }
  ],
  quads: [
    { a: "Genuflexiuni cu bara (squat)", b: "Genuflexiuni frontale cu bara", d: "4 × 6-10" },
    { a: "Împins la presă (leg press)", b: "Fandări bulgărești (split squat)", d: "4 × 10-15" },
    { a: "Fandări (lunges)", b: "Genuflexiuni la aparat (hack squat)", d: "3 × 10-12" },
    { a: "Extensii cvadriceps", b: "Step-up pe bancă", d: "3 × 12-15" }
  ],
  hams: [
    { a: "Îndreptări românești (RDL)", b: "Îndreptări cu bara (deadlift)", d: "4 × 8-12" },
    { a: "Flexii biceps femural", b: "Îndreptări românești (RDL)", d: "3 × 12-15" }
  ],
  glutes: [
    { a: "Hip thrust", b: "Glute bridge cu bara", d: "3 × 8-12" },
    { a: "Fandări invers", b: "Kickback la cablu", d: "3 × 10-12" },
    { a: "Abducții la aparat", b: "Abducții cu bandă elastică", d: "3 × 15" }
  ],
  calves: [
    { a: "Ridicări pe gambe", d: "4 × 12-15" }
  ],
  core: [
    { a: "Plank", b: "Dead bug", d: "3 × 30-60 sec" },
    { a: "Ridicări de picioare", b: "Twist rusesc", d: "3 × 12-15" },
    { a: "Dead bug", b: "Bird dog", d: "3 × 10" },
    { a: "Bird dog", b: "Plank", d: "3 × 10" }
  ]
};

const SPLIT_TEMPLATES = {
  ul: {
    Luni: ["chest", "back", "shoulders", "biceps", "triceps"],
    Miercuri: ["quads", "hams", "glutes", "calves", "core"],
    Joi: ["back", "chest", "shoulders", "triceps", "biceps"],
    Vineri: ["quads", "glutes", "hams", "calves", "core"],
    Sâmbătă: ["chest", "back", "shoulders", "core", "core"]
  },
  arnold: {
    Luni: ["chest", "chest", "back", "back", "shoulders"],
    Miercuri: ["shoulders", "shoulders", "triceps", "biceps", "core"],
    Joi: ["quads", "quads", "hams", "calves", "core"],
    Vineri: ["chest", "back", "back", "shoulders", "triceps"],
    Sâmbătă: ["biceps", "triceps", "shoulders", "core", "calves"]
  },
  full: {
    Luni: ["chest", "back", "quads", "core", "calves"],
    Miercuri: ["back", "shoulders", "hams", "glutes", "core"],
    Joi: ["chest", "back", "quads", "biceps", "triceps"],
    Vineri: ["shoulders", "back", "hams", "glutes", "core"],
    Sâmbătă: ["quads", "glutes", "biceps", "core", "calves"]
  },
  bro: {
    Luni: ["chest", "chest", "chest", "triceps", "triceps"],
    Miercuri: ["back", "back", "back", "rear", "biceps"],
    Joi: ["quads", "quads", "hams", "glutes", "calves"],
    Vineri: ["shoulders", "shoulders", "rear", "triceps", "core"],
    Sâmbătă: ["biceps", "biceps", "triceps", "triceps", "core"]
  },
  hl: {
    Luni: ["chest", "back", "shoulders", "biceps", "triceps"],
    Miercuri: ["quads", "hams", "glutes", "calves", "core"],
    Joi: ["chest", "back", "shoulders", "triceps", "biceps"],
    Vineri: ["quads", "hams", "glutes", "calves", "core"],
    Sâmbătă: ["chest", "back", "shoulders", "core", "core"]
  }
};

const SPLIT_TITLES = {
  ul: { Luni: "Upper A (piept, spate, umeri)", Miercuri: "Lower A (picioare)", Joi: "Upper B", Vineri: "Lower B", Sâmbătă: "Full Body ușor + Core" },
  arnold: { Luni: "Piept + Spate", Miercuri: "Umeri + Brațe", Joi: "Picioare", Vineri: "Piept + Spate (2)", Sâmbătă: "Brațe + Core" },
  full: { Luni: "Full Body A", Miercuri: "Full Body B", Joi: "Full Body C", Vineri: "Full Body D", Sâmbătă: "Full Body E" },
  bro: { Luni: "Piept + Triceps", Miercuri: "Spate + Biceps", Joi: "Picioare", Vineri: "Umeri", Sâmbătă: "Brațe (biceps + triceps)" },
  hl: { Luni: "Upper GREU", Miercuri: "Lower GREU", Joi: "Upper UȘOR", Vineri: "Lower UȘOR", Sâmbătă: "Pump + Core" }
};

const SPLIT_META = {
  ppl: { name: "Push / Pull / Legs (PPL)", why: "Cel mai popular pentru MASĂ MUSCULARĂ — volum mare pe fiecare mușchi." },
  ul: { name: "Upper / Lower", why: "Echilibru perfect — recomandat pentru MENȚINERE." },
  arnold: { name: "Arnold Split", why: "Clasicul lui Arnold — volum mare, pentru cei experimentați." },
  full: { name: "Full Body", why: "Cea mai bună alegere pentru SLĂBIRE — arzi mult la fiecare antrenament." },
  bro: { name: "Bro Split", why: "Un mușchi pe zi — clasic de sală, volum mare pe mușchi." },
  hl: { name: "Heavy-Light", why: "Zile grele alternând cu ușoare — bun pentru forță și recuperare." },
  custom: { name: "Programul meu (personalizat)", why: "Îl construiești tu — zile, exerciții, serii, fix cum vrei." }
};

function defaultSplit(goal) {
  return goal === 'cut' ? 'full' : goal === 'bulk' ? 'ppl' : 'ul';
}

function buildProgram(key, p) {
  const tmpl = SPLIT_TEMPLATES[key];
  if (!tmpl) return null;
  const titles = SPLIT_TITLES[key];
  const block = weekInfo().block;
  const out = {};
  const catCursor = {};
  Object.keys(tmpl).forEach(day => {
    let cats = tmpl[day].slice();
    if (p.sex === 'f') {
      // accent pe fesieri la fete: excedentul de piept/brațe devine fesieri/core
      let chestCount = 0, bicepCount = 0, triCount = 0;
      cats = cats.map(c => {
        if (c === 'chest') { chestCount++; if (chestCount > 1) return 'glutes'; }
        if (c === 'biceps') { bicepCount++; if (bicepCount > 1) return 'core'; }
        if (c === 'triceps') { triCount++; if (triCount > 1) return 'core'; }
        return c;
      });
    }
    const exs = cats.map(cat => {
      const pool = POOL[cat] || [];
      if (!pool.length) return null;
      catCursor[cat] = catCursor[cat] || 0;
      const idx = (block + catCursor[cat]) % pool.length;
      catCursor[cat]++;
      const pick = pool[idx];
      return { a: pick.a, b: pick.b, d: pick.d };
    }).filter(Boolean);
    const goalNote = p.goal === 'cut'
      ? 'Slăbire: menține greutățile, odihnă 60-90 sec, la final 10-15 min cardio ușor.'
      : p.goal === 'bulk'
        ? 'Masă: supraîncărcare progresivă — când faci toate reps, +1-2 kg data viitoare.'
        : 'Menținere: formă bună, greutăți constante, plăcere.';
    out[day] = { title: day + " — " + titles[day], note: goalNote, exercises: exs };
  });
  return out;
}

const DOW = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
function getCustomProgram() { return store.get('customProgram', {}); }
function setCustomProgram(cp) { store.set('customProgram', cp); }

function buildCustom() {
  const cp = getCustomProgram();
  const out = {};
  Object.keys(cp).forEach(day => {
    out[day] = {
      title: cp[day].title || day,
      note: 'Programul tău personal — construiește-l cum vrei tu.',
      exercises: cp[day].exercises || []
    };
  });
  return out;
}

function getTraining() {
  const p = getProfile();
  if (!p) return TRAINING_M;
  const key = p.split || defaultSplit(p.goal);
  if (key === 'custom') return buildCustom();
  if (key === 'ppl' || !SPLIT_TEMPLATES[key]) {
    // PPL foloseste programele detaliate (cu varianta feminina)
    return p.sex === 'f' ? TRAINING_F : TRAINING_M;
  }
  return buildProgram(key, p);
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
  renderTrainCalendar(); renderFastCalendar(); renderSeasonal();
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
  const startWeek = Math.max(0, info.totalWeeks - info.weekInMeso - 4);
  let html = '';
  let lastMeso = -1;
  for (let i = 0; i < 12; i++) {
    const wk = startWeek + i;
    const meso = Math.floor(wk / 4) + 1;
    if (meso !== lastMeso) {
      if (lastMeso !== -1) html += '</div>';
      html += `<div class="month-title">📦 Mesociclul ${meso}</div><div class="cal-grid weeks">`;
      lastMeso = meso;
    }
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
    html += `<div class="cal-g week ${isDel ? 'deload' : 'load'} ${cur ? 'today' : ''}">S${wIn + 1}${pmark}</div>`;
  }
  html += '</div>';
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

// ===== Calendare: luni + sezon =====
const MONTHS_RO = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

const SEASONAL = {
  1: { fructe: ["mere", "pere", "gutui", "portocale", "mandarine", "kiwi"], legume: ["varză", "cartofi", "morcovi", "păstârnac", "sfeclă", "praz", "conopidă", "broccoli", "ceapă", "usturoi"] },
  2: { fructe: ["mere", "pere", "gutui", "portocale", "mandarine", "kiwi", "lămâi"], legume: ["varză", "cartofi", "morcovi", "sfeclă", "praz", "spanac", "conopidă", "broccoli", "ceapă", "usturoi"] },
  3: { fructe: ["mere", "pere", "portocale", "lămâi", "kiwi"], legume: ["salată verde", "spanac", "ceapă verde", "urzici", "ridichi", "conopidă", "broccoli", "morcovi"] },
  4: { fructe: ["mere", "căpșuni", "lămâi"], legume: ["salată verde", "spanac", "ceapă verde", "urzici", "ridichi", "mărar", "broccoli", "conopidă"] },
  5: { fructe: ["căpșuni", "cireșe"], legume: ["salată verde", "spanac", "ridichi", "ceapă verde", "mazăre", "usturoi verde", "ștevie", "lobodă"] },
  6: { fructe: ["căpșuni", "cireșe", "vișine", "piersici"], legume: ["salată", "mazăre", "fasole verde", "dovlecel", "spanac", "ardei gras", "mărar"] },
  7: { fructe: ["cireșe", "vișine", "piersici", "caise", "afine", "zmeură", "pepene verde"], legume: ["roșii", "castraveți", "ardei", "vinete", "dovlecei", "fasole verde", "porumb"] },
  8: { fructe: ["piersici", "caise", "prune", "afine", "zmeură", "gutui", "pepene verde", "pepene roșu"], legume: ["roșii", "castraveți", "ardei", "vinete", "porumb", "morcovi tineri", "fasole verde"] },
  9: { fructe: ["struguri", "prune", "mere", "pere", "gutui", "nuci"], legume: ["roșii", "ardei", "vinete", "dovleac", "conopidă", "varză", "broccoli", "ciuperci"] },
  10: { fructe: ["mere", "pere", "gutui", "struguri", "nuci"], legume: ["dovleac", "cartofi", "varză", "conopidă", "broccoli", "sfeclă", "morcovi", "hrean"] },
  11: { fructe: ["mere", "pere", "gutui", "nuci", "cătină"], legume: ["varză", "cartofi", "morcovi", "sfeclă", "praz", "ceapă", "usturoi", "dovleac", "spanac"] },
  12: { fructe: ["mere", "pere", "gutui", "portocale", "mandarine", "nuci"], legume: ["varză", "cartofi", "morcovi", "sfeclă", "praz", "ceapă", "usturoi", "dovleac", "conopidă"] }
};

function renderSeasonal() {
  const el = document.getElementById('seasonal-box');
  if (!el) return;
  const m = new Date().getMonth() + 1;
  const s = SEASONAL[m];
  const mname = MONTHS_RO[m - 1];
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  el.innerHTML = `
    <div class="note">În <b>${mname}</b>, astea sunt proaspete și ieftine:</div>
    <div class="day-title">🍓 Fructe</div>
    ${s.fructe.map(f => `<div class="exercise"><span class="ex-name">${cap(f)}</span></div>`).join('')}
    <div class="day-title">🥕 Legume</div>
    ${s.legume.map(f => `<div class="exercise"><span class="ex-name">${cap(f)}</span></div>`).join('')}`;
}

// Calendar posturi (Mâncare) — 3 luni
function monthGridHTML(y, m) {
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  let cells = '<div class="cal-dow"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="cal-grid">';
  for (let i = 0; i < firstDow; i++) cells += '<div class="cal-g empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const fi = fastInfo(ds);
    const isToday = ds === todayKey();
    cells += `<div class="cal-g ${fi.black ? 'black' : (fi.active ? 'fast' : '')} ${isToday ? 'today' : ''}" data-ds="${ds}">${d}</div>`;
  }
  cells += '</div>';
  const title = MONTHS_RO[m].charAt(0).toUpperCase() + MONTHS_RO[m].slice(1) + ' ' + y;
  return `<div class="month-block"><div class="month-title">🗓️ ${title}</div>${cells}</div>`;
}

// Detalii pentru ziua selectata din calendar
function dayDetailHTML(ds) {
  const p = getProfile();
  const fi = fastInfo(ds);
  const dow = DOW[new Date(ds).getDay()];
  const TRAIN = getTraining();
  const dnum = new Date(ds);
  const mn = MONTHS_RO[dnum.getMonth()];
  const mname = mn.charAt(0).toUpperCase() + mn.slice(1);
  let html = `<div class="month-title" style="margin-bottom:6px;">📅 ${dnum.getDate()} ${mname} ${dnum.getFullYear()} — ${dow}</div>`;
  if (fi.black) {
    html += '<div class="note">🚫 <b>POST NEGRU</b> — fără mâncare sau foarte puțin după amiază. La sală: fără efort mare, doar mobilitate sau plimbare.</div>';
  } else if (fi.name) {
    html += `<div class="note">🌿 <b>${fi.name}</b> — fără carne, lapte, ouă, pește. Proteine din: soia texturată, tofu, linte, năut, fasole. Vezi „Planul meu de post".</div>`;
  } else if (fi.wedfri) {
    html += '<div class="note">🌿 Zi de post (miercuri/vineri) — fără carne, lapte, ouă, pește.</div>';
  } else {
    html += '<div class="note">✅ Nu e post — mănânci normal după planul tău.</div>';
  }
  if (TRAIN[dow]) {
    html += `<div class="note">🏋️ <b>${TRAIN[dow].title}</b> — exercițiile și încălzirea în tab-ul Sală.</div>`;
  } else if (dow === 'Marți') {
    html += '<div class="note">🏃 Fotbal 1h30 — zi de sport, fără sală.</div>';
  } else if (dow === 'Duminică') {
    html += '<div class="note">🚶 Odihnă sau cardio ușor (30-45 min).</div>';
  }
  if (p && p.programStart) {
    const wk = Math.floor(daysBetween(p.programStart, ds) / 7);
    const wIn = ((wk % 4) + 4) % 4;
    html += (wIn === 3)
      ? '<div class="note">🟡 Săptămână de <b>DESCĂRCARE</b> — volum -40%, greutăți -10%.</div>'
      : `<div class="note">🔵 Săptămână de <b>ÎNCĂRCARE</b> ${wIn + 1}/4 — progresiv, adaugă kg la exercițiile principale.</div>`;
  }
  if (p && p.sex === 'f' && p.cycle && p.cycle.last) {
    const len = p.cycle.len || 28;
    const d = daysBetween(p.cycle.last, ds);
    const dayOf = ((d % len) + len) % len;
    if (dayOf < 5) html += '<div class="note">🌸 Posibilă menstruație — antrenamente ușoare-moderate, fără efort maxim.</div>';
    else if (dayOf >= len - 3 && dayOf < len) html += '<div class="note">🌸 Ciclul se apropie — păstrează energie, nu forța recorduri.</div>';
  }
  return html;
}

function renderFastCalendar() {
  const el = document.getElementById('fast-cal');
  if (!el) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  let pm = m - 1, py = y;
  if (pm < 0) { pm = 11; py = y - 1; }
  let nm = m + 1, ny = y;
  if (nm > 11) { nm = 0; ny = y + 1; }
  el.innerHTML = monthGridHTML(py, pm) + monthGridHTML(y, m) + monthGridHTML(ny, nm);
  document.getElementById('fast-banner').innerHTML = fastBannerHTML();
  const plan = document.getElementById('fast-plan');
  if (plan) plan.innerHTML = FAST_PLAN_HTML;
}

function renderToday() {
  const p = getProfile();
  const t = computeTargets(p);
  const tot = todayTotals();
  const rem = Math.round(t.target - tot.c);
  // zile consecutive
  const stk = store.get('streak', { last: null, count: 0 });
  document.getElementById('greet-line').innerHTML =
    `<span class="streak">🔥 ${stk.count} ${stk.count === 1 ? 'zi' : 'zile'} la rând</span>`;
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
    html += warmupHTML(TRAIN[dow]);
    html += EX_TABLE_HEAD;
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
  list.innerHTML = today.meals.map((m, i) => {
    const meta = `${m.calories} kcal · P ${m.protein}g · C ${m.carbs}g · G ${m.fat}g`;
    return `<li class="meal-row">
      <div class="meal-info">
        <div class="meal-name">${esc(m.name)}</div>
        <div class="meal-meta">${meta}</div>
      </div>
      <div class="meal-actions">
        <button class="meal-edit" data-i="${i}" title="Editează">✏️</button>
        <button class="meal-del" data-i="${i}" title="Șterge">🗑️</button>
      </div>
    </li>`;
  }).join('');
}

// ===== Incalzire speciala pentru fiecare zi de sala =====
const WARMUP_BY_CAT = {
  chest: ["Fluturări fără greutate × 15", "Împins cu bară goală × 12"],
  back: ["Ridicări de umeri (shrugs) ușoare × 12", "Tracțiuni ușoare × 5-8 sau aparat ușor × 12"],
  shoulders: ["Cercuri de brațe × 15 în fiecare direcție", "Fluturări laterale foarte ușoare × 12"],
  triceps: ["Împins triceps foarte ușor × 15"],
  biceps: ["Curl foarte ușor × 15"],
  rear: ["Fluturări spate foarte ușoare × 15"],
  quads: ["Genuflexiuni fără greutate × 15", "Fandări în loc × 10 fiecare picior"],
  hams: ["Îndreptări cu bară goală × 12"],
  glutes: ["Glute bridge × 15", "Abducții cu bandă × 15"],
  calves: ["Ridicări pe gambe fără greutate × 15"],
  core: ["Plank ușor 20 sec"]
};

function catOfExercise(name) {
  for (const cat of Object.keys(POOL)) {
    if (POOL[cat].some(it => it.a === name || it.b === name)) return cat;
  }
  return null;
}

function warmupForDay(dayData) {
  const items = ["3-5 min bicicletă / vâslire ușoară (pulsul urcă puțin, nu te obosi)"];
  const cats = [];
  (dayData.exercises || []).forEach(slot => {
    const c = catOfExercise(activeSlotName(slot));
    if (c && !cats.includes(c)) cats.push(c);
  });
  cats.slice(0, 4).forEach(c => {
    (WARMUP_BY_CAT[c] || []).forEach(w => { if (!items.includes(w)) items.push(w); });
  });
  const first = dayData.exercises && dayData.exercises[0];
  if (first) {
    items.push(`${displayName(activeSlotName(first))}: 1-2 serii ușoare cu 40-50% din kg normal (× 10-12)`);
    const second = dayData.exercises[1];
    if (second) items.push(`${displayName(activeSlotName(second))}: 1 serie ușoară (× 10)`);
  }
  return items;
}

function warmupHTML(dayData) {
  const items = warmupForDay(dayData);
  return `<div class="warmup">
    <div class="warmup-title">🔥 Încălzire (înainte de antrenament)</div>
    ${items.map(i => `<div class="warmup-item">${i}</div>`).join('')}
  </div>`;
}

const EX_TABLE_HEAD = `<div class="ex-table-head"><span class="th-yt">▶️</span><span>Exercițiu · Serii</span><span class="th-add">➕</span><span class="th-ren">✏️</span></div>`;

function toggleExLog(key) {
  const logs = document.querySelectorAll(`.ex-log[data-key="${CSS.escape(key)}"]`);
  if (!logs.length) return;
  logs.forEach(l => {
    l.classList.toggle('hidden');
    if (!l.classList.contains('hidden')) {
      const inp = l.querySelector('.log-weight');
      if (inp && l.closest('.tab.active')) inp.focus();
    }
  });
}

// Un exercitiu = tabel: ▶️ YouTube + nume + ➕ adauga kg/reps + ✏️ redenumire
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
  const del = info.deload ? ' · <span class="dl">descărcare: -10% kg</span>' : '';
  return `<div class="exercise-item">
    <div class="ex-row">
      <button class="ex-yt" data-key="${esc(key)}" title="Vezi pe YouTube Shorts cum se execută">▶️</button>
      <div class="ex-main" data-key="${esc(key)}" title="Apasă ca să adaugi kg și reps">
        <div class="ex-name">${esc(label)}</div>
        <div class="ex-detail">${esc(slot.d)}${last ? ' · <b>ultimul: ' + last.weight + 'kg × ' + last.reps + '</b>' : ''}${del}</div>
      </div>
      <button class="ex-add" data-key="${esc(key)}" title="Adaugă kg și repetări">➕</button>
      <button class="ex-rename" data-key="${esc(key)}" title="Redenumește exercițiul">✏️</button>
    </div>
    ${tips}
    <div class="ex-log hidden" data-key="${esc(key)}">
      <div class="inline-form log-form">
        <input type="number" class="log-weight" inputmode="decimal" placeholder="kg" />
        <input type="number" class="log-reps" inputmode="numeric" placeholder="reps" />
        <button class="log-add">➕</button>
      </div>
      <div class="log-history">${hist || '<div class="meal-meta">Nicio serie salvată încă.</div>'}</div>
    </div>
  </div>`;
}

// Editor program personalizat
function renderCustomEditor() {
  const cp = getCustomProgram();
  const el = document.getElementById('custom-days');
  if (!Object.keys(cp).length) {
    el.innerHTML = '<div class="note">Programul tău e gol. Apasă „➕ Adaugă o zi" și construiește-l fix cum vrei tu: alegi zilele, exercițiile și seriile.</div>';
    return;
  }
  el.innerHTML = Object.keys(cp).map(day => {
    const d = cp[day];
    const exs = (d.exercises || []).map((e, i) =>
      `<div class="exercise"><span class="ex-name">${esc(e.a)}</span> — <span class="ex-detail">${esc(e.d || '')}</span>
        <button class="ce-btn ce-del-ex" data-day="${esc(day)}" data-i="${i}" type="button">🗑️</button></div>`
    ).join('');
    return `<div class="day-block">
      <div class="day-title">${esc(day)} — ${esc(d.title || '')}
        <button class="ce-btn ce-del-day" data-day="${esc(day)}" type="button">🗑️ ziua</button>
        <button class="ce-btn ce-ren-day" data-day="${esc(day)}" type="button">✏️ titlu</button>
      </div>
      ${exs}
      <button class="ce-btn ce-add-ex" data-day="${esc(day)}" type="button">➕ Adaugă exercițiu</button>
    </div>`;
  }).join('');
}

function renderTraining() {
  const el = document.getElementById('training-plan');
  const p = getProfile();
  const TRAIN = getTraining();
  const info = weekInfo();
  const isCustom = p && p.split === 'custom';

  document.getElementById('btn-custom-edit').classList.toggle('hidden', !isCustom);

  let html = isCustom
    ? '<h3 class="section-h">🏋️ Programul meu personalizat</h3>'
    : `<h3 class="section-h">🏋️ Antrenament (5 zile) — varianta ${info.block === 0 ? 'A' : 'B'}</h3>`;
  if (isCustom && !Object.keys(TRAIN).length) {
    html += '<div class="note">✏️ Programul tău e gol. Apasă butonul „✏️ Editează programul meu" de sus și construiește-l fix cum vrei: zile, exerciții, serii.</div>';
  }
  html += Object.keys(TRAIN).map(k => {
    const d = TRAIN[k];
    let h = `<div class="day-block"><div class="day-title">${d.title}</div>`;
    h += warmupHTML(d);
    h += EX_TABLE_HEAD;
    d.exercises.forEach(slot => { h += exerciseHTML(slot); });
    h += `<div class="note">${d.note}</div></div>`;
    return h;
  }).join('');
  html += '<div class="note">➜ Marțea: fotbal / odihnă activă. Duminica: cardio opțional.</div>';
  html += '<div class="note">▶️ = filmare YouTube Shorts · ➕ (sau click pe exercițiu) = adaugă kg × reps · ✏️ = redenumește aparatul din sala ta.</div>';
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
    Program: <b>${SPLIT_META[(p.split || defaultSplit(p.goal))].name}</b> — ${SPLIT_META[(p.split || defaultSplit(p.goal))].why}<br>
    BMR: <b>${t.bmr} kcal</b> · TDEE: <b>${t.tdee} kcal</b><br>
    Ținta zilnică: <b>${t.target} kcal</b><br>
    Proteine <b>${t.protein}g</b> · Carbo <b>${t.carbs}g</b> · Grăsimi <b>${t.fat}g</b>
  `;
}

// ===== Gemini (incearca mai multe modele automat) =====
const AI_MODELS = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];

function fetchTO(url, opts, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 40000);
  return fetch(url, Object.assign({}, opts, { signal: ctrl.signal })).finally(() => clearTimeout(t));
}

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
      return Promise.reject(new Error('Serverul e ocupat — mai încearcă o dată'));
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS[i]}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
    return fetchTO(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(r => r.json()).then(data => {
      if (data.error) {
        if (data.error.code === 400 || data.error.code === 403) {
          const e = new Error(data.error.message || 'Eroare');
          e.noRetry = true;
          throw e;
        }
        if ([404, 429, 500, 503].includes(data.error.code)) return tryModel(i + 1);
        throw new Error(data.error.message || 'Eroare');
      }
      const txt = (data.candidates?.[0]?.content?.parts || []).map(pt => pt.text || '').join('');
      if (!txt) return tryModel(i + 1);
      try {
        return JSON.parse(txt.replace(/```json|```/g, '').trim());
      } catch (e) {
        return tryModel(i + 1);
      }
    }).catch(e => {
      if (e && e.noRetry) throw e;
      return tryModel(i + 1);
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
    cb(cnv.toDataURL('image/jpeg', 0.75).split(',')[1]);
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
    name: document.getElementById('in-name').value.trim() || 'Campion',
    height: parseFloat(document.getElementById('in-height').value) || 186,
    weight: parseFloat(document.getElementById('in-weight').value) || 98,
    age: parseInt(document.getElementById('in-age').value) || 27,
    sex: document.getElementById('in-sex').value,
    goal: document.getElementById('in-goal').value,
    split: document.getElementById('in-split').value || defaultSplit(document.getElementById('in-goal').value),
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
  status.innerHTML = '<span class="typing"><span></span><span></span><span></span></span> Analizez poza...';
  resizeImage(file, 800, (base64) => {
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

// ===== Chat de mancare: scrii ce ai mancat, AI-ul calculeaza =====
function analyzeTextMeal(text) {
  const p = getProfile();
  const fi = fastInfo(todayKey());
  const fastLine = fi.active ? ' Context: persoana ține post ortodox azi (fără carne, lapte, ouă, pește).' : '';
  const prompt = `Ești nutriționist. Descrierea mesei: "${text}"
Estimează caloriile și macro-urile (proteine, carbohidrați, grăsimi) pentru toată porția descrisă.${fastLine}
Răspunde DOAR cu un obiect JSON cu exact aceste chei:
{
  "name": "numele scurt al mesei",
  "calories": numar,
  "protein": numar,
  "carbs": numar,
  "fat": numar,
  "portion": "descrierea porției estimate",
  "confidence": "high|medium|low",
  "notes": "1-2 propoziții despre calitatea alimentului"
}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };
  return geminiText(body).then(txt => {
    try {
      return JSON.parse(txt.replace(/```json|```/g, '').trim());
    } catch (e) {
      throw new Error('Nu am putut calcula — reformulează mâncarea');
    }
  });
}

function mealTextSend() {
  const inp = document.getElementById('meal-text');
  const text = inp.value.trim();
  if (!text) { toast('Scrie ce ai mâncat'); return; }
  const status = document.getElementById('meal-text-status');
  status.innerHTML = '<span class="typing"><span></span><span></span><span></span></span> Calculez caloriile...';
  analyzeTextMeal(text).then(res => {
    const { all, today } = getLog();
    today.meals.push({
      name: res.name || text.slice(0, 30), calories: res.calories || 0,
      protein: res.protein || 0, carbs: res.carbs || 0, fat: res.fat || 0,
      portion: res.portion || '', confidence: res.confidence || 'medium', notes: res.notes || ''
    });
    saveLog(all);
    renderToday(); renderMeals();
    status.textContent = `✅ ${res.name}: ${res.calories} kcal · P ${res.protein}g · C ${res.carbs}g · G ${res.fat}g`;
    inp.value = '';
    toast((res.name || 'Mâncare') + ' adăugată!');
  }).catch(err => {
    status.textContent = '❌ ' + err.message;
  });
}

document.getElementById('btn-meal-text').addEventListener('click', mealTextSend);
document.getElementById('meal-text').addEventListener('keydown', (e) => { if (e.key === 'Enter') mealTextSend(); });

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
  document.getElementById('in-name').value = p.name || '';
  document.getElementById('in-height').value = p.height;
  document.getElementById('in-weight').value = p.weight;
  document.getElementById('in-age').value = p.age;
  document.getElementById('in-sex').value = p.sex;
  document.getElementById('in-goal').value = p.goal;
  document.getElementById('in-split').value = p.split || defaultSplit(p.goal);
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

document.getElementById('btn-custom-edit').addEventListener('click', () => {
  renderCustomEditor();
  document.getElementById('custom-editor').classList.remove('hidden');
  document.getElementById('custom-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('btn-custom-done').addEventListener('click', () => {
  document.getElementById('custom-editor').classList.add('hidden');
  renderTraining(); renderToday(); renderTrainCalendar();
  toast('Programul tău e salvat! ✅');
});

document.getElementById('btn-custom-add-day').addEventListener('click', () => {
  const raw = prompt('Ziua (scrie una din): ' + DOW.join(', '), 'Luni');
  if (!raw) return;
  const day = raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
  if (!DOW.includes(day)) { toast('Ziua nu e validă — scrie ex: Luni'); return; }
  const cp = getCustomProgram();
  if (cp[day]) { toast('Ziua există deja — șterge-o întâi dacă vrei să o refaci'); return; }
  const title = prompt('Titlul zilei (ex: Picioare grele):', day + ' — antrenamentul meu');
  cp[day] = { title: (title && title.trim()) || (day + ' — antrenamentul meu'), exercises: [] };
  setCustomProgram(cp);
  renderCustomEditor();
  toast('Zi adăugată! Acum adaugă exerciții.');
});

document.getElementById('btn-cal-size').addEventListener('click', () => {
  const cal = document.getElementById('fast-cal');
  cal.classList.toggle('compact');
  document.getElementById('btn-cal-size').textContent =
    cal.classList.contains('compact') ? '🔍 Marește calendarul' : '🔍 Micșorează calendarul';
});

document.getElementById('btn-key-help').addEventListener('click', () => {
  document.getElementById('key-help').classList.toggle('hidden');
});

// Recomandare automata a programului in functie de obiectiv
document.getElementById('in-goal').addEventListener('change', () => {
  const g = document.getElementById('in-goal').value;
  document.getElementById('in-split').value = defaultSplit(g);
  toast('Am ales programul recomandat pentru obiectivul tău');
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
  const chatRow = ev.target.closest('.chat-room-row');
  if (chatRow) {
    const c = getChat();
    c.active = chatRow.dataset.code;
    setChat(c);
    openRoomChat();
    return;
  }
  const ceAdd = ev.target.closest('.ce-add-ex');
  if (ceAdd) {
    const day = ceAdd.dataset.day;
    const v = prompt('Exercițiul (nume | serii × repetări):', 'Împins din piept cu bara | 4 × 8-12');
    if (!v) return;
    const parts = v.split('|').map(x => x.trim());
    const cp = getCustomProgram();
    if (!cp[day]) return;
    cp[day].exercises.push({ a: parts[0] || 'Exercițiu', d: parts[1] || '3 × 10' });
    setCustomProgram(cp);
    renderCustomEditor();
    toast('Exercițiu adăugat!');
    return;
  }
  const ceDelEx = ev.target.closest('.ce-del-ex');
  if (ceDelEx) {
    const day = ceDelEx.dataset.day;
    const i = parseInt(ceDelEx.dataset.i);
    const cp = getCustomProgram();
    if (cp[day] && cp[day].exercises[i] && confirm('Ștergi „' + cp[day].exercises[i].a + '"?')) {
      cp[day].exercises.splice(i, 1);
      setCustomProgram(cp);
      renderCustomEditor();
      toast('Șters!');
    }
    return;
  }
  const ceRenDay = ev.target.closest('.ce-ren-day');
  if (ceRenDay) {
    const day = ceRenDay.dataset.day;
    const cp = getCustomProgram();
    const t = prompt('Titlul zilei:', cp[day] ? cp[day].title : day);
    if (t && t.trim() && cp[day]) {
      cp[day].title = t.trim();
      setCustomProgram(cp);
      renderCustomEditor();
      toast('Titlu schimbat!');
    }
    return;
  }
  const ceDelDay = ev.target.closest('.ce-del-day');
  if (ceDelDay) {
    const day = ceDelDay.dataset.day;
    const cp = getCustomProgram();
    if (cp[day] && confirm('Ștergi ziua ' + day + ' (cu toate exercițiile)?')) {
      delete cp[day];
      setCustomProgram(cp);
      renderCustomEditor();
      toast('Zi ștearsă!');
    }
    return;
  }
  const calDay = ev.target.closest('.cal-g[data-ds]');
  if (calDay) {
    const ds = calDay.dataset.ds;
    const el = document.getElementById('day-detail');
    if (el) {
      el.innerHTML = dayDetailHTML(ds) + '<button class="cal-toggle" type="button" id="btn-day-close">✖ Închide</button>';
      el.classList.remove('hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
  }
  if (ev.target.closest('#btn-day-close')) {
    const el = document.getElementById('day-detail');
    if (el) el.classList.add('hidden');
    return;
  }
  const mealDel = ev.target.closest('.meal-del');
  if (mealDel) {
    const i = parseInt(mealDel.dataset.i);
    const { all, today } = getLog();
    if (today.meals[i] && confirm('Ștergi „' + today.meals[i].name + '"?')) {
      today.meals.splice(i, 1);
      saveLog(all);
      renderMeals(); renderToday();
      toast('Șters!');
    }
    return;
  }
  const mealEdit = ev.target.closest('.meal-edit');
  if (mealEdit) {
    const i = parseInt(mealEdit.dataset.i);
    const { all, today } = getLog();
    const m = today.meals[i];
    if (!m) return;
    const v = prompt('Editează: nume | kcal | proteine | carbo | grăsimi', `${m.name} | ${m.calories} | ${m.protein} | ${m.carbs} | ${m.fat}`);
    if (v !== null) {
      const parts = v.split('|').map(x => x.trim());
      if (parts.length >= 5 && parts[0]) {
        m.name = parts[0];
        m.calories = parseFloat(parts[1]) || 0;
        m.protein = parseFloat(parts[2]) || 0;
        m.carbs = parseFloat(parts[3]) || 0;
        m.fat = parseFloat(parts[4]) || 0;
        saveLog(all);
        renderMeals(); renderToday();
        toast('Actualizat!');
      } else {
        toast('Format: nume | kcal | proteine | carbo | grăsimi');
      }
    }
    return;
  }
  const ytBtn = ev.target.closest('.ex-yt');
  if (ytBtn) {
    const key = ytBtn.dataset.key;
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(displayName(key)) + '&sp=EgIYAQ%3D%3D', '_blank');
    return;
  }
  const exAdd = ev.target.closest('.ex-add');
  if (exAdd) { toggleExLog(exAdd.dataset.key); return; }
  const exMain = ev.target.closest('.ex-main');
  if (exMain) { toggleExLog(exMain.dataset.key); return; }
  const addBtn = ev.target.closest('.log-add');
  if (addBtn) {
    const log = addBtn.closest('.ex-log');
    const key = log.dataset.key;
    const w = parseFloat(log.querySelector('.log-weight').value);
    const r = parseInt(log.querySelector('.log-reps').value);
    if (!w || w <= 0 || !r || r <= 0) { toast('Completează kg și reps'); return; }
    addSet(key, w, r);
    renderTraining(); renderToday();
    toggleExLog(key);
    toast(`${displayName(key)}: ${w}kg × ${r} salvat!`);
  }
});

// ===== Zile consecutive (streak) =====
function updateStreak() {
  const s = store.get('streak', { last: null, count: 0 });
  const t = todayKey();
  if (s.last === t) return;
  if (s.last === addDays(t, -1)) s.count += 1; else s.count = 1;
  s.last = t;
  store.set('streak', s);
}

// ===== Splash (animația de deschidere) =====
function hideSplash() {
  const s = document.getElementById('splash');
  if (!s || s.classList.contains('gone')) return;
  s.classList.add('gone');
  setTimeout(() => s.classList.add('hidden'), 600);
}
document.getElementById('splash').addEventListener('click', hideSplash);

// ===== Chat Antrenor <-> Elev (textdb.dev, gratuit) =====
const CHAT_URL = (code) => `https://textdb.dev/api/data/${code}`;

function getChat() { return store.get('chat', { name: '', rooms: [], active: null }); }
function setChat(c) { store.set('chat', c); }
let chatTimer = null;

function randCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = 'fp-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function chatCreate() {
  const c = getChat();
  const name = document.getElementById('chat-name').value.trim();
  if (name) c.name = name;
  if (!c.name) { toast('Scrie mai întâi numele tău'); return; }
  const title = prompt('Numele camerei (ex: Camera comună / Privat — Ana):', 'Camera comună');
  if (!title || !title.trim()) return;
  const code = randCode();
  const body = JSON.stringify({ title: title.trim(), msgs: [] });
  fetch(CHAT_URL(code), { method: 'POST', body: body }).then(r => {
    if (!r.ok) throw new Error('eroare');
    c.rooms.push({ code: code, title: title.trim() });
    c.active = code;
    setChat(c);
    openRoomChat();
    toast('Cameră creată! Cod: ' + code);
  }).catch(() => toast('Nu am putut crea camera, încearcă din nou'));
}

function chatJoin() {
  const c = getChat();
  const name = document.getElementById('chat-name').value.trim();
  if (name) c.name = name;
  if (!c.name) { toast('Scrie mai întâi numele tău'); return; }
  const code = document.getElementById('chat-code').value.trim().toLowerCase();
  if (!code) { toast('Introdu codul camerei'); return; }
  fetch(CHAT_URL(code)).then(r => r.text()).then(txt => {
    if (!txt || !txt.trim()) throw new Error('gol');
    const data = JSON.parse(txt);
    if (!c.rooms.find(r => r.code === code)) c.rooms.push({ code: code, title: data.title || 'Cameră' });
    c.active = code;
    setChat(c);
    openRoomChat();
    toast('Ai intrat în: ' + (data.title || 'cameră'));
  }).catch(() => toast('Codul nu e bun — verifică-l'));
}

function chatSend() {
  const c = getChat();
  if (!c.active) return;
  const inp = document.getElementById('chat-input');
  const text = inp.value.trim();
  if (!text) return;
  const code = c.active;
  fetch(CHAT_URL(code)).then(r => r.text()).then(txt => {
    let data;
    try { data = JSON.parse(txt); } catch (e) { data = { title: 'Cameră', msgs: [] }; }
    if (!data.msgs) data.msgs = [];
    data.msgs.push({ u: c.name, t: text, ts: Date.now() });
    return fetch(CHAT_URL(code), { method: 'POST', body: JSON.stringify(data) });
  }).then(() => {
    inp.value = '';
    chatRefresh();
  }).catch(() => toast('Mesajul nu s-a trimis, reîncearcă'));
}

function chatRefresh() {
  const c = getChat();
  if (!c.active) return;
  const el = document.getElementById('chat-msgs');
  fetch(CHAT_URL(c.active)).then(r => r.text()).then(txt => {
    let data = null;
    try { if (txt && txt.trim()) data = JSON.parse(txt); } catch (e) {}
    const msgs = (data && data.msgs) ? data.msgs : [];
    if (!msgs.length) { el.innerHTML = '<div class="meal-meta">Niciun mesaj încă. Spune „Salut!" 👋</div>'; return; }
    el.innerHTML = msgs.slice(-60).map(m => {
      const mine = m.u === c.name;
      const time = new Date(m.ts || Date.now()).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      return `<div class="msg ${mine ? 'mine' : 'other'}">
        ${mine ? '' : '<div class="msg-user">' + esc(m.u) + '</div>'}
        <div class="msg-text">${esc(m.t)}</div>
        <div class="msg-time">${time}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }).catch(() => {});
}

let chatMode = null; // 'room' | 'coach' | 'zozo'
let aiTyping = false;
const AI_HIST = { zozo: 'zozoHist' };

function showChatLobby() {
  chatMode = null;
  aiTyping = false;
  if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  document.getElementById('chat-room').classList.add('hidden');
  const c = getChat();
  document.getElementById('chat-name').value = c.name || '';
  const roomsEl = document.getElementById('chat-rooms');
  roomsEl.innerHTML = c.rooms.length
    ? '<div class="day-title">Camerele tale</div>' + c.rooms.map(r =>
        `<div class="chat-room-row" data-code="${r.code}"><span class="ex-name">${esc(r.title)}</span><span class="meal-meta">${r.code}</span></div>`
      ).join('')
    : '';
  document.getElementById('chat-lobby').classList.remove('hidden');
}

function closeChat() {
  chatMode = null;
  aiTyping = false;
  if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  document.getElementById('chat-room').classList.add('hidden');
  document.getElementById('chat-lobby').classList.add('hidden');
}

function openRoomChat() {
  const c = getChat();
  const room = c.rooms.find(r => r.code === c.active);
  if (!room) { showChatLobby(); return; }
  chatMode = 'room';
  document.getElementById('chat-lobby').classList.add('hidden');
  document.getElementById('chat-room').classList.remove('hidden');
  document.getElementById('chat-room-title').textContent = room.title;
  document.getElementById('chat-code-label').textContent = 'Cod cameră: ' + room.code;
  chatRefresh();
  if (chatTimer) clearInterval(chatTimer);
  chatTimer = setInterval(() => {
    if (!document.getElementById('tab-chat').classList.contains('active')) return;
    chatRefresh();
  }, 4000);
}

// ===== Scriptul antrenorului AI (se schimba cu obiectivul din Setari) =====
function coachScript() {
  const p = getProfile();
  const t = computeTargets(p);
  const TRAIN = getTraining();
  const dow = DOW[new Date().getDay()];
  const todayW = TRAIN[dow] ? TRAIN[dow].title : 'odihnă sau cardio ușor';
  const info = weekInfo();
  const weekTxt = info.deload ? 'săptămână de DESCĂRCARE (volum redus)' : `săptămâna ${info.weekInMeso + 1} din 4 de ÎNCĂRCARE`;
  const fi = fastInfo(todayKey());
  const fastNote = fi.active ? 'IMPORTANT: azi ține post ortodox (fără carne, lapte, ouă) — orice sfat alimentar trebuie să respecte postul. ' : '';
  const pi = periodInfo();
  const periodNote = (pi && pi.inPeriod) ? 'IMPORTANT: e în perioada menstruală — recomandă antrenamente mai ușoare, fier și hidratare. ' : '';
  const sexNote = p.sex === 'f'
    ? 'E femeie: accent pe fesieri/picioare în antrenamente, fii atentă la energie, fier și calciu. '
    : 'E bărbat: forță și masă în focus, joacă fotbal marțea (zi de sport, fără sală). ';
  const base = `Ești antrenor personal certificat și nutriționist sportiv, expert. Îl/O ajuta pe: ${p.name || 'elevul meu'}, ${p.age} ani, ${p.height} cm, ${p.weight} kg.
DATELE SALE (folosește-le în răspunsuri): ținta zilnică ${t.target} kcal · proteine ${t.protein}g · carbo ${t.carbs}g · grăsimi ${t.fat}g. Antrenament 5 zile/săptămână. Azi are: ${todayW}. Suntem în ${weekTxt}.
${sexNote}${periodNote}${fastNote}`;
  const style = `STIL DE RĂSPUNS:
- Direct, cald, motivant — ca un antrenor care ține la elevul lui.
- Mereu concret: numere, grame, kcal, serii × repetări. Fără sfaturi vagi.
- Maxim ~150 de cuvinte. Text simplu, fără markdown, fără asteriscuri.
- La întrebări scurte, răspuns scurt și la obiect.
- Dacă nu știi ceva exact, spune onest și recomandă verificare.`;
  if (p.goal === 'cut') {
    return `${base}
OBIECTIVUL: SLĂBIRE + DEFINIRE — deficit caloric moderat cu păstrarea masei musculare.
PRINCIPIILE TALE CA ANTRENOR:
1. Deficit moderat, niciodată extrem — minim 1500 kcal/zi (femei), 1800 kcal/zi (bărbați).
2. Proteinele sunt sacre: minim 30-40g la fiecare masă. Când lipsesc, sugerează surse exacte cu grame.
3. Forța rămâne prioritară în deficit: greutăți în zona 6-12 repetări ca să nu piardă mușchi. Cardio e complement, nu principal.
4. Pași zilnici 8-10 mii și somn 7-8h — jumătate din rețeta slăbirii.
5. Cântărire zilnic dimineața, dar progresul se judecă pe media a 7 zile. Slăbire sănătoasă: 0.5-0.75 kg/săptămână.
${style}`;
  }
  if (p.goal === 'bulk') {
    return `${base}
OBIECTIVUL: MASĂ MUSCULARĂ — surplus caloric controlat + supraîncărcare progresivă.
PRINCIPIILE TALE CA ANTRENOR:
1. Surplus moderat (+10-15% peste necesar, ținta lui: ${t.target} kcal). Creștere ideală: 0.25-0.5 kg/săptămână — mai repede înseamnă grăsime.
2. SUPRAÎNCĂRCARE PROGRESIVĂ = regula de aur: când face toate repetările cu formă bună, data viitoare +1-2 kg la exercițiile principale.
3. Compusele sunt coloana vertebrală: împins, tracțiuni, genuflexiuni, îndreptări, ramat. 10-20 serii/muschi/săptămână.
4. Carbohidrații în jurul antrenamentului = energie. Proteine ${t.protein}g/zi în 3-5 mese.
5. Somn 7-9h — mușchiul crește în odihnă, nu în sală.
${style}`;
  }
  return `${base}
OBIECTIVUL: MENȚINERE + sănătate pe termen lung.
PRINCIPIILE TALE CA ANTRENOR:
1. Echilibru 80/20: 80% mâncare curată, 20% flexibilitate — așa ține pe viață.
2. Forță 3-4x/săptămână + cardio 150 min/săptămână (recomandarea OMS).
3. Greutate stabilă = energie în echilibru; fără restricții extreme.
4. Obiceiuri mici, sustenabile: pași zilnici, somn constant, proteine la fiecare masă.
5. Preventiv: mobilitate pentru spate (muncă de birou), postură, hidratare 2-3L/zi.
${style}`;
}

function zozoScript() {
  const p = getProfile();
  const t = computeTargets(p);
  const TRAIN = getTraining();
  const dow = DOW[new Date().getDay()];
  const todayW = TRAIN[dow] ? TRAIN[dow].title : 'odihnă sau cardio ușor';
  const info = weekInfo();
  const weekTxt = info.deload ? 'săptămână de DESCĂRCARE (volum redus)' : `săptămâna ${info.weekInMeso + 1} de ÎNCĂRCARE`;
  const fi = fastInfo(todayKey());
  const fastNote = fi.active ? 'IMPORTANT: azi ține post ortodox (fără carne, lapte, ouă) — sfaturile alimentare trebuie să respecte postul. ' : '';
  const pi = periodInfo();
  const periodNote = (pi && pi.inPeriod) ? 'IMPORTANT: e în perioada menstruală — recomandă antrenamente mai ușoare, fier și hidratare. ' : '';
  const sexNote = p.sex === 'f'
    ? 'E femeie: accent pe fesieri/picioare în antrenamente, fii atentă la energie, fier și calciu. '
    : 'E bărbat: forță și masă în focus, joacă fotbal marțea (zi de sport, fără sală). ';
  const goalBlock = p.goal === 'cut'
    ? `PRINCIPII PENTRU OBIECTIVUL EI/LUI (SLĂBIRE + DEFINIRE):
1. Deficit moderat, niciodată sub 1500 kcal/zi (femei) sau 1800 kcal/zi (bărbați). Slăbire sănătoasă: 0.5-0.75 kg/săptămână.
2. Proteinele sunt sacre: minim 30-40g la fiecare masă, cu surse concrete (grame).
3. Forța rămâne prioritară în deficit (6-12 reps). Cardio e complement. Pași 8-10 mii, somn 7-8h.`
    : p.goal === 'bulk'
      ? `PRINCIPII (MASĂ MUSCULARĂ):
1. Surpus moderat +10-15% (ținta lui: ${t.target} kcal). Creștere ideală: 0.25-0.5 kg/săptămână.
2. SUPRAÎNCĂRCARE PROGRESIVĂ = regula de aur: +1-2 kg când face toate repetările.
3. Compusele prioritare (împins, tracțiuni, genuflexiuni, îndreptări), 10-20 serii/muschi/săptămână, somn 7-9h.`
      : `PRINCIPII (MENȚINERE):
1. Echilibru 80/20 — 80% mâncare curată, 20% flexibilitate.
2. Forță 3-4x/săptămână + cardio 150 min/săptămână (recomandarea OMS).
3. Obiceiuri sustenabile: pași zilnici, somn constant, proteine la fiecare masă.`;
  return `Ești ZOZO — antrenorul personal AI și expert în fitness, sport, nutriție, suplimente și recuperare. Numele tău e ZOZO pentru toată lumea.
Îl/O ajuta pe: ${p.name || 'elevul meu'}, ${p.age} ani, ${p.height} cm, ${p.weight} kg.
DATELE SALE (folosește-le în răspunsuri): ținta zilnică ${t.target} kcal · proteine ${t.protein}g · carbo ${t.carbs}g · grăsimi ${t.fat}g. Antrenament 5 zile/săptămână. Azi are: ${todayW}. Suntem în ${weekTxt}.
${sexNote}${periodNote}${fastNote}
${goalBlock}
SUBIECTE PERMISE (doar astea): fitness, antrenamente, sala, exerciții, nutriție, suplimente, sport, recuperare, motivație, stiri și articole din fitness. Dacă userul iese de la subiect, refuză politicos, cu umor dacă se potrivește, și adu conversația înapoi la fitness.
Dacă întreabă de stiri foarte recente, spune clar că nu ai date în timp real și recomandă surse de specialitate.
STIL: prietenos, direct, concret (numere, grame, serii × repetări), maxim ~150 cuvinte, text simplu fără markdown. Te adresezi cu „tu".`;
}

function geminiText(body) {
  const p = getProfile();
  const tryModel = (i) => {
    if (i >= AI_MODELS.length) return Promise.reject(new Error('Serverul e ocupat — reîncearcă în câteva minute'));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS[i]}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
    return fetchTO(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(r => r.json()).then(data => {
      if (data.error) {
        if (data.error.code === 400 || data.error.code === 403) {
          const e = new Error(data.error.message || 'Eroare');
          e.noRetry = true;
          throw e;
        }
        if ([404, 429, 500, 503].includes(data.error.code)) return tryModel(i + 1);
        throw new Error(data.error.message || 'Eroare');
      }
      const txt = (data.candidates?.[0]?.content?.parts || []).map(pt => pt.text || '').join('');
      if (!txt) return tryModel(i + 1);
      return txt;
    }).catch(e => {
      if (e && e.noRetry) throw e;
      return tryModel(i + 1);
    });
  };
  return tryModel(0);
}

function chatBubble(m, mine, aiName) {
  const time = new Date(m.ts || Date.now()).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return `<div class="msg ${mine ? 'mine' : 'other'}">
    ${mine ? '' : '<div class="msg-user">' + esc(m.u || aiName || 'Mesaj') + '</div>'}
    <div class="msg-text">${esc(m.text)}</div>
    <div class="msg-time">${time}</div>
  </div>`;
}

function renderAIChat() {
  const el = document.getElementById('chat-msgs');
  const hist = store.get(AI_HIST[chatMode], []);
  const aiName = 'ZOZO';
  if (!hist.length) {
    el.innerHTML = '<div class="meal-meta">Salut, eu sunt ZOZO ⭐ — antrenorul tău. Cunosc obiectivul tău, datele tale, planul de antrenament și calendarul de posturi. Întreabă-mă orice despre fitness, nutriție sau planul tău!</div>';
    return;
  }
  let html = hist.slice(-60).map(m => chatBubble(m, m.role === 'user', aiName)).join('');
  if (aiTyping) {
    html += `<div class="msg other"><div class="msg-user">${aiName} scrie...</div><div class="msg-text"><span class="typing"><span></span><span></span><span></span></span></div></div>`;
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

function aiSend(text) {
  const key = AI_HIST[chatMode];
  const hist = store.get(key, []);
  hist.push({ role: 'user', text: text, ts: Date.now() });
  const system = zozoScript();
  const contents = hist.slice(-16).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));
  const body = {
    contents: contents,
    systemInstruction: { parts: [{ text: system }] }
  };
  aiTyping = true;
  renderAIChat();
  geminiText(body).then(txt => {
    hist.push({ role: 'ai', text: txt.trim(), ts: Date.now() });
    store.set(key, hist.slice(-100));
    aiTyping = false;
    renderAIChat();
  }).catch(err => {
    aiTyping = false;
    toast(err.message);
    renderAIChat();
  });
}

function openAIChat(mode) {
  chatMode = mode;
  document.getElementById('chat-lobby').classList.add('hidden');
  document.getElementById('chat-room').classList.remove('hidden');
  document.getElementById('chat-room-title').textContent = '⭐ ZOZO — antrenorul tău';
  document.getElementById('chat-code-label').textContent = 'Personalizat pe obiectivul, datele tale și calendarul tău';
  renderAIChat();
}

function doSend() {
  const inp = document.getElementById('chat-input');
  const text = inp.value.trim();
  if (!text) return;
  if (chatMode === 'zozo') {
    inp.value = '';
    aiSend(text);
  } else if (chatMode === 'room') {
    chatSend();
  }
}

document.getElementById('btn-chat-create').addEventListener('click', chatCreate);
document.getElementById('btn-chat-show-join').addEventListener('click', () => {
  document.getElementById('chat-join-box').classList.toggle('hidden');
});
document.getElementById('btn-chat-join').addEventListener('click', chatJoin);
document.getElementById('btn-ai-zozo').addEventListener('click', () => openAIChat('zozo'));
document.getElementById('btn-ai-room').addEventListener('click', () => showChatLobby());
document.getElementById('btn-chat-send').addEventListener('click', doSend);
document.getElementById('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
document.getElementById('btn-chat-leave').addEventListener('click', () => {
  const c = getChat(); c.active = null; setChat(c); closeChat();
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
updateStreak();
renderDate();
ensureProfileFields();
applyTheme();
setTimeout(hideSplash, 2400);
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
if (getProfile()) showApp(); else showSetup();
