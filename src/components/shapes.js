import * as THREE from 'three';

// Particle "icons" for the scroll-driven 3D object. Every shape returns exactly `count`
// xyz points so the vertex shader can morph between them index-for-index.

const rand = (min, max) => min + Math.random() * (max - min);
const TAU = Math.PI * 2;

function jitter(v, th, depth = th) {
  v.x += rand(-th, th);
  v.y += rand(-th, th);
  v.z += rand(-depth, depth);
  return v;
}

/* ---------- Primitives: each returns a sampler (v) => void ---------- */

function polyline(points, { th = 0.035, z = 0, depth = th, closed = false } = {}) {
  const pts = closed ? [...points, points[0]] : points;
  const lengths = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lengths.push(l);
    total += l;
  }
  return (v) => {
    let d = Math.random() * total;
    let i = 0;
    while (d > lengths[i] && i < lengths.length - 1) d -= lengths[i++];
    const t = lengths[i] ? d / lengths[i] : 0;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    jitter(v.set(ax + (bx - ax) * t, ay + (by - ay) * t, z), th, depth);
  };
}

const seg = (ax, ay, bx, by, opts) => polyline([[ax, ay], [bx, by]], opts);

const rectOutline = (x0, y0, x1, y1, opts) =>
  polyline([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { ...opts, closed: true });

const rectFill = (x0, y0, x1, y1, z = 0, depth = 0.01) => (v) =>
  v.set(rand(x0, x1), rand(y0, y1), z + rand(-depth, depth));

const disc = (cx, cy, r, z = 0) => (v) => {
  const a = Math.random() * TAU;
  const d = Math.sqrt(Math.random()) * r;
  v.set(cx + Math.cos(a) * d, cy + Math.sin(a) * d, z);
};

const ball = (cx, cy, cz, r) => (v) => {
  v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(Math.cbrt(Math.random()) * r);
  v.x += cx;
  v.y += cy;
  v.z += cz;
};

function assemble(count, parts, { tilt, offset = [0, 0, 0], halo = 0.08 } = {}) {
  const out = new Float32Array(count * 3);
  const body = Math.floor(count * (1 - halo));
  const total = parts.reduce((sum, p) => sum + p[0], 0);
  const euler = tilt ? new THREE.Euler(...tilt) : null;
  const v = new THREE.Vector3();
  let i = 0;

  parts.forEach(([weight, sample], k) => {
    const n = k === parts.length - 1 ? body - i : Math.round((body * weight) / total);
    for (let j = 0; j < n; j++, i++) {
      sample(v);
      v.x += offset[0];
      v.y += offset[1];
      v.z += offset[2];
      if (euler) v.applyEuler(euler);
      out.set([v.x, v.y, v.z], i * 3);
    }
  });

  // A faint halo of loose particles keeps the transitions lively.
  const haloSample = ball(0, 0, 0, 3.2);
  for (; i < count; i++) {
    haloSample(v);
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

/* ---------- Shapes ---------- */

// </>
export function codeSymbol(count) {
  const o = { th: 0.1, depth: 0.22 };
  return assemble(count, [
    [2, polyline([[-0.7, 0.9], [-1.8, 0], [-0.7, -0.9]], o)],
    [1.4, seg(0.45, 1.2, -0.45, -1.2, o)],
    [2, polyline([[0.7, 0.9], [1.8, 0], [0.7, -0.9]], o)],
  ]);
}

// Open laptop with code on screen and a keyboard.
export function laptop(count) {
  const lean = 0.3; // screen tilted back
  const baseY = -0.55;
  const backZ = -0.95;
  const onScreen = (sample) => (v) => {
    sample(v); // x = u, y = h on the screen plane
    const h = v.y;
    const depth = v.z;
    v.set(v.x, baseY + h * Math.cos(lean), backZ - h * Math.sin(lean) + depth);
  };
  const onBase = (sample) => (v) => {
    sample(v); // x, y = z on the base plane
    v.set(v.x, baseY + v.z, v.y);
  };

  const code = [];
  const rows = [
    [0, 0.9], [0.2, 1.3], [0.4, 0.8], [0.4, 1.5], [0.2, 0.6],
    [0.2, 1.1], [0.4, 1.2], [0.2, 0.5], [0, 0.4],
  ];
  rows.forEach(([indent, len], r) => {
    const y = 1.62 - r * 0.16;
    const x0 = -1.25 + indent;
    code.push([len, onScreen(seg(x0, y, x0 + len, y, { th: 0.012 }))]);
  });

  const keys = (v) => {
    const col = Math.floor(Math.random() * 13);
    const row = Math.floor(Math.random() * 4);
    const x = -1.3 + col * 0.2;
    const z = -0.75 + row * 0.2;
    v.set(x + rand(0, 0.15), z + rand(0, 0.15), 0);
  };

  return assemble(
    count,
    [
      [3.2, onScreen(rectOutline(-1.5, 0, 1.5, 1.9, { th: 0.025 }))],
      [0.6, onScreen(rectFill(-1.45, 0.05, 1.45, 1.85))],
      ...code.map(([len, s]) => [len * 0.9, s]),
      [2.4, onBase(rectOutline(-1.6, -0.95, 1.6, 1.05, { th: 0.025 }))],
      [2.2, onBase(keys)],
      [0.8, onBase(rectOutline(-0.45, 0.3, 0.45, 0.9, { th: 0.015 }))],
    ],
    { tilt: [0.32, -0.4, 0], offset: [0, -0.25, 0.1] }
  );
}

// Cloud with an upload arrow: cloud computing & deployment.
export function cloud(count) {
  const spheres = [
    [-1.15, -0.15, 0.65],
    [-0.35, 0.3, 0.9],
    [0.6, 0.2, 0.8],
    [1.35, -0.2, 0.55],
    [0.2, -0.3, 0.65],
    [-0.7, -0.35, 0.55],
  ];
  const bottom = -0.7;
  const weights = spheres.map((s) => s[2] * s[2]);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const tmp = new THREE.Vector3();

  const surface = (v) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      let pick = Math.random() * totalW;
      let k = 0;
      while (pick > weights[k]) pick -= weights[k++];
      const [cx, cy, r] = spheres[k];
      tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(r);
      tmp.x += cx;
      tmp.y += cy;
      if (tmp.y < bottom) continue;
      const inside = spheres.some(
        ([ox, oy, or], j) => j !== k && Math.hypot(tmp.x - ox, tmp.y - oy, tmp.z) < or * 0.98
      );
      if (!inside) break;
    }
    v.set(tmp.x, tmp.y, tmp.z * 0.6);
  };

  const o = { th: 0.06, depth: 0.06, z: 0 };
  return assemble(count, [
    [7, surface],
    [1.2, seg(-1.75, bottom, 1.85, bottom, { th: 0.03 })],
    [1, seg(0, -0.55, 0, 0.55, o)],
    [0.9, polyline([[-0.4, 0.15], [0, 0.55], [0.4, 0.15]], o)],
  ]);
}

// Browser window with floating UI layers: a web app.
export function browser(count) {
  const t = { th: 0.02 };
  const cards = [-1.6, -0.5, 0.6].flatMap((x) => [
    [1.3, rectOutline(x, -1.05, x + 1, -0.1, { ...t, z: 0.35 })],
    [0.5, rectFill(x + 0.1, -0.55, x + 0.9, -0.2, 0.35)],
    [0.25, seg(x + 0.1, -0.7, x + 0.8, -0.7, { th: 0.012, z: 0.35 })],
    [0.2, seg(x + 0.1, -0.85, x + 0.55, -0.85, { th: 0.012, z: 0.35 })],
  ]);

  return assemble(
    count,
    [
      [3.2, rectOutline(-1.8, -1.25, 1.8, 1.25, t)],
      [0.9, seg(-1.8, 0.85, 1.8, 0.85, t)],
      [0.35, disc(-1.6, 1.05, 0.06)],
      [0.35, disc(-1.42, 1.05, 0.06)],
      [0.35, disc(-1.24, 1.05, 0.06)],
      [0.9, rectOutline(-0.9, 0.97, 1.3, 1.13, { th: 0.012 })],
      [1.1, rectOutline(-1.6, 0.1, 1.6, 0.7, { ...t, z: 0.2 })],
      [0.5, seg(-1.4, 0.5, 0.2, 0.5, { th: 0.03, z: 0.2 })],
      [0.35, seg(-1.4, 0.3, -0.3, 0.3, { th: 0.015, z: 0.2 })],
      [0.4, rectFill(0.7, 0.25, 1.35, 0.4, 0.2)],
      [0.5, rectFill(-1.75, -1.2, 1.75, 0.8, 0, 0.005)],
      ...cards,
    ],
    { tilt: [0.08, -0.35, 0] }
  );
}

// React atom.
export function atom(count) {
  const orbit = (angle) => {
    const e = new THREE.Euler(0, 0, angle);
    return (v) => {
      const a = Math.random() * TAU;
      jitter(v.set(Math.cos(a) * 2, Math.sin(a) * 0.72, 0), 0.03).applyEuler(e);
    };
  };
  const electron = (angle, phase) => {
    const e = new THREE.Euler(0, 0, angle);
    const p = new THREE.Vector3(Math.cos(phase) * 2, Math.sin(phase) * 0.72, 0).applyEuler(e);
    return ball(p.x, p.y, p.z, 0.09);
  };
  const angles = [0, Math.PI / 3, (2 * Math.PI) / 3];

  return assemble(
    count,
    [
      [1.1, ball(0, 0, 0, 0.3)],
      ...angles.map((a) => [2.2, orbit(a)]),
      ...angles.map((a, i) => [0.2, electron(a, 0.8 + i * 2.1)]),
    ],
    { tilt: [0.35, 0.3, 0] }
  );
}

// Isometric stack of layers: front-end / back-end / database, i.e. full-stack.
export function database(count) {
  const size = 1.75;
  const layers = [0.75, 0, -0.75];
  const diamond = [[0, -size], [size, 0], [0, size], [-size, 0]];
  // Samplers work in 2D (x, y); lay them flat in the XZ plane at height `y`.
  const flat = (y, sample) => (v) => {
    sample(v);
    v.set(v.x, y + v.z, v.y);
  };
  const fill = (v) => {
    const a = rand(-1, 1);
    const b = rand(-1, 1);
    v.set(((a - b) * size) / 2, ((a + b) * size) / 2, rand(-0.01, 0.01));
  };

  return assemble(
    count,
    layers.flatMap((y, i) => [
      [2.4, flat(y, polyline(diamond, { th: 0.025, closed: true }))],
      [0.9, flat(y - 0.12, polyline(diamond, { th: 0.015, closed: true }))],
      [i === 0 ? 1.4 : 0.7, flat(y, fill)],
    ]),
    { tilt: [0.55, 0, 0] }
  );
}

// Envelope: get in touch.
export function envelope(count) {
  const t = { th: 0.03 };
  return assemble(
    count,
    [
      [3.4, rectOutline(-1.7, -1.1, 1.7, 1.1, t)],
      [2, polyline([[-1.7, 1.1], [0, -0.15], [1.7, 1.1]], t)],
      [0.7, seg(-1.7, -1.1, -0.5, 0.2, { th: 0.02 })],
      [0.7, seg(1.7, -1.1, 0.5, 0.2, { th: 0.02 })],
      [0.8, rectFill(-1.65, -1.05, 1.65, 1.05)],
    ],
    { tilt: [0.1, -0.3, 0] }
  );
}
