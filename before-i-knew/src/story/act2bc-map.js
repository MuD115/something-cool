// Act 2, Paths B (the Witness) and C (Grief): the shared map. World units,
// ground at y = 0, up is negative; 1 unit is about a centimetre (Sami is
// 170 tall). Places that open off the street (a room, a memory) lie far off
// along the same ground, centred on their x with a half-width.

// Path B: the southern quarter, 4:35 to 5:35 pm, left to right.
export const XW = {
  start: 0,
  woman: 520, // a woman in a doorway who points him to Um Said's
  umSaid: 1150, // Um Said's green door, ajar, curtains drawn behind it
  bakery: 1850, // a courtyard open to the street behind a low wall: the clay oven, the hand mill
  wall: 2550, // the graffiti wall of children's drawings, a low wall to sit on in front of it
  balcony: 3050, // a woman hanging laundry on what's left of a balcony (a photograph; or someone to sit with)
  torn: 3450, // a building with its face torn off (a photograph)
  view: 3950, // a gap between buildings with School Street far off: the shape under the blanket, small (a photograph)
  alley: 4500, // a side alley where Abu Yazan finds him
  end: 4900,
};
// Um Said's room (a ground-floor flat): centre and half-width.
export const UM_SAID = [30000, 380];

// Path C: the corner of Zeitoun Street at 4:20 to 5:15 pm, where the news was given.
export const XG = {
  start: 0,
  kerb: 700, // the kerb where he sits; Abu Yazan beside him
  olive: 980, // the dead olive tree
  north: 1500, // the way north, towards Um Ahmad's (Abu Nidal comes from here)
  east: -500, // the way east, alone (left of the corner), into the falling light
  end: 1800,
};
// The 2009 flashback, and Um Ahmad's flat.
export const LECTURE = [34000, 520]; // a lecture hall at Damascus University
export const CAMPUS = [37000, 1200]; // outside: a Damascus street, the falafel cart, the jasmine seller, the cafeteria at the right end
export const UM_AHMAD = [41000, 420]; // her flat: the sewing machine, the photograph, the clock, the west window
export const NORTH_WALK = [44000, 1000]; // the walk north with Abu Nidal, through the quarter at dusk
