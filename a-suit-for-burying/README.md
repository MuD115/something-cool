# A Suit for Burying

An interactive 2D Western with real-time lighting and shadows. A widower in a black suit, his
late wife's grey mare, and choices that decide who he becomes.

The story borrows the bones of *Unforgiven* (1992): a retired killer, a promise to a dead
wife, a bounty and a horse that won't carry the man he used to be. The characters, dialogue
and events are all original. [`STORY.md`](STORY.md) holds the series bible and the plan for
the chapters to come.

## Chapter One: The Trunk

About five minutes per playthrough, with four decisions:

1. **The stranger:** hear Tobias out, or send him away (a long night changes Eli's mind).
2. **The trunk:** take the pistol from Ada's shawl, or leave it. Leave it, and someone else
   decides.
3. **The mare:** speak softly to Dove, or force her.
4. **The flood (timed):** hold the reins, or let go. What happens depends on how you
   treated Dove in choice 3.

The end card sums up the Eli you're making, and the choices are saved for Chapter Two.

## Playing

- **Easiest:** open `a-suit-for-burying.html` (the single-file build) by double-clicking it.
  It has no dependencies. It fetches its typefaces from Google Fonts if you're online, and
  otherwise falls back to system fonts.
- **From source:** serve the folder, for example with `python3 -m http.server --directory
  a-suit-for-burying 8080`, then open the printed URL. Run `python3 build.py` to rebuild the
  single file after editing `src/`.

Controls: click or press `1` / `2` to choose, `Space` to pause, `M` to mute, `F` for
fullscreen. Sound matters: turn it on.

## How it's made

Everything is drawn and synthesised in code. There are no images or audio files.

- **Lighting** ([`src/engine/renderer.js`](src/engine/renderer.js)). Each frame, the scene
  paints four Canvas 2D layers: *albedo*, *occluders*, *emissive* (sky and light sources) and
  *ground shadows*. A WebGL2 shader then lights them with up to four lights. It computes:
  - **projected shadows** on backdrops, where a pixel on the barn wall looks back along the
    ray to the lantern, so Eli and Dove throw giant shadows across the planks;
  - **rim light**, from the gradient of the occluder mask, so silhouettes glow on the side
    facing the light;
  - **cast shadows** along the ground, projected away from the key light;
  - god rays through the oak, bloom, lightning flashes, film grain and a vignette.
- **Characters** ([`src/rigs/`](src/rigs)).
  - The horse has two-bone IK legs driven by real gaits: a four-beat walk, a diagonal trot
    and a transverse gallop. It rears, bucks, swims, pins its ears, and has a springy tail.
    Its hooves trigger the hoof sounds.
  - The people share one rig with outfits (Eli's frock coat, Tobias's vest, June's dress)
    and a pose library.
- **Direction** ([`src/engine/director.js`](src/engine/director.js),
  [`src/story/chapter1.js`](src/story/chapter1.js)). Scenes are data: timed dialogue, cards,
  sound cues and choices, plus a short staging script per scene. Choices name the next scene,
  so the branch graph lives in the script.
- **Sound** ([`src/engine/audio.js`](src/engine/audio.js)).
  - Wind, rain and river beds made from filtered noise.
  - Synthesised hooves, falls, thunder, snorts and a panicked neigh.
  - A sparse score on a Karplus–Strong plucked string over a low drone, in a hall reverb.
