import { Renderer } from './engine/renderer.js';
import { Sound } from './engine/audio.js';
import { Score } from './engine/score.js';
import { Text } from './engine/text.js';
import { Input, ACTIONS, keyLabel } from './engine/input.js';
import { Settings } from './engine/settings.js';
import { Menu } from './engine/menu.js';
import { bindI18n, t, lang } from './engine/i18n.js';
import { freshState, loadSave, writeSave, clearSave } from './engine/save.js';
import { Game, TOOLS } from './game.js';
import { ACT1 } from './story/act1.js';
import { ACT2R } from './story/act2r.js';
import { ACT3R } from './story/act3r.js';
import { ACT3W } from './story/act3w.js';
import { ACT3V } from './story/act3v.js';
import { ACT4 } from './story/act4.js';
import { ACT2W } from './story/act2w.js';
import { ACT2G } from './story/act2g.js';
import { ENDINGS } from './story/endings.js';
import { ITEMS, JOURNAL } from './story/items.js';
import { Photo } from './engine/photo.js';
import { setMaterialSize } from './engine/materials.js';
import { setFacadeRes } from './sets/town.js';

// The chapters. A save names its act; old saves (act: 1) are Act One.
const ACTS = { act1: ACT1, act2r: ACT2R, act2w: ACT2W, act2g: ACT2G, act3r: ACT3R, act3w: ACT3W, act3v: ACT3V, act4: ACT4 };
const actKey = (s) => (s && ACTS[s.act] ? s.act : 'act1');

// What the player has unlocked, and the state Act One ended with (carried
// into Act Two from the Chapters page). Kept apart from the checkpoint save.
const PROGRESS = 'before-i-knew:progress:v1';
// Also: the state at each checkpoint reached (scenes), every choice ever
// made (seen) and the last one (last), and what Sami stopped to look at
// (noticed, with how many things each act holds in totals).
function progress() {
  const base = { unlocked: ['act1'], carry: null, scenes: {}, seen: {}, last: {}, noticed: {}, totals: {} };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PROGRESS) || '{}') };
  } catch {
    return base;
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(PROGRESS, JSON.stringify(p));
  } catch {
    /* fine */
  }
}
// Act Two (Retrieval) begins where Act One's «بدي شوفو» left Sami.
function act2State(s) {
  const tools = [...new Set([...(s?.tools || []), 'torch', 'mirror', 'walkie'])];
  return { ...freshState(), ...(s || {}), path: 'retrieval', act: 'act2r', checkpoint: 'south', completed: false, tools, noticed: [] };
}
// Act Two on the other paths: the Witness (C2), into the southern quarter to
// find who saw; Grief (C3), on the kerb where he was told.
function act2wState(s) {
  const tools = [...new Set([...(s?.tools || []), 'torch', 'mirror', 'walkie'])];
  return { ...freshState(), ...(s || {}), path: 'witness', act: 'act2w', checkpoint: 'quarterW', completed: false, tools, noticed: [] };
}
function act2gState(s) {
  const tools = [...new Set([...(s?.tools || []), 'torch', 'mirror', 'walkie'])];
  return { ...freshState(), ...(s || {}), path: 'grief', act: 'act2g', checkpoint: 'kerbG', completed: false, tools, noticed: [] };
}
// Act Two, by the path Act One ended on.
const act2For = (s) => (s?.path === 'witness' ? act2wState(s) : s?.path === 'grief' ? act2gState(s) : act2State(s));
// Act Three, by path: Retrieval goes to the checkpoint or the building; the
// others to the night walk.
const act3For = (s) => (!s?.path || s.path === 'retrieval' ? act3State(s) : act3wState(s));

// Act Three (Retrieval) begins where Act Two left him: with the white cloth
// at the checkpoint's edge, or at the door of the ruined building.
function act3State(s) {
  const back = s?.d_choice === 'back';
  const tools = [...new Set([...(s?.tools || []), 'torch', 'walkie', 'lighter', 'journal'])];
  if (!back && !tools.includes('whitecloth')) tools.push('whitecloth');
  return { ...freshState(), ...(s || {}), path: 'retrieval', d_choice: back ? 'back' : 'cloth', act: 'act3r', checkpoint: back ? 'building' : 'night', completed: false, tools, noticed: [] };
}
// Act Three, Part 3 (the night walk) follows Part 1 or 2 straight on, with
// everything carried.
function act3wState(s) {
  return { ...freshState(), ...(s || {}), act: 'act3w', checkpoint: 'moon', completed: false, noticed: [] };
}
// Act Three, Parts 4 to 6 (the small hours: the visions, the flashbacks and
// the roof) follow the night walk straight on.
function act3vState(s) {
  return { ...freshState(), ...(s || {}), act: 'act3v', checkpoint: 'classroom', completed: false, noticed: [] };
}
// Act Four (Dawn) begins on the same roof, as the call to prayer goes on.
function act4State(s) {
  return { ...freshState(), ...(s || {}), act: 'act4', checkpoint: 'roof4', completed: false, ending: null, h_choice: null, noticed: [] };
}
// What comes after each act, and how to start it from the state it ended with.
const NEXT = { act1: ['act2', act2For], act2r: ['act3r', act3State], act2w: ['act3w', act3wState], act2g: ['act3w', act3wState], act3v: ['act4', act4State] };

const $ = (id) => document.getElementById(id);
const stage = $('stage');

let R;
try {
  R = new Renderer($('view'));
} catch (err) {
  $('nogl').hidden = false;
  throw err;
}

const settings = new Settings();
bindI18n(settings);
const input = new Input(settings);
const sound = new Sound(settings);
sound.score = new Score(sound);
const text = new Text(settings);
const game = new Game({ R, sound, text, input, settings });

// Every checkpoint reached opens its scene in Chapters, from the state it
// was reached with; and a small "Saved" shows in the corner.
game.onCheckpoint = (id, state) => {
  if (mode !== 'play') return;
  const p = progress();
  const key = actKey(state);
  (p.scenes[key] ||= {})[id] = { ...state, completed: false };
  saveProgress(p);
  showSaved();
};
// Examine points: remembered for this run (the end card) and for good (the
// Your story page).
game.onNotice = (id, line) => {
  if (mode !== 'play' || !line) return;
  const s = game.state;
  s.noticed ||= [];
  if (!s.noticed.includes(id)) s.noticed.push(id);
  const p = progress();
  (p.noticed[actKey(s)] ||= {})[id] = line;
  saveProgress(p);
};
function showSaved() {
  const el = $('saved');
  el.querySelector('.saved-t').textContent = t('saved');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

// Vibration: a phone buzz, and a gamepad's rumble, on blasts and shots.
sound.onImpact = (k, dur, delay = 0) => {
  if (!settings.get('vibration') || mode !== 'play') return;
  setTimeout(() => {
    try {
      navigator.vibrate?.(Math.round(dur * 1000 * Math.min(1, k + 0.2)));
    } catch {
      /* not allowed here */
    }
    for (const pad of navigator.getGamepads?.() || []) {
      pad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: dur * 1000, strongMagnitude: k, weakMagnitude: k * 0.6 }).catch?.(() => {});
    }
  }, delay * 1000);
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ------------------------------------------------------------ sizing ----

