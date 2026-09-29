// What Sami carries, as the Belongings page describes it, and the pages of
// Ahmad's journal. Damascus dialect, with the English. Lines taken from the
// scripts are final; the rest are placeholders, marked `draft: true` (shown
// "[draft]" on the page). To replace one, change its text and delete the flag.

import { LINES } from './act2r-lines.js';

const pair = (L) => ({ ar: L.ar, en: L.en });

export const ITEMS = {
  torch: { ar: 'مصباح بدينمو. دوّر المقبض وبيضوي شوي، وبس توقّف بيخفت.', en: 'A hand-crank torch. Wind the handle and it gives a little light; stop, and it fades.', draft: true },
  mirror: { ar: 'شقفة مراية. بتبيّن فيها الطريق اللي ما عم تشوفها.', en: 'Mirror shard. It shows the road you can’t see.' },
  walkie: { ar: 'لاسلكي. بتسمع فيه تحذيرات الرصد. ما بيبعت، بس بيستقبل.', en: 'Walkie-talkie. You hear the spotters’ warnings. Receive only.' },
  whitecloth: pair(LINES.cloth_item),
  lighter: pair(LINES.lighter),
  journal: pair(LINES.journal),
};

// Ahmad's journal, page by page. Only the last page is from the script.
export const JOURNAL = [
  {
    ar: 'درس اليوم: كان وأخواتها.\nكان الطقسُ حارّاً.\nصار الماءُ قليلاً.\nأصبح الصفُّ أهدأَ من أمس.',
    en: 'Today’s lesson: kāna and her sisters.\nThe weather was hot.\nThe water became scarce.\nThe class became quieter than yesterday.',
    draft: true,
  },
  {
    ar: 'سبعتعش طالب اليوم. تلاتة غايبين.\nهبة جابت شمعتين من بيتها.\nلازم نلاقي ورق. عم يكتبوا عالورقة من الوجّين.',
    en: 'Seventeen pupils today. Three absent.\nHiba brought two candles from home.\nWe need to find paper. They’re writing on both sides of every sheet.',
    draft: true,
  },
  {
    ar: 'عمر، هبة، ريم، محمد الصغير، محمد الكبير، سلمى، طارق، نور.\nنور كل يوم بتسأل: إيمتى بترجع المدرسة الحقيقية؟',
    en: 'Omar, Hiba, Reem, Little Mohammad, Big Mohammad, Salma, Tariq, Nour.\nEvery day Nour asks: when is the real school coming back?',
    draft: true,
  },
  {
    ar: 'بكرا بدي علّمهن قصيدة محمود درويش.',
    en: 'Tomorrow I’ll teach them a Mahmoud Darwish poem.',
  },
];
