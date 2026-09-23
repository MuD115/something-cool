// Full-screen ray tracer for a Schwarzschild black hole.
//
// Units: the Schwarzschild radius r_s = 1 (so M = 0.5, photon sphere r = 1.5,
// innermost stable circular orbit r = 3). Each pixel fires a photon backwards
// from the camera and integrates its null geodesic with the classic
// "effective potential" trick: in flat coordinates a photon obeys
//   d²x/dλ² = -3/2 · h² · x / |x|⁵,   h = |x × v|
// which reproduces the exact Schwarzschild orbit equation.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uCamPos;
  uniform mat4  uCamWorld;
  uniform float uTanHalfFov;
  uniform float uAspect;
  uniform float uPixelAngle;

  uniform float uLensing;
  uniform float uDoppler;
  uniform float uRedshift;

  uniform float uDiscInner;
  uniform float uDiscOuter;
  uniform float uDiscTemp;
  uniform float uDiscBrightness;
  uniform float uDiscOpacity;
  uniform float uDiscSpeed;
  uniform float uDiscDetail;

  uniform float uJets;
  uniform float uStars;
  uniform float uNebula;
  uniform float uExposure;

  uniform int   uSteps;
  uniform float uStepScale;

  #define MAX_STEPS 720
  #define PI 3.14159265359

  // ---------------------------------------------------------------- noise ---
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i + vec3(0, 0, 0)), hash13(i + vec3(1, 0, 0)), u.x),
          mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
      mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x),
          mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y),
      u.z);
  }

  float fbm(vec3 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      sum += amp * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 4.1);
      amp *= 0.5;
    }
    return sum;
  }

  // ----------------------------------------------------------- blackbody ---
  // Approximate sRGB-ish colour of a blackbody at temperature T (kelvin).
  vec3 blackbody(float T) {
    vec3 c;
    c.r = 56100000.0 * pow(T, -1.5) + 148.0;
    c.g = T > 6500.0 ? 35200000.0 * pow(T, -1.5) + 184.0 : 100.04 * log(T) - 623.6;
    c.b = 194.18 * log(T) - 1448.6;
    c = clamp(c, 0.0, 255.0) / 255.0;
    if (T < 1000.0) c *= T / 1000.0;
    return c * c; // to linear
  }

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // ------------------------------------------------------ accretion disc ---
  // Returns premultiplied-style emission (rgb) and opacity (a) where the
  // photon crosses the equatorial plane at 'hit'.
  vec4 discSample(vec3 hit, vec3 rd) {
    float r = length(hit.xz);
    float inner = uDiscInner;
    float outer = uDiscOuter;
    if (r < inner * 0.92 || r > outer * 1.05) return vec4(0.0);

    // Keplerian shear, cross-faded between two phases so the pattern never
    // winds itself into featureless rings.
    float period = 18.0;
    float omega = uDiscSpeed * 0.7071 * pow(r, -1.5);
    float omegaRef = uDiscSpeed * 0.7071 * pow(inner * 2.0, -1.5);
    float t = uTime;
    float ph1 = fract(t / period);
    float ph2 = fract(t / period + 0.5);
    float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
    float base = omegaRef * t;

    vec2 q1 = rot(base + (omega - omegaRef) * ph1 * period) * hit.xz;
    vec2 q2 = rot(base + (omega - omegaRef) * ph2 * period) * hit.xz;

    // Streaks: the angular coordinate is sampled on a fixed small circle, so
    // features stretch along the orbit; a little isotropic noise adds clumps.
    int oct = int(uDiscDetail);
    vec2 u1 = normalize(q1);
    vec2 u2 = normalize(q2);
    float n1 = fbm(vec3(u1 * 2.4, r * 1.7), oct) * 0.75 + fbm(vec3(q1 * 0.9, r * 0.8), 3) * 0.25;
    float n2 = fbm(vec3(u2 * 2.4 + 7.7, r * 1.7), oct) * 0.75 + fbm(vec3(q2 * 0.9 + 3.1, r * 0.8), 3) * 0.25;
    float n = mix(n2, n1, w1);

    // Fine, broken lanes of denser gas.
    float lanes = 0.78 + 0.22 * sin(r * 7.0 + n * 12.0);
    float density = smoothstep(0.22, 0.8, n) * lanes;

    float edge = smoothstep(inner * 0.92, inner * 1.08, r)
               * (1.0 - smoothstep(outer * 0.55, outer * 1.05, r));
    density *= edge;

    // Novikov–Thorne-like temperature profile, normalised to peak at 1.
    float x = inner / r;
    float prof = pow(x, 0.75) * pow(max(1.0 - sqrt(x), 0.0), 0.25) / 0.488;
    prof = max(prof, 0.0);

    // Relativistic Doppler factor of the orbiting gas.
    vec3 vdir = normalize(vec3(-hit.z, 0.0, hit.x));
    float beta = min(sqrt(0.5 / max(r - 1.0, 0.05)), 0.95);
    float gamma = inversesqrt(1.0 - beta * beta);
    float cosT = dot(vdir, -rd);
    float D = 1.0 / (gamma * (1.0 - beta * cosT));

    // Gravitational redshift relative to the camera.
    float rc = length(uCamPos);
    float grav = sqrt(max(1.0 - 1.0 / r, 0.001)) / sqrt(max(1.0 - 1.0 / rc, 0.001));

    float g = mix(1.0, D, uDoppler) * mix(1.0, grav, uRedshift);

    float T = uDiscTemp * (0.25 + 0.75 * prof) * g;
    float I = uDiscBrightness * pow(prof, 3.0) * pow(g, 3.0);

    vec3 emission = blackbody(T) * I * (0.2 + 1.3 * density);

    // Thin slab: grazing rays travel through more material.
    float slant = max(abs(rd.y), 0.12);
    float a = 1.0 - exp(-density * uDiscOpacity * 2.2 / slant);
    return vec4(emission, clamp(a, 0.0, 1.0));
  }

  // --------------------------------------------------- relativistic jets ---
  vec3 jetSample(vec3 p, vec3 rd, float dt) {
    float ay = abs(p.y);
    if (ay < 1.1 || ay > 48.0) return vec3(0.0);
    float d = length(p.xz);
    float w = 0.12 + ay * 0.06;
    if (d > w * 3.0) return vec3(0.0);
    float core = exp(-d * d / (w * w));
    float s = sign(p.y);
    float n = fbm(vec3(p.xz * 1.3 / w, ay * 0.35 - uTime * 2.4), 3);
    float knots = 0.6 + 0.4 * sin(ay * 0.9 - uTime * 3.0);
    float fall = smoothstep(1.1, 3.5, ay) * exp(-ay * 0.055);
    // Beaming: the jet pointing at the camera is far brighter.
    float beta = 0.92;
    float cosT = dot(vec3(0.0, s, 0.0), -rd);
    float D = 1.0 / (inversesqrt(1.0 - beta * beta) * (1.0 - beta * cosT));
    float boost = mix(1.0, min(pow(D, 2.0), 5.0), uDoppler) * 0.35;
    vec3 c = mix(vec3(0.35, 0.55, 1.0), vec3(0.85, 0.7, 1.0), n);
    return c * core * (0.3 + n * knots) * fall * boost * dt * uJets * 3.0;
  }

  // ---------------------------------------------------------- background ---
  vec3 starLayer(vec3 d, float scale, float density, float pix) {
    vec3 p = d * scale;
    vec3 id = floor(p);
    vec3 h = hash33(id);
    if (h.z > density) return vec3(0.0);
    vec3 sp = normalize(id + 0.3 + 0.4 * h);
    float dist = length(d - sp);
    float size = pix * 0.75;
    float b = exp(-dist * dist / (size * size));
    // Keep each star's total flux independent of the render resolution.
    float flux = min(0.0012 / size, 1.0);
    float mag = pow(hash13(id + 7.1), 14.0) * 4.0 + 0.04;
    float temp = mix(3000.0, 15000.0, pow(h.y, 1.8));
    return blackbody(temp) * b * mag * flux * flux * 2.5;
  }

  vec3 background(vec3 d) {
    vec3 col = vec3(0.0);

    // A faint galactic band and nebular dust.
    vec3 bandN = normalize(vec3(0.35, 1.0, -0.25));
    float lat = dot(d, bandN);
    float band = exp(-lat * lat * 9.0);
    float dust = fbm(d * 3.0 + vec3(3.1, 0.4, 7.7), 5);
    float wisps = fbm(d * 7.0 - vec3(1.3), 4);
    vec3 neb = mix(vec3(0.06, 0.03, 0.12), vec3(0.22, 0.09, 0.06), smoothstep(0.35, 0.75, dust));
    neb += vec3(0.05, 0.1, 0.18) * smoothstep(0.5, 0.9, wisps);
    col += neb * (0.025 + band * 0.4) * smoothstep(0.3, 0.8, dust) * uNebula;

    float pix = max(uPixelAngle, 0.0006);
    vec3 stars = starLayer(d, 60.0, 0.04, pix)
               + starLayer(d, 130.0, 0.025, pix) * 0.6
               + starLayer(d, 260.0, 0.006 + band * 0.05, pix) * 0.45;
    col += stars * uStars * (0.7 + band * 0.8);
    return col;
  }

  // ----------------------------------------------------------------- main ---
  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 dirCam = normalize(vec3(ndc.x * uTanHalfFov * uAspect, ndc.y * uTanHalfFov, -1.0));
    vec3 rd = normalize(mat3(uCamWorld) * dirCam);

    vec3 pos = uCamPos;
    vec3 vel = rd;
    float h2 = dot(cross(pos, vel), cross(pos, vel));
    float escapeR = max(length(uCamPos) * 1.3, 40.0);

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    bool captured = false;

    // Interleaved gradient noise hides step banding in the jets.
    float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));

    for (int i = 0; i < MAX_STEPS; i++) {
      if (i >= uSteps) break;

      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) { captured = true; break; }
      if (r > escapeR && dot(pos, vel) > 0.0) break;
      if (alpha > 0.995) break;

      float dt = clamp(uStepScale * r, 0.012, 2.5);
      if (i == 0) dt *= jitter;

      vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r) * uLensing;
      vec3 prev = pos;
      vel += acc * dt;
      pos += vel * dt;

      if (prev.y * pos.y < 0.0) {
        float t = prev.y / (prev.y - pos.y);
        vec3 hit = mix(prev, pos, t);
        vec4 d = discSample(hit, normalize(vel));
        col += (1.0 - alpha) * d.rgb * d.a;
        alpha += (1.0 - alpha) * d.a;
      }

      if (uJets > 0.001) {
        col += (1.0 - alpha) * jetSample(pos, normalize(vel), dt);
      }
    }

    if (!captured) {
      col += (1.0 - alpha) * background(normalize(vel));
    }

    gl_FragColor = vec4(col * uExposure, 1.0);
  }
`;
