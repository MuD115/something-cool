// Ambience by place: for each act, a table of stretches of the street and
// what can be heard there. The act calls, once a frame,
//     g.sound.zone('act1', playerX)       // or zone(ZONES.act1, x)
// and the sound crossfades (about 2 s) between neighbouring stretches.
//
// A zone is { x0, x1, mix } with mix keys 0…1:
//   radio      a song on a far radio behind a window (never intelligible)
//   children   far-off children playing (DAYTIME ONLY)
//   generator  a chorus of neighbours' generators, a little out of tune
//   pigeons    cooing on a ledge
//   windGlass  wind through broken windows, a soft whistle
//   drip       water dripping somewhere in a courtyard or a cellar
// and optional multipliers on the act's own ambience() levels (default 1):
//   xWind, xAir, xTraffic, xCrowd
// Outside every zone the new beds fall silent and the multipliers return to 1.
// Zones blend over about 200 px either side of their edges.

export const ZONES = {
  // Act One: the morning street, 150…10250.
  act1: [
    { x0: 0, x1: 600, mix: { radio: 0.25, children: 0.18, pigeons: 0.2, generator: 0.1 } },
    { x0: 600, x1: 1300, mix: { pigeons: 0.55, children: 0.1, windGlass: 0.08 } }, // the vine, the pigeons at 980
    { x0: 1300, x1: 2000, mix: { radio: 0.4, windGlass: 0.15, pigeons: 0.15 } }, // the curtains, the sag
    { x0: 2000, x1: 2900, mix: { radio: 0.3, children: 0.25, generator: 0.3, xCrowd: 1.3 } }, // the shop
    { x0: 2900, x1: 3500, mix: { generator: 0.4, xTraffic: 1.2, children: 0.1 } }, // the junction
    { x0: 3500, x1: 4300, mix: { pigeons: 0.4, radio: 0.2, windGlass: 0.1 } }, // the old man, the door
    { x0: 4300, x1: 5100, mix: { windGlass: 0.4, generator: 0.15 } }, // the shard, the corner
    { x0: 5100, x1: 6500, mix: { windGlass: 0.25, xWind: 1.15, xCrowd: 0.4, xTraffic: 0.6 } }, // the spotter, the helicopter: the street holds its breath
    { x0: 6500, x1: 7500, mix: { windGlass: 0.5, drip: 0.08, xCrowd: 0.3 } }, // the collapsed block
    { x0: 7500, x1: 8400, mix: { windGlass: 0.3, drip: 0.18, pigeons: 0.08, xCrowd: 0.2 } }, // the school, the empty classroom
    { x0: 8400, x1: 9100, mix: { generator: 0.55, radio: 0.1 } }, // the battery shop
    { x0: 9100, x1: 9700, mix: { xCrowd: 0.4, xTraffic: 0.4, windGlass: 0.12 } }, // the news
    { x0: 9700, x1: 10400, mix: { pigeons: 0.15, windGlass: 0.2, xWind: 1.1, generator: 0.1 } }, // the olive tree, the way south
  ],

  // Act Two, road: the sniper lanes, 150…6700, daytime.
  act2r: [
    { x0: 0, x1: 900, mix: { radio: 0.2, children: 0.1, pigeons: 0.2, generator: 0.15 } },
    { x0: 900, x1: 1700, mix: { windGlass: 0.3, xWind: 1.1, xCrowd: 0.4 } }, // lane 1
    { x0: 1700, x1: 2300, mix: { pigeons: 0.12, windGlass: 0.1, xCrowd: 0.6 } },
    { x0: 2300, x1: 2900, mix: { windGlass: 0.35, xWind: 1.15, xCrowd: 0.3, xTraffic: 0.5 } }, // lane 2, the burnt car
    { x0: 2900, x1: 3400, mix: { drip: 0.2, windGlass: 0.2 } }, // the crawl gap
    { x0: 3400, x1: 4000, mix: { windGlass: 0.3, xWind: 1.1, xCrowd: 0.3 } }, // lane 3
    { x0: 4250, x1: 5200, mix: { generator: 0.6, radio: 0.2, xCrowd: 1.6 } }, // the field hospital
    { x0: 5200, x1: 5700, mix: { generator: 0.25, windGlass: 0.2, xCrowd: 0.6 } },
    { x0: 5700, x1: 6300, mix: { windGlass: 0.5, drip: 0.18, xCrowd: 0.2, xTraffic: 0.5 } }, // the ruin
    { x0: 6300, x1: 6900, mix: { windGlass: 0.3, xWind: 1.2, xCrowd: 0.2 } }, // the mouth of School Street
  ],

  // Act Two, west: Um Said's quarter, 0…4900, afternoon.
  act2w: [
    { x0: -300, x1: 450, mix: { radio: 0.3, children: 0.22, pigeons: 0.3, generator: 0.1 } },
    { x0: 450, x1: 900, mix: { radio: 0.2, children: 0.15, pigeons: 0.2 } }, // the woman in the doorway
    { x0: 900, x1: 1500, mix: { radio: 0.4, pigeons: 0.12, generator: 0.1 } }, // Um Said's door
    { x0: 1500, x1: 2300, mix: { children: 0.35, generator: 0.25, pigeons: 0.3, xCrowd: 1.4 } }, // the bakery
    { x0: 2300, x1: 2800, mix: { children: 0.45, pigeons: 0.15 } }, // the children's wall
    { x0: 2800, x1: 3300, mix: { pigeons: 0.4, radio: 0.25, children: 0.1 } }, // the balcony
    { x0: 3300, x1: 3750, mix: { windGlass: 0.5, pigeons: 0.1, xCrowd: 0.5 } }, // the torn face
    { x0: 3750, x1: 4300, mix: { windGlass: 0.3, xWind: 1.2, xCrowd: 0.4 } }, // the view of School Street
    { x0: 4300, x1: 5100, mix: { drip: 0.3, generator: 0.3, radio: 0.1 } }, // the alley
  ],

  // Act Two, grief: the corner of Zeitoun Street at dusk, -500…1800.
  // (The flashbacks and flats sit far away on the x axis: silent here.)
  act2g: [
    { x0: -900, x1: -100, mix: { windGlass: 0.15, xWind: 1.2, xCrowd: 0.3, xTraffic: 0.6 } }, // east, alone, into the light
    { x0: -100, x1: 1200, mix: { generator: 0.25, pigeons: 0.12, radio: 0.1, children: 0.06, xCrowd: 0.7 } }, // the kerb, the olive tree
    { x0: 1200, x1: 2000, mix: { radio: 0.2, generator: 0.3, windGlass: 0.1, xCrowd: 0.8 } }, // north
  ],

  // Act Three, walk: the night, 0…3800. No children, no radios; one generator.
  act3w: [
    { x0: -200, x1: 380, mix: { windGlass: 0.25, xWind: 1.0 } },
    { x0: 380, x1: 900, mix: { windGlass: 0.6, drip: 0.08, xWind: 0.9 } }, // the open bombed rooms
    { x0: 900, x1: 1500, mix: { windGlass: 0.15, xWind: 1.1 } }, // the vine
    { x0: 1500, x1: 2100, mix: { drip: 0.4, windGlass: 0.2, xWind: 0.6 } }, // the alley
    { x0: 2100, x1: 2900, mix: { generator: 0.5, drip: 0.1, windGlass: 0.1, xWind: 0.8 } }, // the basement: one lone generator behind a door
    { x0: 2900, x1: 3400, mix: { drip: 0.35, pigeons: 0.08, xWind: 0.7 } }, // the courtyard
    { x0: 3400, x1: 4000, mix: { windGlass: 0.1, xWind: 1.0 } },
  ],

  // Act Four: the morning after, 0…3400, then the five endings.
  act4: [
    { x0: -200, x1: 400, mix: { radio: 0.1, pigeons: 0.2, generator: 0.15, children: 0.05 } },
    { x0: 400, x1: 1000, mix: { generator: 0.3, pigeons: 0.15, radio: 0.12 } }, // the jerrycan man
    { x0: 1000, x1: 1500, mix: { children: 0.18, radio: 0.2, pigeons: 0.25 } }, // the sweeper
    { x0: 1500, x1: 2300, mix: { children: 0.45, radio: 0.1, pigeons: 0.2 } }, // the boys with their exercise books
    { x0: 2300, x1: 3000, mix: { windGlass: 0.12, xTraffic: 1.2, children: 0.1 } }, // the junction
    { x0: 3000, x1: 3700, mix: { windGlass: 0.2, xWind: 1.15 } }, // the road on, east
    // Ending 1, the Witness: the edge road at sunrise
    { x0: 58200, x1: 61800, mix: { windGlass: 0.05, xWind: 1.3, pigeons: 0.1 } },
    // Ending 2, the Last Farewell: no-man's-land at grey dawn, then the cemetery
    { x0: 62700, x1: 65300, mix: { windGlass: 0.3, xWind: 1.1, xCrowd: 0.2 } },
    { x0: 67300, x1: 68700, mix: { pigeons: 0.25, xWind: 0.8 } },
    // Ending 3, the Tunnel: the fields, then the dark
    { x0: 71100, x1: 72900, mix: { xWind: 1.0, pigeons: 0.08, generator: 0.1 } },
    { x0: 74400, x1: 77600, mix: { drip: 0.6, windGlass: 0.2, xWind: 0.2, xAir: 1.5 } },
    // Ending 4, the One Who Remains: Ahmad's basement classroom at dawn
    { x0: 79480, x1: 80520, mix: { drip: 0.1, pigeons: 0.1, windGlass: 0.05, xWind: 0.5 } },
    // Ending 5, the Wolf's Hour: the open room under the sky
    { x0: 83480, x1: 84520, mix: { windGlass: 0.5, pigeons: 0.04, xWind: 0.9 } },
  ],
};
// act4's table also holds the endings, so any of these will do
ZONES.endings = ZONES.act4;

