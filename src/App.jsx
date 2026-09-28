import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import {
  Animate,
  CountUp,
  EASE,
  Kicker,
  Magnetic,
  ScrollCard,
  ScrollText,
  SectionHeading,
  SplitText,
  Stagger,
  StaggerItem,
  TagList,
  TiltCard,
  VARIANTS,
  VelocityRow,
} from './components/Motion.jsx';
import {
  EDUCATION,
  INTERNSHIPS,
  LANGUAGES,
  PROFILE,
  PROJECTS,
  SKILL_GROUPS,
  SOFT_SKILLS,
  STATS,
} from './data/cv.js';

// Three.js is heavy: start downloading it right away, but only mount it once the
// intro animation has had the main thread, so the first seconds stay smooth.
const loadScene = () => import('./components/Scene.jsx');
const Scene = lazy(loadScene);
loadScene();

function useIdleReady(timeout) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, timeout));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const id = idle(() => setReady(true), { timeout });
    return () => cancel(id);
  }, [timeout]);
  return ready;
}

const NAV_LINKS = [
  { id: 'about', label: 'À propos' },
  { id: 'education', label: 'Formation' },
  { id: 'projects', label: 'Projets' },
  { id: 'experience', label: 'Stages' },
  { id: 'skills', label: 'Compétences' },
  { id: 'contact', label: 'Contact' },
];

const SOCIALS = [
  { icon: 'ph-github-logo', label: 'GitHub', href: PROFILE.githubUrl },
  { icon: 'ph-envelope-simple', label: 'Email', href: `mailto:${PROFILE.email}` },
  { icon: 'ph-phone', label: 'Téléphone', href: PROFILE.phoneHref },
];

// Timing of the hero's load sequence (seconds).
const INTRO = { nav: 0.1, badge: 0.2, greeting: 0.35, name: 0.5, role: 1.0, tagline: 1.15, cta: 1.25, stack: 1.4, footer: 1.45 };

const fadeUpOnLoad = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, ease: EASE, delay },
});

let lenisInstance = null;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisInstance) lenisInstance.scrollTo(el, { offset: id === 'home' ? 0 : -80, duration: 1.8 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Long, exponential ease-out glide for wheel and trackpad scrolling.
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
    });
    lenisInstance = lenis;
    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}

