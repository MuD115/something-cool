// What the street's people say when Sami lends a hand: Damascus dialect,
// English subtitles. Short, the way people speak over work.

export const HELP_LINES = {
  ladder: ['الله يرضى عليك. ثبّتها شوي.', 'God bless you. Hold it steady a moment.'],
  ball: ['شكراً عمو!', 'Thanks, uncle!'],
  carry: ['يسلمو إيديك.', 'Bless your hands.'],
  generator: ['ولك اشتغلت! كيف عملتها؟', 'It’s going! How did you do that?'],
  tap: ['يسلمو عمو. هي التقيلة.', 'Thanks, uncle. That’s the heavy one.'],
  laundry: ['الله يخليك يا ابني.', 'God keep you, son.'],
  dig: ['إي هيك. بدها بندورة هالأرض.', 'That’s it. This ground wants tomatoes.'],
  saw: ['ثبّت هون… إي، هيك.', 'Hold it there… yes, like that.'],
  smoke: ['اقعد خيّو. الليل طويل.', 'Sit, brother. The night’s long.'],
  hammer: ['ناولني المسمار… الله يعطيك العافية.', 'Pass me a nail… God give you strength.'],
};

export const HELP_LABELS = {
  ladder: ['أمسك السلّم', 'Hold the ladder'],
  ball: ['ارجع الطابة', 'Kick the ball back'],
  carry: ['احمل حجرة', 'Carry a block'],
  generator: ['جرّب الحبل', 'Try the cord'],
  tap: ['احمل البيدون', 'Carry a can'],
  laundry: ['امسك السلّة', 'Hold the basket'],
  dig: ['احفر شوي', 'Dig a little'],
  saw: ['ثبّت اللوح', 'Steady the plank'],
  smoke: ['اقعد معه', 'Sit with him'],
  hammer: ['ناوله مسمار', 'Pass a nail'],
};

// Four neighbours with names, who turn up again later in the day. Which
// worker each is, by act and task; how they look; and what they say when
// Sami passes them again: one line if he once lent them a hand, another if not.
export const NEIGHBOURS = {
  act1: { dig: 'khalil', hammer: 'imad', saw: 'samir', ball: 'hamoudi' },
  act2w: { tap: 'hamoudi' },
  act3w: { generator: 'imad', smoke: 'samir' },
  act4: { dig: 'khalil', tap: 'hamoudi' },
};

export const NAMES = {
  khalil: ['أبو خليل', 'Abu Khalil'],
  imad: ['أبو عماد', 'Abu Imad'],
  samir: ['أبو سمير', 'Abu Samir'],
  hamoudi: ['حمّودي', 'Hamoudi'],
};

export const LOOKS = { khalil: 'man', imad: 'man3', samir: 'man2', hamoudi: 'boy' };

export const REMEMBER = {
  khalil: {
    act4: {
      yes: ['صباح الخير يا ابني. شايف؟ زرعنا البندورة مطرح ما حفرتلي مبارح.', 'Morning, son. See? We planted the tomatoes where you dug for me yesterday.'],
      no: ['صباح الخير. بكّير صاحي… الله يكون معك.', 'Morning. Up early… God be with you.'],
    },
  },
  imad: {
    act3w: {
      yes: ['إنت يلي ناولتني المسامير العصر! الشبّاك صمد، الحمد لله.', 'You’re the one who passed me nails this afternoon! The window held, thank God.'],
      no: ['مسا الخير. دير بالك بالزاروب التحتاني.', 'Evening. Mind yourself in the lower lane.'],
    },
  },
  samir: {
    act3w: {
      yes: ['الحطب يلي نشرناه سوا… طبخت عليه أم سمير. تعال، اقعد شوي.', 'The wood we sawed together… Um Samir cooked on it. Come, sit a while.'],
      no: ['ما عم تنام إنت كمان؟ ما حدا نايم الليلة.', 'Can’t sleep either? Nobody’s sleeping tonight.'],
    },
  },
  hamoudi: {
    act2w: {
      yes: ['عمو! أنا حمّودي، تبع الطابة!', 'Uncle! It’s me, Hamoudi, with the ball!'],
      no: ['عمو، في مي بالحنفية اليوم.', 'Uncle, there’s water in the tap today.'],
    },
    act4: {
      yes: ['عمو! خبّيت الطابة بالبيت، ما بدي ياها تضيع.', 'Uncle! I hid the ball at home. I don’t want to lose it.'],
      no: ['صباح الخير عمو.', 'Morning, uncle.'],
    },
  },
};
