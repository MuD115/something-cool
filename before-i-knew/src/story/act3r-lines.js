// Act 3, Retrieval: The Night. Parts 1 (the negotiation) and 2 (the
// dangerous route). Lines from script/act3.md are final: Damascus dialect
// (the soldiers with a coastal accent), with the English. Gameplay barks the
// script doesn't cover are placeholders, marked `draft: true`; the dialogue
// log tags those "[draft]". The code only ever refers to lines by key.
//
// Officer Maher follows the revised script: no sympathy, no photograph. A
// regime officer who sells passage and bodies, as the checkpoints did.

export const WHO = {
  sami: ['سامي', 'Sami'],
  soldier: ['صوت جندي', 'Soldier’s voice'],
  s1: ['جندي', 'Soldier'],
  maher: ['الضابط ماهر', 'Officer Maher'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // ------------------------------------------------ 3A-1: the approach --
  torch_tip: s(null, 'الأرض قدّامي ما بتنشاف. شوية ضو، وبسرعة.', 'I can’t see the ground ahead. A little light, and quickly.', 'examine', 4),
  ground: s(null, 'ردم. قزاز. طرف حفرة.', 'Rubble. Glass. The edge of a crater.', 'examine', 3.4),
  torch_off: s(null, 'بطفّيه. الضو بيجيب الرصاص.', 'I switch it off. Light draws fire.', 'examine', 3.4),
  no_crouch: s(null, 'لا. واقف. لازم يشوفوا القماشة.', 'No. Upright. They have to see the cloth.', 'examine', 3.4),
  shout_1: s('soldier', 'مين هاد؟! وقّف!', 'Who’s that?! Stop!', 'shout', 2.8),
  sami_1: s('sami', 'مدني! مدني! عندي قماشة بيضا! بدي احكي مع الضابط!', 'Civilian! Civilian! I have a white cloth! I want to speak with the officer!', 'shout', 4.5),
  shout_2: s('soldier', 'ارفع إيديك! ضل واقف!', 'Raise your hands! Stay where you are!', 'shout', 3),
  s1_tell: s('s1', 'خبّر الضابط.', 'Tell the officer.', '', 2.4),

  // ------------------------------------------------- 3A-2: Officer Maher --
  m_1: s('maher', 'شو بدك؟', 'What do you want?', '', 2.4),
  sa_1: s('sami', 'في جثة بالشارع. صاحبي. بدي جيبو.', 'There’s a body in the street. My friend. I want to bring him back.', '', 4),
  m_2: s('maher', 'صاحبك؟ مين كان صاحبك؟', 'Your friend? Who was your friend?', '', 3),
  sa_2: s('sami', 'اسمو أحمد. كان معلّم.', 'His name was Ahmad. He was a teacher.', '', 3),
  m_3: s('maher', 'كلهن معلمين. أو أطباء. أو صحفيين. ما حدا بيقول إنو كان مسلّح.', 'They’re all teachers. Or doctors. Or journalists. No one ever says he was armed.', '', 5.5),
  sa_3: s('sami', 'لأنو ما كان مسلّح. كان يعلّم ولاد عربي بقبو مدرسة.', 'Because he wasn’t armed. He was teaching children Arabic in a school basement.', '', 5),
  m_4: s('maher', 'بقبو مدرسة. وين؟', 'In a school basement. Where?', '', 2.8),
  sa_4: s('sami', 'بالحارة الشرقية.', 'In the eastern quarter.', '', 2.6),
  m_5: s('maher', 'والمسلحين يلي بالحارة الشرقية، مين بيعلّمهن؟', 'And the militants in the eastern quarter, who teaches them?', '', 4.5),
  sa_5: s('sami', 'صاحبي كان يعلّم ولاد عمرهن تمان سنين. اسماءهن: رامي، سارة، يوسف، ليلى، عمر. بدك كمّل؟', 'My friend taught children aged eight. Their names: Rami, Sara, Youssef, Layla, Omar. Shall I go on?', '', 7),
  m_6: s('maher', 'قعود.', 'Sit down.', '', 2),

  // ---------------------------------------------------- beat 1: terms --
  m_7: s('maher', 'بدك تجيب الجثة.', 'You want to retrieve the body.', '', 2.8),
  sa_7: s('sami', 'إي.', 'Yes.', '', 1.6),
  m_8: s('maher', 'ليش؟', 'Why?', '', 1.6),
  sa_8: s('sami', 'لأنو لازم يندفن. أمو بدها تدفنو.', 'Because he needs to be buried. His mother wants to bury him.', '', 4),
  m_9: s('maher', 'أمو. هي كمان بالحصار؟', 'His mother. She’s in the siege too?', '', 3),
  sa_9: s('sami', 'إي.', 'Yes.', '', 1.6),
  m_10: s('maher', 'ليش ما طلعت؟', 'Why didn’t she leave?', '', 2.4),
  sa_10: s('sami', 'لأنو هاد بيتها.', 'Because this is her home.', '', 2.8),
  m_11: s('maher', 'بتعرف شو بيصير لو سمحتلك تاخد الجثة؟ رح يقولوا عني إنّي عم بساعد إرهابيين. رح يكون في تحقيق. يمكن يبعتوني ع خط تاني، واحد ما في رجعة منو.', 'You know what happens if I let you take the body? They’ll say I’m helping terrorists. There’ll be an investigation. They might send me to another front, one you don’t come back from.', '', 9),

  // --------------------------------------- beat 2: teacher and soldier --
  sa_12: s('sami', 'أحمد ما كان إرهابي. كان يعلّم ولاد قواعد عربي.', 'Ahmad wasn’t a terrorist. He taught children Arabic grammar.', '', 4),
  m_12: s('maher', 'والمظاهرات؟', 'And the protests?', '', 2.2),
  sa_13: s('sami', 'المظاهرات كانت سلمية.', 'The protests were peaceful.', '', 2.8),
  m_13: s('maher', 'سلمية. وبعدها؟', 'Peaceful. And after?', '', 2.6),
  sa_14: s('sami', 'أحمد ما حمل سلاح بحياتو.', 'Ahmad never carried a weapon in his life.', '', 3.2),
  m_14: s('maher', 'وإنت؟', 'And you?', '', 1.8),
  sa_15: s('sami', 'أنا مهندس. بصلّح مواسير مي.', 'I’m an engineer. I fix water pipes.', '', 3),
  m_15: s('maher', 'مهندس. مواسير مي.', 'An engineer. Water pipes.', '', 2.6),

  // ------------------------------------------------- beat 3: the price --
  m_16: s('maher', 'حلوة. أصلية؟', 'Nice. Is it real?', '', 2.4),
  sa_16: s('sami', 'هي لأحمد.', 'It’s Ahmad’s.', '', 2),
  m_17: s('maher', 'أحمد ما عاد بدّو ياها.', 'Ahmad doesn’t need it any more.', '', 3),
  m_18: s('maher', 'هون ما في شي ببلاش. لا الطحين، ولا الدوا، ولا الجثث. قلّي شو معك.', 'Nothing here is free. Not flour, not medicine, not bodies. Tell me what you’ve got.', '', 6),

  // ------------------------------------------------------ G1: dignity --
  g1_1: s('sami', 'اليوم شفت ولاد عم ياكلوا علف. شفت ولاد عم يجمّعوا حديد ليشتروا خبز. أحمد كان يعلّمهن يقروا. ما بطلب منك شي غير إنو يندفن.', 'Today I saw children eating animal feed. I saw children collecting scrap metal to buy bread. Ahmad was teaching them to read. I’m not asking you for anything except that he’s buried.', '', 10),
  g1_2: s('maher', 'حكي حلو. الحكي ما بيشتري شي.', 'Nice speech. Speeches don’t buy anything.', '', 3.6),
  g1_3: s('maher', 'هي بتكفّي. عشرين دقيقة قبل الفجر. إذا ما شافك حدا من شبابي، ما كنت هون. إذا شافوك، مش شغلتي.', 'That’ll do. Twenty minutes before dawn. If none of my men see you, you were never here. If they see you, it’s not my business.', '', 8),

  // -------------------------------------------------------- G2: anger --
  g2_1: s('sami', 'شو بدك؟ ندفع لتندفن الناس؟ عم تجوّعوا ولاد! عم ترموا براميل ع بيوت! وإنت قاعد هون عم تشرب شاي وتبيع جثث؟', 'What do you want? Pay you so people can be buried? You’re starving children! You’re dropping barrels on houses! And you sit here drinking tea, selling bodies?', 'shout', 8.5),
  g2_2: s('maher', 'آخر واحد حكى هيك رجّعناه بكيس. إنت محظوظ إني تعبان الليلة.', 'The last man who talked like that, we sent back in a bag. You’re lucky I’m tired tonight.', '', 5.5),
  g2_3: s('maher', 'بالفجر. تنين بس، وخمس دقايق. والقنّاص مش تبعي. إذا رمى، هاي إرادة الله.', 'At dawn. Two men only, and five minutes. The sniper isn’t mine. If he fires, that’s God’s will.', '', 7),

  // --------------------------------------------------------- G3: deal --
  g3_1: s('sami', 'بقدر ساعدك بشي.', 'I can help you with something.', 'whisper', 2.6),
  g3_2: s('maher', 'شو عندك؟', 'What do you have?', '', 2),
  g3_3: s('sami', 'أنا بعرف شبكة المي تبعت هالمنطقة. كل أنبوب، كل محبس، كل خط. إذا بدك تقطع المي ع حي معيّن، أو توصّلها، أنا بقدر قلّك من وين.', 'I know the water network of this area. Every pipe, every valve, every line. If you want to cut the water to a specific block, or reconnect it, I can tell you where.', '', 9),
  g3_4: s('maher', 'الشبكة المحلية. المحابس الرئيسية.', 'The local network. The main valves.', '', 3.2),
  g3_5: s('sami', 'إي.', 'Yes.', '', 1.8),
  g3_6: s('maher', 'أعطيني خريطة. ما بدها تكون كاملة، بس المحابس الرئيسية يلي بتتحكّم بالحارة الجنوبية.', 'Give me a map. It doesn’t have to be complete, just the main valves that control the southern quarter.', '', 6),
  g3_7: s('maher', 'خود صاحبك. الليلة. هلّق.', 'Take your friend. Tonight. Now.', '', 3.2),
  g3_after: s(null, 'رسمتلو المحابس. إيدي كانت ثابتة. بطني لا.', 'I drew him the valves. My hand was steady. My stomach wasn’t.', 'examine', 5),

  // --------------------------------------------- 3B-1: the building --
  building: s(null, 'ست طوابق، ونصها ع الأرض. أنا مهندس. بعرف إنو ما لازم كون هون.', 'Six storeys, and half of it on the ground. I’m an engineer. I know I shouldn’t be in here.', 'examine', 5.5),
  dark: s(null, 'عتمة. بدّي الكشّاف.', 'Dark. I need the torch.', 'examine', 2.8),
  table: s(null, 'طاولة محطوط عليها صحون. كانوا عم يتعشّوا، أو رايحين يتعشّوا. ما رجعوا.', 'A table with plates set on it. They were eating dinner, or about to. They didn’t come back.', 'examine', 6),
  stove: s(null, 'صوبة من تنكة. الحيط فوقها أسود. كانوا يحرقوا نايلون ليطبخوا. الريحة لسّا بالحيطان.', 'A stove made from a tin. The wall above it is black. They burned plastic to cook. The smell is still in the walls.', 'examine', 5),
  drawing: s(null, 'رسمة ولد ع الحيط. بيت، وشمس، وأربعة ماسكين إيدين بعض.', 'A child’s drawing on the wall. A house, a sun, four people holding hands.', 'examine', 5),
  slab: s(null, 'بلاطة سقف واقعة ع الدرج. بطلع من فوقها، ع الحديد.', 'A ceiling slab has fallen across the stairs. I’ll climb over it, on the rebar.', 'examine', 4.5),
  slab_holds: s(null, 'تحرّكت. وثبتت.', 'It shifted. And held.', 'examine', 2.6),
  wardrobe: s(null, 'خزانة ع جنبها. بمرق من تحتها.', 'A wardrobe on its side. I’ll get under it.', 'examine', 3.2),
  lowceil: s(null, 'السقف نازل لنص الإجر. ع بطني.', 'The ceiling has come down to knee height. On my belly.', 'examine', 3.6),
  gap: s(null, 'الدرج راح. بس البسطة باينة فوق. بنطّ وبتمسّك فيها.', 'The stairs are gone. But the landing is there, above. I jump and grab hold.', 'examine', 4),
  heights: s(null, 'خطوط طول ع باب. ولد أو بنت، كل سنة خط جديد. ٢٠٠٩. ٢٠١٠. ٢٠١١. ما في ٢٠١٢.', 'Height markings on a door frame. A boy or girl, a new line each year. 2009. 2010. 2011. There is no 2012.', 'examine', 7),
  step_gives: s(null, 'الدرجة انكسرت تحتي. تمسّكت بالدرابزين.', 'The step broke under me. I caught the rail.', 'examine', 3.6),

  // --------------------------------------------- 3B-2: the view --
  view: s(null, 'من هون بشوف الشارع كلو. الحاجز، النور، الحرام يلي عالأرض. ومن هون، بشوف يلي شافو القنّاص. شارع فاضي وشخص عم يمشي. من هالعلو، كل إنسان بيصير نقطة.', 'From here I can see the whole street. The checkpoint, the light, the blanket on the ground. And from here, I see what the sniper saw. An empty street and a person walking. From this height, every person becomes a dot.', 'examine', 11),
  balcony: s(null, 'البلكون مكشوف. بضل واطي.', 'The balcony is exposed. I stay low.', 'examine', 3),
  pipe: s(null, 'قسطل المزراب. بيطقطق، بس بيحمل.', 'The drainpipe. It creaks, but it holds.', 'examine', 3.4),
  alley: s(null, 'زاروب ورا البنايات. من هون عالشارع عشرين متر.', 'An alley behind the buildings. From here to the street, twenty metres.', 'examine', 4),
  moon: s(null, 'القمر كاشف كل شي. ع بطني، وع مهلي.', 'The moon shows everything. On my belly, and slowly.', 'examine', 3.6),
  miss_1: s(null, 'طلقة. شبر عن راسي.', 'A shot. A hand’s width from my head.', 'examine', 2.8),
  miss_2: s(null, 'طلقة. القمر عليّي. لازم انبطح.', 'A shot. The moon is on me. I have to get down.', 'examine', 3.2),
  blanket: s(null, 'ما برفع الحرام. بمسك أطرافو.', 'I don’t lift the blanket. I take its edges.', 'examine', 3.6),
  drag: s(null, 'تقيل. أتقل من أي شي حملتو.', 'Heavy. Heavier than anything I’ve carried.', 'examine', 3.6),
};

// Title cards (scene intros, in Aref Ruqaa).
export const CARDS = {
  open: [['الليل وصل.', 'Night has arrived.'], ['بالحصار، الليل مش بس عتمة. الليل هوي المكان يلي بتطلع فيه الأشياء يلي الشمس بتخبّيها.', 'Under siege, night isn’t just darkness. Night is the place where the things the sun hides come out.']],
  after: [['الساعة عشرة بالليل.', 'Ten o’clock at night.'], ['والليل لسّا طويل.', 'And the night is still long.']],
};
