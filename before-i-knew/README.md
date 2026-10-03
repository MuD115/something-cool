# قبل ما عرفت / Before I Knew

An interactive side-scrolling story game set in a besieged town in Ghouta, outside Damascus,
on 14 August 2014. Sami, 27, walks home with his closest friend, Ahmad. They part at a
junction. Less than an hour later, the world has already changed, and Sami doesn't know it
yet.

- [`STORY.md`](STORY.md) is the story bible: characters, tools, the four acts, the endings
  and the state that carries between them.
- [`script/act1.md`](script/act1.md) to [`script/act4.md`](script/act4.md) are the production
  scripts. Act One and Act Two's Retrieval path are built, and follow them line for line.

Dialogue is in the Damascus dialect with English subtitles. Menus and on-screen hints use
Modern Standard Arabic. The depiction is restrained: violence
is heard and implied, never shown.

**Content note:** life under military siege, shelling, sniper fire, hunger, the death of a
friend, grief. Recommended for ages 16 and over. The story is fiction, drawn from documented
accounts of siege life.

## Act One: The Afternoon

From 3:05 to 4:15 pm, about 10–20 minutes to play.

1. **The Walk.** Walk Zeitoun Street with Ahmad, talking about the football they played after school, grammar
   tenses and a boy who doesn't know what "abroad" means. Along the way you crouch under a
   sniper curtain and climb a collapsed wall.
2. **The Parting.** Ahmad turns down the southern road.
3. **The Hour.** You spend it alone.
   - The old man with the jerrycans. ◆ **Choice A:** help carry his water, or keep walking.
   - The mirror shard, which lets you look around a corner.
   - The spotter, who hands you a walkie-talkie.
   - The jet. On channel 3 the spotters say «مروحي» for a helicopter and «حربي» for a jet.
     When «حربي» comes over the radio, get flat before it tears overhead.
   - Mortars fall around Layla and the scrap-collecting children. ◆ **Choice B:** run for
     the children, or take cover. Running for them takes you down into a dark stairwell,
     where you need the hand-crank torch.
   - A cat on a wall.
   - A flashback to 2010.
   - A car battery charging the neighbourhood's phones.
4. **The News.** At the corner with the dead olive tree, Abu Yazan comes up the southern
   street to meet you.
   ◆ **Choice C:** *I need to see him*, *Who did this?* or silence. Each answer takes Sami
   into a different night.

## Act Two: The Evening (Retrieval)

From 4:30 pm, on the path that begins with «بدي شوفو» (*I need to see him*). About 10 minutes to
play.

1. **The southern quarter.** Walk south, towards School Street. It gets harder as you go:
   - **Three lanes** open onto the sniper on the western hill, and each is a band of low sun
     across the street. Cross one standing while he's watching and he fires to kill: the round
     cracks into the wall a hand's width from Sami's head, and he throws himself back to where
     the lane began.
   - In the first lane, keep low behind the waist-high wall.
   - In the second, a burnt-out car only covers half the way. The walkie-talkie tells you
     when he leaves the window, and the mirror shows you.
   - Before the third lane, you crawl through a gap in a collapsed wall.
   - At the third, someone has lit a tyre, and you cross while the smoke blinds him.
2. **The field hospital.** A medic smokes outside it. He says: *We couldn't reach him.*
3. **The no-man's-land.** At the sandbags, School Street opens to the regime checkpoint.
   Halfway down it lies a shape under a blanket.
   ◆ **Choice D:** take the white cloth (a sheet from a balcony rail, wrapped round a curtain
   rail), or look for another way, through the half-collapsed building.
4. **Abu Yazan** has followed you south. He gives you Ahmad's lighter and his journal.

## Act Three: The Night (Retrieval), Parts One to Three

From 8 pm, whichever way Choice D went. Each route is about 8 minutes to play.

