import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PROFILE, PROJECTS, STATS } from '../data/cv.js';

/*
 * The hero background: a 5 s fly-through of a studio that ends on a desk with two
 * monitors. When it lands, both screens switch on and show the profile.
 *
 * Everything lives on a 1920×1080 "stage" matching the video frame, scaled and
 * positioned with one transform, so the screen overlays stay pinned to the monitors
 * at any viewport size.
 */

const FRAME = { w: 1920, h: 1080 };

/*
 * Screens measured pixel by pixel on the final frame (where the lit screen meets the
 * black bezel). The monitors are curved, so each screen is an outline, not a rectangle:
 * `corners` (TL, TR, BR, BL) enclose it and drive the perspective, and `outline`
 * clips the overlay to the exact screen edge.
 */
const LEFT_SCREEN = {
  corners: [[430, 393], [950, 399], [950, 653], [443, 681]],
  outline: [
    [430, 394], [550, 396], [700, 398.5], [850, 400], [949, 400],
    [949, 652], [900, 655], [850, 656], [800, 658], [750, 660], [650, 665],
    [600, 668], [560, 671], [520, 674], [480, 677], [443, 680],
  ],
};
const RIGHT_SCREEN = {
  corners: [[961, 399], [1477, 395], [1467, 678], [961, 656]],
  outline: [
    [962, 400], [1150, 400], [1250, 399], [1350, 398.5], [1400, 397], [1476, 396],
    [1466, 677], [1440, 674], [1400, 673.5], [1350, 670], [1300, 667.4], [1250, 663.8],
    [1200, 661.2], [1150, 659.6], [1100, 657], [1050, 656.4], [962, 655],
  ],
};
const MONITORS = { x0: 430, x1: 1477, y0: 393, y1: 681 };

// Screen UIs are laid out at this size, then projected onto the monitor.
const UI = { w: 1036, h: 560 };

/** Projective map from the unit square onto a quad: X = (a·u + b·v + c) / (g·u + k·v + 1). */
function homography([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const k = (dx1 * dy3 - dx3 * dy1) / den;
  return { a: x1 - x0 + g * x1, b: x3 - x0 + k * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + k * y3, f: y0, g, k };
}

/** Frame point → point in the w×h UI box (inverse of the projective map). */
function toLocal({ a, b, c, d, e, f, g, k }, [X, Y]) {
  const p = a - g * X, q2 = b - k * X, r = X - c;
  const s2 = d - g * Y, t = e - k * Y, w2 = Y - f;
  const det = p * t - q2 * s2;
  return [((r * t - q2 * w2) / det) * UI.w, ((p * w2 - r * s2) / det) * UI.h];
}

function screenStyle({ corners, outline }) {
  const H = homography(corners);
  const { a, b, c, d, e, f, g, k } = H;
  const { w, h } = UI;
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, c, f, 0, 1];
  // Grow the outline by 0.75px so antialiased edges never let the old screen show through.
  const cx = outline.reduce((n, p) => n + p[0], 0) / outline.length;
  const cy = outline.reduce((n, p) => n + p[1], 0) / outline.length;
  const points = outline.map(([x, y]) => {
    const len = Math.hypot(x - cx, y - cy);
    return toLocal(H, [x + ((x - cx) / len) * 0.75, y + ((y - cy) / len) * 0.75]);
  });
  return {
    transform: `matrix3d(${m.join(",")})`,
    clipPath: `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`,
  };
}

const LEFT_STYLE = screenStyle(LEFT_SCREEN);
const RIGHT_STYLE = screenStyle(RIGHT_SCREEN);

// Narrow screens show this part of the frame as a banner above the text.
// Keep in sync with the hero padding in hero.css (72px + 47.8vw).
const BANNER = { x0: 380, x1: 1530, y0: 250, top: 72 };

/**
 * Wide screens: the monitors sit in the right half, beside the text, and the frame
 * fades into the page on its left. Narrow screens: the desk becomes a full-width
 * banner at the top of the hero, with the text below it.
 */
function stageLayout(vw, vh) {
  if (vw > 1024) {
    const mw = MONITORS.x1 - MONITORS.x0;
    const my = (MONITORS.y0 + MONITORS.y1) / 2;
    const s = Math.max((0.53 * vw) / mw, (0.62 * vh) / FRAME.h);
    return { s, x: 0.94 * vw - MONITORS.x1 * s, y: 0.47 * vh - my * s };
  }
  const s = vw / (BANNER.x1 - BANNER.x0);
  return { s, x: -BANNER.x0 * s, y: BANNER.top - BANNER.y0 * s };
}

/* ---------- Left monitor: an editor typing out the profile ---------- */