function useActiveSection(ids) {
  const [active, setActive] = useState('home');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = ['home', ...NAV_LINKS.map((l) => l.id)];

function NavLink({ id, children, className, onNavigate }) {
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToId(id);
        onNavigate?.();
      }}
    >
      {children}
    </a>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <nav className="navbar">
          <motion.div {...fadeUpOnLoad(INTRO.nav)}>
            <NavLink id="home" className="logo" aria-label={`${PROFILE.firstName} ${PROFILE.lastName}, accueil`}>
              <motion.span
                className="logo-mark"
                aria-hidden="true"
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 180, damping: 14, delay: INTRO.nav }}
              >
                <svg viewBox="0 0 40 40">
                  <text x="20" y="26.5" textAnchor="middle">
                    SB
                  </text>
                </svg>
              </motion.span>
              <span className="logo-text" aria-hidden="true">
                <span className="logo-name">
                  {PROFILE.firstName} {PROFILE.lastName}
                  <span className="logo-dot">.</span>
                </span>
                <span className="logo-role">Full-Stack Developer</span>
              </span>
            </NavLink>
          </motion.div>

          <motion.ul className="nav-links" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: INTRO.nav + 0.1 } } }}>
            {NAV_LINKS.map((link) => (
              <motion.li
                key={link.id}
                variants={{ hidden: { opacity: 0, y: -16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
              >
                <NavLink id={link.id} className={active === link.id ? 'active' : ''}>
                  {link.label}
                  {active === link.id && <motion.span layoutId="nav-underline" className="nav-underline" />}
                </NavLink>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div className="nav-actions" {...fadeUpOnLoad(INTRO.nav + 0.4)}>
            <Magnetic>
              <a href={PROFILE.cvUrl} download className="btn btn-outline btn-sm">
                CV <i className="ph ph-download-simple" />
              </a>
            </Magnetic>
          </motion.div>

          <button
            className="mobile-menu-toggle"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <i className={`ph ${menuOpen ? 'ph-x' : 'ph-list'}`} />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu glass-panel"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.05 + i * 0.05 }}
              >
                <NavLink id={link.id} onNavigate={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
            <a href={PROFILE.cvUrl} download className="btn btn-primary">
              Télécharger le CV <i className="ph ph-download-simple" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ROLE_CHAR = {
  hidden: { opacity: 0, y: '0.5em' },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, y: '-0.5em', transition: { duration: 0.25, ease: EASE } },
};

function RotatingRole() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PROFILE.roles.length), 3400);
    return () => clearInterval(id);
  }, []);
  const role = PROFILE.roles[index];

  // Letters swap one by one; words stay unbroken so the line wraps cleanly.
  return (
    <span className="role-rotator" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="role-text"
          aria-label={role}
          initial="hidden"
          animate="show"
          exit="exit"
          variants={{
            show: { transition: { staggerChildren: 0.018 } },
            exit: { transition: { staggerChildren: 0.008, staggerDirection: -1 } },
          }}
        >
          {role.split(' ').map((word, wi, words) => (
            <Fragment key={wi}>
              <span className="role-word" aria-hidden="true">
                {[...word].map((ch, ci) => (
                  <motion.span key={ci} className="role-char" variants={ROLE_CHAR}>
                    {ch}
                  </motion.span>
                ))}
              </span>
              {wi < words.length - 1 && ' '}
            </Fragment>
          ))}
        </motion.span>
      </AnimatePresence>
      <span className="role-caret" />
    </span>
  );
}

const POINTER_SPRING = { stiffness: 50, damping: 18, mass: 0.8 };
const SPOT_SPRING = { stiffness: 120, damping: 24 };

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const backdropOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Pointer position in the hero, from -0.5 to 0.5 on each axis. The text drifts
  // slightly against it for depth, and a soft light follows it more closely.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const parallaxX = useTransform(useSpring(px, POINTER_SPRING), (v) => v * -18);
  const parallaxY = useTransform(useSpring(py, POINTER_SPRING), (v) => v * -12);
  // The light is positioned in pixels; hero size is read on pointer move, not per frame.
  const size = useRef({ w: 0, h: 0 });
  const spotX = useTransform(useSpring(px, SPOT_SPRING), (v) => (v + 0.5) * size.current.w);
  const spotY = useTransform(useSpring(py, SPOT_SPRING), (v) => (v + 0.5) * size.current.h);
  const spotOpacity = useSpring(0, { stiffness: 60, damping: 20 });

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    size.current = { w: r.width, h: r.height };
    spotOpacity.set(1);
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section id="home" ref={ref} className="hero-section" onPointerMove={onPointerMove} onPointerLeave={() => spotOpacity.set(0)}>
      <motion.div className="hero-backdrop" aria-hidden="true" style={{ opacity: backdropOpacity }}>
        <motion.div className="hero-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2, delay: 0.2 }} />
        <div className="hero-aurora" />
        <motion.div className="hero-spotlight" style={{ x: spotX, y: spotY, opacity: spotOpacity }} />
      </motion.div>

      <motion.div className="hero-content" style={{ y, opacity, scale }}>
        <motion.div className="hero-parallax" style={{ x: parallaxX, y: parallaxY }}>
          <motion.div {...fadeUpOnLoad(INTRO.badge)}>
            <NavLink id="contact" className="hero-badge">
              <span className="pulse-dot" />
              <span className="hero-badge-label">Disponible</span>
              <span className="hero-badge-sep" />
              <span className="hero-badge-text">Freelance &amp; temps plein</span>
              <i className="ph ph-arrow-up-right" />
            </NavLink>
          </motion.div>

          <div className="hero-eyebrow">
            <motion.span
              className="eyebrow-line"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, ease: EASE, delay: INTRO.greeting }}
            />
            <SplitText text="Bonjour, je suis" by="char" step={0.025} delay={INTRO.greeting + 0.1} onMount />
          </div>

          <h1 className="main-title">
            <SplitText className="split-line" itemClassName="title-char" text={PROFILE.firstName} by="char" delay={INTRO.name} onMount />
            <span className="split-line">
              <SplitText
                itemClassName="title-char title-char--accent"
                text={PROFILE.lastName}
                by="char"
                delay={INTRO.name + 0.15}
                onMount
              />
              <motion.span
                className="title-dot"
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0, y: -40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: INTRO.name + 0.75 }}
              >
                .
              </motion.span>
            </span>
          </h1>

          <motion.h2 className="sub-title" {...fadeUpOnLoad(INTRO.role)}>
            <RotatingRole />
          </motion.h2>

          <motion.ul className="hero-meta" {...fadeUpOnLoad(INTRO.tagline)}>
            <li>
              <i className="ph ph-graduation-cap" /> {PROFILE.tagline}
            </li>
            <li>
              <i className="ph ph-map-pin" /> {PROFILE.location}
            </li>
          </motion.ul>

          <motion.div className="cta-group" {...fadeUpOnLoad(INTRO.cta)}>
            <Magnetic strength={0.25}>
              <NavLink id="projects" className="btn btn-primary btn-shine btn-cta">
                Voir mes projets
                <span className="btn-icon" aria-hidden="true">
                  <i className="ph ph-arrow-right" />
                  <i className="ph ph-arrow-right" />
                </span>
              </NavLink>
            </Magnetic>
            <Magnetic strength={0.25}>
              <a href={PROFILE.cvUrl} download className="btn btn-outline btn-ghost">
                Télécharger le CV <i className="ph ph-download-simple" />
              </a>
            </Magnetic>
          </motion.div>

          <motion.div
            className="hero-stack"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: INTRO.stack } } }}
          >
            <motion.span className="hero-stack-label" variants={VARIANTS.up}>
              Stack
            </motion.span>
            {PROFILE.stack.map((tech) => (
              <motion.span key={tech} className="hero-stack-chip" variants={VARIANTS.pop}>
                {tech}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <footer className="hero-footer">
        <motion.div
          className="social-links"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: INTRO.footer } } }}
        >
          {SOCIALS.map((s) => (
            <motion.div key={s.label} variants={VARIANTS.pop}>
              <Magnetic strength={0.4}>
                <a
                  href={s.href}
                  aria-label={s.label}
                  title={s.label}
                  target={s.label === 'GitHub' ? '_blank' : undefined}
                  rel="noreferrer"
                >
                  <i className={`ph ${s.icon}`} />
                </a>
              </Magnetic>
            </motion.div>
          ))}
        </motion.div>

        <motion.button type="button" className="scroll-cue" onClick={() => scrollToId('about')} {...fadeUpOnLoad(INTRO.footer + 0.2)}>
          <span className="scroll-cue-track">
            <span className="scroll-cue-thumb" />
          </span>
          Scroll
        </motion.button>

        <motion.div className="stats-group" {...fadeUpOnLoad(INTRO.footer + 0.1)}>
          {STATS.map((stat) => (
            <div key={stat.label} className="stat">
              <span className="stat-value">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </footer>
    </section>
  );
}

function About() {
  const info = [
    { icon: 'ph-map-pin', label: 'Localisation', value: PROFILE.location },
    { icon: 'ph-envelope-simple', label: 'Email', value: PROFILE.email, href: `mailto:${PROFILE.email}` },
    { icon: 'ph-phone', label: 'Téléphone', value: PROFILE.phone, href: PROFILE.phoneHref },
    { icon: 'ph-github-logo', label: 'GitHub', value: PROFILE.github, href: PROFILE.githubUrl },
  ];

  return (
    <section id="about" className="section">
      <SectionHeading index="01" kicker="À propos" title="Du cloud au pixel, je construis des applications web qui tiennent la route." />
      <div className="about-grid">
        <div className="about-text">
          {PROFILE.summary.map((p, i) => (
            <ScrollText key={i} text={p} />
          ))}
        </div>
        <div className="info-grid">
          {info.map((item, i) => (
            <ScrollCard key={item.label} depth={30 + (i % 2) * 40}>
              <a
                className="info-card glass-card"
                href={item.href}
                target={item.label === 'GitHub' ? '_blank' : undefined}
                rel="noreferrer"
              >
                <i className={`ph ${item.icon}`} />
                <span className="info-label">{item.label}</span>
                <span className="info-value">{item.value}</span>
              </a>
            </ScrollCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function Education() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="education" className="section">
      <SectionHeading index="02" kicker="Formation" title="Parcours académique" />
      <div className="timeline" ref={ref}>
        <div className="timeline-track">
          <motion.div className="timeline-fill" style={{ scaleY }} />
        </div>
        {EDUCATION.map((item) => (
          <ScrollCard key={item.title} className="timeline-item" x={-70} depth={40}>
            <motion.span
              className="timeline-dot"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, amount: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
            />
            <div className="glass-card timeline-card">
              <span className="pill">{item.period}</span>
              <h3>{item.title}</h3>
              <p className="muted">
                <i className="ph ph-graduation-cap" /> {item.school}
              </p>
              {item.courses.length > 0 && <TagList items={item.courses} delay={0.4} />}
            </div>
          </ScrollCard>
        ))}
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section id="projects" className="section">
      <SectionHeading index="03" kicker="Projets" title="Des plateformes livrées en production" />
      <div className="projects-grid">
        {PROJECTS.map((project, i) => (
          // Right column travels further: the grid moves in a staggered wave.
          <ScrollCard key={project.name} depth={i % 2 ? 110 : 50}>
            <TiltCard className="project-card glass-card">
              <div className="project-glow" />
              <div className="project-top">
                <span className="project-number">0{i + 1}</span>
                <span className="pill">
                  <i className="ph ph-clock" /> {project.duration}
                </span>
              </div>
              <SplitText as="h3" text={project.name} delay={0.3} />
              <Animate as="p" className="muted" delay={0.4}>
                {project.description}
              </Animate>
              <TagList items={project.tech} delay={0.5} />
              <a className="project-link" href={project.url} target="_blank" rel="noreferrer">
                {project.url.replace(/^https?:\/\//, '')} <i className="ph ph-arrow-up-right" />
              </a>
            </TiltCard>
          </ScrollCard>
        ))}
      </div>
    </section>
  );
}

function Experience() {
  return (
    <section id="experience" className="section">
      <SectionHeading index="04" kicker="Stages" title="Expérience professionnelle" />
      <div className="experience-list">
        {INTERNSHIPS.map((job, i) => (
          <ScrollCard key={job.company} x={i % 2 ? 90 : -90} depth={50}>
            <article className="experience-card glass-card">
              <div className="experience-meta">
                <span className="experience-type">{job.type}</span>
                <SplitText as="h3" text={job.company} by="char" step={0.03} delay={0.25} />
                <span className="pill">
                  <i className="ph ph-clock" /> {job.duration}
                </span>
              </div>
              <div className="experience-body">
                <Animate as="p" className="muted" delay={0.35}>
                  {job.description}
                </Animate>
                <TagList items={job.tech} delay={0.5} />
              </div>
            </article>
          </ScrollCard>
        ))}
      </div>
    </section>
  );
}

function Marquee() {
  const all = SKILL_GROUPS.flatMap((g) => g.items);
  return (
    <div className="marquee" aria-hidden="true">
      <VelocityRow items={all} baseVelocity={-1} />
      <VelocityRow items={[...all].reverse()} baseVelocity={1} className="outline" />
    </div>
  );
}

function Skills() {
  return (
    <section id="skills" className="section">
      <SectionHeading index="05" kicker="Compétences" title="Ma boîte à outils technique" />
      <Marquee />
      <div className="skills-grid">
        {SKILL_GROUPS.map((group, i) => (
          <ScrollCard key={group.title} depth={30 + (i % 3) * 35} tilt={16}>
            <div className="skill-card glass-card">
              <div className="skill-head">
                <motion.i
                  className={`ph ${group.icon}`}
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                />
                <h3>{group.title}</h3>
              </div>
              <TagList items={group.items} delay={0.35} />
            </div>
          </ScrollCard>
        ))}
      </div>

      <div className="extras-grid">
        <ScrollCard x={-70} depth={40}>
          <div className="glass-card extras-card">
            <h3>
              <i className="ph ph-translate" /> Langues
            </h3>
            {LANGUAGES.map((lang, i) => (
              <div key={lang.name} className="lang">
                <div className="lang-row">
                  <span>{lang.name}</span>
                  <span className="muted">{lang.level}</span>
                </div>
                <div className="lang-bar">
                  <motion.span
                    initial={{ width: 0 }}
                    whileInView={{ width: `${lang.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: EASE, delay: 0.3 + i * 0.12 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollCard>
        <ScrollCard x={70} depth={70}>
          <div className="glass-card extras-card">
            <h3>
              <i className="ph ph-sparkle" /> Compétences douces
            </h3>
            <Stagger className="soft-list" step={0.08} delay={0.3}>
              {SOFT_SKILLS.map((s) => (
                <StaggerItem key={s} as="span" variant="pop" className="soft-chip">
                  <i className="ph ph-check-circle" /> {s}
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </ScrollCard>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="section contact-section">
      <Kicker index="06" label="Contact" center />
      <h2 className="contact-title">
        <SplitText text="Construisons quelque chose" delay={0.1} />{' '}
        <SplitText text="ensemble." by="char" itemClassName="accent-text-gradient" delay={0.45} step={0.05} />
      </h2>
      <Animate as="p" className="muted contact-sub" delay={0.3}>
        Ouvert à apprendre et à répondre aux besoins de l'entreprise, prêt à contribuer dans tout rôle requis.
      </Animate>
      <Stagger className="contact-actions" step={0.12} delay={0.45}>
        <StaggerItem variant="pop">
          <Magnetic>
            <a href={`mailto:${PROFILE.email}`} className="btn btn-primary btn-shine">
              <i className="ph ph-envelope-simple" /> {PROFILE.email}
            </a>
          </Magnetic>
        </StaggerItem>
        <StaggerItem variant="pop">
          <Magnetic>
            <a href={PROFILE.phoneHref} className="btn btn-outline">
              <i className="ph ph-phone" /> {PROFILE.phone}
            </a>
          </Magnetic>
        </StaggerItem>
      </Stagger>
      <Animate as="footer" className="site-footer" delay={0.2} amount={0.8}>
        <span>
          © {new Date().getFullYear()} {PROFILE.firstName} {PROFILE.lastName}
        </span>
        <span className="muted">
          <i className="ph ph-map-pin" /> {PROFILE.location}
        </span>
      </Animate>
    </section>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  return <motion.div className="scroll-progress" style={{ scaleX }} />;
}

export default function App() {
  useSmoothScroll();
  const sceneReady = useIdleReady(900);

  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}>{sceneReady && <Scene />}</Suspense>
      <ScrollProgress />
      <Navbar />
      <main className="page">
        <Hero />
        <About />
        <Education />
        <Projects />
        <Experience />
        <Skills />
        <Contact />
      </main>
    </MotionConfig>
  );
}