// Graphics quality: a render-scale cap. Auto starts high and steps down if
// the frame rate struggles.
const QUALITY = { low: [0.55, 960], medium: [0.8, 1280], high: [1, 1600], auto: [1, 1500] };
let autoScale = 1;
function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const aspect = vw / vh < 1 ? 1.6 : 2.39;
  const w = Math.min(vw, vh * aspect);
  const h = w / aspect;
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  stage.style.setProperty('--u', `${Math.max(w, h * 2.39) / 100}px`);
  const q = settings.get('quality') || 'auto';
  const [scale, cap] = QUALITY[q] || QUALITY.auto;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(Math.min(cap, Math.max(560, w * dpr)) * scale * (q === 'auto' ? autoScale : 1));
  const py = Math.round(px / aspect);
  if (px !== R.W || py !== R.H) R.resize(px, py);
  // Low skips surface relief and bakes smaller textures; High adds lens dirt
  R.fx.relief = q !== 'low';
  R.fx.dirt = q === 'high';
  setMaterialSize(q === 'low' ? 128 : 256);
  setFacadeRes(q === 'high' ? 2 : q === 'low' ? 1 : 1.25);
}
window.addEventListener('resize', resize);
resize();

function applyLanguage() {
  document.body.dataset.rotate = t('rotate');
  document.documentElement.lang = lang() === 'ar' ? 'ar' : 'en-GB';
  stage.dataset.lang = lang();
}
applyLanguage();
settings.onChange((k) => {
  if (k === 'quality') {
    autoScale = 1;
    resize();
  }
  if (k === 'lang') applyLanguage();
});

// ---------------------------------------------------------- the title ---

// Behind the menu: the empty street at the vine, the afternoon going on.
let mode = 'title'; // 'title' | 'play' | 'end'
function titleScene() {
  game.start(ACT1, freshState());
  game.runner.clear();
  game.player.visible = false;
  for (const w of game.npcs) w.visible = false;
  game.camOverride = (g) => ({ x: 900 + Math.sin(g.time * 0.05) * 160, y: -300, view: 1650 });
  game.snapCamera();
  game.lock();
  game.clearHud();
  text.objective(null);
  text.hideCard();
  text.clearLine();
  text.tools([], null, 0, false);
}
titleScene();

// Each decision, and every way it can go: [value, English, Arabic]. The end
// card tells the one taken; Your story shows them all.
const DECISIONS = [
  {
    act: 'act1',
    key: 'helped_old_man',
    title: 'decWater',
    time: ['3:20', '٣:٢٠'],
    options: [
      [true, 'You carried the old man’s water to his daughter’s door.', 'حملتَ ماء الرجل العجوز إلى باب ابنته.'],
      [false, 'You walked past the old man and his water.', 'مضيتَ وتركتَ الرجل العجوز وماءه.'],
    ],
  },
  {
    act: 'act1',
    key: 'children_helped',
    title: 'decMortar',
    time: ['3:45', '٣:٤٥'],
    options: [
      [true, 'When the mortars came, you ran for Layla and the boy.', 'حين سقطت القذائف، ركضتَ نحو ليلى والطفل.'],
      [false, 'When the mortars came, you took cover. Layla got the boy to the stairs herself.', 'حين سقطت القذائف، احتميتَ. أوصلت ليلى الطفل إلى الدرج وحدها.'],
    ],
  },
  {
    act: 'act1',
    key: 'path',
    title: 'decNews',
    time: ['4:10', '٤:١٠'],
    options: [
      ['retrieval', '“I need to see him.” You walked south, towards School Street.', '«أريد أن أراه.» مشيتَ جنوباً نحو شارع المدرسة.'],
      ['witness', '“Who did this?” You asked for facts, because facts can be carried.', '«من فعل هذا؟» سألتَ عن الحقائق، لأن الحقائق يمكن حملها.'],
      ['grief', 'You said nothing. You sat on the kerb, and Abu Yazan sat with you.', 'لم تقل شيئاً. جلستَ على الرصيف، وجلس أبو يزن إلى جانبك.'],
    ],
  },
  {
    act: 'act2r',
    key: 'd_choice',
    title: 'decWay',
    time: ['5:00', '٥:٠٠'],
    options: [
      ['cloth', 'You wrapped a white sheet round a curtain rail, to go and talk to them.', 'لففتَ شرشفاً أبيض على سكّة ستارة، لتكلّمهم.'],
      ['back', 'You looked at the ruined building, and saw a way.', 'نظرتَ إلى المبنى المدمّر، ورأيتَ طريقاً.'],
    ],
  },
];
DECISIONS.push({
  act: 'act3r',
  key: 'g_choice',
  title: 'decPrice',
  time: ['8:45', '٨:٤٥'],
  options: [
    ['dignity', 'You told Maher what you’d seen. He took Ahmad’s lighter as the price.', 'أخبرتَ ماهر بما رأيت. أخذ ولّاعة أحمد ثمناً.'],
    ['anger', 'You told Maher what he was. A rifle butt, then his conditions.', 'قلتَ لماهر ما هو. ضربة بأخمص البندقية، ثم شروطه.'],
    ['deal', 'You drew Maher the valves that control the southern quarter’s water.', 'رسمتَ لماهر المحابس التي تتحكّم بمياه الحارة الجنوبية.'],
    ['none', 'You went up through the ruined building, and out over the street.', 'صعدتَ عبر المبنى المدمّر، وخرجتَ فوق الشارع.'],
  ],
});
DECISIONS.push({
  act: 'act3w',
  key: 'watered_garden',
  title: 'decGarden',
  time: ['11:30', '١١:٣٠'],
  options: [
    [true, 'You watered someone else’s garden at midnight.', 'سقيتَ حديقة غيرك في منتصف الليل.'],
    [false, 'You looked over the wall at the garden, and walked on.', 'نظرتَ إلى الحديقة من فوق الجدار، ومضيتَ.'],
  ],
});
DECISIONS.push({
  act: 'act4',
  key: 'ending',
  title: 'decEnding',
  time: ['4:25', '٤:٢٥'],
  options: [
    [1, 'You carried the photographs east, into the sunrise.', 'حملتَ الصور شرقاً، نحو الشروق.'],
    [2, 'You brought him home, and buried him under the vine.', 'أعدتَه إلى بيته، ودفنته تحت الدالية.'],
    [3, 'You went down into the tunnel, and the light behind you went out.', 'نزلتَ إلى النفق، وانطفأ الضوء خلفك.'],
    [4, 'You wrote the date on his board, and the children sat down.', 'كتبتَ التاريخ على لوحه، وجلس الأولاد.'],
    [5, 'You sat in the rubble with the cat, and the town woke around you.', 'جلستَ بين الركام مع القطة، واستيقظت البلدة من حولك.'],
  ],
});
DECISIONS.push({
  act: 'act2w',
  key: 'e_choice',
  title: 'decCamera',
  time: ['5:20', '٥:٢٠'],
  options: [
    ['camera', 'You raised Ahmad’s camera, and began to keep what should last.', 'رفعتَ كاميرا أحمد، وبدأت تحفظ ما يجب أن يبقى.'],
    ['people', 'You put the camera away, and sat with people instead.', 'وضعتَ الكاميرا جانباً، وجلستَ مع الناس.'],
  ],
});
DECISIONS.push({
  act: 'act2g',
  key: 'f_choice',
  title: 'decUmAhmad',
  time: ['5:30', '٥:٣٠'],
  options: [
    ['umAhmad', 'You went to Um Ahmad. She said: bring him back to me.', 'ذهبتَ إلى أم أحمد. قالت: ارجعلي ياه.'],
    ['alone', 'You said “later”, and walked east, alone, into the falling light.', 'قلتَ «بعدين»، ومشيتَ شرقاً وحدك، نحو الضوء النازل.'],
  ],
});
const optionFor = (d, v) => d.options.find((o) => o[0] === v) || d.options[d.options.length - 1];

