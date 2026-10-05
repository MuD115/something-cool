// Act 2: The Evening (العصرية), Path C: Grief (طريق الحزن), from Choice
// C3, silence. script/act2.md, scenes 2C-1 to 2C-3. Lines from the script are
// final (Damascus dialect, with the English).

export const WHO = {
  sami: ['سامي', 'Sami'],
  ahmad: ['أحمد', 'Ahmad'],
  abu: ['أبو يزن', 'Abu Yazan'],
  nidal: ['أبو نضال', 'Abu Nidal'],
  umAhmad: ['أم أحمد', 'Um Ahmad'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });

export const LINES = {
  // 2C-1: sitting
  kerb: s(null, 'رصيف. باطون مكسور. في خربشات عليه — أسماء وتواريخ. حدا كتب: "كنا هون."', 'A kerb. Cracked concrete. There are scratches on it — names and dates. Someone wrote: “We were here.”', 'examine', 7),
  olive: s(null, 'زيتونة ماتت. يبست من قلة المي. الجذع لسا واقف. الأغصان مكسّرة — حدا قصّها للحطب.', 'A dead olive tree. Dried out from lack of water. The trunk still stands. The branches are broken off — someone cut them for firewood.', 'examine', 7.5),

  // 2C-1a: the university, 2009
  endure: s('ahmad', 'ليش لازم أتحمّل هاد الدكتور المملّ؟ أنا بدرس أدب.', 'Why do I have to endure this boring lecturer? I study literature.', 'whisper', 4.6),
  followed: s('sami', 'لأنك تبعتني.', 'Because you followed me.', 'whisper', 2.6),
  cafeteria: s('ahmad', 'تبعتك لأنو كافتيريتكن أحسن.', 'I followed you because your cafeteria’s better.', 'whisper', 3.6),
  difference: s('ahmad', 'بتعرف شو الفرق بين الهندسة والأدب؟', 'You know the difference between engineering and literature?', 'whisper', 3.8),
  useful: s('sami', 'الهندسة مفيدة.', 'Engineering is useful.', 'whisper', 2.4),
  why: s('ahmad', 'الأدب بيفهّمك ليش لازم البناية تبقى واقفة. الهندسة بتقلّك كيف.', 'Literature makes you understand why the building should stand. Engineering tells you how.', '', 6),
  nescafe: s('ahmad', 'يلا، عالكافتيريا. بدي نسكافيه.', 'Come on, to the cafeteria. I need a Nescafe.', '', 3.4),
  always: s('sami', 'إنت دايماً بدك نسكافيه.', 'You always need a Nescafe.', '', 2.8),
  solves: s('ahmad', 'لأنو النسكافيه بيحل كل مشاكل الدنيا.', 'Because Nescafe solves all the world’s problems.', '', 4),

  // 2C-2: Abu Yazan and the lighter
  gave: s('abu', 'أحمد أعطاني هدول.', 'Ahmad gave me these.', 'whisper', 3),
  lighter: s(null, 'ولّاعة أحمد. زيبو قديمة. ما كان يدخّن — كان يستعملها يولّع الشمعات بالصف.', 'Ahmad’s lighter. An old Zippo. He didn’t smoke — he used it to light the candles in the classroom.', 'examine', 7),
  need: s('abu', 'سامي. في ناس بدهن ياك.', 'Sami. There are people who need you.', '', 3.6),
  mother: s('abu', 'أمو لسا ما بتعرف. والليلة رح تجي. ولازم حدا يكون معها. حدا يعرف أحمد.', 'His mother still doesn’t know. And night is coming. And someone who knew Ahmad needs to be with her.', '', 7),
  beforeDark: s('abu', 'مش لازم هلّق. بس قبل الليل.', 'Not now. But before dark.', 'whisper', 3.6),
  come: s('nidal', 'سامي. يلا يا ابني.', 'Sami. Come, son.', '', 3),
  letsGo: s('sami', 'يلا.', 'Let’s go.', 'whisper', 2),
  later: s('sami', 'بعدين.', 'Later.', 'whisper', 2),

  // 2C-3: Um Ahmad
  ahmad: s('umAhmad', 'أحمد.', 'Ahmad.', 'whisper', 2.6),
  mercy: s('sami', 'أم أحمد... الله يرحمو.', 'Um Ahmad... God have mercy on him.', '', 4),
  where: s('umAhmad', 'وين كان؟', 'Where was he?', '', 2.6),
  school: s('sami', 'شارع المدرسة.', 'School Street.', '', 2.2),
  alone: s('umAhmad', 'كان لحالو؟', 'Was he alone?', '', 2.4),
  yes: s('sami', 'إي.', 'Yes.', '', 1.6),
  suffer: s('umAhmad', 'تعذّب؟', 'Did he suffer?', '', 2.4),
  fast: s('sami', 'لا. كانت سريعة. ما حسّ بشي.', 'No. It was fast. He didn’t feel anything.', '', 4),
  thank: s('umAhmad', 'الحمدلله.', 'Thank God.', 'whisper', 2.4),
  shirt: s('umAhmad', 'كنت عم خيّطلو قميص. بدّو ياه للعيد. ما خلصتو.', 'I was sewing him a shirt. He wanted it for Eid. I didn’t finish it.', '', 6),
  bring: s('umAhmad', 'ارجعلي ياه.', 'Bring him back to me.', '', 3.4),
  willing: s('sami', 'إن شاء الله.', 'God willing.', 'whisper', 3),
};

export const CARDS = {
  open: [['العصرية', 'The Evening'], ['طريق الحزن', 'Grief']],
  y2009: [['٢٠٠٩', '2009'], ['جامعة دمشق', 'Damascus University']],
  close: [['الساعة سبعة. الشمس عم تغيب.', 'Seven o’clock. The sun is setting.'], ['الليل بيجي. والليل بالحصار ما بيشبه أي ليل تاني.', 'Night is coming. And a night under siege is like no other night.']],
};