- **The white cloth.** Crank the torch to see the ground, then switch it off: light draws fire.
  Then sixty metres of open, moonlit ground to the regime checkpoint, upright, the sheet held
  above your head. The game won't let you crouch or run. A shout; hands up; two soldiers pat
  you down and take the walkie-talkie and Ahmad's lighter. At a camp table under a battery lamp,
  **Officer Maher** hears you out, then names his terms: *nothing here is free, not flour, not
  medicine, not bodies.*
  ◆ **Choice G:** answer with dignity (he pockets Ahmad's lighter as the price, and sells you
  twenty minutes before dawn), with anger (a rifle butt, heard and not shown, then his
  conditions: two men, five minutes, and the sniper is "not his"), or with a deal (you draw
  him the valves that control the southern quarter's water).
- **The back route.** Up through the ruined building in the dark, torch in hand. A flight of
  stairs, then a table still set for dinner, a stove cut from a tin with the wall black above it
  (under the siege, plastic was the fuel), and a child's drawing. A ceiling slab has fallen
  across the next flight. A wardrobe on its side has a crawl space under it, and part of the
  ceiling has come down to knee height. Where the stairs are gone, you jump from the rubble
  and pull yourself up. There are height marks on a door frame (2009, 2010, 2011, and no
  2012), and a step gives way. From the fifth floor you see what the sniper saw. Then out: a
  balcony (stay low: standing still up there is seen too), a drop, a drainpipe, the alley, and a belly crawl across the moonlit
  street to the blanket. You take its edges and pull him back into the shadow.

- **The night walk** (Part Three, both routes, straight on from either): 10 pm to midnight,
  about six minutes, and for a long while nothing asked of you at all. The moon is high and
  the town is silver: the bombed building with moonlight filling its open rooms, the vine from
  the afternoon, crickets, a single far-off shot, a dog, a breath of ney now and then. In an
  alley the black cat is waiting on a low wall; stop by it (or crouch) and find nothing in your
  pocket for it, and it yawns, every tooth, and curls up and sleeps. Music under the street grows into a
  wedding: open the basement door a crack and see thirty people in candlelight, a bride in a
  dress made from curtains, an old man with an oud; you shake your head when they wave you
  in, and close the door. Past it, someone's vegetable garden, watered at night, and a can
  half full: you can water it. It ends at midnight; the end card tells the whole night.

Officer Maher is written as the regime's checkpoints were: he trades in what he controls, and
the game doesn't ask you to understand him. The visions, the flashbacks and the rooftop
(Parts Four to Six) are still to come.

Your choices set the story state that later acts build on: compassion, courage, isolation,
the children and the path. It's saved in the browser.

## Playing

- **Easiest:** open `before-i-knew.html` (the single-file build). It has no dependencies. If
  you're online, it loads its Arabic and Latin typefaces from Google Fonts.
- **From source:** serve this folder, for example with `python3 -m http.server 8080`, then
  open the printed URL. Run `python3 build.py` to rebuild the single file.

| Action | Keys | Gamepad |
| --- | --- | --- |
| Walk | A / D or ← / → | stick / d-pad |
| Run | Shift | RT |
| Jump / climb | Space, W or ↑ | A |
| Crouch | C or ↓ | LB |
| Go prone | Z | B |
| Interact | E or Enter | X |
| Switch tool | Q or Tab | Y |
| Use tool (tap F for the torch, hold F to crank it) | F | RB |
| Choose | 1 / 2 / 3, or click | |
| Next line (hold to keep skipping) | X or Backspace | LT |
| Menu | Esc or P | Start |

You can rebind every key under **Controls**. On phones and tablets, on-screen buttons appear.

**Menus.** The main menu has Continue (from the last checkpoint, in whichever act), New game,
Chapters, Your story, Settings, Controls and About. Finishing Act One, with any ending, unlocks Act Two:
the end card offers **Continue to Act Two**, carrying your choices and tools over, and so does
Continue on the main menu. (The Witness and Grief evenings are still to come; for now Act Two
follows Sami south, to Ahmad.)

- **Chapters** lists each act's scenes. A scene opens once you've reached it in the story,
  and it starts from the state you last reached it with.
- **Your story** lists every decision in the acts you've finished. The one you took last time
  is marked, other ways you've taken it are shown, and ways you haven't tried yet stay dotted
  out. Below that is **What you noticed**: the things Sami stopped to look at, act by act. The
  end card counts them too, and it has a short afterword on the siege.

During play, `Esc` pauses the game and opens Resume, Dialogue log, Belongings, Photo mode,
Settings, Controls, Restart from checkpoint and Main menu. The pause screen also shows the
current objective, what you're carrying and the checkpoint. **Belongings** describes what Sami
carries; Ahmad's journal opens page by page. **Photo mode** stops the story and hides the HUD:
the arrows move the camera, + and − zoom, F changes the look (natural, warm, black and white,
faded), Enter saves a PNG and Esc goes back. A small "Saved" shows in the corner at each
checkpoint. Settings:

- **Sound:** master, music and effects volume.
- **Text:** the menu language (English or Arabic, with right-to-left menus), subtitles (Arabic
  and English, English only or Arabic only), text size and the subtitle backing.
- **Display:** graphics quality (Auto, Low, Medium, High), depth blur (lens, soft or off),
  camera shake and reduce flashes.
- **Play:** control hints.
- **Accessibility:** subtitle reading time (longer, normal, shorter), crouch and prone (press to
  toggle, or hold), Act Two's sniper lanes (standard, or forgiving: longer gaps and more
  smoke, and a near miss drops Sami flat where he is instead of sending him back), the
  camera easing towards things to use, their outlines, and vibration (a phone buzz, or a
  gamepad's rumble, on blasts and shots).

As Sami nears something he can look at, pick up or talk to, the camera leans towards it and
closes in a little, and a thin, softly breathing outline traces its shape (the cat's own
silhouette, the three sheets of the sniper curtain, the car's profile), so it isn't walked past.
The outline never crosses anyone standing in front of it. Both can be switched off under
Accessibility. What Sami makes of a thing floats above it in a small caption, not in the
subtitles; spoken lines stay at the bottom, each speaker's name in their own colour. Press Skip
to move on to the next line (never past a choice); hold it to keep going.

**How Sami moves.** Jumps gather a moment before take-off and give on landing, deeper the
further he falls, without ever holding up the controls. A jump still works for a moment after
stepping off an edge, and one pressed just before landing fires as he lands. He leans into a
run and settles when he stops; left standing in a quiet moment he checks his watch, glances
back or touches the pouch at his hip. He climbs stairs with a real stair gait, pulls himself
up a ledge hand over hand, bends to pick things up and reaches up for high ones. When he looks
at something he turns to it and tips his head to its height; the people he talks to turn to
face him. Using a thing gives a soft click and a brief brighter outline. Control prompts show
the keys, gamepad buttons or touch buttons, whichever you used last.

Control prompts step aside once you've done what they ask, or after a few seconds. They come
back if you stand idle while the story is still waiting on them.

## How it's made

Everything is drawn and synthesised in code. There are no images or recordings. The way
people walk, run, crouch and bend is motion-captured (below).

- **Light** ([`src/engine/renderer.js`](src/engine/renderer.js)) uses the lighting engine
  from *A Suit for Burying*, extended with:
  - a cone light, used for the torch in the stairwell;
  - a colour grade, which is warm in the 2010 flashback and drained when the news comes, with
    a split tone (a colour for the shadows and one for the highlights) per scene;
  - a **height layer**: surfaces carry relief, which the lights rake across (the low sun picks
    out mortar joints and bullet pocks, the torch every crack);
  - **form** for anything that casts a shadow: people, poles and cars are rounded from their
    silhouettes, lit on the side towards a light and turning away on the other;
  - contact shading where things stand against a wall, ground fog that thins with height and
    drifts, and lens dirt on High.
- **Materials** ([`src/engine/materials.js`](src/engine/materials.js)): tileable textures
  baked at load from seeded noise, each with a height map: cut limestone, *ablaq* (limestone
  banded with black basalt, as on the old houses of Damascus), cement render (blotched, with
  flakes fallen away to the blocks beneath, and hairline cracks), poured concrete, rusted
  corrugated sheet, old wood, asphalt, paving slabs and cloth. Big walls use two passes at
  unrelated scales so the tile never shows. Each building's face is baked once with its
  material, floor slabs, window reveals, weathering and holes, which is also faster per frame
  than drawing it every time; rooftops carry black water tanks and solar water heaters. Low
  quality skips the relief and bakes smaller textures.
- **Motion capture** ([`tools/mocap.mjs`](tools/mocap.mjs),
  [`src/rigs/motion.js`](src/rigs/motion.js)): walking, a sad walk, jogging, running, a
  crouched walk, creeping, picking something up, squatting and a standing wait come from the
  [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu/) (the BVH conversion by
  Bruce Hahne), free for commercial use. The tool reads the BVH files, runs forward kinematics,
  projects each take onto the body's own side-on plane and turns it into the rig's joint
  angles; loops are cut to one clean stride and closed. In the game a gait's phase is carried by
  the distance covered, walk blending into jog and run with speed, and a planted foot is locked
  where it lands, the leg solved with two-bone IK so it neither slides nor sinks, and stands on
  kerbs and rubble. To regenerate: download the takes listed in the tool into a folder and run
  `node tools/mocap.mjs build <folder>`. *The data used in this project was obtained from
  mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.* (The CMU
  get-up-from-the-floor takes roll sideways and don't read side-on, so getting up after a fall
  is keyed by hand.)
- **Ragdolls** ([`src/rigs/ragdoll.js`](src/rigs/ragdoll.js)): Verlet points on the rig's
  joints, with bone lengths, knee, elbow, hip and neck limits and ground friction (after
  Jakobsen's *Advanced Character Physics*). A near miss sends Sami diving away from the
  shot; a mortar close by rocks him back, and throws grown men near it off their feet (never
  the children); a long drop takes him down. Then he gets up: off his back by sitting up and
  kneeling, off his front through the crawl. The body under the blanket in Act Three is a
  heavy chain the blanket drapes over, never drawn itself: pulled by the shoulders, its weight
  comes after. A bag, a pouch and a scarf's end swing on damped springs as the body moves.
  **Falls and knockdowns** can be switched off under Accessibility (a flinch instead).
- **Movement** ([`src/world/`](src/world)): a walker with walk, run, crouch, prone, jump and
  mantle; ceilings you can only pass under crouched; and walls you climb. Stance changes take
  half a second, and getting down to the ground (or up from it) passes through a kneel. The
  crawl is an elbow-and-knee crawl with the belly on the ground: opposite forearm and knee
  reach together, the lower leg folding up behind. Story beats are
  generator scripts, triggered by position.
- **People and the cat** ([`src/rigs/`](src/rigs)): one procedural rig, with outfits for each
  character and a pose library. It has side, front and back views, with a quick turn between
  them, for anyone walking into or out of a side street. Idle figures breathe, blink and glance
  around, and passers-by cross the side streets in the calm stretches. They walk in from beyond
  the edge of the frame, run across ground the sniper can see, never use the exposed corner, and
  hurry off (never vanish) when the shelling starts. The black cat is a separate small rig at
  real size beside Sami (about 25 cm at the shoulder, after the
  [American Shorthair's dimensions](https://www.dimensions.com/element/american-shorthair-cat)):
  one silhouette, its legs tapering solids in the body's colour, the walk a lateral-sequence
  gait. Its silhouette checks used Google's
  [Noto Emoji](https://github.com/googlefonts/noto-emoji) black-cat artwork (open licence) as
  a reference; none of it is drawn into the game.
- **Depth** ([`src/sets/depth.js`](src/sets/depth.js)): the world is side-on, so walls,
  slabs, kerbs, sandbags and rubble get their thickness drawn behind them along one oblique
  direction for the whole game (back, up and to the right): tops lit, sides darker. Torn
  corners of buildings show a broken section of block and concrete, exposed slab ends show
  their rebar, and shell holes show the wall's thickness inside them.
- **In your hands**: when Sami carries or pulls something, you walk it: the water jugs to the
  old man's door (he keeps pace beside you), the walk out into School Street with the white
  cloth held high, the last walk to Abu Yazan, the blanket pulled back into the shadow (hold
  away from the body), and the watering can from bed to bed in the night garden.
- **The street** ([`src/sets/town.js`](src/sets/town.js)): blocks of flats with Syrian doors on
  the ground floor (painted steel double doors with a grille, old studded wooden doors under a
  pointed arch, rolling shop shutters, wrought-iron gates), and tarred wooden electricity poles,
  some leaning, whose cables run to the next pole, into a building, or hang snapped to the ground.
- **Depth of field** ([`src/engine/dof.js`](src/engine/dof.js)): whoever walks away down a side
  street, and the far end of the side streets themselves, go softer the deeper they are, with a
  lens-like (bokeh) disc blur or a plain soft one, and fade as they reach the end.
- **The distance** ([`src/sets/horizon.js`](src/sets/horizon.js)) is layered and softened with
  depth: Mount Qasioun's ridge with its masts, Damascus with its domes, minarets and cranes, then
  the nearer towns of Ghouta, with haze lifting off the horizon, drifting cirrus and the odd
  flock of birds. The far layers are drawn once, blurred, into small cached images, so the
  softness costs almost nothing per frame. At dusk, generator lights come on in the far city.
- **Sound** ([`src/engine/audio.js`](src/engine/audio.js)) is all Web Audio, in a street-shaped
  space (early slaps off the facing buildings, a darkening tail) through a compressor and a
  limiter:
  - the ambience: a generator hum, pigeons, gusting wind that whistles through broken windows;
  - distant life, now and then: a dog, children far off, tin creaking, rubble settling, a
    door, a motorbike across town;
  - footsteps in two parts (heel and toe), coloured by the ground and softer crouched; the
    people around you have their own;
  - gunfire in single shots and bursts with their echoes, mortar whistles and impacts, the
    airstrike's sub-bass, car alarms;
  - walkie-talkie static, and a low jet pass;
  - ringing ears at the news.
  Sounds sit left or right of the screen where they happen.
- **Score** ([`src/engine/score.js`](src/engine/score.js)): a light generative score in maqam
  Bayati on D. A deep sub-bass swells slowly under a soft pad in open fifths, with an oud or
  qanun phrase and a breath of ney now and then. The story sets its mood (the walk, the hour,
  danger, memory, silence at the news, and after), and it steps back under speech and blasts.

## Acts and dialogue

- **Acts.** Each act is a module in [`src/story/`](src/story) (`act1.js`, `act2r.js`, `act3r.js`), with
  its set beside it (`act1-set.js`, `act2r-set.js`). [`src/main.js`](src/main.js) keeps a
  registry of them. The save names the act and its checkpoint.
- **Act Two's dialogue** is data, in [`src/story/act2r-lines.js`](src/story/act2r-lines.js),
  keyed by line. The lines from `script/act2.md` are final. A few gameplay barks the script
  doesn't cover (the lanes, the near misses, the crawl) are placeholders marked
  `draft: true`, and the dialogue log tags them **[draft]**. To replace one, edit its `ar` and
  `en` and delete the flag. No code changes are needed.
