import { Fragment, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1];

/* ---------- Entrance variants ---------- */

const show = (extra = {}) => ({
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotateX: 0,
  transition: { duration: 0.9, ease: EASE, ...extra },
});

export const VARIANTS = {
  // Only opacity and transforms: these run on the compositor, while animating
  // `filter: blur()` repaints the element on every frame.
  up: { hidden: { opacity: 0, y: 40 }, show: show() },
  left: { hidden: { opacity: 0, x: -70 }, show: show() },
  right: { hidden: { opacity: 0, x: 70 }, show: show() },
  scale: { hidden: { opacity: 0, scale: 0.9, y: 60 }, show: show({ duration: 1 }) },
  flip: {
    hidden: { opacity: 0, rotateX: -40, y: 50, transformPerspective: 1000 },
    show: show({ duration: 1 }),
  },
  pop: {
    hidden: { opacity: 0, scale: 0.5, y: 12 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 20 } },
  },
};

const stagger = (step, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

/** Animates its own entrance when scrolled into view. */
export function Animate({ as = 'div', variant = 'up', delay = 0, amount = 0.2, className, children, ...rest }) {
  const Tag = motion[as];
  const v = VARIANTS[variant];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: v.hidden, show: { ...v.show, transition: { ...v.show.transition, delay } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export const Reveal = (props) => <Animate variant="up" {...props} />;

/** Container that staggers the entrance of its <StaggerItem> children. */
export function Stagger({ as = 'div', step = 0.08, delay = 0, amount = 0.2, className, children }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={stagger(step, delay)}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = 'div', variant = 'up', className, children, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={VARIANTS[variant]} {...rest}>
      {children}
    </Tag>
  );
}

/** Tag chips that pop in one after another. */
export function TagList({ items, delay = 0.2 }) {
  return (
    <Stagger className="tag-list" step={0.045} delay={delay} amount={0.5}>
      {items.map((t) => (
        <StaggerItem key={t} as="span" variant="pop" className="tag">
          {t}
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/* ---------- Text ---------- */

const maskItem = {
  hidden: { y: '115%', rotate: 5, opacity: 0 },
  show: { y: '0%', rotate: 0, opacity: 1, transition: { duration: 0.95, ease: EASE } },
};

/**
 * Masked text reveal: every word (or letter) slides up from behind a clip.
 * `onMount` plays immediately (hero); otherwise it plays when scrolled into view.
 */
export function SplitText({ text, as = 'span', by = 'word', className, itemClassName = '', delay = 0, step, onMount = false }) {
  const Tag = motion[as];
  const words = text.split(' ');
  const trigger = onMount
    ? { animate: 'show' }
    : { whileInView: 'show', viewport: { once: true, amount: 0.6 } };

  const piece = (content, key) => (
    <span key={key} className="split-mask">
      <motion.span className={`split-inner ${itemClassName}`} variants={maskItem}>
        {content}
      </motion.span>
    </span>
  );

  return (
    <Tag
      className={className}
      aria-label={text}
      initial="hidden"
      variants={stagger(step ?? (by === 'char' ? 0.035 : 0.07), delay)}
      {...trigger}
    >
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="split-word" aria-hidden="true">
            {by === 'char' ? [...word].map((ch, ci) => piece(ch, ci)) : piece(word, 0)}
          </span>
          {wi < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  );
}

function ScrollWord({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const y = useTransform(progress, range, [6, 0]);
  return (
    <>
      <motion.span className="scroll-word" style={{ opacity, y }}>
        {children}
      </motion.span>{' '}
    </>
  );
}

/** Paragraph whose words light up one by one as it scrolls through the viewport. */
export function ScrollText({ text, className }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.6'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <ScrollWord key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </ScrollWord>
      ))}
    </p>
  );
}

/* ---------- Section heading ---------- */

export function SectionHeading({ index, kicker, title, center = false }) {
  return (
    <div className={`section-heading ${center ? 'center' : ''}`}>
      <Kicker index={index} label={kicker} center={center} />
      <SplitText as="h2" className="section-title" text={title} delay={0.15} />
    </div>
  );
}

export function Kicker({ index, label, center = false }) {
  return (
    <motion.p
      className={`section-kicker ${center ? 'center' : ''}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.8 }}
      variants={stagger(0.12)}
    >
      <motion.span className="section-index" variants={VARIANTS.up}>
        {index}
      </motion.span>
      <motion.span
        className="kicker-line"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease: EASE } } }}
      />
      <motion.span variants={VARIANTS.up}>{label}</motion.span>
    </motion.p>
  );
}

/* ---------- Scroll-linked motion ---------- */

/**
 * Card that keeps moving with the scroll, in both directions: it rises with parallax,
 * tilts back into place from depth, scales up and fades in as it enters, then
 * tilts away and fades slightly as it leaves the top of the viewport.
 * `depth` sets the parallax travel (px), `x` an optional sideways entry.
 */
export function ScrollCard({ children, className, depth = 60, tilt = 12, x = 0 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // Tied straight to scroll: smooth scrolling already eases it, and a second spring
  // on top made cards trail behind the page.
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const y = useTransform(p, [0, 1], [depth, -depth]);
  const translateX = useTransform(p, [0, 0.35], [x, 0]);
  const rotateX = useTransform(p, [0, 0.35, 0.7, 1], [tilt, 0, 0, -tilt * 0.6]);
  const scale = useTransform(p, [0, 0.35, 0.75, 1], [0.88, 1, 1, 0.95]);
  const opacity = useTransform(p, [0, 0.25, 0.85, 1], [0, 1, 1, 0.35]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { y, x: translateX, rotateX, scale, opacity, transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  );
}

const wrap = (min, max, v) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/**
 * Endless marquee row. It drifts on its own and speeds up with scroll velocity;
 * scrolling up reverses it. The content is rendered twice so the loop is seamless.
 */
export function VelocityRow({ items, baseVelocity = 3, className }) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  // Soft spring on scroll speed so the boost and skew build up and die down gradually.
  const smoothVelocity = useSpring(useVelocity(scrollY), { damping: 40, stiffness: 80, mass: 0.8 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 1.2], { clamp: false });
  const skewX = useTransform(smoothVelocity, [-3000, 3000], [3, -3], { clamp: true });
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef(1);
  const ref = useRef(null);
  // No work while the row is off screen.
  const visible = useInView(ref, { margin: '200px 0px' });

  useAnimationFrame((_, delta) => {
    if (reduce || !visible) return;
    const vf = velocityFactor.get();
    // Ease toward the new direction instead of flipping instantly.
    const targetDirection = vf < -0.02 ? -1 : vf > 0.02 ? 1 : direction.current >= 0 ? 1 : -1;
    direction.current += (targetDirection - direction.current) * (1 - Math.exp(-(delta / 1000) * 1.5));
    const step = direction.current * baseVelocity * (delta / 1000);
    baseX.set(baseX.get() + step + step * Math.abs(vf));
  });

  const copy = (key) => (
    <div className="marquee-copy" key={key} aria-hidden={key === 1}>
      {items.map((s, i) => (
        <span key={i}>
          {s} <i className="ph ph-asterisk" />
        </span>
      ))}
    </div>
  );

  return (
    <motion.div ref={ref} className={`marquee-row ${className ?? ''}`} style={{ x, skewX }}>
      {copy(0)}
      {copy(1)}
    </motion.div>
  );
}

/* ---------- Interaction ---------- */

/** Element that is gently pulled toward the cursor. */
export function Magnetic({ children, strength = 0.35, className }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} className={`magnetic ${className ?? ''}`} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </motion.div>
  );
}

export function TiltCard({ children, className }) {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 12);
    rx.set(-py * 12);
    ref.current.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    ref.current.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}
