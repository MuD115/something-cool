// Sami's notebook: who he met, what he stopped to look at, the photographs he
// took, the endings he has reached. It is kept across playthroughs under its
// own key, so a new game doesn't wipe it; the menu reads it (main.js).

const KEY = 'bik.collect';
const empty = () => ({ people: {}, things: {}, photos: {}, endings: {} });

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...empty(), ...d };
  } catch {
    return empty();
  }
}

let data = load();
let onNew = null;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // a full or blocked store: the notebook just doesn't keep this one
  }
}

function add(kind, id, val = Date.now()) {
  if (!id || data[kind][id]) return false;
  data[kind][id] = val;
  save();
  onNew?.(kind, id);
  return true;
}

export const notebook = () => data;
export const onNewEntry = (fn) => (onNew = fn);
export const seen = (id) => add('things', id);
export const ending = (n) => add('endings', String(n));
export const photo = (id, url) => add('photos', id, url || Date.now());

// People, in the order the day meets them: who, and what Sami would write.
export const PEOPLE = [
  { id: 'ahmad', name: ['أحمد', 'Ahmad'], note: ['أعزّ صاحب. أستاذ عربي. بيمشي قدّامي نص خطوة، دايماً.', 'My closest friend. Teaches Arabic. Always walks half a step ahead of me.'] },
  { id: 'khalil', name: ['أبو خليل', 'Abu Khalil'], note: ['عم يحفر حوض بندورة بنص الحارة. بيقول الأرض لسّا بتعطي.', 'Digging a tomato bed in the middle of the lane. Says the ground still gives.'] },
  { id: 'imad', name: ['أبو عماد', 'Abu Imad'], note: ['بيسكّر شبّاكه بالخشب كل ما ينكسر. وبيرجع يسكّره.', 'Boards up his window every time it breaks. And boards it up again.'] },
  { id: 'samir', name: ['أبو سمير', 'Abu Samir'], note: ['بينشر حطب من أبواب البيوت الفاضية. أم سمير بتطبخ عليه.', 'Saws firewood from the doors of empty houses. Um Samir cooks on it.'] },
  { id: 'hamoudi', name: ['حمّودي', 'Hamoudi'], note: ['ولد وطابة. ما بيعرف إنو في شي اسمه حصار، أو بيعرف وعم يلعب.', 'A boy and a ball. Doesn’t know there’s a siege, or knows and plays anyway.'] },
  { id: 'abu', name: ['أبو يزن', 'Abu Yazan'], note: ['هوي يلي جابلي الخبر. وجابلي ولّاعة أحمد ودفتره.', 'He brought me the news. And Ahmad’s lighter, and his journal.'] },
  { id: 'umSaid', name: ['أم سعيد', 'Um Said'], note: ['شافت كل شي من شبّاكها. خبّت الشنطة.', 'Saw everything from her window. Kept the bag.'] },
  { id: 'baker', name: ['أبو فراس', 'Abu Firas'], note: ['فرنه شغّال بشو ما لقي. عطاني رغيف وما رضي ياخد شي.', 'His oven runs on whatever he finds. Gave me a loaf and wouldn’t take anything.'] },
  { id: 'umAhmad', name: ['أم أحمد', 'Um Ahmad'], note: ['أمّه. ما كانت بتعرف لسّا.', 'His mother. She didn’t know yet.'] },
  { id: 'raed', name: ['رائد', 'Raed'], note: ['إجا معنا للحدّ وحمل معنا. ما سأل ليش.', 'He came with us to the edge, and carried. He didn’t ask why.'] },
  { id: 'maher', name: ['الضابط ماهر', 'Officer Maher'], note: ['على الحاجز، بالقماشة البيضا. وقّف وسمع.', 'At the checkpoint, at the white cloth. He stopped, and listened.'] },
  { id: 'medic', name: ['المسعف', 'The medic'], note: ['إيديه ما بتوقف. ما سألني شي.', 'His hands never stop. He didn’t ask me anything.'] },
  { id: 'teacher', name: ['الأستاذ', 'The teacher'], note: ['أستاذي بالمدرسة. قلّي اطوي الورقة وحطّها بجيبتك.', 'My teacher at school. Told me to fold the paper and put it in my pocket.'] },
  { id: 'father', name: ['أبو سامي', 'Sami’s father'], note: ['أبي.', 'My father.'] },
];

const BY_EN = Object.fromEntries(PEOPLE.map((p) => [p.name[1], p.id]));

// Called with whoever speaks a line: [Arabic, English] or null.
export function meet(who) {
  const id = Array.isArray(who) ? BY_EN[who[1]] : null;
  if (id) add('people', id);
}
