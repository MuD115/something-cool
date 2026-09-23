# Event Horizon

A real-time, ray-traced Schwarzschild black hole for the browser, built with three.js.

Each pixel fires a photon backwards from the camera and integrates its path through curved
spacetime, so everything on screen comes from the physics:

- **Gravitational lensing**: the far side of the accretion disc is bent up over the top and
  under the bottom of the shadow, as in *Interstellar*. The starfield behind folds into an
  Einstein ring.
- **Photon ring**: thin, repeated images of the disc from light that orbits the hole
  before escaping.
- **Relativistic Doppler beaming**: gas orbiting at up to half the speed of light brightens
  and blue-shifts as it comes towards you, and dims and reddens as it moves away.
- **Gravitational redshift**: light climbing out of the well loses energy.
- **Keplerian shear**: inner gas laps the outer gas, winding turbulence into streaks.
- **Relativistic jets** (optional), with beaming towards the viewer.

A live telemetry panel shows your distance in Schwarzschild radii, how fast your clock runs
compared with a distant observer, the escape velocity and the local circular-orbit speed.

## Running it

It is a static page with no build step. three.js loads from jsDelivr through an import map.
Serve the folder with any static server:

```sh
npx serve event-horizon
# or
python3 -m http.server --directory event-horizon 8080
```

Then open the printed URL. Opening `index.html` straight from disk won't work, because
browsers block ES modules on `file://`.

## Controls

| Input | Action |
| --- | --- |
| Drag / one-finger drag | Orbit the black hole |
| Scroll / pinch | Move closer or further away (down to 2.6 rₛ, inside the ISCO) |
| `1`–`6` | Scenes: Interstellar, Relativistic, M87\*, Quasar, Lensing only, Newtonian |
| `C` | Toggle cinematic drift |
| `M` | Toggle the procedural soundtrack. The drone drops in pitch as your clock slows |
| `P` | Capture a full-resolution still |
| `H` | Hide or show the interface |
| `F` | Fullscreen |

You can link straight to a scene with a hash: `#relativistic`, `#m87`, `#quasar`,
`#lensing-only`, `#newtonian`.

The **Controls** panel exposes every parameter: light-bending strength, Doppler and redshift
amounts, disc radii, temperature, opacity, orbital speed, jets, sky, bloom, ray-step count and
resolution. Adaptive resolution is on by default and keeps the frame rate smooth on
weaker GPUs.

## How it works

Units are chosen so the Schwarzschild radius is `rₛ = 1`. Then the photon sphere is at
`r = 1.5` and the innermost stable circular orbit (ISCO) is at `r = 3`.

A photon's path in the Schwarzschild metric can be integrated in ordinary 3D coordinates as

```
d²x/dλ² = −(3/2) · h² · x / |x|⁵,     h = |x × dx/dλ|
```

which reproduces the exact relativistic orbit equation for light. The fragment shader in
[`src/shader.js`](src/shader.js) steps this equation with a step size that shrinks close to
the hole. Along each path it:

1. stops if the photon falls below `r = 1` (the event horizon), which leaves the pixel black;
2. finds each crossing of the equatorial plane and composites the disc front to back, using a
   Novikov–Thorne-style temperature profile, blackbody colour, and a combined Doppler and
   gravitational shift `g`. Observed temperature scales with `g` and intensity with `g³`;
3. accumulates emission from the jets while inside them;
4. on escape, looks up the procedural starfield and nebula in the photon's final direction.

The HDR result goes through `UnrealBloomPass`, then ACES tone mapping in `OutputPass`.

## Files

- `index.html`: page, styles, overlay UI and the import map
- `src/main.js`: renderer, camera, presets and tweening, GUI, telemetry, adaptive quality
- `src/shader.js`: the geodesic ray tracer (GLSL)
- `src/audio.js`: Web Audio drone driven by gravitational time dilation