// The end card: each choice as a moment in the afternoon.
function summary2(s) {
  const ar = lang() === 'ar';
  const n = s.lane_retries || 0;
  return [
    [ar ? '٤:٣٥' : '4:35', ar ? (n ? `عبرتَ الحارة الجنوبية تحت عين القنّاص، وأخطأتك رصاصاته بشبر ${n} مرة.` : 'عبرتَ الحارة الجنوبية تحت عين القنّاص، ولم يرك.') : n ? `You crossed the southern quarter under the sniper's eye. His rounds missed you by a hand’s width ${n} time${n > 1 ? 's' : ''}.` : "You crossed the southern quarter under the sniper's eye. He never saw you."],
    [ar ? '٤:٤٢' : '4:42', ar ? 'قال المسعف: ما قدرنا نوصلّو.' : 'The medic said: we couldn’t reach him.'],
    [ar ? '٤:٥٥' : '4:55', ar ? 'رأيتَ شكلاً مغطّى بحرام، وسط شارع المدرسة.' : 'You saw a shape under a blanket, in the middle of School Street.'],
    [ar ? '٥:٠٠' : '5:00', optionFor(DECISIONS[3], s.d_choice)[ar ? 2 : 1]],
    [ar ? '٥:١٠' : '5:10', ar ? 'أعطاك أبو يزن ولّاعة أحمد ودفتره.' : 'Abu Yazan gave you Ahmad’s lighter, and his journal.'],
  ];
}

// The evening on the Witness path, and on the path of grief.
function summary2w(s) {
  const ar = lang() === 'ar';
  const rows = [
    [ar ? '٤:٤٠' : '4:40', ar ? 'أم سعيد، التي غطّته. أعطتك شنطته، والكاميرا فيها.' : 'Um Said, who covered him. She gave you his bag, and the camera in it.'],
    [ar ? '٥:٠٥' : '5:05', ar ? 'أبو فراس أعطاك خبزاً من العلف، وأكلتَه.' : 'Abu Firas gave you bread made from feed, and you ate it.'],
    [ar ? '٥:٢٠' : '5:20', optionFor(DECISIONS.find((d) => d.key === 'e_choice'), s.e_choice)[ar ? 2 : 1]],
    [ar ? '٥:٣٥' : '5:35', ar ? 'أعطاك أبو يزن الولّاعة والدفتر. أمّه لا تعرف بعد.' : 'Abu Yazan gave you the lighter and the journal. His mother still doesn’t know.'],
  ];
  return rows;
}
function summary2g(s) {
  const ar = lang() === 'ar';
  return [
    [ar ? '٤:٢٠' : '4:20', ar ? 'جلستَ على الرصيف، وجلس أبو يزن معك. تحرّك الضوء.' : 'You sat on the kerb, and Abu Yazan sat with you. The light moved.'],
    [ar ? '٢٠٠٩' : '2009', ar ? 'محاضرة مملّة، وأحمد إلى جانبك: الأدب يقول لماذا، والهندسة كيف.' : 'A boring lecture, Ahmad beside you: literature says why, engineering how.'],
    [ar ? '٥:١٥' : '5:15', ar ? 'الولّاعة والدفتر. «في ناس بدهن ياك.»' : 'The lighter and the journal. “There are people who need you.”'],
    [ar ? '٥:٣٠' : '5:30', optionFor(DECISIONS.find((d) => d.key === 'f_choice'), s.f_choice)[ar ? 2 : 1]],
  ];
}

function summary3(s) {
  const ar = lang() === 'ar';
  if (s.path && s.path !== 'retrieval') return []; // Parts 1 and 2 are the retrieval's
  if (s.d_choice === 'back') {
    return [
      [ar ? '٨:٣٠' : '8:30', ar ? 'صعدتَ عبر المبنى المدمّر في العتمة، طابقاً بعد طابق.' : 'You climbed the ruined building in the dark, floor by floor.'],
      [ar ? '٩:٠٠' : '9:00', ar ? 'من الطابق الخامس، رأيتَ ما رآه القنّاص.' : 'From the fifth floor, you saw what the sniper saw.'],
      [ar ? '٩:٤٠' : '9:40', ar ? 'زحفتَ إلى الحرام، وسحبتَه إلى الظل.' : 'You crawled to the blanket, and pulled it back into the shadow.'],
    ];
  }
  return [
    [ar ? '٨:١٥' : '8:15', ar ? 'مشيتَ ستين متراً في العراء، والقماشة البيضاء فوق رأسك.' : 'You walked sixty metres in the open, the white cloth above your head.'],
    [ar ? '٨:٢٥' : '8:25', ar ? 'قال ماهر: هون ما في شي ببلاش.' : 'Maher said: nothing here is free.'],
    [ar ? '٨:٤٥' : '8:45', optionFor(DECISIONS[4], s.g_choice)[ar ? 2 : 1]],
  ];
}

function summary3w(s) {
  const ar = lang() === 'ar';
  const rows = [];
  if (s.cat_seen) rows.push([ar ? '١٠:٣٠' : '10:30', ar ? 'القطة السوداء على الجدار. تثاءبت، ونامت.' : 'The black cat on the wall. It yawned, and slept.']);
  else rows.push([ar ? '١٠:٣٠' : '10:30', ar ? 'مررتَ بالقطة السوداء على الجدار، ولم تتوقّف.' : 'You passed the black cat on the wall, and didn’t stop.']);
  if (s.wedding_seen) rows.push([ar ? '١١:٠٠' : '11:00', ar ? 'عرس في قبو. فتحتَ الباب قليلاً، ولم تدخل.' : 'A wedding in a basement. You opened the door a crack, and didn’t go in.']);
  else rows.push([ar ? '١١:٠٠' : '11:00', ar ? 'موسيقى عرس من تحت الأرض. مررتَ بها.' : 'Wedding music from under the ground. You walked on past it.']);
  rows.push([ar ? '١١:٣٠' : '11:30', optionFor(DECISIONS.find((d) => d.key === 'watered_garden'), !!s.watered_garden)[ar ? 2 : 1]]);
  return rows;
}

// The small hours: three visions, three memories, and the roof.
function summary3v(s) {
  const ar = lang() === 'ar';
  return [
    [ar ? '١:٠٠' : '1:00', ar ? 'صفّ أحمد، كل مقعد فيه مشغول. قال: خلّص الدرس يا هندسة.' : 'Ahmad’s classroom, every desk full. He said: finish the lesson, ya handasa.'],
    [ar ? '١:٤٥' : '1:45', ar ? 'البساتين كما كانت. ماتت في دقيقة.' : 'The orchards as they were. They died in a moment.'],
    [ar ? '٢:١٥' : '2:15', ar ? 'دمشق في واجهة دكّان: أنتما الاثنان في مقهى، قبل كل شيء.' : 'Damascus in a shop window: the two of you in a café, before everything.'],
    [ar ? '٢٠٠٨' : '2008', ar ? 'طرقة على الباب في العيد، وثلاث ثوانٍ من الصمت.' : 'A knock at the door at Eid, and three seconds of silence.'],
    [ar ? '٢٠١١' : '2011', ar ? 'الجمعة الأولى. «ما رح يرجعوا يسكتونا.»' : 'The first Friday. “They’re never going to silence us again.”'],
    [ar ? '٢٠٠١' : '2001', ar ? 'ورقة في الصف، وأستاذ اختار ألّا يرى، وأبوك في المطبخ.' : 'A note in class, a teacher who chose not to see, and your father in the kitchen.'],
    [ar ? '٢:٣٥' : '2:35', ar ? 'دمشق مضاءة، والغوطة معتمة، وأذان الفجر.' : 'Damascus lit, Ghouta dark, and the dawn call to prayer.'],
  ];
}