// the keys that are levels (default 0) and the ones that scale the act's own
// ambience (default 1)
export const ZONE_LEVELS = ['radio', 'children', 'generator', 'pigeons', 'windGlass', 'drip'];
export const ZONE_MULS = ['xWind', 'xAir', 'xTraffic', 'xCrowd'];

// Blend a table at x into one mix object. Each zone's weight ramps across
// its edges; neighbours meet at 0.5 each, and outside everything the mix
// fades to the defaults.
export function blendZones(table, x, feather = 200, out = {}) {
  for (const k of ZONE_LEVELS) out[k] = 0;
  for (const k of ZONE_MULS) out[k] = 1;
  if (!table) return out;
  let total = 0;
  for (let i = 0; i < table.length; i++) {
    const z = table[i];
    const d = Math.min(x - z.x0, z.x1 - x);
    let w = (d + feather) / (2 * feather);
    if (w <= 0) continue;
    if (w > 1) w = 1;
    w = w * w * (3 - 2 * w);
    total += w;
    z._w = w;
  }
  const norm = total > 1 ? 1 / total : 1;
  const deficit = total > 1 ? 0 : 1 - total;
  for (const k of ZONE_LEVELS) out[k] = 0;
  for (const k of ZONE_MULS) out[k] = deficit;
  for (let i = 0; i < table.length; i++) {
    const z = table[i];
    const d = Math.min(x - z.x0, z.x1 - x);
    if (d + feather <= 0) continue;
    const w = z._w * norm;
    for (const k of ZONE_LEVELS) out[k] += w * (z.mix[k] || 0);
    for (const k of ZONE_MULS) out[k] += w * (z.mix[k] ?? 1);
  }
  return out;
}
