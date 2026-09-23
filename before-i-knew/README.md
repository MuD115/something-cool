# قبل ما عرفت / Before I Knew

An interactive side-scrolling story game set in a besieged town in Ghouta, outside Damascus,
on 14 August 2014. Sami, 27, walks home with his closest friend, Khaled. They part at a
junction. Less than an hour later, the world has already changed, and Sami doesn't know it
yet.

- [`STORY.md`](STORY.md) is the story bible: characters, tools, the four acts, the endings
  and the state that carries between them.
- [`script/act1.md`](script/act1.md) is the Act One script. The game follows it line for
  line.

Dialogue is in Damascene Arabic with English subtitles. The depiction is restrained: violence
is heard and implied, never shown.

**Content note:** life under military siege, shelling, sniper fire, hunger, the death of a
friend, grief. Recommended for ages 16 and over. The story is fiction, drawn from documented
accounts of siege life.

## Act One: The Afternoon

From 3:05 to 4:15 pm, about 10–20 minutes to play.

1. **The Walk.** Walk Zeitoun Street with Khaled, talking about Bakdash ice cream, grammar
   tenses and a boy who doesn't know what "abroad" means. Along the way you crouch under a
   sniper curtain and climb a collapsed wall.
2. **The Parting.** Khaled turns down the southern road.
3. **The Hour.** You spend it alone.
   - The old man with the jerrycans. ◆ **Choice A:** help carry his water, or keep walking.
   - The mirror shard, which lets you look around a corner.
   - The spotter, who hands you a walkie-talkie.
   - The helicopter. Get flat before the barrel bomb falls.
   - Mortars fall around Layla and the scrap-collecting children. ◆ **Choice B:** run for
     the children, or take cover. Running for them takes you down into a dark stairwell,
     where you need the hand-crank torch.
   - A cat on a wall.
   - A flashback to 2010.
   - A car battery charging the neighbourhood's phones.
4. **The News.** At the corner with the dead olive tree, Abu Yazan is waiting for you.
   ◆ **Choice C:** *I need to see him*, *Who did this?* or silence. Each answer takes Sami
   into a different night.

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
| Menu | Esc or P | Start |

You can rebind every key under **Controls**. On phones and tablets, on-screen buttons appear.

**Menus.** The main menu has Continue (from the last checkpoint), New game, Settings, Controls
and About. During play, `Esc` pauses the game and opens Resume, Settings, Controls, Restart from
checkpoint and Main menu. Settings cover master, music and effects volume, subtitles (Arabic
and English, English only or Arabic only), text size, camera shake, reduce flashes and control
hints.

## How it's made

Everything is drawn and synthesised in code. There are no images or recordings.

- **Light** ([`src/engine/renderer.js`](src/engine/renderer.js)) uses the lighting engine
  from *A Suit for Burying*, extended with two things:
  - a cone light, used for the torch in the stairwell;
  - a colour grade, which is warm in the 2010 flashback and drained when the news comes.
- **Movement** ([`src/world/`](src/world)): a walker with walk, run, crouch, prone, jump and
  mantle; ceilings you can only pass under crouched; and walls you climb. Story beats are
  generator scripts, triggered by position.
- **People and the cat** ([`src/rigs/`](src/rigs)): one procedural rig, with outfits for each
  character and a pose library. The tabby is a separate small rig.
- **Sound** ([`src/engine/audio.js`](src/engine/audio.js)) is all Web Audio:
  - the ambience: a generator hum, pigeons, wind;
  - distant shots, a helicopter rotor, mortar whistles and impacts, car alarms;
  - walkie-talkie static;
  - a ney, and an oud playing in maqam Bayati for the flashback;
  - ringing ears at the news.
