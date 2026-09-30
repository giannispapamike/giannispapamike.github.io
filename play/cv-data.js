// All CV content for the 3D portfolio lives here.
// To update the site for a new CV, edit this file only — the world is built from it.
// Entries marked TODO are placeholders to be replaced with the new CV.

export const cv = {
  name: 'Giannis Papamichail',
  title: 'Software Engineer',
  location: 'Athens, Greece',
  email: 'papamichail.giannis@gmail.com',
  cvFile: '../dist/assets/cv/cv-english.pdf',

  // Each station is a stop on the island. `shape` picks the floating landmark
  // (torus, cone, box, octa, ico, knot) and `color` its glow.
  stations: [
    {
      id: 'about',
      label: 'About',
      shape: 'torus',
      color: '#ff7a59',
      type: 'text',
      paragraphs: [
        'Creative and solution-oriented Computer Engineer with in-depth knowledge of algorithmic complexity and data structures. Driven and self-motivated, while enjoying teamwork and collaboration.',
        'Passionate about new technologies and experimentation. Experienced in software and web development, data analysis, natural language processing and machine learning.',
      ],
    },
    {
      id: 'experience',
      label: 'Experience',
      shape: 'box',
      color: '#ffc94a',
      type: 'timeline',
      items: [
        {
          date: 'TODO – Present',
          title: 'TODO: Current role',
          subtitle: 'TODO: Company',
          details: ['TODO: key achievement', 'TODO: key achievement'],
        },
        {
          date: 'TODO',
          title: 'TODO: Previous role',
          subtitle: 'TODO: Company',
          details: ['TODO: key achievement'],
        },
      ],
    },
    {
      id: 'education',
      label: 'Education',
      shape: 'cone',
      color: '#5ad1a7',
      type: 'timeline',
      items: [
        {
          date: 'Feb 2019',
          title: 'Diploma in Electrical & Computer Engineering',
          subtitle: 'National Technical University of Athens',
          details: [
            'Software, Computer Systems, Telecommunications & Networks',
            'Thesis: Social-media event detection with NLP and machine learning',
          ],
        },
      ],
    },
    {
      id: 'skills',
      label: 'Skills',
      shape: 'octa',
      color: '#5aa9ff',
      type: 'skills',
      groups: [
        { name: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'C#', 'C++', 'Java', 'C'] },
        { name: 'Web', items: ['Angular', 'Node.js', 'ASP.NET', 'HTML & CSS', 'SASS'] },
        { name: 'Data', items: ['SQL', 'NoSQL', 'Machine Learning', 'NLP'] },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      shape: 'knot',
      color: '#c58bff',
      type: 'projects',
      items: [
        { title: 'studentcompass.edu.gr', text: 'Website for a cram school.', link: 'https://studentcompass.edu.gr' },
        { title: 'Parallel computing', text: 'Game of Life (OpenMP), Floyd–Warshall (TBB), heat equation (MPI), mat-vec (CUDA).' },
        { title: 'Encrypted chat & QEMU crypto device', text: 'Linux drivers, virtual devices and a TCP chat.' },
        { title: 'Flight simulator & Pong', text: 'Graphics and game projects in Unity.' },
      ],
    },
    {
      id: 'contact',
      label: 'Contact',
      shape: 'ico',
      color: '#ff6fae',
      type: 'contact',
      links: [
        { label: 'Email', href: 'mailto:papamichail.giannis@gmail.com' },
        { label: 'GitHub', href: 'https://github.com/giannispapamike' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/giannispapamike/' },
      ],
    },
  ],
};
