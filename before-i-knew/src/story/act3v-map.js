// Act 3, Parts 4 to 6: The Small Hours (الساعات الصغيرة), 1 am to dawn.
// The shared map: where things stand on the night street, and where each
// remembered or dreamed place lies. World units, ground at y = 0, up is
// negative; 1 unit is about a centimetre (Sami is 170 tall).
//
// The night street runs left to right, past six things that each open a
// memory, to the tall building whose roof he climbs to. The memories are
// separate places far off along the same ground: when one opens, Sami is
// moved into it (younger, where the script makes him younger), and back to
// the street when it closes. Each memory space is centred on its MEM x and
// is walkable across its span.

export const X4 = {
  start: 0,
  classroom: 700, // half a flight down to a basement door: Ahmad's classroom (vision 1)
  arch: 1500, // a stone archway between two buildings (vision 2: the orchard)
  shop: 2300, // a cracked, empty shop window, a reflection in it (vision 3: Damascus)
  shutter: 3000, // a shuttered doorway with an Eid wreath's nail (flashback 1: Eid)
  minaret: 3700, // the mosque's cracked minaret, standing over the street (flashback 2: the protest)
  portrait: 4400, // a gutted ground-floor room; a half-burned official portrait on its back wall (flashback 3)
  tower: 5100, // a six-storey building, less damaged, its stair door open (the climb, the roof)
  end: 5400,
};

// Memory and vision spaces: centre x and half-width of the walkable span.
export const MEM = {
  classroom: [20000, 420], // Ahmad's basement classroom, full and candlelit, then as it is
  orchard: [23000, 1300], // the grape orchards before the war, golden afternoon
  damascus: [27000, 1400], // a Damascus street in 2010; the café window near its right end
  eid: [31000, 520], // a family room at Eid, 2008: a table for eight with fifteen round it
  protest: [34500, 1700], // a street after Friday prayers, March 2011; an alley and a dumpster at its right end
  school: [39000, 460], // a school classroom, 2001: the portrait over the board, a flag
  kitchen: [40400, 300], // his family's kitchen that afternoon
  stairs: [44000, 300], // the tall building's stairwell, six flights up
  roof: [48000, 900], // the roof: Damascus lit in the west, Ghouta dark all round
};

// The café window in Damascus, and the dumpster in the alley, as world x.
export const CAFE_X = MEM.damascus[0] + 820;
export const DUMPSTER_X = MEM.protest[0] + 1450;
// The stairwell: six flights, each a straight run up and to the right then
// back, landing to landing; FLOOR_H a storey.
export const FLOOR_H = 150;
export const FLIGHTS = 6;