const q = (s) => `'${s}'`;
const CODE = [
  [['kw', 'import'], ['p', ' { '], ['ty', 'Developer'], ['p', ' } '], ['kw', 'from'], ['p', ' '], ['str', q('@seif/core')], ['p', ';']],
  [],
  [['kw', 'export const'], ['p', ' '], ['var', 'seif'], ['p', ': '], ['ty', 'Developer'], ['p', ' = {']],
  [['p', '  '], ['prop', 'name'], ['p', ': '], ['str', q(`${PROFILE.firstName} ${PROFILE.lastName}`)], ['p', ',']],
  [['p', '  '], ['prop', 'role'], ['p', ': '], ['str', q(PROFILE.role)], ['p', ',']],
  [['p', '  '], ['prop', 'location'], ['p', ': '], ['str', q(PROFILE.location)], ['p', ',']],
  [
    ['p', '  '],
    ['prop', 'stack'],
    ['p', ': ['],
    ...PROFILE.stack.slice(0, 4).flatMap((t, i) => [...(i ? [['p', ', ']] : []), ['str', q(t)]]),
    ['p', '],'],
  ],
  [['p', '  '], ['prop', 'experience'], ['p', ': '], ['str', q("2+ ans")], ['p', ',']],
  [['p', '  '], ['prop', 'available'], ['p', ': '], ['bool', 'true'], ['p', ',']],
  [['p', '};']],
  [],
  [['com', '// Ouvert aux missions freelance et CDI ✦']],
];
const CODE_LENGTH = CODE.reduce((n, line) => n + line.reduce((m, [, t]) => m + t.length, 0) + 1, 0);

const FILES = [
  { name: 'src', dir: true },
  { name: 'components', dir: true, depth: 1 },
  { name: 'Hero.tsx', depth: 2, ext: 'tsx' },
  { name: 'Projects.tsx', depth: 2, ext: 'tsx' },
  { name: 'profile.ts', depth: 1, ext: 'ts', active: true },
  { name: 'stack.json', depth: 1, ext: 'json' },
  { name: 'package.json', ext: 'json' },
  { name: 'Dockerfile', ext: 'docker' },
];

function useTyping(start, total, charsPerTick = 2, tick = 22) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= total) {
          clearInterval(id);
          return c;
        }
        return c + charsPerTick;
      });
    }, tick);
    return () => clearInterval(id);
  }, [start, total, charsPerTick, tick]);
  return Math.min(count, total);
}

function CodeScreen() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(id);
  }, []);
  const reduce = useReducedMotion();
  const typing = useTyping(ready && !reduce, CODE_LENGTH);
  const typed = reduce ? CODE_LENGTH : typing;

  let budget = typed;
  let caretLine = 0;
  const lines = CODE.map((line, li) => {
    const tokens = [];
    // The caret sits on the last line that typing has reached.
    if (budget > 0) caretLine = li;
    for (const [type, text] of line) {
      if (budget <= 0) break;
      const part = text.slice(0, budget);
      budget -= part.length;
      tokens.push(
        <span key={tokens.length} className={`tk-${type}`}>
          {part}
        </span>
      );
    }
    budget -= 1; // newline
    return tokens;
  });
  const done = typed >= CODE_LENGTH;

  return (
    <div className="ui ui-editor">
      <div className="ui-titlebar">
        <span className="ui-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="ui-title">profile.ts — seif-portfolio</span>
      </div>
      <div className="editor-body">
        <div className="editor-activity">
          <span className="is-active" />
          <span />
          <span />
          <span />
        </div>
        <div className="editor-explorer">
          <p className="explorer-head">Explorateur</p>
          {FILES.map((f) => (
            <p key={f.name} className={`explorer-item ${f.active ? 'is-active' : ''}`} style={{ paddingLeft: 14 + (f.depth ?? 0) * 16 }}>
              <span className={`file-icon ${f.dir ? 'is-dir' : `ext-${f.ext}`}`} />
              {f.name}
            </p>
          ))}
        </div>
        <div className="editor-main">
          <div className="editor-tabs">
            <span className="editor-tab is-active">
              <span className="file-icon ext-ts" /> profile.ts
            </span>
            <span className="editor-tab">
              <span className="file-icon ext-json" /> stack.json
            </span>
          </div>
          <div className="editor-code">
            {lines.map((tokens, i) => (
              <div key={i} className={`code-line ${i === caretLine ? 'is-current' : ''}`}>
                <span className="code-num">{i + 1}</span>
                <span className="code-text">
                  {tokens}
                  {i === caretLine && <span className={`code-caret ${done ? 'is-blinking' : ''}`} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="editor-status">
        <span>⎇ main</span>
        <span>✓ 0 problème</span>
        <span className="status-right">TypeScript React · UTF-8</span>
      </div>
    </div>
  );
}

/* ---------- Right monitor: the portfolio, live in a browser ---------- */

const SKILLS = [
  { name: 'React / Next.js', level: 90 },
  { name: 'Node.js', level: 85 },
  { name: 'MongoDB / SQL', level: 80 },
  { name: 'Docker / K8s', level: 70 },
];

const rise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay },
});

