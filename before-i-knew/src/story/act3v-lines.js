// Act 3, Parts 4 to 6: The Small Hours (الساعات الصغيرة), 1 am to dawn.
// Lines from script/act3.md (scenes 3D, 3E and 3F) are final (Damascus
// dialect, with the English). Barks the script doesn't cover are
// placeholders, marked `draft: true`; the dialogue log tags those "[draft]".
// The code refers to lines by key.

export const WHO = {
  sami: ['سامي', 'Sami'],
  ahmad: ['أحمد', 'Ahmad'],
  father: ['أبو سامي', 'Sami’s father'],
  all: ['الكل', 'Everyone'],
  neighbour: ['أبو هشام', 'Abu Hisham'],
  crowd: ['الحشد', 'The crowd'],
  teacher: ['الأستاذ', 'The teacher'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // ---- the street between the memories
  stair: d(null, 'صف أحمد. نص درج لتحت، وباب.', 'Ahmad’s classroom. Half a flight down, and a door.', 'examine', 4),
  arch: d(null, 'قنطرة. ورا منها العتمة، وريحة تراب.', 'An archway. Darkness behind it, and the smell of earth.', 'examine', 4),
  window: d(null, 'هاد مو أنا. أو هاد أنا، من زمان.', 'That isn’t me. Or it is — a long time ago.', 'examine', 4),
  shutter: d(null, 'باب بيت مسكّر. في بسمار فوقو لزينة العيد.', 'A house door, shuttered. A nail above it where the Eid wreath hung.', 'examine', 4.5),
  minaret: d(null, 'المادنة. مشقوقة من فوق لتحت، وبعدها واقفة.', 'The minaret. Split from top to bottom, and still standing.', 'examine', 4.5),
  portrait: d(null, 'في شي معلّق عالحيط جوّا.', 'Something hanging on the wall inside.', 'examine', 3.5),
  tower: d(null, 'أعلى بناية بالحارة. الدرج لسا سليم.', 'The tallest building in the quarter. The stairs are still whole.', 'examine', 4),

  // ---- 3D-1: the classroom vision
  late: s('ahmad', 'تأخّرت، يا هندسة.', 'You’re late, ya handasa.', '', 3.4),
  tenses: s('ahmad', 'ماضي... حاضر... مستقبل.', 'Past... present... future.', '', 4),
  lesson: s('ahmad', 'خلّص الدرس يا هندسة.', 'Finish the lesson, ya handasa.', 'whisper', 4.5),
  noVoice: d(null, '...', '...', 'whisper', 2),

  // ---- 3D-2: the orchard vision
  grape: d(null, 'إيدي عم تمرق فيها. موجودة ومش موجودة.', 'My hand goes straight through it. There and not there.', 'whisper', 4.5),
  ahmadFar: d(null, 'أحمد!', 'Ahmad!', 'shout', 1.6),

  // ---- 3D-3: the Damascus vision
  glass: d(null, 'الزجاج بارد.', 'The glass is cold.', 'whisper', 3),

  // ---- 3E-1: Eid before the revolution
  eid: s('father', 'كل عام وإنتو بخير.', 'Happy Eid, everyone.', '', 3),
  andYou: s('all', 'وإنت بخير!', 'And you!', 'shout', 2),
  baklava: d('neighbour', 'مرتي عملت كتير. كل عام وإنتو بخير.', 'My wife made too much. Happy Eid.', '', 3.6),

  // ---- 3E-2: the first protest
  chant: s('crowd', 'الشعب يريد إسقاط النظام!', 'The people want the fall of the regime!', 'shout', 3),
  go: s('ahmad', 'يلا.', 'Let’s go.', 'whisper', 2.2),
  never: s('ahmad', 'ما رح يرجعوا يسكتونا.', 'They’re never going to silence us again.', '', 4.6),

  // ---- 3E-3: the mukhabarat
  who: s('teacher', 'مين كتب هاد؟', 'Who wrote this?', '', 3),
  fold: s('teacher', 'اطوي هالورقة. حطّها بجيبتك. اوعى تحكي عنها لحدا. ما كانت هون. ما شفتها. فهمت؟', 'Fold this paper. Put it in your pocket. Don’t tell anyone about it. It was never here. I never saw it. Understand?', 'whisper', 7.5),
  home: s('father', 'شو ما بتسمع بالبيت، ما بتحكي عنو بالمدرسة. وشو ما بتسمع بالمدرسة — بتنسى. فهمت؟', 'Whatever you hear at home, you don’t talk about at school. And whatever you hear at school — you forget. Understood?', 'whisper', 7),
  why: s('father', 'مش لأنو غلط تحكي. لأنو في ناس بتعاقب الناس يلي بتحكي.', 'Not because it’s wrong to speak. Because there are people who punish the people who speak.', 'whisper', 6.5),

  // ---- 3F: the rooftop
  damascus: s(null, 'دمشق. خمس كيلومترات. بتشوف النور — بيوت مضوية، سيارات، شوارع. عالم تاني. عالم بيعرف إنو نحنا هون. وبيكمّل.', 'Damascus. Five kilometres. You can see the light — lit homes, cars, streets. Another world. A world that knows we’re here. And carries on.', 'examine', 8.5),
  ghouta: s(null, 'الغوطة. عتمة من كل الجهات. نقاط نور — شمعة هون، مولّد هونيك — بس أغلبها عتمة. من هون بتشوف الحصار بعيون طير.', 'Ghouta. Darkness in every direction. Points of light — a candle here, a generator there — but mostly dark. From here you see the siege through a bird’s eyes.', 'examine', 8.5),
};

// Title cards (in Aref Ruqaa).
export const CARDS = {
  open: [['الساعات الصغيرة', 'The Small Hours'], ['١:٠٠', '1:00 am']],
  y2008: [['٢٠٠٨', '2008'], ['العيد', 'Eid']],
  y2011: [['٢٠١١', '2011'], ['جمعة', 'A Friday']],
  y2001: [['٢٠٠١', '2001']],
  close: [['الفجر عم يجي.', 'Dawn is coming.'], ['اللّيل خلص. بس القصة لسا.', 'The night is over. But the story isn’t.']],
};
