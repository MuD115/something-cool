# Event Horizon

Watch, hear and scrub through a binary black hole merger, ray-traced live in the browser with
three.js. Then explore the black hole it leaves behind.

## Collision

The page opens on a merger modelled on **GW150914**, the first gravitational waves ever
detected. The masses here are equal: two black holes of 32.5 Suns each.

- **Two lenses at once.** Every pixel's light ray is bent by both holes. Each hole's glowing
  mini disc appears warped around the other hole's shadow.
- **Gravitational waves you can see.** The waves spread outward as a two-armed spiral at a
  finite speed. Their (hugely exaggerated) strain ripples the starlight passing through them,
  and an optional glow traces the wave crests.
- **Gravitational waves you can hear.** Turn sound on to hear the chirp at the pitch the
  waves would really have at each separation: 19 Hz rising to about 260 Hz. That is the range
  LIGO's detectors recorded. Playback is 33× slower than reality, since the real inspiral
  lasts under a second.
- **A LIGO-style strain trace** of the whole event. Drag it to scrub through time, and the
  holes, waves and sound follow. The time axis is stretched around the merger, as in LIGO's
  zoomed plots.
- **Merger, ringdown and a new disc.** The mini discs are torn apart as the orbit shrinks.
  The holes merge into one horizon, which wobbles as it rings down. Then gas floods in and a
  fresh accretion disc lights up around the single, heavier black hole.
- **Real numbers** throughout: separation in km, wave frequency in Hz, orbital speed as a
  fraction of *c*, and real time left before the merger. Afterwards the readout shows the final
  mass and the 3.2 Suns' worth of energy radiated as gravitational waves.

## Put anything behind a black hole

Use the **Sky** buttons to hang a calibration grid behind the hole, or drop in any image
(drag it onto the page, or choose **Your image…**). Move closer and watch it bend into an
Einstein ring. It works in both modes. With the binary, your picture is lensed twice.

## Explore one black hole

The single Schwarzschild black hole ray tracer that the merger ends on. Each pixel fires a photon
backwards from the camera and integrates its path through curved spacetime, so everything on
screen comes from the physics:

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
| `0` | The collision |
| `Space` / `R` | Play or pause, restart the collision |
| `1`–`6` | Explore scenes: Interstellar, Relativistic, M87\*, Quasar, Lensing only, Newtonian |
| `C` | Toggle cinematic drift |
| `M` | Sound: the gravitational-wave chirp, plus an ambient drone that drops in pitch as your clock slows |
| `P` | Capture a full-resolution still |
| `H` | Hide or show the interface |
| `F` | Fullscreen |

You can link straight to a scene with a hash: `#collision` (the default), `#interstellar`,
`#relativistic`, `#m87`, `#quasar`, `#lensing-only`, `#newtonian`.

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

### The merger model, and its limits

- **Inspiral.** The Newtonian quadrupole chirp: separation `a(t) = a₀ (1 − t/T)^¼`, so the
  orbital phase has a closed form, `Φ(t) = (8/5) ω₀ T [1 − (1 − t/T)^⅝]`. The shader, the camera,
  the strain trace and the audio all evaluate the same formulas, so everything stays in sync,
  even while scrubbing ([`src/merger.js`](src/merger.js)).
- **Units.** The binary's total Schwarzschild radius is 1, which is 192 km for 65 solar masses.
  The real-world readouts (km, Hz, time left from the Peters formula) are computed from that
  scale.
- **Lensing by two holes.** The two deflections are superposed. That is an approximation: an
  exact binary spacetime needs numerical relativity (as in the SXS simulations). It captures
  the look, with two shadows lensing each other, but not the exact shapes.
- **Gravitational waves.** A travelling quadrupole ripple, `h ∝ A(t−r/c) cos(2φ − 2Φ(t−r/c)) / r`.
  Rays are bent by its gradient, with the strain exaggerated about 10²⁰ times (real strain at
  Earth was 10⁻²¹). The wave speed is slowed so the spiral stays on screen.
- **Merger and ringdown** are stylised. The common horizon forms at a fixed separation, 5% of
  the mass is radiated, and the new horizon's quadrupole wobble decays exponentially.

## Files

- `index.html`: page, styles, overlay UI and the import map
- `src/main.js`: renderer, camera, modes, presets and tweening, GUI, telemetry, adaptive quality
- `src/shader.js`: the geodesic ray tracer (GLSL): one or two holes, discs, jets, wave field, backdrops
- `src/merger.js`: the merger timeline and its physical readouts
- `src/scope.js`: the scrubbable strain trace
- `src/sky.js`: the calibration grid and user-image backdrops
- `src/audio.js`: Web Audio drone and gravitational-wave chirp
