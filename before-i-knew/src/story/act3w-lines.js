// Act 3, Part 3: The Night Walk (المشي بالليل), 10 pm to midnight. Lines
// from script/act3.md are final (Damascus dialect, with the English).
// Barks the script doesn't cover are placeholders, marked `draft: true`; the
// dialogue log tags those "[draft]". The code refers to lines by key.

export const WHO = {
  sami: ['سامي', 'Sami'],
};

const s = (who, ar, en, style = '', dur = null) => ({ who, ar, en, style, dur });
const d = (...a) => ({ ...s(...a), draft: true });

export const LINES = {
  // Scene 3C-1: Moonlight streets
  ruin: s(null, 'بالليل البناية المدمّرة بتصير شي تاني. القمر بيعبّي الغرف المفتوحة بنور. كأنها بيوت أشباح — ساكنة بس مش فاضية.', 'At night the bombed building becomes something else. The moon fills the open rooms with light. Like ghost houses — inhabited but not occupied.', 'examine', 7),
  vine: s(null, 'نفس الدالية. بالليل الورق بيلمع. العنب لسا ما استوى. يمكن ما حدا رح يقطفو.', 'The same vine. At night the leaves shine. The grapes still aren’t ripe. Maybe no one will pick them.', 'examine', 6),
  quiet: d(null, 'ما في حدا بالشارع. بس أنا والقمر وصوت الزيز.', 'No one in the street. Just me, the moon and the crickets.', 'examine', 4.5),

  // Scene 3C-2: The cat returns
  cat_seen: d(null, 'إنتِ كمان سهرانة.', 'You’re up late too.', 'whisper', 3),
  cat_pocket: d(null, 'ما معي شي إلك. ولا لإلي.', 'I’ve got nothing for you. Or for me.', 'whisper', 3.6),

  // Scene 3C-3: The wedding
  music: d(null, 'في موسيقى. من تحت الأرض.', 'Music. From under the ground.', 'examine', 3.4),
  door: s(null, 'باب قبو. ورا الباب — موسيقى. عرس. ناس عم تتزوّج وسط الحصار. الحياة عم تصر على حالها.', 'A basement door. Behind it — music. A wedding. People getting married in the middle of a siege. Life insisting on itself.', 'examine', 7),

  // Scene 3C-4: The night garden
  garden: s(null, 'حديقة خضرا. بندورة ونعنع وكوسا. حدا عم يسقيها بالليل — مي أقل تتبخّر، وأقل خطر. مجنون هالشخص. أو عاقل. صعب تفرّق.', 'A vegetable garden. Tomatoes, mint, courgettes. Someone waters them at night — less evaporation, less risk. This person is mad. Or sane. Hard to tell.', 'examine', 8),
  can: d(null, 'سطل سقاية. نصّو مليان.', 'A watering can. Half full.', 'examine', 3),
  watered: d(null, 'التراب غمّق. فاحت ريحة النعنع.', 'The soil darkens. The mint gives up its smell.', 'examine', 4),
};

// Title cards (in Aref Ruqaa).
export const CARDS = {
  open: [['المشي بالليل', 'The Night Walk'], ['القمر عالي، والبلد فضّة.', 'The moon is high, and the town is silver.']],
  close: [['نص الليل.', 'Midnight.'], ['والفجر لسّا بعيد.', 'And dawn is still a long way off.']],
};