// Dawn: the junction, and the ending. Its last line, by ending.
const ACT4_LAST = {
  1: { time: ['5:05', '٥:٠٥'], en: 'One testimony changes nothing. But silence changes everything.', ar: 'شهادة واحدة ما بتغيّر شي. بس السكوت بيغيّر كل شي.' },
  2: { time: ['5:30', '٥:٣٠'], en: 'I couldn’t say goodbye to him. But I could bring him home.', ar: 'ما قدرت قلّو وداعاً. بس قدرت جبتو لبيتو.' },
  3: { time: ['5:00', '٥:٠٠'], en: 'Not every departure is flight. Not every staying is courage.', ar: 'مش كل مشي هروب. ومش كل بقاء شجاعة.' },
  4: { time: ['5:10', '٥:١٠'], en: 'Life isn’t just staying alive. Life is staying human.', ar: 'الحياة مش بس إنك تضل عايش. الحياة إنك تضل إنسان.' },
  5: { time: ['5:05', '٥:٠٥'], en: 'The story didn’t end. But the night did.', ar: 'ما خلصت القصة. بس خلص الليل.' },
};
function summary4(s) {
  const ar = lang() === 'ar';
  const rows = [[ar ? '٤:٠٥' : '4:05', ar ? 'نزلتَ عن السطح، والأذان ما زال.' : 'You came down off the roof, the call to prayer still going on.']];
  rows.push([ar ? '٤:١٥' : '4:15', ar ? 'رجل بغالون ماء، وامرأة تكنس نصف بيتها، وولدان ذاهبان إلى درس لن يكون.' : 'A man with a jerrycan, a woman sweeping half a house, two boys going to a lesson that won’t happen.']);
  const h = { south: ['South, towards Ahmad.', 'جنوباً، نحو أحمد.'], tunnels: ['To the edge of town, to the tunnels.', 'إلى حدود البلدة، نحو الأنفاق.'], classroom: ['East, to Ahmad’s classroom.', 'شرقاً، إلى صفّ أحمد.'] }[s.h_choice];
  rows.push([ar ? '٤:٢٥' : '4:25', h ? (ar ? `عند المفرق اخترتَ طريقاً: ${h[1]}` : `At the junction you chose a road: ${h[0]}`) : ar ? 'عند المفرق، كانت الليلة قد اختارت طريقك.' : 'At the junction, the night had already chosen your road.']);
  if (s.ending) rows.push([ar ? '٤:٣٠' : '4:30', optionFor(DECISIONS.find((d) => d.key === 'ending'), s.ending)[ar ? 2 : 1]]);
  return rows;
}

function summary(s) {
  const ar = lang() === 'ar';
  return DECISIONS.filter((d) => d.act === 'act1').map((d) => [d.time[ar ? 1 : 0], optionFor(d, s[d.key])[ar ? 2 : 1]]);
}

function startGame(state) {
  mode = 'play';
  menu.close();
  stage.classList.remove('ended', 'paused');
  $('end').hidden = true;
  stage.classList.add('playing');
  sound.start().then(() => {
    const key = actKey(state);
    state.noticed ||= [];
    game.start(ACTS[key], state);
    game.onEnd = showEnd;
    game.onPart = key === 'act3r' ? nextPart : key === 'act3w' ? nextPart3v : null;
    // how many things this act has to look at
    const p = progress();
    p.totals[key] = game.level.things.filter((x) => x.look).length;
    saveProgress(p);
  });
}

// ----------------------------------------------------------- the sheets --

function sheetDir(el) {
  el.dir = lang() === 'ar' ? 'rtl' : 'ltr';
}

function newGame() {
  const note = $('note');
  sheetDir(note);
  note.innerHTML = `
    <p class="kicker-small">${esc(t('noteKicker'))}</p>
    <h2 id="note-h">${esc(t('noteTitle'))}</h2>
    <p>${esc(t('noteBody'))}</p>
    <p class="sheet-quiet">${esc(t('noteSound'))}</p>
    <div class="sheet-btns"><button type="button" id="note-go" class="primary">${esc(t('begin'))}</button></div>`;
  note.hidden = false;
  $('note-go').addEventListener('click', () => {
    note.hidden = true;
    clearSave();
    const s = freshState();
    writeSave(s);
    startGame(s);
  });
  $('note-go').focus();
}

// An act finished: unlock what follows, carry its state, and remember every
// choice made, for Your story.
function recordAct(s) {
  const key = actKey(s);
  const p = progress();
  // Act One on the retrieval path unlocks Act Two, and carries its state
  if (key === 'act1') {
    // Act Two opens (the Chapters page starts it on the path this ending took)
    if (!p.unlocked.includes('act2r')) p.unlocked.push('act2r');
    p.carry = { ...s };
  }
  if (key === 'act2w' || key === 'act2g') {
    if (!p.unlocked.includes('act3r')) p.unlocked.push('act3r');
    if (!p.unlocked.includes('act3w')) p.unlocked.push('act3w');
    p.carry2 = { ...s };
    p.carry3 = { ...s };
  }
  if (key === 'act2r') {
    if (!p.unlocked.includes('act3r')) p.unlocked.push('act3r');
    p.carry2 = { ...s };
  }
  if (key === 'act3r') {
    if (!p.unlocked.includes('act3w')) p.unlocked.push('act3w');
    p.carry3 = { ...s };
  }
  if (key === 'act3w') {
    if (!p.unlocked.includes('act3v')) p.unlocked.push('act3v');
    p.carry4 = { ...s };
  }
  if (key === 'act3v') {
    if (!p.unlocked.includes('act4')) p.unlocked.push('act4');
    p.carry5 = { ...s };
  }
  for (const d of DECISIONS.filter((x) => x.act === key)) {
    const v = optionFor(d, s[d.key])[0];
    const seen = (p.seen[d.key] ||= []);
    if (!seen.includes(v)) seen.push(v);
    p.last[d.key] = v;
  }
  saveProgress(p);
  return p;
}

// Parts 1 and 2 of Act Three run straight on into Part 3, no end card.
function nextPart(s) {
  recordAct(s);
  const n = act3wState(s);
  writeSave(n);
  startGame(n);
}
// And the night walk runs straight on into the small hours.
function nextPart3v(s) {
  recordAct(s);
  const n = act3vState(s);
  writeSave(n);
  startGame(n);
}