function BrowserScreen() {
  return (
    <div className="ui ui-browser">
      <div className="ui-titlebar">
        <span className="ui-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="browser-url">
          <span className="browser-lock" /> seif-ben-aicha.dev
        </span>
      </div>
      <div className="browser-page">
        <div className="page-glow" />
        <div className="page-profile">
          <motion.div className="page-avatar" {...rise(0.5)}>
            SB
          </motion.div>
          <motion.p className="page-hello" {...rise(0.6)}>
            Bonjour, je suis
          </motion.p>
          <motion.p className="page-name" {...rise(0.7)}>
            {PROFILE.firstName} {PROFILE.lastName}
            <span>.</span>
          </motion.p>
          <motion.p className="page-role" {...rise(0.8)}>
            {PROFILE.role}
          </motion.p>
          <motion.div className="page-tags" {...rise(0.9)}>
            <span className="page-status">
              <i /> Disponible
            </span>
            <span className="page-location">{PROFILE.location}</span>
          </motion.div>
          <motion.div className="page-buttons" {...rise(1)}>
            <span className="page-btn is-primary">Voir mes projets →</span>
            <span className="page-btn">CV</span>
          </motion.div>
        </div>
        <div className="page-side">
          <motion.div className="page-stats" {...rise(0.8)}>
            {STATS.map((s) => (
              <div key={s.label} className="page-stat">
                <strong>
                  {s.value}
                  {s.suffix}
                </strong>
                <span>{s.label}</span>
              </div>
            ))}
          </motion.div>
          <motion.div className="page-skills" {...rise(0.95)}>
            {SKILLS.map((s, i) => (
              <div key={s.name} className="page-skill">
                <p>
                  {s.name} <span>{s.level}%</span>
                </p>
                <div className="page-bar">
                  <motion.i
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: s.level / 100 }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 1.2 + i * 0.12 }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
        <motion.div className="page-projects" {...rise(1.15)}>
          <p className="page-section">Projets récents</p>
          <div className="page-project-row">
            {PROJECTS.slice(0, 3).map((p, i) => (
              <div key={p.name} className="page-project">
                <span className={`page-thumb thumb-${i}`} />
                <strong>{p.name}</strong>
                <span>{p.tech.slice(0, 2).join(' · ')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Screen({ placement, delay, children }) {
  return (
    <div className="screen" style={{ ...placement, '--on-delay': `${delay}s` }}>
      <div className="screen-inner">{children}</div>
    </div>
  );
}

export default function HeroStage({ parallaxX, parallaxY, scrollY }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [on, setOn] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    const measure = () => setLayout(stageLayout(el.clientWidth, el.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    // Reduced motion: skip the fly-through and start on the desk.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true);
      setOn(true);
      return;
    }
    const onEnded = () => setOn(true);
    video.addEventListener('ended', onEnded);
    video.muted = true;
    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay blocked (e.g. low-power mode): show the final frame instead.
      setStill(true);
      setOn(true);
    });
    return () => video.removeEventListener('ended', onEnded);
  }, []);

  const stageStyle = layout
    ? { transform: `translate3d(${layout.x}px, ${layout.y}px, 0) scale(${layout.s})` }
    : { visibility: 'hidden' };

  return (
    <div className="hero-media" ref={wrapRef} aria-hidden="true">
      <motion.div className="stage-motion" style={{ x: parallaxX, y: parallaxY }}>
        <motion.div className="stage-scroll" style={{ y: scrollY }}>
          <div className={`stage ${on ? 'is-on' : ''}`} style={stageStyle}>
            {still ? (
              <img className="stage-video" src="/hero/desk-end.webp" alt="" decoding="async" />
            ) : (
              <video ref={videoRef} className="stage-video" poster="/hero/poster.webp" muted playsInline preload="auto">
                <source src="/hero/desk.webm" type="video/webm" />
                <source src="/hero/desk.mp4" type="video/mp4" />
              </video>
            )}
            <div className="screen-glow" />
            {on && (
              <>
                <Screen placement={LEFT_STYLE} delay={0}>
                  <CodeScreen />
                </Screen>
                <Screen placement={RIGHT_STYLE} delay={0.35}>
                  <BrowserScreen />
                </Screen>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
      <div className="hero-overlay" />
    </div>
  );
}
