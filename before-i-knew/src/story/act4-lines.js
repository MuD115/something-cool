// Act 4: Dawn (الفجر), 4 am to 6:30, 15 August 2014. Lines from
// script/act4.md are final (Damascus dialect, with the English). Barks the
// script doesn't cover are placeholders, marked `draft: true`; the dialogue
// log tags those "[draft]". The code refers to lines by key.

export const WHO = {
  sami: ['سامي', 'Sami'],
  abu: ['أبو يزن', 'Abu Yazan'],
  raed: ['رائد', 'Raed'],
  boy: ['الولد', 'The boy'],
  radio: ['لاسلكي', 'Radio'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // ---- 4A: the descent, the dawn street
  morning: s(null, 'أول ضو. الصبح بالحصار إلو طعم — مش فرح ومش حزن. بس إنك لسا هون. لسا عم تتنفس. هاد بيكفي ليكون بداية.', 'First light. Morning in the siege has a taste — not happiness, not sadness. Just that you’re still here. Still breathing. That’s enough to be a beginning.', 'examine', 9),
  pots: d(null, 'طناجر عالغاز. حدا كان عم يطبخ لمّا تركوا.', 'Pots on the stove. Someone was cooking when they left.', 'examine', 4),
  bike: d(null, 'بسكليت ولد، على جنبو.', 'A child’s bicycle, on its side.', 'examine', 3.5),
  laundry: d(null, 'غسيل عالبلكون من شهور. الشمس أكلت لونو.', 'Washing on the balcony for months. The sun has eaten its colour.', 'examine', 4),
  boys: d(null, 'رايحين عالدرس. بعدهن ما بيعرفوا.', 'Going to their lesson. They don’t know yet.', 'whisper', 4),

  // ---- 4B: the junction, and Choice H
  junction: s(null, 'هون افترقنا. "بشوفك بالليل إن شاء الله." أربعتعشر ساعة من وقتها. أطول أربعتعشر ساعة بحياتي.', 'This is where we parted. “See you tonight, God willing.” Fourteen hours since then. The longest fourteen hours of my life.', 'examine', 8.5),
  hSouth: s(null, 'الجنوب. المكان يلي وقع فيه. في شي بعدو هنيك — الجثمان، أو الناس يلي غطّوه، أو بس المكان. لازم روح.', 'South. The place where he fell. Something is still there — the body, or the people who covered him, or just the place. I need to go.', 'examine', 7.5),
  hTunnels: s(null, 'حدود البلد. الأنفاق. في ناس بتطلع من هون. مش هروب — بس... مش هون. مكان تاني. أي مكان تاني.', 'The edge of town. The tunnels. People get out through there. Not running — just... not here. Somewhere else. Anywhere else.', 'examine', 7.5),
  hClassroom: s(null, 'الصف. صف أحمد. مدري ليش — إجريي عم تاخدني لهنيك. في شي ناطرني، أو أنا ناطرو.', 'The classroom. Ahmad’s classroom. I don’t know why — my feet are taking me there. Something is waiting, or I am.', 'examine', 7.5),

  // ---- Ending 1: the Witness
  photos: s(null, 'مية وثلاث صور. مية وثلاث لحظة ضلّت. كل صورة بتقول: هاد صار. هدول ناس كانوا هون. هاد مكان كان عامر.', 'A hundred and three photos. A hundred and three moments that lasted. Each one says: this happened. These people were here. This place was alive.', 'examine', 8.5),
  justice: s(null, 'ما رح تجيب عدالة. هالصور ما رح ترجّع أحمد ولا توقف الحصار ولا تخلّي العالم يهتم. بس إذا ضاعوا — إذا ما حدا شاف — بيصير كإنو ما صار شي. وصار. كل شي صار.', 'It won’t bring justice. These photos won’t bring Ahmad back or end the siege or make the world care. But if they’re lost — if no one sees — it’s as though nothing happened. And it did. All of it happened.', 'whisper', 11),
  lastSaw: s(null, 'هون كان آخر مرة شفتو. ما كنت عارف. ما كنت عارف إنو عم ودّعو.', 'This is where I last saw him. I didn’t know. I didn’t know I was saying goodbye.', 'examine', 6.5),

  // ---- Ending 2: the Last Farewell
  ready: d('abu', 'عشرين دقيقة. يلا، على مهل.', 'Twenty minutes. Come on. Slowly.', 'whisper', 3.6),
  readyAnger: d('abu', 'خمس دقايق، واتنين بس. ما في وقف.', 'Five minutes, and two of us only. No stopping.', 'whisper', 3.6),
  crackle: d('radio', '...', '...', 'radio', 1.6),
  shoes: d(null, 'صبّاطو. حدا حطّن جنب بعض.', 'His shoes. Someone set them side by side.', 'whisper', 4),
  recite: s('abu', 'اللهم اغفرلو وارحمو... وعافيه واعف عنو... اللهم أكرم نزلو... ووسّع مدخلو...', 'O God, forgive him and have mercy on him... pardon him and grant him well-being... honour the place where he arrives... and make his entrance wide...', 'whisper', 11),
  ifYouWant: s('abu', 'إذا بدّك تقول شي.', 'If you want to say something.', 'whisper', 3.4),
  poem1: s('sami', '"على هذي الأرض ما يستحق الحياة..."', '“On this earth, there is that which deserves life...”', '', 5),
  poem2: s('sami', '"تردّد أبريل، رائحة الخبز في الفجر، آراء امرأة في الرجال..."', '“April’s hesitation, the smell of bread at dawn, a woman’s opinion of men...”', '', 6.5),
  poem3: s('sami', '"كتابات أسخيلوس، أول الحب..."', '“The writings of Aeschylus, the beginning of love...”', '', 5),
  poem4: s('sami', '"عشب على حجر... أمهات تقفن على خيط ناي..."', '“Grass on a stone... mothers standing on a thread of flute-song...”', '', 6),
  poem5: s('sami', '"والخوف من ذكريات..."', '“And the fear of memories...”', 'whisper', 5),
  best: s('sami', 'كان أحسن واحد فينا. مش لأنو ما كان يخاف — كان يخاف متل ما كلنا منخاف. بس كان يضل يعلّم. كل يوم ينزل عالقبو ويفتح الدفاتر ويعلّم. هاد يلي كان.', 'He was the best of us. Not because he wasn’t afraid — he was afraid like we’re all afraid. But he kept teaching. Every day he’d go down to the basement and open the exercise books and teach. That’s who he was.', '', 12),
  grapes: s(null, 'العنب لسا أخضر. بيستوي بأيلول — بعد أسبوعين، تلاتة. إذا ضل حدا يقطفو. بيستوي فوق قبرو وبينزل وما حدا بياكلو وبيرجع تراب. أو بيجي حدا ويقطفو ويحطّو بصحن ويقول بسم الله. ما بعرف أيّا أحلى.', 'The grapes are still green. They’ll ripen in September — two weeks, three. If anyone’s left to pick them. They’ll ripen over his grave and fall and no one will eat them and they’ll become earth again. Or someone will come and pick them and put them on a plate and say bismillah. I don’t know which is more beautiful.', 'examine', 14),

  // ---- Ending 3: the Tunnel
  wall: s(null, 'كلمات محفورة بالحيط: "لا تنسونا." بخط حدا طالع من هون. ما بعرف مين كتبها ولا إمتى. بس هاد يلي كان بدّو يقولو: لا تنسونا.', 'Words scratched into the wall: “Don’t forget us.” In the handwriting of someone leaving. I don’t know who wrote them or when. But this is what they needed to say: don’t forget us.', 'examine', 9.5),
  threshold: s(null, 'في ناس بيطلعوا وبيحكوا وبيحملوا القصة معهن. وفي ناس بيضلّوا وبيكملوا. ما بعرف أيّا أنا. بس أعرف إنو إجريي واقفة هون — بين جوّا وبرّا — وما عم تقرر.', 'Some people leave and they speak and they carry the story with them. And some people stay and they carry on. I don’t know which I am. But I know my feet are standing here — between inside and outside — and they haven’t decided.', 'whisper', 11),

  // ---- Ending 4: the One Who Remains
  room: s(null, 'صف أحمد. ما تغيّر شي من إمبارح الصبح. اللوح مكتوب عليه درس بكرا — درس ما صار. الكراسي ناطرة. الطبشورة ناطرة. كل شي ناطرو ييجي، وما رح ييجي.', 'Ahmad’s classroom. Nothing has changed since yesterday morning. The board has tomorrow’s lesson on it — a lesson that never happened. The chairs are waiting. The chalk is waiting. Everything is waiting for him to come, and he’s not coming.', 'examine', 11),
  board: s(null, '"اكتب جملة عن يومك." هاد التمرين يلي كان بدّو يعطيهن ياه. شو كانوا رح يكتبوا ولاد الحصار عن يومهن؟ "اليوم أكلنا خبز من علف." "اليوم ما طلعنا عالشارع." "اليوم سمعنا قصف." جمل ما لازم يكتبها ولا ولد.', '“Write a sentence about your day.” The exercise he was going to give them. What would siege children write about their day? “Today we ate bread made from feed.” “Today we didn’t go outside.” “Today we heard shelling.” Sentences no child should have to write.', 'examine', 13),
  books: s(null, 'كراسيهن. كل واحد مكتوب عليه اسم بخط ولد. "حسن." "مريم." "عمر." "دعاء." أحمد كان يصحّح بالأحمر — بس تصحيحو لطيف. ما كان يحط غلط بكبير. كان يحط نجمة صغيرة حد الجمل الحلوة.', 'Their exercise books. Each labelled in a child’s hand. “Hassan.” “Maryam.” “Omar.” “Du’aa.” Ahmad corrected in red — but gently. He never wrote WRONG in big letters. He drew a small star next to the good sentences.', 'examine', 11),
  where: s('boy', 'أستاز أحمد وينو؟', 'Where is teacher Ahmad?', '', 3.4),
  comeIn: s('boy', 'تعوا. فوت.', 'Come in. Sit down.', '', 2.6),
};

// Title cards (in Aref Ruqaa).
export const CARDS = {
  open: [['الفجر.', 'Dawn.'], ['الليل أطول شي بالحصار. بس بيخلص.', 'The night is the longest thing in the siege. But it ends.']],
  // the last words of each ending, white on black
  final: {
    1: [['شهادة واحدة ما بتغيّر شي.', 'One testimony changes nothing.'], ['بس السكوت بيغيّر كل شي.', 'But silence changes everything.']],
    2: [['ما قدرت قلّو وداعاً.', 'I couldn’t say goodbye to him.'], ['بس قدرت جبتو لبيتو.', 'But I could bring him home.']],
    3: [['في ناس بتبقى وفي ناس بتمشي.', 'Some people stay and some people walk.'], ['مش كل مشي هروب.', 'Not every departure is flight.'], ['ومش كل بقاء شجاعة.', 'Not every staying is courage.']],
    4: [['الحياة مش بس إنك تضل عايش.', 'Life isn’t just staying alive.'], ['الحياة إنك تضل إنسان.', 'Life is staying human.']],
    5: [['ما خلصت القصة.', 'The story didn’t end.'], ['بس خلص الليل.', 'But the night did.']],
  },
  // the epilogue, every ending: one line at a time
  epilogue: [
    [['حصار الغوطة الشرقية استمر من ٢٠١٣ لـ ٢٠١٨.', 'The siege of Eastern Ghouta lasted from 2013 to 2018.']],
    [['أكثر من أربعمية ألف شخص عاشوا تحت الحصار.', 'More than four hundred thousand people lived under siege.']],
    [['الشخصيات متخيّلة. الحصار كان حقيقي.', 'The characters are fictional. The siege was real.']],
  ],
};

// Choice H, as roads.
export const CHOICE_H = [
  ['south', ['نحو الجنوب، نحو أحمد', 'South, towards Ahmad'], 'hSouth'],
  ['tunnels', ['نحو حدود البلد، نحو الأنفاق', 'To the edge of town, to the tunnels'], 'hTunnels'],
  ['classroom', ['نحو الحارة الشرقية، نحو صف أحمد', 'East, to Ahmad’s classroom'], 'hClassroom'],
];