function showEnd(s) {
  mode = 'end';
  text.hideCard();
  game.clearHud();
  stage.classList.add('ended');
  const key = actKey(s);
  const ar = lang() === 'ar';
  const p = recordAct(s);
  const total = p.totals[key] || 0;
  const looked = (s.noticed || []).length;
  const act1 = key === 'act1';
  const act3 = key === 'act3r' || key === 'act3w' || key === 'act3v';
  const small = key === 'act3v';
  const dawn = key === 'act4';
  const side2 = key === 'act2w' || key === 'act2g';
  const walk = key === 'act3w';
  // the night's last part tells the whole night
  const rows = act1 ? summary(s) : key === 'act2w' ? summary2w(s) : key === 'act2g' ? summary2g(s) : dawn ? summary4(s) : small ? [...summary3(s), ...summary3w(s), ...summary3v(s)] : walk ? [...summary3(s), ...summary3w(s)] : act3 ? summary3(s) : summary2(s);
  const first = dawn ? [ar ? '٤:٠٠' : '4:00', ar ? 'الفجر.' : 'Dawn.'] : act1 ? [ar ? '٣:٠٥' : '3:05', ar ? 'أحمد وسامي يسيران في شارع الزيتون.' : 'Ahmad and Sami walk down Zeitoun Street.'] : act3 ? [ar ? '٨:٠٠' : '8:00', ar ? 'الليل وصل.' : 'Night had arrived.'] : [ar ? '٤:١٥' : '4:15', ar ? 'قال أبو يزن: القنّاص ما زال هناك.' : 'Abu Yazan said: the sniper is still there.'];
  const fin = dawn ? ACT4_LAST[s.ending] || ACT4_LAST[5] : null;
  const last = dawn ? [ar ? fin.time[1] : fin.time[0], ar ? fin.ar : fin.en] : act1 ? [ar ? '٤:١٥' : '4:15', ar ? 'بقيت للشمس ثلاث ساعات في السماء.' : 'Three hours of sun left in the sky.'] : small ? [ar ? '٤:٠٠' : '4:00', ar ? 'الفجر عم يجي.' : 'Dawn is coming.'] : walk ? [ar ? '١٢:٠٠' : '12:00', ar ? 'نص الليل. والفجر لسّا بعيد.' : 'Midnight. And dawn is still a long way off.'] : act3 ? [ar ? '١٠:٠٠' : '10:00', ar ? 'والليل لسّا طويل.' : 'And the night is still long.'] : [ar ? '٧:٠٠' : '7:00', ar ? 'الشمس تغيب. الليل قادم.' : 'The sun is setting. Night is coming.'];
  const next = NEXT[key]; // Act One (any ending) → Act Two → Act Three
  const end = $('end');
  sheetDir(end);
  end.innerHTML = `
    <p class="kicker-small">${esc(side2 ? t(key === 'act2w' ? 'endKicker2w' : 'endKicker2g') : dawn ? `${t('endKicker4')} · ${ENDINGS[s.ending]?.[ar ? 'ar' : 'en'] || ''}` : t(act1 ? 'endKicker' : small ? 'endKicker3v' : walk ? 'endKicker3w' : act3 ? 'endKicker3' : 'endKicker2'))}</p>
    <h2 id="end-h"><span class="ar" lang="ar" dir="rtl">قبل ما عرفت</span><span class="end-en">Before I Knew</span></h2>
    <ol class="timeline">
      <li class="tl-start"><time>${first[0]}</time><span>${esc(first[1])}</span></li>
      ${rows.map(([time, line]) => `<li><time>${esc(time)}</time><span>${esc(line)}</span></li>`).join('')}
      <li class="tl-end"><time>${last[0]}</time><span>${esc(last[1])}</span></li>
    </ol>
    ${total ? `<p class="end-noticed">${esc(t('noticed')(looked, total))}</p>` : ''}
    <p class="sheet-quiet">${esc(t(act1 ? 'endNextAct2' : dawn ? 'endNext4' : small ? 'endNext3v' : walk ? 'endNext3w' : act3 ? 'endNext3' : 'endNextAct3'))}</p>
    <div class="sheet-btns">
      ${next ? `<button type="button" id="end-next" class="primary">${esc(t(act1 ? 'continueAct2' : small ? 'continueAct4' : 'continueAct3'))}</button>` : ''}
      <button type="button" id="end-again" class="${next ? '' : 'primary'}">${esc(t(act1 ? 'again' : dawn ? 'againAct4' : small ? 'againAct3v' : walk ? 'againAct3w' : act3 ? 'againAct3' : 'againAct2'))}</button>
      <button type="button" id="end-menu">${esc(t('mainMenu'))}</button>
    </div>
    <button type="button" class="end-after-link" id="end-after" aria-expanded="false">${esc(t('afterwordLink'))}</button>
    <div class="end-after" id="end-after-body" hidden>${afterwordHtml()}</div>`;
  end.hidden = false;
  requestAnimationFrame(() => end.classList.add('show'));
  const close = () => {
    end.hidden = true;
    end.classList.remove('show');
  };
  $('end-next')?.addEventListener('click', () => {
    close();
    const n = next[1](s);
    writeSave(n);
    startGame(n);
  });
  $('end-again').addEventListener('click', () => {
    close();
    if (act1) newGame();
    else {
      const n = side2 ? act2For(progress().carry || s) : dawn ? act4State(progress().carry5 || s) : small ? act3vState(progress().carry4 || s) : walk ? act3wState(progress().carry3 || s) : act3 ? act3State(progress().carry2 || s) : act2State(progress().carry || s);
      writeSave(n);
      startGame(n);
    }
  });
  $('end-menu').addEventListener('click', () => toMainMenu());
  $('end-after').addEventListener('click', () => {
    const body = $('end-after-body');
    body.hidden = !body.hidden;
    $('end-after').setAttribute('aria-expanded', String(!body.hidden));
    if (!body.hidden) body.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  ($('end-next') || $('end-again')).focus();
}

function toMainMenu() {
  mode = 'title';
  $('end').hidden = true;
  $('end').classList.remove('show');
  stage.classList.remove('playing', 'mirror', 'ended', 'paused');
  game.paused = false;
  sound.resume();
  sound.setMuffle?.(0);
  sound.ringing?.(0);
  sound.ambience?.({ wind: 0.3, air: 0.4, generator: 0, crowd: 0, traffic: 0 });
  titleScene();
  sound.score.mood('title', 3);
  menu.showMain();
}

// --------------------------------------------------------------- menus --

const saved = () => {
  const s = loadSave();
  return s && !s.completed && !(actKey(s) === 'act1' && s.checkpoint === 'walk') ? s : null;
};
// An act finished and the next not yet begun: Continue starts it.
const nextAct = () => {
  const s = loadSave();
  return s && s.completed && NEXT[actKey(s)] ? s : null;
};
const startNext = (s) => {
  const n = NEXT[actKey(s)][1](s);
  writeSave(n);
  startGame(n);
};

function continueSub() {
  const s = saved();
  if (!s) return nextAct() ? t(actKey(nextAct()) === 'act1' ? 'chapter2' : 'chapter3') : '';
  return `${t('checkpoints')[s.checkpoint] || ''} · ${t('times')[s.checkpoint] || ''}`;
}

function pauseAside() {
  const obj = text.current;
  const tools = (game.state?.tools || []).map((id) => TOOLS[id]).filter(Boolean);
  const ar = lang() === 'ar';
  const cp = game.state?.checkpoint;
  return `
    <p class="aside-k">${esc(t('objective'))}</p>
    <p class="aside-v">${obj ? `${esc(ar ? obj[0] : obj[1])}` : '·'}</p>
    <p class="aside-k">${esc(t('carrying'))}</p>
    <p class="aside-v">${tools.length ? tools.map((x) => esc(ar ? x.ar : x.en)).join(' · ') : esc(t('nothing'))}</p>
    <p class="aside-k">${esc(t('checkpoint'))}</p>
    <p class="aside-v">${cp ? `${esc(t('checkpoints')[cp] || cp)} · ${esc(t('times')[cp] || '')}` : '·'}</p>`;
}

// The scenes of each act, in order: the first is the act's own start.
const SCENES = { act1: ['walk', 'hour', 'school', 'news'], act2r: ['south', 'lanes', 'front'], act3r: ['night', 'table', 'building', 'floor4', 'descent'], act3w: ['moon', 'wedding', 'garden'], act2w: ['quarterW', 'wallW'], act2g: ['kerbG', 'campusG', 'choiceG'], act3v: ['classroom', 'orchard', 'damascus', 'eid', 'protest', 'mukhabarat', 'roof'], act4: ['roof4', 'street', 'e1', 'e2', 'e3', 'e4', 'e5'] };
const sceneName = (cp) => String(t('checkpoints')[cp] || cp).split(' · ').pop();

function chaptersPage(panel, m) {
  const h = document.createElement('h2');
  h.className = 'menu-title';
  h.textContent = t('chapters');
  panel.appendChild(h);
  const p = progress();
  const list = document.createElement('div');
  list.className = 'menu-list chapter-list';
  const item = (n, title, sub, locked, go, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `menu-btn${locked ? ' locked' : ''}${cls}`;
    b.disabled = locked;
    b.innerHTML = `<span class="menu-btn-n">${n}</span><span class="menu-btn-text"><span class="menu-btn-label"></span><span class="menu-btn-sub"></span></span>`;
    b.querySelector('.menu-btn-label').textContent = title;
    b.querySelector('.menu-btn-sub').textContent = sub;
    if (!locked) b.addEventListener('click', go);
    list.appendChild(b);
  };
  // the later scenes of an act, each from the state it was last reached with
  const scenes = (key, open, from = 1) => {
    for (const cp of SCENES[key].slice(from)) {
      const st = p.scenes[key]?.[cp];
      item(t('times')[cp], sceneName(cp), st ? '' : t('sceneLocked'), !open || !st, () => {
        const n = { ...st, checkpoint: cp, completed: false };
        writeSave(n);
        startGame(n);
      }, ' scene');
    }
  };
  item('I', t('chapter1'), t('chapter1Sub'), false, () => newGame());
  scenes('act1', true);
  const open2 = p.unlocked.includes('act2r');
  item('II', t('chapter2'), open2 ? t('chapter2Sub') : t('chapter2Locked'), !open2, () => {
    const n = act2For(p.carry);
    writeSave(n);
    startGame(n);
  });
  scenes('act2r', open2);
  scenes('act2w', open2, 1);
  scenes('act2g', open2, 1);
  const open3 = p.unlocked.includes('act3r');
  item('III', t('chapter3'), open3 ? t('chapter3Sub') : t('chapter3Locked'), !open3, () => {
    const n = act3For(p.carry2);
    writeSave(n);
    startGame(n);
  });
  scenes('act3r', open3);
  // the night walk, from each of its scenes (its first included)
  scenes('act3w', open3 && p.unlocked.includes('act3w'), 0);
  // the small hours, likewise
  scenes('act3v', open3 && p.unlocked.includes('act3v'), 0);
  const open4 = p.unlocked.includes('act4');
  item('IV', t('chapter4'), open4 ? t('chapter4Sub') : t('chapter4Locked'), !open4, () => {
    const n = act4State(p.carry5);
    writeSave(n);
    startGame(n);
  });
  // the dawn street, and each ending reached, from the state it was reached with
  scenes('act4', open4);
  panel.appendChild(list);
  m.backButton(panel);
}

// Your story: every decision, the way it went last time, the other ways it
// has gone, and those not yet taken; then what Sami stopped to look at.
function storyPage(panel, m) {
  const ar = lang() === 'ar';
  const p = progress();
  panel.insertAdjacentHTML('beforeend', `<h2 class="menu-title">${esc(t('yourStory'))}</h2><p class="menu-sub">${esc(t('yourStorySub'))}</p>`);
  const box = document.createElement('div');
  box.className = 'menu-story';
  box.tabIndex = 0;
  let any = false;
  for (const [key, title] of [['act1', 'chapter1'], ['act2r', 'chapter2'], ['act2w', 'chapter2w'], ['act2g', 'chapter2g'], ['act3r', 'chapter3'], ['act3w', 'chapter3Walk'], ['act4', 'chapter4']]) {
    const ds = DECISIONS.filter((d) => d.act === key);
    if (!ds.some((d) => p.seen[d.key]?.length)) continue;
    any = true;
    let html = `<h3 class="menu-group">${esc(t(title))}</h3>`;
    for (const d of ds) {
      const seen = p.seen[d.key] || [];
      html += `<div class="story-dec"><p class="story-dec-t"><time>${esc(d.time[ar ? 1 : 0])}</time>${esc(t(d.title))}</p><ul>`;
      for (const o of d.options) {
        const was = seen.includes(o[0]);
        const last = p.last[d.key] === o[0];
        html += was
          ? `<li class="${last ? 'last' : ''}"><span>${esc(o[ar ? 2 : 1])}</span>${last ? `<em>${esc(t('storyLast'))}</em>` : ''}</li>`
          : `<li class="unseen" aria-label="${esc(t('storyUnseen'))}"><span aria-hidden="true">· · · · ·</span></li>`;
      }
      html += '</ul></div>';
    }
    box.insertAdjacentHTML('beforeend', html);
  }
  if (!any) box.insertAdjacentHTML('beforeend', `<p class="menu-sub">${esc(t('storyNone'))}</p>`);

  // what you noticed
  let notes = `<h3 class="menu-group">${esc(t('memories'))}</h3><p class="menu-sub">${esc(t('memoriesSub'))}</p>`;
  let found = 0;
  for (const [key, title] of [['act1', 'chapter1'], ['act2r', 'chapter2'], ['act2w', 'chapter2w'], ['act2g', 'chapter2g'], ['act3r', 'chapter3'], ['act3w', 'chapter3Walk'], ['act3v', 'chapter3Small'], ['act4', 'chapter4']]) {
    const got = Object.values(p.noticed[key] || {});
    const total = Math.max(p.totals[key] || 0, got.length);
    if (!total) continue;
    found += got.length;
    notes += `<div class="story-notes"><p class="story-dec-t">${esc(t(title))}<span class="story-count">${esc(t('noticedAct')(got.length, total))}</span></p><ul>`;
    for (const line of got) notes += `<li>${ar ? `<span class="ar" lang="ar" dir="rtl">${esc(line[0])}</span>` : `<span>${esc(line[1])}</span>`}</li>`;
    notes += `</ul><p class="story-dots" aria-hidden="true">${'●'.repeat(got.length)}${'○'.repeat(total - got.length)}</p></div>`;
  }
  if (!found) notes += `<p class="menu-sub">${esc(t('memoriesNone'))}</p>`;
  box.insertAdjacentHTML('beforeend', notes);
  panel.appendChild(box);
  m.backButton(panel);
}

// Belongings: what Sami carries, and what each thing is. Ahmad's journal
// opens, page by page.
function belongingsPage(panel, m) {
  const ar = lang() === 'ar';
  const subs = settings.get('subtitles');
  panel.insertAdjacentHTML('beforeend', `<h2 class="menu-title">${esc(t('belongings'))}</h2>`);
  const box = document.createElement('div');
  box.className = 'menu-belongings';
  const tools = game.state?.tools || [];
  if (!tools.length) box.innerHTML = `<p class="menu-sub">${esc(t('belongingsNone'))}</p>`;
  const lines = (L) => `${subs !== 'en' ? `<span class="ar" lang="ar" dir="rtl">${esc(L.ar)}</span>` : ''}${subs !== 'ar' ? `<span class="en" dir="ltr">${esc(L.en)}</span>` : ''}`;
  for (const id of tools) {
    const T = TOOLS[id];
    const it = ITEMS[id];
    if (!T) continue;
    const row = document.createElement('div');
    row.className = 'belong';
    row.innerHTML = `<p class="belong-name">${esc(ar ? T.ar : T.en)}${it?.draft ? '<span class="log-draft">[draft]</span>' : ''}</p>${it ? `<p class="belong-desc">${lines(it)}</p>` : ''}`;
    if (id === 'journal') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-link';
      b.textContent = t('read');
      b.addEventListener('click', () => m.push('journal'));
      row.appendChild(b);
    }
    box.appendChild(row);
  }
  panel.appendChild(box);
  m.backButton(panel);
}

let journalAt = 0;
function journalPage(panel, m) {
  const subs = settings.get('subtitles');
  const pg = JOURNAL[journalAt];
  panel.insertAdjacentHTML(
    'beforeend',
    `<h2 class="menu-title">${esc(TOOLS.journal[lang() === 'ar' ? 'ar' : 'en'])}</h2>
    <div class="journal-page">
      <p class="journal-ar" lang="ar" dir="rtl">${esc(pg.ar).replace(/\n/g, '<br>')}</p>
      ${subs !== 'ar' ? `<p class="journal-en" dir="ltr">${esc(pg.en).replace(/\n/g, '<br>')}</p>` : ''}
      ${pg.draft ? '<span class="log-draft">[draft]</span>' : ''}
    </div>
    <div class="journal-nav">
      <button type="button" class="menu-link" id="j-prev" ${journalAt ? '' : 'disabled'}>${esc(t('prevPage'))}</button>
      <span class="journal-n">${esc(t('pageN')(journalAt + 1, JOURNAL.length))}</span>
      <button type="button" class="menu-link" id="j-next" ${journalAt < JOURNAL.length - 1 ? '' : 'disabled'}>${esc(t('nextPage'))}</button>
    </div>`,
  );
  const turn = (d) => {
    journalAt = Math.max(0, Math.min(JOURNAL.length - 1, journalAt + d));
    sound.cloth?.();
    m.keepFocus = true;
    m.render();
  };
  panel.querySelector('#j-prev').addEventListener('click', () => turn(-1));
  panel.querySelector('#j-next').addEventListener('click', () => turn(1));
  m.backButton(panel);
}

function afterwordHtml() {
  return lang() === 'ar'
    ? `<h3>${esc(t('afterword'))}</h3>
    <p>حوصرت الغوطة الشرقية، ببلداتها وبساتينها شرقيّ دمشق، من عام ٢٠١٣ حتى نيسان ٢٠١٨. عاش فيها مئات الآلاف من الناس تحت القصف والجوع وشحّ الدواء، في واحد من أطول الحصارات في التاريخ الحديث.</p>
    <p>سامي وأحمد وشارعهما من نسج الخيال. أمّا ما يعيشونه، من ستائر القنّاصة إلى المدارس في الأقبية والبطاريات التي تشحن هواتف حيّ كامل، فمستمَدّ من شهادات من كانوا هناك.</p>`
    : `<h3>${esc(t('afterword'))}</h3>
    <p>Eastern Ghouta, the towns and orchards east of Damascus, was besieged from 2013 until April 2018. Several hundred thousand people lived inside it, through shelling, hunger and shortages of medicine, in one of the longest sieges in modern history.</p>
    <p>Sami, Ahmad and their street are invented. What they live through, from the sniper curtains to the schools in basements and the car batteries charging a whole neighbourhood’s phones, is drawn from the accounts of people who were there.</p>`;
}

function logPage(panel, m) {
  const h = document.createElement('h2');
  h.className = 'menu-title';
  h.textContent = t('log');
  panel.appendChild(h);
  const box = document.createElement('div');
  box.className = 'menu-log';
  box.tabIndex = 0;
  const subs = settings.get('subtitles');
  if (!text.log.length) box.innerHTML = `<p class="menu-sub">${esc(t('logEmpty'))}</p>`;
  for (const e of text.log) {
    const row = document.createElement('div');
    row.className = `log-row style-${e.style || 'plain'}`;
    const whoName = e.who ? (lang() === 'ar' ? `<span class="ar" lang="ar" dir="rtl">${esc(e.who[0])}</span>` : `<span class="en">${esc(e.who[1])}</span>`) : '';
    const who = e.who ? `<span class="log-who">${whoName}</span>` : '';
    const draft = e.draft ? `<span class="log-draft">[draft]</span>` : '';
    row.innerHTML = `${who}${draft}<span class="log-lines">${subs !== 'en' ? `<span class="ar" lang="ar" dir="rtl">${esc(e.line[0])}</span>` : ''}${subs !== 'ar' ? `<span class="en" dir="ltr">${esc(e.line[1])}</span>` : ''}</span>`;
    box.appendChild(row);
  }
  panel.appendChild(box);
  requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
  m.backButton(panel);
}

const menu = new Menu($('menu'), {
  t,
  dir: () => (lang() === 'ar' ? 'rtl' : 'ltr'),
  header: () => `<p class="kicker"><span class="kicker-rule" aria-hidden="true"></span><span>${esc(t('kickerDate'))}</span></p>
    <h1><span class="ar" lang="ar" dir="rtl">قبل ما عرفت</span><span class="en" lang="en">Before I Knew</span></h1>
    <p class="tagline">${esc(t('tagline'))}</p>`,
  main: [
    {
      label: () => t('continue'),
      sub: continueSub,
      hidden: () => !saved() && !nextAct(),
      action: () => {
        if (saved()) return startGame(saved());
        startNext(nextAct());
      },
    },
    { label: () => t('newGame'), sub: () => t('newGameSub'), action: () => newGame() },
    { label: () => t('chapters'), action: (m) => m.push('chapters') },
    { label: () => t('yourStory'), action: (m) => m.push('story') },
    { label: () => t('settings'), action: (m) => m.push('settings') },
    { label: () => t('controls'), action: (m) => m.push('controls') },
    { label: () => t('about'), action: (m) => m.push('about') },
  ],
  pause: [
    { label: () => t('resume'), action: (m) => m.close() },
    { label: () => t('log'), action: (m) => m.push('log') },
    {
      label: () => t('belongings'),
      action: (m) => {
        journalAt = 0;
        m.push('belongings');
      },
    },
    { label: () => t('photo'), action: () => openPhoto() },
    { label: () => t('settings'), action: (m) => m.push('settings') },
    { label: () => t('controls'), action: (m) => m.push('controls') },
    {
      label: () => t('restart'),
      action: () => {
        const s = loadSave() || freshState();
        startGame({ ...s, completed: false });
      },
    },
    { label: () => t('mainMenu'), action: () => toMainMenu() },
  ],
  pauseAside,
  pages: { log: logPage, chapters: chaptersPage, story: storyPage, belongings: belongingsPage, journal: journalPage },
  onOpen: () => {
    game.paused = true;
    stage.classList.add('paused');
    sound.suspend();
  },
  onClose: () => {
    game.paused = false;
    stage.classList.remove('paused');
    sound.resume();
  },
  settingsStore: settings,
  settings: [
    { group: 'gSound' },
    { key: 'master', label: 'master', type: 'range' },
    { key: 'music', label: 'music', type: 'range' },
    { key: 'effects', label: 'effects', type: 'range' },
    { group: 'gText' },
    { key: 'lang', label: 'lang', type: 'select', options: [['en', 'English'], ['ar', 'عربي']], redraw: true },
    { key: 'subtitles', label: 'subtitles', type: 'select', options: [['both', 'subsBoth'], ['en', 'subsEn'], ['ar', 'subsAr']] },
    { key: 'textSize', label: 'textSize', type: 'select', options: [[0.85, 'small'], [1, 'medium'], [1.2, 'large'], [1.4, 'xlarge']] },
    { key: 'backing', label: 'backing', type: 'select', options: [['off', 'off'], ['light', 'light'], ['dark', 'dark']] },
    { group: 'gDisplay' },
    { key: 'quality', label: 'quality', type: 'select', options: [['auto', 'auto'], ['low', 'low'], ['medium', 'medium'], ['high', 'high']] },
    { key: 'dof', label: 'dof', type: 'select', options: [['bokeh', 'dofBokeh'], ['soft', 'dofSoft'], ['off', 'off']] },
    { key: 'shake', label: 'shake', type: 'toggle' },
    { key: 'reduceFlashes', label: 'reduceFlashes', type: 'toggle' },
    { group: 'gPlay' },
    { key: 'hints', label: 'hints', type: 'toggle' },
    { group: 'gAccess' },
    { key: 'readSpeed', label: 'readSpeed', type: 'select', options: [[1.35, 'slow'], [1, 'normal'], [0.8, 'fast']] },
    { key: 'crouchMode', label: 'crouchMode', type: 'select', options: [['toggle', 'crouchToggle'], ['hold', 'crouchHold']] },
    { key: 'lanes', label: 'lanes', type: 'select', options: [['standard', 'lanesStandard'], ['forgiving', 'lanesForgiving']] },
    { key: 'focusCam', label: 'focusCam', type: 'toggle' },
    { key: 'outlines', label: 'outlines', type: 'toggle' },
    { key: 'physics', label: 'physics', type: 'toggle' },
    { key: 'vibration', label: 'vibration', type: 'toggle' },
  ],
  controls: { input, actions: ACTIONS, label: keyLabel },
  about: () =>
    lang() === 'ar'
      ? `<h2 class="menu-title">عن القصة</h2>
    <p><strong>قبل ما عرفت</strong> قصة تفاعلية تدور أحداثها في بلدة محاصرة في الغوطة، قرب دمشق، في آب ٢٠١٤. سامي في السابعة والعشرين. يمشي مع أقرب أصدقائه، أحمد، ثم يفترقان عند مفترق الطرق. وبعد أقلّ من ساعة، يعلم أن أحمد قد استُشهد.</p>
    <p>الفصل الأول هو المشوار، والفراق، وساعة ما قبل المعرفة. تحدّد خياراتك من يكون سامي حين يصله الخبر، وإلى أين يمضي المساء. في الفصل الثاني، يتّجه سامي جنوباً نحو أحمد.</p>
    <h3>تنبيه حول المحتوى</h3>
    <p>الحياة تحت الحصار: القصف، والقنص، والجوع، وموت صديق، والحزن. يُسمَع العنف ويُفهَم، لكنه لا يُعرَض. يُنصح بها لمن هم في السادسة عشرة فما فوق.</p>
    <p class="menu-sub">عمل متخيَّل مستند إلى شهادات موثّقة عن الحياة تحت الحصار. كل ما فيه مرسوم ومولَّد بالبرمجة، من دون صور أو تسجيلات.</p>
    <p class="menu-sub">حركة المشي والركض والانحناء مأخوذة من قاعدة بيانات التقاط الحركة في جامعة كارنيغي ميلون (mocap.cs.cmu.edu)، التي أُنشئت بتمويل من المؤسسة الوطنية للعلوم NSF EIA-0196217.</p>
    ${afterwordHtml()}`
      : `<h2 class="menu-title">About</h2>
    <p><strong>Before I Knew · قبل ما عرفت</strong> is an interactive story set in a besieged town in Ghouta, outside Damascus, in August 2014. Sami is 27. He walks with his closest friend, Ahmad, and they part at a junction. Less than an hour later, he learns that Ahmad has been killed.</p>
    <p>Act One is the walk, the parting, and the hour of not knowing. Your choices shape who Sami is when the news reaches him, and which way the evening goes. In Act Two, Sami heads south, to Ahmad.</p>
    <h3>Content note</h3>
    <p>Life under military siege: shelling, sniper fire, hunger, the death of a friend, grief. Violence is heard and implied, never shown. Recommended for ages 16 and over.</p>
    <p class="menu-sub">A work of fiction drawing on documented accounts of siege life. Everything is drawn and synthesised in code. There are no images or recordings.</p>
    <p class="menu-sub">Walking, running, crouching and bending are motion-captured: the data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.</p>
    ${afterwordHtml()}`,
});
menu.showMain();

input.onKey((e) => {
  const acts = input.actionsFor(e.code);
  if (!acts.includes('menu') || photo.active) return;
  if (!$('note').hidden) {
    $('note').hidden = true;
    return;
  }
  if (mode === 'play') menu.toggle();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'play' && !menu.open && !photo.active) menu.showPause();
});

