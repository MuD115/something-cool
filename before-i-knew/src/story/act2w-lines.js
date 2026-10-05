// Act 2: The Evening (العصرية), Path B: the Witness (طريق الشاهد), from
// Choice C2, "Who did this?". script/act2.md, scenes 2B-1 to 2B-3. Lines
// from the script are final (Damascus dialect, with the English). Barks the
// script doesn't cover are placeholders, marked `draft: true`.

export const WHO = {
  sami: ['سامي', 'Sami'],
  umSaid: ['أم سعيد', 'Um Said'],
  baker: ['أبو فراس', 'Abu Firas'],
  abu: ['أبو يزن', 'Abu Yazan'],
  woman: ['امرأة', 'A woman'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // the quarter, on the way
  quiet: d(null, 'الحارة الجنوبية ساكتة. الناس فاتوا لجوّا من بعد القنّاص.', 'The southern quarter has gone quiet. People went indoors after the sniper.', 'examine', 5),
  directions: d('woman', 'أم سعيد؟ البيت التالت، الباب الأخضر. هيي يلي طلعت عليه.', 'Um Said? The third house, the green door. She’s the one who went out to him.', 'whisper', 5),

  // 2B-1a: Um Said
  umSaid: s('sami', 'أم سعيد؟', 'Um Said?', '', 2),
  comeIn: s('umSaid', 'ادخل. ما تضل بالشارع.', 'Come in. Don’t stay in the street.', '', 3),
  wentOut: s('sami', 'إنتي طلعتي عليه.', 'You went out to him.', '', 2.6),
  yes: s('umSaid', 'إي.', 'Yes.', '', 1.6),
  why: s('sami', 'ليش؟ القنّاص كان هناك.', 'Why? The sniper was there.', '', 3),
  wrong: s('umSaid', 'لأنو ما بيصير يضل هيك بالشمس. حرام. ما حدا بيستاهل يضل مكشوف هيك.', 'Because he can’t stay like that in the sun. It’s wrong. No one deserves to lie there exposed like that.', '', 7),
  whatSaw: s('sami', 'شو... شو شفتي؟', 'What... what did you see?', 'whisper', 3),
  saw: s('umSaid', 'كان ماشي عشارع المدرسة. وحدو. ما كان راكض — كان ماشي عادي. سمعت الطلقة وبعدها شفتو. ما حسّ بشي.', 'He was walking down School Street. Alone. He wasn’t running — just walking normally. I heard the shot and then I saw him. He didn’t feel anything.', '', 9),
  bag: s('umSaid', 'كانت شنطتو وقعت جنبو. سحبتها لمّا طلعت. هون.', 'His bag had fallen next to him. I pulled it away when I went out. It’s here.', '', 5.5),
  bagLook: s(null, 'شنطة أحمد. دفاتر الولاد يلي كان عم يصحّحها. قلم أزرق. وكاميرا — كان يصوّر فيها كل شي. قال: "لازم حدا يحكي قصتنا."', 'Ahmad’s bag. The children’s exercise books he was marking. A blue pen. And a camera — he used it to photograph everything. He said: “Someone has to tell our story.”', 'examine', 10),
  takeIt: s('umSaid', 'خودها. هيي إلك أكتر مني.', 'Take it. It’s yours more than mine.', '', 3.5),
  camera: s(null, 'كاميرا أحمد. شاشة مكسورة بس لسا شغّالة. آخر صورة فيها: أولاد بالصف، عم يكتبوا بدفاترهن.', 'Ahmad’s camera. Cracked screen but still working. Last photo on it: children in class, writing in their exercise books.', 'examine', 8),
  mother: s('umSaid', 'أمو بتعرف؟', 'Does his mother know?', '', 2.6),
  dontKnow: s('sami', 'ما بعرف.', 'I don’t know.', 'whisper', 2.4),
  tellHer: s('umSaid', 'لازم حدا يقلّها. ما بيصير تسمع من الشارع.', 'Someone has to tell her. She can’t hear it from the street.', '', 5),

  // 2B-1b: the baker
  oven: s(null, 'فرن طين مبني من حجار وباطون. أبو فراس بناه بإيدو. بيخبز ست أرغفة كل ساعة. الطحين مش طحين — علف حيوانات مطحون. الخبز رمادي وخشن. بس ساخن.', 'A clay oven built from stones and concrete. Abu Firas built it by hand. He bakes six loaves an hour. The flour isn’t flour — it’s ground animal feed. The bread is grey and rough. But it’s hot.', 'examine', 10),
  eat: s('baker', 'كل. إنت شكلك ما أكلت اليوم.', 'Eat. You look like you haven’t eaten today.', '', 3.4),
  thanks: s('sami', 'شكراً يا عمّو.', 'Thank you, uncle.', '', 2.2),
  price: s('baker', 'بتعرف قديش كان سعر كيلو الطحين قبل الحصار؟ خمسين ليرة. هلّق — لو بتلاقي طحين حقيقي — عشرين ألف. وهاد مش طحين. هاد أكل بقر.', 'You know how much a kilo of flour cost before the siege? Fifty liras. Now — if you can find real flour — twenty thousand. And this isn’t flour. This is cow feed.', '', 10),
  fills: s('baker', 'بس بيشبع. وإذا بيشبع — بينفع.', 'But it fills you up. And if it fills you up — it’ll do.', '', 4),

  // 2B-2: the wall, and Choice E
  graffiti: s(null, 'رسمات ولاد ع الحيط. بيت وشمس وشجرة. طيّارة مرسومة بالأحمر. عائلة بتبتسم — محاطة بنار. تحتها بخط ولد: "بكرا أحلى."', 'Children’s drawings on the wall. A house, a sun, a tree. A helicopter drawn in red. A family smiling — surrounded by fire. Below it, in a child’s handwriting: “Tomorrow is more beautiful.”', 'examine', 10),
  scroll: d(null, 'صور أحمد. الولاد بالصف. بناية واقعة. ختيارة عم تعجن. عنب عالدالية. البلد من فوق سطح. حياة عادية، مصوّرة بعناية.', 'Ahmad’s photos. The children in class. A collapsed building. An old woman kneading dough. Grapes on a vine. The town from a rooftop. Ordinary life, recorded with care.', 'examine', 9),
  // E2: listening (barks for the quiet path)
  son: d('woman', 'ابني طلع قبل الحصار بشهر. قال راجع بعد أسبوع.', 'My son left a month before the siege. He said he’d be back in a week.', '', 5),
  carry: d('baker', 'تعا ساعدني بهالكيس.', 'Come and help me with this sack.', '', 3),

  // 2B-3: the lighter
  sami: s('abu', 'سامي.', 'Sami.', '', 1.6),
  uncle: s('sami', 'عمّو.', 'Uncle.', '', 1.6),
  gave: s('abu', 'أحمد أعطاني هدول من زمان. قلّي: "إذا صار شي، أعطيهن لسامي."', 'Ahmad gave me these a while ago. He told me: “If something happens, give them to Sami.”', '', 7),
  lighter: s(null, 'ولّاعة أحمد. زيبو قديمة. ما كان يدخّن — كان يستعملها يولّع الشمعات بالصف.', 'Ahmad’s lighter. An old Zippo. He didn’t smoke — he used it to light the candles in the classroom.', 'examine', 7),
  stillDoesnt: s('abu', 'أمو لسا ما بتعرف.', 'His mother still doesn’t know.', 'whisper', 3.6),
};

export const CARDS = {
  open: [['العصرية', 'The Evening'], ['طريق الشاهد', 'The Witness']],
  close: [['الساعة سبعة. الشمس عم تغيب.', 'Seven o’clock. The sun is setting.'], ['الليل بيجي. والليل بالحصار ما بيشبه أي ليل تاني.', 'Night is coming. And a night under siege is like no other night.']],
};
