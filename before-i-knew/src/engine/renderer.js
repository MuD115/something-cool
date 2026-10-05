// Deferred 2D lighting.
//
// Scenes paint into four Canvas 2D layers each frame:
//   albedo    – the painted colours of everything that receives light
//   occluders – alpha of anything that casts a shadow
//   emissive  – light sources and sky (not lit, but glowing)
//   ground    – contact/cast shadows projected onto the ground plane
//   height    – surface relief (materials, and the characters' rounded
//               forms): the red channel is height; a pixel marked blue with
//               no green is an object's own relief, which is lit even where
//               it casts a shadow, while walls' relief only shows where
//               nothing stands in front of them
// A WebGL2 pass then lights the albedo with up to four point or directional
// lights: projected shadows on backdrops (so a lantern throws giant shadows
// on a barn wall), relief from the height layer (light rakes across mortar
// and cracks), contact shading where things meet a wall, rim light on
// silhouettes from the occluder gradient, god rays, bloom, ground fog, a
// split-tone grade, lens dirt, lightning flashes, film grain and a vignette.

import { Camera } from './camera.js';
import { texturePath, heightPath } from './materials.js';

const MAX_LIGHTS = 4;

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uAlb;
uniform sampler2D uOcc;
uniform sampler2D uEmit;
uniform sampler2D uShd;
uniform sampler2D uHgt;
uniform vec4 uRelief;              // strength, object strength, contact AO, dirt
uniform vec4 uFog;                 // density, height (world units), world y at top, at bottom
uniform vec3 uFogCol;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform vec2 uRes;
uniform vec3 uAmbient;
uniform int uCount;
uniform vec2 uLP[${MAX_LIGHTS}];
uniform vec3 uLC[${MAX_LIGHTS}];
uniform vec4 uLK[${MAX_LIGHTS}];   // falloff radius, projection k, softness, rim
uniform vec4 uLS[${MAX_LIGHTS}];   // spot: direction (uv, y down), cos(outer), cos(inner)
uniform vec4 uGrade;               // saturation, contrast, lift, unused
uniform vec3 uTint;
uniform vec2 uGodPos;
uniform float uGod;
uniform float uBloom;
uniform vec3 uFlash;
uniform float uGroundShadow;
uniform float uTime;
uniform float uFade;
uniform float uVignette; // extra darkening at the edges (time passing, grief)
uniform float uGrain;
uniform float uExposure;

vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec4 alb = texture(uAlb, uv);
  float occ = texture(uOcc, uv).a;
  vec3 emit = toLin(texture(uEmit, uv).rgb);
  float gshd = textureLod(uShd, uv, 1.2).a;
  vec3 base = toLin(alb.rgb);

  // Outward normal of silhouettes, from the occluder alpha gradient.
  vec2 px = 1.0 / uRes;
  float rr = 2.5;
  float ax = texture(uOcc, uv + vec2(px.x * rr, 0.0)).a - texture(uOcc, uv - vec2(px.x * rr, 0.0)).a;
  float ay = texture(uOcc, uv + vec2(0.0, px.y * rr)).a - texture(uOcc, uv - vec2(0.0, px.y * rr)).a;
  vec2 grad = vec2(ax * aspect, ay);
  float edge = clamp(length(grad) * 0.7, 0.0, 1.0);
  vec2 nrm = edge > 0.001 ? -normalize(grad) : vec2(0.0);

  // Relief: a surface normal from the height layer's slope. Walls only show
  // it where nothing stands in front; objects carry their own everywhere.
  vec4 hs = texture(uHgt, uv);
  float isObj = step(0.9, hs.b) * step(hs.g, 0.1);
  float hw = hs.a * mix(1.0 - occ, 1.0, isObj) * mix(uRelief.x, uRelief.y, isObj);
  vec3 N = vec3(0.0, 0.0, 1.0);
  float cavity = 1.0;
  if (hw > 0.002) {
    vec2 hp = px * 1.5;
    vec4 h1 = texture(uHgt, uv + vec2(hp.x, 0.0));
    vec4 h2 = texture(uHgt, uv - vec2(hp.x, 0.0));
    vec4 h3 = texture(uHgt, uv + vec2(0.0, hp.y));
    vec4 h4 = texture(uHgt, uv - vec2(0.0, hp.y));
    // at the edge of a surface the slope means nothing: fade it out
    float inside = min(min(h1.a, h2.a), min(h3.a, h4.a));
    float hr = hs.r / max(hs.a, 0.001);
    vec2 slope = vec2(h1.r / max(h1.a, 0.001) - h2.r / max(h2.a, 0.001), h3.r / max(h3.a, 0.001) - h4.r / max(h4.a, 0.001));
    N = normalize(vec3(-slope * 2.2 * hw * inside, 1.0));
    // mortar joints, cracks and pocks hold less light
    cavity = mix(1.0, 0.55 + 0.45 * smoothstep(0.1, 0.6, hr), hw * inside * 0.8);
  }

  // Form: things that cast shadows (people, poles, cars) are rounded from
  // their silhouette, so the side towards a light is lit and the far side
  // turns away into shade.
  vec2 fp = px * 4.0;
  vec2 og = vec2(textureLod(uOcc, uv + vec2(fp.x, 0.0), 2.0).a - textureLod(uOcc, uv - vec2(fp.x, 0.0), 2.0).a,
                 textureLod(uOcc, uv + vec2(0.0, fp.y), 2.0).a - textureLod(uOcc, uv - vec2(0.0, fp.y), 2.0).a);
  vec2 formN = -og;

  // Contact shading: a wall darkens softly where something stands in front
  // of it, most of all just below (feet, bases, the foot of a car).
  float contact = textureLod(uOcc, uv + vec2(0.0, px.y * 6.0), 4.0).a;
  float aoK = 1.0 - contact * (1.0 - occ) * uRelief.z;

  vec3 light = (uAmbient * cavity * aoK) + uFlash;
  vec3 rim = vec3(0.0);

  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uCount) break;
    vec2 d = uLP[i] - uv;
    vec2 da = vec2(d.x * aspect, d.y);
    float dist = length(da);
    vec4 k = uLK[i];
    float att = k.x > 0.0 ? 1.0 / (1.0 + (dist * dist) / (k.x * k.x)) : 1.0;

    float sh = 1.0;
    if (k.y > 0.0) {
      // The backdrop sits behind the actors: a backdrop pixel is shadowed
      // by whatever occluder lies on the line back toward the light,
      // scaled by 1/k — which enlarges shadows the further the wall is.
      vec2 src = uLP[i] + (uv - uLP[i]) / k.y;
      float s = texture(uOcc, src).a * 0.28;
      s += texture(uOcc, src + vec2(k.z, 0.0)).a * 0.18;
      s += texture(uOcc, src - vec2(k.z, 0.0)).a * 0.18;
      s += texture(uOcc, src + vec2(0.0, k.z * aspect)).a * 0.18;
      s += texture(uOcc, src - vec2(0.0, k.z * aspect)).a * 0.18;
      sh = 1.0 - s * (1.0 - occ) * 0.92;
    }
    if (i == 0) sh *= 1.0 - gshd * uGroundShadow * (1.0 - occ);

    // Spotlights (the torch): fade outside a cone around the beam direction.
    vec4 sp = uLS[i];
    if (sp.z > -1.5) {
      vec2 fromL = dist > 0.0001 ? -da / dist : vec2(0.0);
      vec2 sd = normalize(sp.xy); // world and aspect-corrected uv share directions
      att *= smoothstep(sp.z, sp.w, dot(fromL, sd));
    }
    vec2 ld0 = dist > 0.0001 ? da / dist : vec2(0.0);
    // relief: how squarely this bit of surface faces the light, against how
    // squarely a flat one would (lights sit a little in front of the scene)
    vec2 tilt = N.xy / max(N.z, 0.3);
    float bump = clamp(1.0 + dot(tilt, ld0) * 1.3 * smoothstep(0.0, 0.06, dist), 0.0, 2.2);
    float form = clamp(1.0 + dot(formN, ld0) * 1.1 * occ * uRelief.y * smoothstep(0.0, 0.06, dist), 0.3, 1.9);
    light += uLC[i] * att * sh * bump * form * cavity * mix(1.0, aoK, 0.6);
    vec2 ld = dist > 0.0001 ? da / dist : vec2(0.0);
    rim += uLC[i] * min(att * 1.6, 1.0) * k.w * edge * max(dot(nrm, ld), 0.0);
  }

  vec3 col = base * light + rim * occ + emit;

  // Ground fog: thickest at street level, thinning with height, drifting.
  if (uFog.x > 0.0) {
    float wy = mix(uFog.z, uFog.w, uv.y);
    float drift = 0.75 + 0.5 * vnoise(vec2(uv.x * 5.0 + uTime * 0.03, uv.y * 11.0 - uTime * 0.01));
    float fk = uFog.x * exp(min(wy, 0.0) / uFog.y) * drift;
    fk = clamp(fk, 0.0, 0.85);
    col = mix(col, toLin(uFogCol) * (uAmbient * 2.2 + 0.08), fk);
  }

  // Light shafts: march toward the sun through the emissive sky, blocked by occluders.
  if (uGod > 0.0) {
    vec2 dir = (uv - uGodPos) / 48.0;
    vec2 c = uv;
    float decay = 1.0;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 48; i++) {
      c -= dir;
      vec3 s = toLin(texture(uEmit, c).rgb) * (1.0 - texture(uOcc, c).a);
      acc += s * decay;
      decay *= 0.955;
    }
    col += acc / 48.0 * uGod;
  }

  // Bloom from the emissive layer's mip chain.
  vec3 glow = toLin(textureLod(uEmit, uv, 3.0).rgb) * 0.5 + toLin(textureLod(uEmit, uv, 5.0).rgb) * 0.8;
  // lens dirt: bloom catches on a smudged lens
  float dirt = 1.0 + uRelief.w * (vnoise(uv * vec2(7.0, 4.0)) * 1.4 + vnoise(uv * 23.0) * 0.6 - 0.5);
  col += max(glow - 0.05, 0.0) * uBloom * dirt;

  col = aces(col * uExposure);
  col = pow(col, vec3(1.0 / 2.2));

  // Colour grade: warm memories, drained grief.
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, uGrade.x);
  col = (col - 0.5) * uGrade.y + 0.5 + uGrade.z;
  col *= uTint;
  // split tone: shadows and highlights each take a colour
  col *= mix(uShadowTint, uHighTint, smoothstep(0.05, 0.85, luma));
  col = clamp(col, 0.0, 1.0);

  vec2 q = uv - 0.5;
  col *= max(0.0, 1.0 - dot(q * vec2(0.9, 1.3), q * vec2(0.9, 1.3)) * (0.9 + uVignette * 3.2));
  col += (hash(uv * uRes + fract(uTime * 7.13) * 91.0) - 0.5) * uGrain;
  col *= 1.0 - uFade;
  outColor = vec4(col, 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is required');
    this.gl = gl;
    this.cam = new Camera();

    const mk = () => {
      const c = document.createElement('canvas');
      return { c, x: c.getContext('2d') };
    };
    this.layers = { alb: mk(), occ: mk(), emit: mk(), shd: mk(), hgt: mk() };

    this.prog = this.program(VERT, FRAG);
    this.u = {};
    const n = gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(this.prog, i).name.replace(/\[0\]$/, '');
      this.u[name] = gl.getUniformLocation(this.prog, name);
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.tex = {};
    ['alb', 'occ', 'emit', 'shd', 'hgt'].forEach((k, i) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      const mip = k === 'emit' || k === 'shd' || k === 'occ';
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.tex[k] = { t, unit: i, mip };
    });
    // Canvas pixels are premultiplied internally; keep them that way so a
    // faint glow stays faint and mipmaps (bloom) average correctly.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.useProgram(this.prog);
    gl.uniform1i(this.u.uAlb, 0);
    gl.uniform1i(this.u.uOcc, 1);
    gl.uniform1i(this.u.uEmit, 2);
    gl.uniform1i(this.u.uShd, 3);
    gl.uniform1i(this.u.uHgt, 4);
    // quality: relief and the rest switch off on Low
    this.fx = { relief: true, dirt: false };
  }

  program(vs, fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  resize(w, h) {
    this.W = w;
    this.H = h;
    this.canvas.width = w;
    this.canvas.height = h;
    for (const k in this.layers) {
      this.layers[k].c.width = w;
      this.layers[k].c.height = h;
    }
  }

  // ---- painting API used by sets, rigs and scenes -------------------------

  // Set every layer's transform for a parallax depth.
  layer(depth = 1) {
    for (const k in this.layers) this.cam.apply(this.layers[k].x, this.W, this.H, depth);
    this.depth = depth;
  }

  // Sky and light sources: emissive only.
  sky(fn) {
    fn(this.layers.emit.x);
  }

  // Far distance: drawn into the emissive layer as it is (unlit, already
  // hazed), so it reads like sky; nearer painted things cover it as usual.
  far(fn) {
    const e = this.layers.emit.x;
    e.save();
    e.globalCompositeOperation = 'source-over';
    fn(e);
    e.restore();
  }

  // Opaque, lit, casts no shadow. Covers anything glowing behind it.
  paint(fn) {
    fn(this.layers.alb.x);
    const e = this.layers.emit.x;
    e.save();
    e.globalCompositeOperation = 'destination-out';
    fn(e);
    e.restore();
  }

  // Opaque, lit and shadow-casting.
  cast(fn) {
    this.paint(fn);
    fn(this.layers.occ.x);
  }

  // Opaque and lit, and hides any occluder beneath it (water over legs).
  cover(fn) {
    this.paint(fn);
    const o = this.layers.occ.x;
    o.save();
    o.globalCompositeOperation = 'destination-out';
    fn(o);
    o.restore();
  }

  // A textured surface: path(ctx) builds a path, which is filled with the
  // material over the colour already painted there, and its relief goes
  // into the height layer. (Paint the base colour first, with paint/cast.)
  surface(path, mat, opts = {}) {
    const a = this.layers.alb.x;
    a.save();
    a.beginPath();
    path(a);
    texturePath(a, mat, opts);
    a.restore();
    if (!this.fx.relief) return;
    const h = this.layers.hgt.x;
    h.save();
    h.beginPath();
    path(h);
    heightPath(h, mat, opts);
    h.restore();
  }

  // Draw straight into the height layer (a character's rounded forms, a
  // baked façade's relief).
  height(fn) {
    if (!this.fx.relief) return;
    fn(this.layers.hgt.x);
  }

  // Additive light on top: flames, windows, glints, lightning.
  glow(fn) {
    const e = this.layers.emit.x;
    e.save();
    e.globalCompositeOperation = 'lighter';
    fn(e);
    e.restore();
  }

  // A shadow on the ground: fn's shape, sheared away from the key light and
  // flattened onto the ground plane about the point (ax, ay).
  shadow(fn, ax, ay, shear, squash = 0.16) {
    const s = this.layers.shd.x;
    s.save();
    s.translate(ax, ay);
    s.transform(1, 0, shear, squash, 0, 0);
    s.translate(-ax, -ay);
    fn(s);
    s.restore();
  }

  // ---- frame ---------------------------------------------------------------

  frame(draw, look) {
    const { W, H } = this;
    for (const k in this.layers) {
      const x = this.layers[k].x;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-over';
      x.globalAlpha = 1;
      x.clearRect(0, 0, W, H);
    }
    this.layers.alb.x.fillStyle = '#000';
    this.layers.alb.x.fillRect(0, 0, W, H);
    this.layer(1);
    draw(this);

    const gl = this.gl;
    gl.viewport(0, 0, W, H);
    for (const k in this.tex) {
      const { t, unit, mip } = this.tex[k];
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.layers[k].c);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    }

    const u = this.u;
    const lights = (look.lights || []).slice(0, MAX_LIGHTS);
    const lp = new Float32Array(MAX_LIGHTS * 2);
    const lc = new Float32Array(MAX_LIGHTS * 3);
    const lk = new Float32Array(MAX_LIGHTS * 4);
    const ls = new Float32Array(MAX_LIGHTS * 4).fill(-2);
    lights.forEach((l, i) => {
      const [ux, uy] = l.uv || this.cam.toUv(l.x, l.y, W, H, l.depth ?? 1);
      lp[i * 2] = ux;
      lp[i * 2 + 1] = uy;
      const inten = l.intensity ?? 1;
      lc[i * 3] = l.color[0] * inten;
      lc[i * 3 + 1] = l.color[1] * inten;
      lc[i * 3 + 2] = l.color[2] * inten;
      lk[i * 4] = l.radius ?? 0;
      lk[i * 4 + 1] = l.project ?? 0;
      lk[i * 4 + 2] = l.soft ?? 0.004;
      lk[i * 4 + 3] = l.rim ?? 0.45;
      if (l.cone) {
        // l.dir: beam angle in world space (radians, 0 = right, +y down)
        ls[i * 4] = Math.cos(l.dir);
        ls[i * 4 + 1] = Math.sin(l.dir);
        ls[i * 4 + 2] = Math.cos(l.cone);
        ls[i * 4 + 3] = Math.cos(l.cone * 0.55);
      }
    });
    gl.uniform2fv(u.uLP, lp);
    gl.uniform3fv(u.uLC, lc);
    gl.uniform4fv(u.uLK, lk);
    gl.uniform4fv(u.uLS, ls);
    const gr = look.grade || {};
    gl.uniform4f(u.uGrade, gr.sat ?? 1, gr.contrast ?? 1, gr.lift ?? 0, 0);
    gl.uniform3fv(u.uTint, gr.tint || [1, 1, 1]);
    gl.uniform1i(u.uCount, lights.length);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform3fv(u.uAmbient, look.ambient || [0.2, 0.2, 0.25]);
    gl.uniform3fv(u.uFlash, look.flash || [0, 0, 0]);
    const god = look.god;
    if (god) {
      const [gx, gy] = god.uv || this.cam.toUv(god.x, god.y, W, H, god.depth ?? 1);
      gl.uniform2f(u.uGodPos, gx, gy);
      gl.uniform1f(u.uGod, god.strength);
    } else gl.uniform1f(u.uGod, 0);
    gl.uniform1f(u.uBloom, look.bloom ?? 0.6);
    gl.uniform1f(u.uGroundShadow, look.groundShadow ?? 0.7);
    gl.uniform1f(u.uTime, look.time || 0);
    gl.uniform1f(u.uFade, look.fade || 0);
    if (u.uVignette) gl.uniform1f(u.uVignette, look.vignette || 0);
    gl.uniform1f(u.uGrain, look.grain ?? 0.05);
    gl.uniform1f(u.uExposure, look.exposure ?? 1);
    const rel = look.relief ?? 1;
    gl.uniform4f(u.uRelief, this.fx.relief ? 0.9 * rel : 0, this.fx.relief ? 1.0 : 0, 0.22 * (look.contact ?? 1), this.fx.dirt ? (look.dirt ?? 0.35) : 0);
    const fog = look.fog;
    if (fog) {
      const f = this.cam.frame(W, H, 1);
      gl.uniform4f(u.uFog, fog.density ?? 0.25, fog.height ?? 120, (0 - f.oy) / f.s, (H - f.oy) / f.s);
      gl.uniform3fv(u.uFogCol, fog.color || [0.6, 0.58, 0.55]);
    } else gl.uniform4f(u.uFog, 0, 1, 0, 0);
    gl.uniform3fv(u.uShadowTint, gr.shadows || [1, 1, 1]);
    gl.uniform3fv(u.uHighTint, gr.highs || [1, 1, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
