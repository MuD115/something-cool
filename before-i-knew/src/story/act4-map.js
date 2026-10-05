// Act 4: Dawn (الفجر), 4 am to sunrise, 15 August 2014. The shared map.
// World units, ground at y = 0, up is negative; 1 unit is about a
// centimetre (Sami is 170 tall).
//
// The act opens on the roof from the end of Act Three (rooftop.js, with
// MEM.roof and MEM.stairs from act3v-map.js, re-used), goes down the
// stairwell and out into a dawn street in the eastern quarter, to the
// junction where Sami and Ahmad parted in Act One. From there, one of five
// endings, each in places of its own, far off along the same ground.

// The dawn street, left to right: out of the tall building's door, past
// people waking, to the junction and its three roads.
export const X5 = {
  start: 0, // the tall building's street door
  jerrycan: 520, // a man with a yellow jerrycan on his shoulder, hugging the wall's shadow
  sweeper: 1150, // a woman sweeping the threshold of a half-collapsed building
  boys: 1700, // two boys come up out of a basement with handmade exercise books
  junction: 2600, // where Zeitoun Street meets the road south: where they parted
  // the three roads at the junction (Choice H): mouths where Sami walks into one
  south: 2380, // the side street south, the way Ahmad went (into depth, left of the corner)
  classroom: 2840, // a side street east, into the eastern quarter (into depth, right of the corner)
  tunnels: 3250, // the street goes on, east, out towards the edge of town
  end: 3400,
};

// The endings' places: centre x and half-width of the walkable span.
export const END = {
  // Ending 1: the Witness — the roof's edge (rooftop.js, at dawn), then east
  edgeRoad: [60000, 1800], // the last buildings, the orchards, the dusty road into the sunrise
  // Ending 2: the Last Farewell
  nomans: [64000, 1300], // the no-man's-land street at grey dawn, the checkpoint at its right end
  cemetery: [68000, 700], // the small cemetery in the grape arbours
  // Ending 3: the Tunnel
  edge: [72000, 900], // farm buildings where the town thins into fields
  tunnel: [76000, 1600], // a basement, the tunnel mouth, and the tunnel going on into the dark
  // Ending 4: the One Who Remains
  school: [80000, 520], // Ahmad's basement classroom at dawn, as he left it; the steps down at its left
  // Ending 5: the Wolf's Hour
  rubble: [84000, 520], // a ground-floor room, the façade fallen open to the sky
};

// The no-man's-land: where Sami waits with the stretcher, where the body
// lies under its sheet, and the checkpoint.
export const NOMANS = { edge: END.nomans[0] - 1100, body: END.nomans[0] + 150, checkpoint: END.nomans[0] + 1050 };
// The tunnel: its mouth, and how far in the dark goes.
export const TUNNEL = { steps: END.tunnel[0] - 1450, mouth: END.tunnel[0] - 1100, wall: END.tunnel[0] - 1180 };
// The classroom: the door at the foot of the steps, the board, the window.
export const SCHOOL = { door: END.school[0] - 420, board: END.school[0] + 120, desk: END.school[0] + 300, window: END.school[0] - 60 };
// The rubble room: the slab he sits on, and the opening.
export const RUBBLE = { slab: END.rubble[0] - 80, opening: END.rubble[0] + 300 };
