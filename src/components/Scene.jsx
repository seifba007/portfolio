import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { atom, browser, cloud, codeSymbol, database, envelope, laptop } from './shapes.js';

// One developer icon per page section; the particles morph as each section scrolls in.
const SECTIONS = [
  { id: 'home', x: 2.5, y: 0.1, s: 1.0, o: 1 },
  { id: 'about', x: 2.6, y: -0.1, s: 0.95, o: 0.55 },
  { id: 'education', x: 2.7, y: 0.0, s: 0.95, o: 0.5 },
  { id: 'projects', x: -2.5, y: 0.1, s: 0.9, o: 0.45 },
  { id: 'experience', x: 2.6, y: 0.0, s: 0.95, o: 0.55 },
  { id: 'skills', x: 2.7, y: 0.1, s: 0.85, o: 0.55 },
  { id: 'contact', x: 0.0, y: 0.5, s: 0.75, o: 0.35 },
];
const SHAPES = [codeSymbol, laptop, cloud, browser, atom, database, envelope];

function getScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

// Which section sits at the middle of the viewport, and how far through it we are.
// The morph to the next shape happens over the last part of each section.
function getSectionTarget() {
  const mid = window.scrollY + window.innerHeight * 0.5;
  const tops = SECTIONS.map(({ id }) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  });
  let i = 0;
  while (i < SECTIONS.length - 1 && tops[i + 1] <= mid) i++;
  const last = i === SECTIONS.length - 1;
  const end = last ? document.documentElement.scrollHeight : tops[i + 1];
  const frac = THREE.MathUtils.clamp((mid - tops[i]) / Math.max(1, end - tops[i]), 0, 1);
  const e = last ? 0 : THREE.MathUtils.smootherstep(frac, 0.3, 1);
  const a = SECTIONS[i];
  const b = SECTIONS[last ? i : i + 1];
  const lerp = (k) => THREE.MathUtils.lerp(a[k], b[k], e);
  // `travel` peaks mid-transition: the object sinks back in depth while it crosses the screen.
  return { x: lerp('x'), y: lerp('y'), s: lerp('s'), o: lerp('o'), m: i + e, travel: Math.sin(Math.PI * e) };
}

const rand = (min, max) => min + Math.random() * (max - min);

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uSize;
  attribute vec3 aShape1;
  attribute vec3 aShape2;
  attribute vec3 aShape3;
  attribute vec3 aShape4;
  attribute vec3 aShape5;
  attribute vec3 aShape6;
  attribute float aRandom;
  varying vec3 vColor;
  varying float vAlpha;

  // Each particle starts its transition slightly later than the previous: a staggered morph.
  float progress(float k) {
    return clamp((uMorph - k) * 1.5 - aRandom * 0.5, 0.0, 1.0);
  }

  // Quintic ease: zero velocity and acceleration at both ends, so particles glide.
  float ease(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float step01(float k) {
    return ease(progress(k));
  }

  void main() {
    vec3 p = position;
    p = mix(p, aShape1, step01(0.0));
    p = mix(p, aShape2, step01(1.0));
    p = mix(p, aShape3, step01(2.0));
    p = mix(p, aShape4, step01(3.0));
    p = mix(p, aShape5, step01(4.0));
    p = mix(p, aShape6, step01(5.0));

    // While morphing, each particle drifts outward along its own direction and settles back.
    float inFlight = 0.0;
    for (int k = 0; k < 6; k++) inFlight += sin(3.14159 * progress(float(k)));
    vec3 dir = normalize(vec3(sin(aRandom * 91.7), cos(aRandom * 47.3), sin(aRandom * 13.9 + 1.0)));
    p += dir * inFlight * (0.25 + aRandom * 0.35);

    float t = uTime * 0.8 + aRandom * 40.0;
    p += vec3(sin(t * 1.3), cos(t * 1.1), sin(t * 0.9)) * 0.012;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.55 + aRandom * 0.9) / -mv.z;

    vec3 violet = vec3(0.54, 0.39, 0.97);
    vec3 blue = vec3(0.35, 0.55, 1.0);
    vColor = mix(violet, blue, smoothstep(-1.8, 1.8, p.y + p.x * 0.4));
    vColor = mix(vColor, vec3(1.0), step(0.965, aRandom) * 0.7);
    vAlpha = 0.45 + aRandom * 0.55;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float glow = smoothstep(0.5, 0.0, d);
    glow = pow(glow, 1.6);
    gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
  }
`;

function ParticleMorph({ pointer }) {
  const group = useRef();
  const material = useRef();
  const spin = useRef(0);
  const sway = useRef(0);
  const { viewport, gl } = useThree();
  const count = viewport.width < 6 ? 6000 : 11000;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const shapes = SHAPES.map((fn) => fn(count));
    geo.setAttribute('position', new THREE.BufferAttribute(shapes[0], 3));
    for (let i = 1; i < shapes.length; i++) {
      geo.setAttribute(`aShape${i}`, new THREE.BufferAttribute(shapes[i], 3));
    }
    const randoms = new Float32Array(count);
    for (let i = 0; i < count; i++) randoms[i] = Math.random();
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uSize: { value: 52 * Math.min(gl.getPixelRatio(), 1.75) },
      uOpacity: { value: 1 },
    }),
    [gl]
  );

  useFrame((state, delta) => {
    const target = getSectionTarget();
    const narrow = viewport.width < 6;
    // Narrow screens: centre the cloud behind the text and fade it back.
    const spread = narrow ? 0 : Math.min(1, viewport.width / 9);
    const g = group.current;
    const u = material.current.uniforms;

    g.position.x = THREE.MathUtils.damp(g.position.x, target.x * spread, 1.3, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, target.y, 1.3, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, -target.travel * 1.6, 1.3, delta);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target.s * (narrow ? 0.85 : 1), 1.3, delta));
    const morph = THREE.MathUtils.damp(u.uMorph.value, target.m, 1.6, delta);
    // One full turn per shape change, landing front-facing; it trails the morph slightly
    // so the spin eases in and out. A slow sway and the mouse add life at rest.
    spin.current = THREE.MathUtils.damp(spin.current, morph * Math.PI * 2, 1.2, delta);
    sway.current = THREE.MathUtils.damp(sway.current, pointer.current.x * 0.25, 1.5, delta);
    g.rotation.y = spin.current + Math.sin(state.clock.elapsedTime * 0.3) * 0.2 + sway.current;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pointer.current.y * 0.3, 1.5, delta);

    u.uTime.value = state.clock.elapsedTime;
    u.uMorph.value = morph;
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, target.o * (narrow ? 0.5 : 1), 1.2, delta);
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function StarField({ count = 1800 }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    // Keep every star well behind the camera plane so none render as big blobs.
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr.set([rand(-22, 22), rand(-30, 30), rand(-22, -3)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    const p = getScrollProgress();
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, p * 10, 1.2, delta);
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#b9a6ff" size={0.045} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

function CameraRig({ pointer }) {
  useFrame((state, delta) => {
    const cam = state.camera;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, pointer.current.x * 0.5, 1.2, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, pointer.current.y * 0.3, 1.2, delta);
    cam.lookAt(0, 0, 0);
  });
  return null;
}

export default function Scene() {
  // The canvas sits behind the page (pointer-events: none), so track the mouse on window.
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="scene-container" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: false, alpha: true }}>
        <StarField />
        <ParticleMorph pointer={pointer} />
        <CameraRig pointer={pointer} />
      </Canvas>
      <div className="scene-overlay" />
    </div>
  );
}