// ------------------------------------------------------- touch controls --

const touchMap = [
  ['t-left', 'left'],
  ['t-right', 'right'],
  ['t-jump', 'jump'],
  ['t-crouch', 'crouch'],
  ['t-prone', 'prone'],
  ['t-use', 'interact'],
  ['t-tool', 'tool'],
  ['t-light', 'use'],
  ['t-skip', 'skip'],
];
// A second tap on an arrow, held, runs (as a stick pushed all the way does).
const lastTap = {};
for (const [id, action] of touchMap) {
  const b = $(id);
  if (!b) continue;
  const arrow = action === 'left' || action === 'right';
  let running = false;
  const down = (e) => {
    e.preventDefault();
    input.touchDown(action);
    if (arrow && performance.now() - (lastTap[action] || -1e9) < 320) {
      running = true;
      input.touchDown('run');
    }
    b.classList.add('down');
  };
  const up = () => {
    if (!b.classList.contains('down')) return;
    input.touchUp(action);
    if (arrow) lastTap[action] = performance.now();
    if (running) {
      running = false;
      input.touchUp('run');
    }
    b.classList.remove('down');
  };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
}
$('t-menu').addEventListener('click', () => mode === 'play' && !photo.active && menu.toggle());

// ----------------------------------------------------------- photo mode --

