// Single source of truth for the CV.
// Both the classic site (/index.html) and the 3D island (/play/) are built from this file,
// so updating the CV means editing only this file (and replacing the PDF in assets/cv/).
// Dates are 'YYYY-MM'; `end: null` means the role is current.

export const cv = {
  name: 'Giannis Papamichail',
  fullName: 'Ioannis Papamichail',
  title: 'Senior Full-Stack Engineer',
  tagline: 'I build software that helps shipping companies keep their fleets safe.',
  location: 'Athens, Greece',
  coordinates: '37.98° N · 23.73° E',
  email: 'papamichail.giannis@gmail.com',
  github: 'https://github.com/giannispapamike',
  linkedin: 'https://www.linkedin.com/in/giannispapamike/',
  // Path from the site root; the island prefixes '../'.
  cvFile: 'assets/cv/ioannis-papamichail-cv.pdf',
  // Optional headshot path from the site root, e.g. 'assets/img/me.jpg'. Leave empty for a monogram.
  photo: '',

  about: [
    'At Orca AI I work across the whole stack of FleetView, the fleet-safety platform used by ship owners and operators: an Angular web and mobile app, Python and NestJS microservices on PostgreSQL and Snowflake, and AWS pipelines.',
    'I own features end to end, from product spec and design review to backend schema, API, UI, release and QA follow-up. I care about developer experience as much as product: test-suite migrations, major framework upgrades and release pipelines are part of the job.',
    'In parallel I founded Matso, a multi-tenant personal and business finance platform for the Greek market, which I build solo end to end. Computer Engineering graduate of the National Technical University of Athens, working with a distributed team in Tel Aviv.',
  ],

  experience: [
    {
      company: 'Orca AI',
      role: 'Senior Full-Stack Engineer',
      start: '2024-11',
      end: null,
      location: 'Tel Aviv, Israel · Remote',
      summary: 'Full-stack engineer on FleetView, Orca AI\'s fleet-safety platform for shipping companies. ~1,000 commits in the dashboard, ~250 across backend repos, 120+ tickets delivered.',
      highlights: [
        'Designed and built the company-wide MMSI-updates orchestrator (Python, Kubernetes): one pipeline with row-level backups, rollback and verification replaced a manual process spanning five teams. Used for every production fleet migration.',
        'Built the AI Search Assistant: natural-language prompts turned into Events-page filters via an OpenAI-backed NestJS service; led the accuracy and performance sprint that closed 35+ QA tickets.',
        'Replaced the Kepler.gl port-events map with a custom Angular + Mapbox GL + deck.gl map: vessel playback, heading and course arrows, ENC nautical charts, downloadable standalone maps.',
        'Shipped GPS-spoofing alert notifications end to end: rules UI, AWS Lambda/SQS processors, email templates, Terraform.',
        'Led the new design-system rollout: a shared Angular component library with Storybook and SCSS tokens across web and mobile.',
        'Upgraded Angular 16 → 20, migrated Karma to Jest, and rebuilt the GitLab release pipeline with automatic versioning, changelogs and Slack notifications.',
      ],
      stack: ['Angular', 'TypeScript', 'NgRx', 'NestJS', 'Python', 'PostgreSQL', 'Snowflake', 'Mapbox GL', 'deck.gl', 'AWS', 'Kubernetes', 'Terraform', 'OpenAI API'],
    },
    {
      company: 'Matso.app',
      role: 'Founder & Principal Engineer',
      start: '2024-02',
      end: null,
      location: 'Athens, Greece',
      summary: 'A multi-tenant personal and business finance platform for the Greek market, built solo end to end: product, architecture, infrastructure, billing and go-to-market. ~280k lines across an Nx monorepo, launching November 2026.',
      highlights: [
        'Built and shipped the whole platform solo: a 51-model domain, role-based access control and a bilingual (EN/GR) UI, from first commit to production infrastructure.',
        'Integrated Stripe end to end as merchant of record: four plan tiers, trials, per-seat billing, downgrade schedules and idempotent webhook handling.',
        'Built a bank-statement import pipeline for six Greek banks and six CSV/XLSX dialects, with column mapping, duplicate and transfer detection, and a 30-day undo.',
        'Own production: Sentry, structured logging, k6 load testing, and a cross-region latency investigation that set the API\'s capacity SLO.',
      ],
      stack: ['Angular', 'NgRx SignalStores', 'Tailwind CSS', 'NestJS', 'Prisma', 'PostgreSQL', 'Stripe', 'Playwright', 'k6', 'Nx', 'Docker'],
    },
    {
      company: 'Calm',
      role: 'Staff Software Engineer',
      start: '2022-07',
      end: '2024-12',
      location: 'San Francisco, USA · Remote',
      summary: 'iOS engineer on the Calm Health mobile app.',
      highlights: [
        'Built a new iOS app from scratch on a custom architecture (Model–View–Store–State–Interactor) designed for scalability and performance.',
        'Built custom animations, AVPlayer-based media playback, push notifications, deep links and a REST client with a caching layer.',
      ],
      stack: ['Swift', 'SwiftUI', 'AVPlayer', 'REST'],
    },
    {
      company: 'Calm',
      role: 'Full-Stack Engineer',
      start: '2022-01',
      end: '2022-06',
      location: 'San Francisco, USA · Remote',
      summary: 'Web client apps and backend services.',
      highlights: [
        'Contributed to Calm\'s web client apps (Next.js, React, TypeScript).',
        'Built a PDF renderer and generator microservice from scratch (Node.js, Go, Docker, GCP Pub/Sub).',
      ],
      stack: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Go', 'GCP'],
    },
    {
      company: 'Programize · Greek Government (EFKA)',
      role: 'Full-Stack Engineer',
      start: '2021-09',
      end: '2022-01',
      location: 'Athens, Greece',
      summary: 'Automated the manual lump-sum and pension calculations for the Greek engineers\' sector.',
      highlights: [
        'Merged several smaller sector databases into one unified database for EFKA.',
        'Isolated and modularised the legacy code so it could be extended safely.',
        'Largely ran the project: development, QA supervision, test/dev/prod environments, staff training and production deployment.',
      ],
      stack: ['PHP', 'JavaScript', 'SCSS', 'MySQL', 'PostgreSQL', 'CI/CD'],
    },
    {
      company: 'Greek Army · Military hospitals',
      role: 'Full-Stack Engineer',
      start: '2021-01',
      end: '2021-09',
      location: 'Athens, Greece',
      summary: 'Backend and frontend work for the military hospitals\' information systems.',
      highlights: [
        'Built a microservice backend that lets different lab information systems exchange medical data over HL7.',
        'Built scalable APIs for a PHP backend, refactored legacy code and improved server response times.',
      ],
      stack: ['React', 'PHP Symfony', 'Node.js', 'PostgreSQL', 'Docker'],
    },
    {
      company: 'Infiot (acquired by Netskope)',
      role: 'Full-Stack Engineer',
      start: '2019-07',
      end: '2020-09',
      location: 'San Jose, USA · Remote',
      summary: 'A cloud-native big-data platform for secure end-to-end networking. Infiot was acquired by Netskope in 2022.',
      highlights: [
        'Full-stack development across IoT data, APIs and the Angular dashboard, with unit, integration and end-to-end tests.',
      ],
      stack: ['TypeScript', 'Angular', 'Node.js', 'GraphQL', 'MongoDB', 'Redis', 'Kubernetes', 'GCP'],
    },
    {
      company: 'Programize',
      role: 'Software Engineer',
      start: '2019-05',
      end: '2021-01',
      location: 'Athens, Greece',
      summary: 'Software engineering consultant on client projects.',
      highlights: [
        'Built a mobile-first website from scratch with fully custom CSS animations (Vue.js, SCSS, AWS Lambda).',
      ],
      stack: ['Vue.js', 'SCSS', 'AWS Lambda'],
    },
    {
      company: 'Freelance',
      role: 'Software Engineer',
      start: '2018-03',
      end: '2019-05',
      location: 'Athens, Greece',
      summary: 'Full-stack applications for small organisations.',
      highlights: [
        'Built a full-stack app for a Cypriot athletics coaches\' association (ASP.NET, C#).',
        'Built a brokerage-office app with custom role- and permission-based auth (NestJS, React, MongoDB).',
      ],
      stack: ['ASP.NET', 'C#', 'NestJS', 'React', 'MongoDB'],
    },
  ],

  // Selected work shown as cards on the classic site and at the island's Projects station.
  work: [
    { title: 'AI Search Assistant', org: 'Orca AI', text: 'Natural-language questions become Events-page filters through an OpenAI-backed NestJS service.', tags: ['LLM', 'NestJS', 'Angular'] },
    { title: 'Port-operations map', org: 'Orca AI', text: 'A custom Mapbox GL + deck.gl map with vessel playback, course arrows and ENC nautical charts.', tags: ['Mapbox GL', 'deck.gl'] },
    { title: 'MMSI-updates orchestrator', org: 'Orca AI', text: 'Backups, rollback and verification in one pipeline that replaced a manual process across five teams.', tags: ['Python', 'Kubernetes'] },
    { title: 'Greek bank imports', org: 'Matso', text: 'Six banks and six statement dialects, with duplicate and transfer detection and a 30-day undo.', tags: ['NestJS', 'Prisma'] },
    { title: 'Stripe billing', org: 'Matso', text: 'Four plan tiers, trials, per-seat billing and idempotent webhooks that survive retries.', tags: ['Stripe', 'PostgreSQL'] },
    { title: 'Calm Health iOS app', org: 'Calm', text: 'A new iOS app on a custom architecture, with media playback, deep links and a cached API client.', tags: ['Swift', 'SwiftUI'] },
  ],

  skills: [
    { group: 'Frontend', items: ['Angular', 'TypeScript', 'RxJS / NgRx', 'React', 'Next.js', 'Vue.js', 'HTML & SCSS', 'Mapbox GL / deck.gl'] },
    { group: 'Backend', items: ['NestJS', 'Node.js', 'Python', 'Go', 'PHP', 'Prisma'] },
    { group: 'Data', items: ['PostgreSQL', 'Snowflake', 'MongoDB', 'MySQL'] },
    { group: 'Cloud & delivery', items: ['AWS Lambda / SQS', 'Kubernetes', 'Docker', 'Terraform', 'GitLab CI', 'GitHub Actions'] },
    { group: 'Mobile', items: ['Swift', 'SwiftUI'] },
    { group: 'Product & quality', items: ['OpenAI API', 'Stripe Billing', 'Jest', 'Playwright', 'k6', 'Software architecture'] },
  ],

  education: [
    {
      degree: 'MEng, Electrical & Computer Engineering',
      school: 'National Technical University of Athens',
      start: '2011-09',
      end: '2018',
      details: [
        'Software, Computer Systems, Telecommunications and Computer Networks',
        'Thesis: social-media event detection with NLP and machine learning',
        'Member of EESTEC',
      ],
      link: 'https://www.ece.ntua.gr/en',
    },
  ],

  languages: [
    { name: 'Greek', level: 'Native' },
    { name: 'English', level: 'C1 listening and reading · B2 writing and speaking' },
  ],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(ym) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-');
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
}

export function formatRange(start, end) {
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}
