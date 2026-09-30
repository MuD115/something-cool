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

## Act Three: The Night (Retrieval), Parts One and Two

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
  stairs, then a table still set for dinner and a child's drawing. A ceiling slab has fallen
  across the next flight. A wardrobe on its side has a crawl space under it, and part of the
  ceiling has come down to knee height. Where the stairs are gone, you jump from the rubble
  and pull yourself up. There are height marks on a door frame (2009, 2010, 2011, and no
  2012), and a step gives way. From the fifth floor you see what the sniper saw. Then out: a
  balcony (stay low), a drop, a drainpipe, the alley, and a belly crawl across the moonlit
  street to the blanket. You take its edges and pull him back into the shadow.

Officer Maher is written as the regime's checkpoints were: he trades in what he controls, and
the game doesn't ask you to understand him. The night walk, the visions, the flashbacks and
the rooftop (Parts Three to Six) are still to come.

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

Control prompts step aside once you've done what they ask, or after a few seconds. They come
back if you stand idle while the story is still waiting on them.

## How it's made

Everything is drawn and synthesised in code. There are no images or recordings.

- **Light** ([`src/engine/renderer.js`](src/engine/renderer.js)) uses the lighting engine
  from *A Suit for Burying*, extended with two things:
  - a cone light, used for the torch in the stairwell;
  - a colour grade, which is warm in the 2010 flashback and drained when the news comes.
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
  hurry off (never vanish) when the shelling starts. The black cat is a separate small rig.
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