const photo = new Photo({
  game,
  stage,
  canvas: $('view'),
  input,
  t,
  render: () => game.render(time),
  onExit: () => menu.showPause(),
});
function openPhoto() {
  menu.close();
  // the story stays stopped while the camera is free
  game.paused = true;
  photo.open();
}

// ------------------------------------------------------------------ loop --

let last = performance.now();
let time = 0;
let frames = 0;
let fpsT = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  time += dt;
  input.poll();
  if (mode === 'title') {
    game.time += dt;
    game.effects.update(dt);
    Object.assign(game.cam, game.cameraTarget());
    game.render(time);
  } else {
    // (testing can run several steps per frame and skip drawing)
    const steps = window.game?.speed || 1;
    if (photo.active) photo.update(dt);
    else if (!menu.open) for (let i = 0; i < steps; i++) game.update(dt);
    if (!window.game?.noRender) game.render(time);
  }
  input.endFrame();

  frames++;
  fpsT += dt;
  if (fpsT > 2) {
    const fps = frames / fpsT;
    frames = 0;
    fpsT = 0;
    if (settings.get('quality') === 'auto' && fps < 34 && autoScale > 0.6) {
      autoScale -= 0.2;
      resize();
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug and testing hook.
window.game = {
  speed: 1,
  game,
  menu,
  input,
  settings,
  text,
  photo,
  progress,
  start: (checkpoint = 'walk', extra = {}) => startGame({ ...freshState(), checkpoint, ...extra }),
  startAct2: (checkpoint = 'south', extra = {}) => startGame({ ...act2State(null), checkpoint, ...extra }),
  startWalk: (checkpoint = 'moon', extra = {}) => startGame({ ...act3wState({ d_choice: 'cloth', g_choice: 'dignity' }), checkpoint, ...extra }),
  startWitness: (checkpoint = 'quarterW', extra = {}) => startGame({ ...act2wState({ path: 'witness', helped_old_man: true }), checkpoint, ...extra }),
  startGrief: (checkpoint = 'kerbG', extra = {}) => startGame({ ...act2gState({ path: 'grief' }), checkpoint, ...extra }),
  startDawn: (checkpoint = 'roof4', extra = {}) => startGame({ ...act4State({ d_choice: 'cloth', g_choice: 'dignity', negotiation_outcome: 'success', body_retrieved: true, tools: ['torch', 'journal', 'lighter'] }), checkpoint, ...extra }),
  startSmall: (checkpoint = 'classroom', extra = {}) => startGame({ ...act3vState({ d_choice: 'cloth', g_choice: 'dignity', watered_garden: true, cat_seen: true }), checkpoint, ...extra }),
  startAct3: (d = 'cloth', checkpoint = null, extra = {}) => startGame({ ...act3State({ d_choice: d }), ...(checkpoint ? { checkpoint } : {}), ...extra }),
  get mode() {
    return mode;
  },
};
