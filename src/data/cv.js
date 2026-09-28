// Contenu issu du CV de Seif Ben Aicha.

export const PROFILE = {
  firstName: 'Seif',
  lastName: 'Ben Aicha',
  role: 'Développeur Full-Stack JavaScript',
  // Rotating hero headline.
  roles: ['Développeur Full-Stack JavaScript', 'Développeur React & Node.js', 'Passionné Cloud & DevOps'],
  tagline: 'Étudiant en Master Cloud Computing & Applications Distribuées',
  location: 'Monastir, Tunisie',
  email: 'seifbenaicha50@gmail.com',
  phone: '+216 54 598 177',
  phoneHref: 'tel:+21654598177',
  github: 'seifbenaicha',
  githubUrl: 'https://github.com/seifbenaicha',
  cvUrl: '/seif-ben-aicha-cv.pdf',
  summary: [
    "Étudiant en deuxième année de Master en Cloud Computing et Développement des applications distribuées, avec une expertise dans la réalisation de projets académiques et professionnels et une capacité avérée à maîtriser rapidement de nouveaux outils pour développer des solutions efficaces et évolutives.",
    "Développeur web full-stack très motivé, avec 2 ans d'expérience spécialisée dans les frameworks JavaScript. Expert dans la création d'applications web réactives et conviviales, avec une forte attention à la performance et à l'évolutivité. J'ai appliqué avec succès mes compétences auto-apprises en React, MongoDB et SQL pour développer des applications bien structurées et efficaces.",
  ],
};

export const STATS = [
  { value: 2, suffix: '+', label: "Ans d'expérience" },
  { value: 4, suffix: '', label: 'Projets livrés' },
  { value: 2, suffix: '', label: 'Stages' },
];

export const EDUCATION = [
  {
    period: '2023 — Présent',
    title: 'Master en Cloud Computing et Développement des Applications Distribuées',
    school: 'ISET Sousse, Tunisie',
    courses: ['DevOps', 'Réseaux', 'Flutter', '.NET MVC', 'Docker', 'Kubernetes', 'JEE'],
  },
  {
    period: '2021 — 2022',
    title: 'Licence en Technologie Informatique, Multimédia et Développement Web',
    school: 'ISET Sousse, Tunisie',
    courses: ['Java', 'Angular', 'PHP', 'React.js', 'Symfony', 'C', 'C#', 'Laravel', 'Node.js'],
  },
  {
    period: '2020',
    title: "Diplôme National du Baccalauréat en Sciences de l'Informatique",
    school: 'Lycée Ali Bourguiba, Bembla',
    courses: [],
  },
];

export const PROJECTS = [
  {
    name: 'Maktba.tn',
    duration: '6 mois',
    description:
      "Création d'une plateforme destinée aux librairies sous forme de réseau social, côté client et serveur.",
    tech: ['React JS', 'Node JS', 'MySQL', 'Material UI', 'Figma', 'GitHub'],
    url: 'https://www.maktba.tn',
  },
  {
    name: 'JCI Association Platform',
    duration: '5 mois',
    description:
      "Développement de JCI, une plateforme pour l'association JCI, avec messagerie en temps réel et tableau de bord pour gérer membres et événements.",
    tech: ['React JS', 'Node JS', 'Mantine', 'Figma', 'GitHub'],
    url: 'https://jcizone.onrender.com',
  },
  {
    name: 'Talent619',
    duration: '4 mois',
    description:
      "Développement d'une plateforme connectant les développeurs spécialisés aux entreprises, offrant des opportunités freelance et simplifiant le recrutement.",
    tech: ['React JS', 'TypeScript', 'Mantine', 'Figma', 'GitHub'],
    url: 'https://talent619.com',
  },
  {
    name: 'Fly Delivery',
    duration: '3 mois',
    description:
      "Développement d'un tableau de bord administrateur pour Fly Delivery, une application destinée à faciliter la livraison de tous types de marchandises.",
    tech: ['React JS', 'Tailwind CSS', 'Figma', 'GitHub'],
    url: 'https://dev.flydelivery.tn',
  },
];

export const INTERNSHIPS = [
  {
    type: 'Stage de PFE',
    company: 'IT NEXT SOLUTIONS',
    duration: '6 mois',
    description:
      "Développement et maintenance d'applications web avec React.js (front-end) et Node.js/Express.js (back-end). Collaboration avec des designers (Figma) et des développeurs back-end pour l'implémentation de nouvelles fonctionnalités.",
    tech: ['React.js', 'Node.js', 'Express.js', 'Figma'],
  },
  {
    type: 'Stage de perfectionnement',
    company: 'DEV-GX',
    duration: '3 mois',
    description:
      "Développement d'une application web e-commerce avec Angular : interface dynamique et réactive, gestion des produits, paniers d'achat et paiements sécurisés, sur une architecture MVC.",
    tech: ['Angular', 'TypeScript', 'MVC'],
  },
];

export const SKILL_GROUPS = [
  { icon: 'ph-code', title: 'Programmation', items: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'C', 'C++', 'PHP', 'Java', 'Dart'] },
  { icon: 'ph-browsers', title: 'Front-End', items: ['React.js', 'Next.js', 'Angular', 'Flutter'] },
  { icon: 'ph-hard-drives', title: 'Back-End', items: ['Node.js', 'Laravel', 'Symfony'] },
  { icon: 'ph-database', title: 'Bases de données', items: ['MongoDB', 'MySQL'] },
  { icon: 'ph-wrench', title: 'Outils', items: ['Git', 'npm', 'Trello', 'Redux Toolkit', 'Figma', 'Web Design'] },
  { icon: 'ph-cloud', title: 'Autres', items: ['RESTful APIs', 'JSON', 'Docker', 'Kubernetes'] },
];

export const LANGUAGES = [
  { name: 'Arabe', level: 'Langue maternelle', percent: 100 },
  { name: 'Français', level: 'B1', percent: 60 },
  { name: 'Anglais', level: 'B1', percent: 60 },
];

export const SOFT_SKILLS = ['Résolution de problèmes', 'Communication', 'Pensée analytique', 'Gestion de projet'];
