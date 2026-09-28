import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { atom, browser, cloud, codeSymbol, database, envelope, laptop } from './shapes.js';

// One developer icon per page section; the particles morph as each section scrolls in.
const SECTIONS = [
  // Hidden in the hero, where the desk video is the visual; it fades in with About.
  { id: 'home', x: 2.5, y: 0.1, s: 1.0, o: 0 },
  { id: 'about', x: 2.6, y: -0.1, s: 0.95, o: 0.55 },
  { id: 'education', x: 2.7, y: 0.0, s: 0.95, o: 0.5 },
  { id: 'projects', x: -2.5, y: 0.1, s: 0.9, o: 0.45 },
  { id: 'experience', x: 2.6, y: 0.0, s: 0.95, o: 0.55 },
  { id: 'skills', x: 2.7, y: 0.1, s: 0.85, o: 0.55 },
  { id: 'contact', x: 0.0, y: 0.5, s: 0.75, o: 0.35 },
];
const SHAPES = [codeSymbol, laptop, cloud, browser, atom, database, envelope];

// Page geometry is measured only when the layout changes, never inside the render loop:
// reading layout every frame forces the browser to recalculate it and makes scrolling stutter.
const layout = { tops: SECTIONS.map(() => 0), maxScroll: 0, vh: 1 };

function measureLayout() {
  const y = window.scrollY;
  layout.tops = SECTIONS.map(({ id }) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + y : 0;
  });
  layout.vh = window.innerHeight;
  layout.maxScroll = document.documentElement.scrollHeight - layout.vh;
}

function useLayoutCache() {
  useEffect(() => {
    let frame;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureLayout);
    };
    measureLayout();
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    // Web fonts can change section heights after first paint.
    document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);
}

function getScrollProgress() {
  return layout.maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / layout.maxScroll)) : 0;
}

// The shape change to the next section is driven by that section entering the screen:
// it starts when its top appears at the bottom of the viewport and completes when the
// top reaches 40% from the top. Long, gradual, and the hero is at rest on page load.
function getSectionTarget() {
  const { vh, tops } = layout;
  const y = window.scrollY;
  let i = 0;
  while (i < SECTIONS.length - 1 && tops[i + 1] <= y + vh * 0.4) i++;
  const last = i === SECTIONS.length - 1;
  const e = last ? 0 : THREE.MathUtils.smootherstep((y + vh - tops[i + 1]) / (vh * 0.6), 0, 1);
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

    // Star palette: mostly the background stars' lavender (#b9a6ff),
    // with some accent violet (#8a63f8) and a few pale blue (#a8c4ff) particles.
    float pick = fract(aRandom * 7.13);
    vec3 lavender = vec3(0.725, 0.651, 1.0);
    vec3 violet = vec3(0.541, 0.388, 0.973);
    vec3 paleBlue = vec3(0.659, 0.769, 1.0);
    vColor = pick < 0.68 ? lavender : (pick < 0.9 ? violet : paleBlue);
    vColor *= 0.85 + aRandom * 0.2;

    // Gentle twinkle, each particle on its own phase.
    float twinkle = 0.75 + 0.25 * sin(uTime * (1.2 + aRandom * 1.5) + aRandom * 60.0);
    // Particles on the far side of the shape are dimmer, which reads as depth.
    float nearness = smoothstep(9.5, 5.5, -mv.z);
    vAlpha = (0.45 + aRandom * 0.35) * twinkle * (0.45 + 0.55 * nearness);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // Crisp round dot with a small soft edge, like the stars.
    float glow = smoothstep(0.5, 0.15, d);
    gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
  }
`;

function ParticleMorph({ pointer }) {
  const group = useRef();
  const material = useRef();
  const points = useRef();
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
      uSize: { value: 40 * Math.min(gl.getPixelRatio(), 1.5) },
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

    g.position.x = THREE.MathUtils.damp(g.position.x, target.x * spread, 2.4, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, target.y, 2.4, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, -target.travel * 1.6, 2.4, delta);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target.s * (narrow ? 0.85 : 1), 2.4, delta));
    const morph = THREE.MathUtils.damp(u.uMorph.value, target.m, 2.6, delta);
    // One full turn per shape change, landing front-facing; it trails the morph slightly
    // so the spin eases in and out. A slow sway and the mouse add life at rest.
    spin.current = THREE.MathUtils.damp(spin.current, morph * Math.PI * 2, 2.2, delta);
    sway.current = THREE.MathUtils.damp(sway.current, pointer.current.x * 0.25, 1.5, delta);
    g.rotation.y = spin.current + Math.sin(state.clock.elapsedTime * 0.3) * 0.2 + sway.current;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pointer.current.y * 0.3, 1.5, delta);

    u.uTime.value = state.clock.elapsedTime;
    // Point size is in device pixels, so follow the adaptive resolution.
    u.uSize.value = 40 * state.viewport.dpr;
    u.uMorph.value = morph;
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, target.o * (narrow ? 0.5 : 1), 2.2, delta);
    // Skip drawing entirely while invisible (behind the hero video).
    points.current.visible = u.uOpacity.value > 0.005;
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
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
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, p * 10, 2.4, delta);
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
  // Drop the resolution if the device cannot keep up, and restore it when it can.
  const [dpr, setDpr] = useState(1.5);
  useLayoutCache();

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="scene-container" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={dpr}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false, depth: false }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
        <StarField />
        <ParticleMorph pointer={pointer} />
        <CameraRig pointer={pointer} />
      </Canvas>
      <div className="scene-overlay" />
    </div>
  );
}
