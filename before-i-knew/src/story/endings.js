// Which of the five endings the night has led to. script/act4.md, "State
// Variable Resolution", exactly; none of them is the right one.
//
//   1 The Witness            documented, on the witness path
//   2 The Last Farewell      the body brought back (by negotiation or the building)
//   3 The Tunnel             withdrawn and alone, without much courage left
//   4 The One Who Remains    compassion, and Um Ahmad or the children
//   5 The Wolf's Hour        everything else, and the anger at the checkpoint

export const ENDINGS = {
  1: { key: 'witness', ar: 'الشاهد', en: 'The Witness' },
  2: { key: 'farewell', ar: 'الوداع الأخير', en: 'The Last Farewell' },
  3: { key: 'tunnel', ar: 'النفق', en: 'The Tunnel' },
  4: { key: 'remains', ar: 'الباقي', en: 'The One Who Remains' },
  5: { key: 'wolf', ar: 'ساعة الذئب', en: 'The Wolf’s Hour' },
};

// The body is brought home at dawn: agreed at the checkpoint (fully, or on
// Maher's terms after the anger), or already pulled into the shadow from the
// building.
export const retrieval = (s) => s.negotiation_outcome === 'success' || s.negotiation_outcome === 'partial' || !!s.dangerous_route_complete;

export function resolveEnding(s) {
  const compassion = s.compassion || 0;
  const courage = s.courage || 0;
  const isolation = s.isolation || 0;
  if (s.documented && s.path === 'witness') return 1;
  // (Ending 2's own conditions take in the anger path's partial outcome:
  // Maher lets the retrieval go ahead at dawn, on his terms — scene E2-1b.
  // The summary table's "anger → Ending 5" is the failed negotiation, which
  // this game's checkpoint never ends in.)
  if (retrieval(s)) return 2;
  if (isolation >= 2 && compassion <= 1) return courage <= 1 ? 3 : 5;
  if (compassion >= 2 && (s.um_ahmad_visited || s.children_helped)) return 4;
  return 5;
}

// Whether the state already settles it, or Choice H at the junction should
// be offered as the tiebreaker. Clear when one of the script's strong
// conditions holds; ambiguous otherwise.
export function endingIsClear(s) {
  const compassion = s.compassion || 0;
  const isolation = s.isolation || 0;
  return !!(
    (s.documented && s.path === 'witness') ||
    retrieval(s) ||
    (isolation >= 2 && compassion <= 1) ||
    (compassion >= 2 && s.um_ahmad_visited)
  );
}

// Choice H, at the junction: each road nudges the state, and the resolver
// then decides. H1 south, towards Ahmad; H2 the tunnels; H3 the classroom.
export function applyChoiceH(s, h) {
  s.h_choice = h;
  if (h === 'south') s.grief_response ||= 'action';
  if (h === 'tunnels') s.isolation = (s.isolation || 0) + 1;
  if (h === 'classroom') s.compassion = (s.compassion || 0) + 1;
  return s;
}
