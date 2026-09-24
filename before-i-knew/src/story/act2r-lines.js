// Act 2, Retrieval: every spoken and examined line, by key.
//
// Lines from script/act2.md (Path A) are final: Damascus dialect, with the
// English subtitle. A few gameplay barks the script doesn't cover (the
// sniper lanes, the warning shots, the crawl) are placeholders, marked
// `draft: true`; the dialogue log tags those "[draft]". To replace one,
// change its `ar` and `en` and delete the flag. The code only ever refers
// to lines by key.
//
// Choice labels, prompts and objectives are not here: they're in Modern
// Standard Arabic, in act2r.js.
//
// who: a speaker key from WHO, or null for Sami's examine and item text.
// style: '' | 'examine' | 'item' | 'radio' | 'shout' | 'whisper'.

export const WHO = {
  sami: ['سامي', 'Sami'],
  abu: ['أبو يزن', 'Abu Yazan'],
  radio: ['لاسلكي', 'Walkie-talkie'],
  medic: ['المسعف', 'The medic'],
  man: ['الرجل', 'The man'],
  tyre: ['شاب الدولاب', 'The man with the tyre'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // ------------------------------------- 2A-1: the southern streets --
  radio_west: s('radio', '...حركة عالحاجز الغربي... احترسوا...', '...movement at the western checkpoint... be careful...', 'radio', 3.4),

  // the sniper lanes (gameplay barks, not in the script)
  lane_intro: d(null, 'فتحة بين بنايتين. من هون بيشوف القنّاص الشارع.', 'A gap between two buildings. From here the sniper can see the street.', 'examine', 5),
  lane_light: d(null, 'وين في شمس، في عين.', 'Where the sun gets through, so does his eye.', 'examine', 3.6),
  lane1_wall: d(null, 'حيط البناية اللي انهدّت. ما ضل منها غير هالحيط، لنص الإجر.', 'All that’s left of the flattened building: this wall, waist-high.', 'examine', 4.5),
  warn_1: d(null, 'الطلقة فاتت بالحيط قدّامك. تحذير.', 'The round went into the wall ahead of you. A warning.', 'examine', 4),
  warn_2: d(null, 'عم يشوفك.', 'He can see you.', 'examine', 3),
  warn_3: d(null, 'مرة تانية. لازم تستنّى.', 'Again. You have to wait.', 'examine', 3),
  lane2_car: d(null, 'سيارة محروقة. بتغطّي نص الطريق بس.', 'A burnt-out car. It only covers half the way.', 'examine', 4.5),
  lane2_hint: d(null, 'اسمع اللاسلكي. أو طلّع بالمراية.', 'Listen to the radio. Or look with the mirror.', 'examine', 4),
  radio_watch: d('radio', '...عالشبّاك... لسا عالشبّاك...', '...at the window... still at the window...', 'radio', 2.6),
  radio_away: d('radio', '...فات لجوّا... هلّق...', '...he’s gone inside... now...', 'radio', 2.6),
  mirror_lane: d(null, 'بالمراية: البناية اللي عليها العلم. لمعة بالشبّاك.', 'In the mirror: the building with the flag. A glint in the window.', 'examine', 4.5),
  mirror_away: d(null, 'الشبّاك فاضي. هلّق.', 'The window is empty. Now.', 'examine', 3),
  crawl: d(null, 'فتحة بالحيط، قد الكتاف. الباطون فوقها لسا معلّق.', 'A gap in the wall, shoulder-width. The concrete above it is still hanging.', 'examine', 4.5),
  lane3_tyre: d('tyre', 'استنّى الدخنة. لمّا تغطّي، روح.', 'Wait for the smoke. When it covers, go.', '', 4),
  lane3_smoke: d(null, 'دولاب عم يحترق. حدا ولّعو قصداً.', 'A tyre burning. Someone lit it on purpose.', 'examine', 4),

  // -------------------------------------- 2A-1b: the field hospital --
  hospital: s(null, 'نقطة طبية. طبيب واحد ومسعف. بداوو كل شي من جروح القنّاص لحالات الجفاف. ما عندهن بنج كافي. ساعات بيضطرّوا يخيّطو بلا بنج.', 'A medical point. One doctor and a paramedic. They treat everything from sniper wounds to dehydration. They don’t have enough anaesthetic. Sometimes they stitch without it.', 'examine', 8.5),
  medic_1: s('medic', 'وين رايح يا أخي؟ الجنوبي ما في فيه شي.', 'Where are you going, brother? There’s nothing in the south.'),
  medic_2: s('sami', 'صاحبي هناك.', 'My friend is there.', '', 2.6),
  medic_3: s('medic', 'أحمد؟', 'Ahmad?', '', 2.4),
  medic_4: s('medic', 'الله يرحمو. ما قدرنا نوصلّو.', 'God rest his soul. We couldn’t reach him.', '', 4),
  medic_5: s('medic', 'الشارع مكشوف. ما حدا بيقدر يقطع من هناك.', 'The street is exposed. No one can cross there.'),
  medic_6: s('sami', 'بدي شوف.', 'I need to see.', '', 2.4),

  // ------------------------------------- 2A-2: the no-man's-land --
  shape: s(null, 'شكل مغطّى بحرام، وسط الشارع. لا بقدر وصلّو، ولا بقدر بعد نظري عنو.', 'A shape covered with a blanket, in the middle of the street. I can’t reach him, and I can’t look away.', 'examine', 6.5),
  man_1: s('man', 'إنت سامي؟ صاحب أحمد؟', 'Are you Sami? Ahmad’s friend?', 'whisper', 3.2),
  man_2: s('sami', 'إيه.', 'Yeah.', '', 1.8),
  man_3: s('man', 'أم سعيد هيي يلي غطّتو. طلعت عليه وهي عارفة إنو القنّاص عم يرصدها. حطّت الحرام وبعدين رجعت. ما رماها. ما بعرف ليش.', 'Um Said is the one who covered him. She went out knowing the sniper was watching. She put the blanket over him and came back. He didn’t shoot her. I don’t know why.', 'whisper', 10),
  man_4: s('man', 'ما فينا نجيبو. الشارع مكشوف. القنّاص بالمبنى يلي فيه العلم، عالتلّة. بيشوف كل شي.', 'We can’t get him. The street is exposed. The sniper is in the building with the flag, on the hill. He can see everything.', 'whisper', 7),

  // ------------------------------------------ D1: the white cloth --
  sheet: d(null, 'شرشف منشور عالدرابزين. أبيض، أو قريب.', 'A sheet hanging on a balcony rail. White, or near enough.', 'examine', 4),
  rail: d(null, 'سكّة برداية، حديد.', 'A curtain rail. Metal.', 'examine', 3),
  cloth_item: s(null, 'قماشة بيضا، علامة هدنة. ما بتحمي من الرصاص، بس بتحمي من القرار إنو يرمي.', 'White cloth, a truce signal. It doesn’t stop bullets, but it stops the decision to fire.', 'item', 6.5),
  cloth_1: s('man', 'شو عم تساوي؟', 'What are you doing?', 'whisper', 2.4),
  cloth_2: s('sami', 'بدي احكي معهن.', 'I’m going to talk to them.', '', 2.8),
  cloth_3: s('man', 'مجنون. رح يرموك.', 'You’re mad. They’ll shoot you.', 'whisper', 3),
  cloth_4: s('sami', 'يمكن. ويمكن لا.', 'Maybe. Maybe not.', '', 3.2),

  // ------------------------------------------ D2: the back route --
  back_1: s('man', 'هالبناية مدمّرة من جوا. الطابق التالت ساقط. إذا بدك تطلع، خلّي بالك، الباطون لسا عم ينزل.', 'That building’s destroyed inside. The third floor has collapsed. If you want to go up, be careful. The concrete’s still falling.', 'whisper', 7.5),
  back_2: s('sami', 'في طريق.', 'There’s a way.', '', 2.4),

  // --------------------------------------- 2A-3: Abu Yazan's gift --
  abu_1: s('abu', 'سامي.', 'Sami.', '', 2.2),
  abu_2: s('sami', 'عمّو، شو عم تساوي هون؟', 'Uncle, what are you doing here?'),
  abu_3: s('abu', 'خود هاي. كانت مع أحمد. أعطاني ياها قبل فترة، قلّي احتفظ فيها بحال صار شي.', 'Take this. It was Ahmad’s. He gave it to me a while ago, told me to keep it in case something happened.', '', 7),
  lighter: s(null, 'ولّاعة أحمد. زيبو قديمة. ما كان يدخّن، كان يستعملها يولّع الشمعات بالصف.', 'Ahmad’s lighter. An old Zippo. He didn’t smoke. He used it to light the candles in the classroom.', 'item', 6.5),
  abu_4: s('abu', 'وخود هاد كمان.', 'And take this too.', '', 2.6),
  journal: s(null, 'دفتر أحمد. دروس قواعد، قصائد منقولة، ملاحظات بخط صغير. آخر صفحة مكتوبة فيها: "بكرا بدي علّمهن قصيدة محمود درويش."', 'Ahmad’s journal. Grammar lessons, copied poems, notes in small handwriting. The last written page reads: “Tomorrow I’ll teach them a Mahmoud Darwish poem.”', 'item', 8.5),
  abu_5: s('abu', 'روح. بس ارجع.', 'Go. But come back.', '', 3.2),

  // --------------------------------------------------------- tools --
  mirror_plain: s(null, 'شقفة مراية. بتشوف فيها حالك.', 'A shard of mirror. You can see yourself in it.', 'examine', 3),
  radio_plain: s('radio', '...الموجة ٣...', '...channel 3...', 'radio', 2),
  cloth_wrong: d(null, 'مو هون.', 'Not here.', 'examine', 2),
  lighter_use: d(null, 'الولّاعة بتشعل من أول مرة.', 'The lighter catches first time.', 'examine', 3),
};

// Title cards (scene intros, in Aref Ruqaa).
export const CARDS = {
  open: [['الساعة أربعة ونص.', 'Half past four.'], ['الشمس عم تنزل، والسؤال الوحيد: شو بدك تساوي هلّق؟', 'The sun is going down, and the only question: what are you going to do now?']],
  close: [['الساعة سبعة. الشمس عم تغيب.', 'Seven o’clock. The sun is setting.'], ['الليل بيجي. والليل بالحصار ما بيشبه أي ليل تاني.', 'Night is coming. And a night under siege is like no other night.']],
};
