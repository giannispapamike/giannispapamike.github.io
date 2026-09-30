import { cv, formatRange } from '../data/cv.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chips = (items) => `<ul class="chips">${items.map((x) => `<li class="chip">${esc(x)}</li>`).join('')}</ul>`;

// ---------- Content ----------
function monthsBetween(start, end) {
  const [sy, sm] = start.split('-').map(Number);
  const now = new Date();
  const [ey, em] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return (ey - sy) * 12 + (em - sm) + 1;
}

function duration(start, end) {
  const m = monthsBetween(start, end);
  const y = Math.floor(m / 12), r = m % 12;
  return [y && `${y} yr${y > 1 ? 's' : ''}`, r && `${r} mo${r > 1 ? 's' : ''}`].filter(Boolean).join(' ');
}

function jobHtml(j) {
  return `
    <li class="job">
      <div class="job-when mono">
        <span class="dates">${esc(formatRange(j.start, j.end))}</span>
        <span class="dur">${esc(duration(j.start, j.end))}</span>
      </div>
      <div>
        <h3>${esc(j.role)}${j.end ? '' : '<span class="now"><span class="pulse"></span>Now</span>'}</h3>
        <p class="company">${esc(j.company)} <span class="where">· ${esc(j.location)}</span></p>
        <p class="summary">${esc(j.summary)}</p>
        ${j.highlights?.length ? `<ul>${j.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        ${j.stack?.length ? chips(j.stack) : ''}
      </div>
    </li>`;
}

function render() {
  document.title = `${cv.name} · ${cv.title}`;
  $('hero-eyebrow').innerHTML = [cv.location, cv.coordinates].map((x) => `<span>${esc(x)}</span>`).join('');
  $('hero-name').textContent = cv.name;
  $('hero-role').textContent = cv.title;
  $('hero-tagline').textContent = cv.tagline;
  $('hero-currently').innerHTML = cv.experience.filter((j) => !j.end)
    .map((j) => `<li><span class="pulse" aria-hidden="true"></span><span>${esc(j.role)} · <strong>${esc(j.company)}</strong></span></li>`).join('');
  $('hero-cv').href = cv.cvFile;

  $('about-body').innerHTML = cv.about.map((p) => `<p>${esc(p)}</p>`).join('');

  // Recent roles open; roles that ended before Oct 2021 fold into "Earlier roles"
  const recent = cv.experience.filter((j) => !j.end || j.end >= '2021-10');
  const older = cv.experience.filter((j) => j.end && j.end < '2021-10');
  const firstYear = cv.experience.map((j) => j.start).sort()[0].slice(0, 4);
  $('exp-note').textContent = `${firstYear} – today · ${cv.experience.length} roles`;
  $('timeline').innerHTML = recent.map(jobHtml).join('') + (older.length ? `
    <li>
      <details class="older">
        <summary>Earlier roles (${esc(older.at(-1).start.slice(0, 4))}–${esc(older[0].end.slice(0, 4))}) · ${older.map((j) => esc(j.company.split(/ [·(]/)[0])).join(', ')}</summary>
        <ol class="timeline">${older.map(jobHtml).join('')}</ol>
      </details>
    </li>` : '');

  $('work-grid').innerHTML = cv.work.map((w) => `
    <article class="card">
      <p class="org mono">${esc(w.org)}</p>
      <h3>${esc(w.title)}</h3>
      <p>${esc(w.text)}</p>
      ${chips(w.tags)}
    </article>`).join('');

  $('skill-grid').innerHTML = cv.skills.map((g) => `
    <div class="skill-group">
      <h3>${esc(g.group)}</h3>
      ${chips(g.items)}
    </div>`).join('');

  $('education-list').innerHTML = cv.education.map((e) => `
    <div class="edu">
      <h3>${esc(e.degree)}</h3>
      <p class="school">${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.school)}</a>` : esc(e.school)}</p>
      <p class="dates mono">${esc(formatRange(e.start, e.end))}</p>
      <ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    </div>`).join('');

  $('languages').innerHTML = cv.languages.map((l) => `<div><dt>${esc(l.name)}</dt><dd>${esc(l.level)}</dd></div>`).join('');

  $('contact-email').textContent = cv.email;
  $('contact-links').innerHTML = `
    <a class="btn btn-ghost" href="${esc(cv.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
    <a class="btn btn-ghost" href="${esc(cv.github)}" target="_blank" rel="noopener">GitHub</a>
    <a class="btn btn-primary" href="${esc(cv.cvFile)}" download>Download CV</a>`;

  $('footer-copy').innerHTML = `© ${new Date().getFullYear()} ${esc(cv.name)} · <a href="play/">Play the island</a>`;
  $('footer-coords').textContent = cv.coordinates;
}

render();

// ---------- Copy email ----------
$('copy-email').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(cv.email);
    btn.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('contact-email'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    btn.textContent = 'Selected';
  }
  setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
});

// ---------- Theme (shared with /play via localStorage 'gp-theme') ----------
const root = document.documentElement;
const media = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : media.matches;

function syncThemeFlag() {
  root.toggleAttribute('data-dark', isDark());
  $('theme-toggle').setAttribute('aria-label', isDark() ? 'Switch to day theme' : 'Switch to night theme');
  contours.refreshColor();
}

$('theme-toggle').addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('gp-theme', next); } catch { /* storage unavailable */ }
  syncThemeFlag();
});
media.addEventListener('change', syncThemeFlag);

// ---------- Depth contours behind the hero ----------
// Marching squares over a drifting noise field, drawn like bathymetry on a nautical chart.
const contours = (() => {
  const canvas = $('contours');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CELL = 16;
  const LEVELS = 9;
  let w = 0, h = 0, color = '#000', visible = true, last = 0;

  // Small value-noise implementation
  const perm = new Uint8Array(512);
  { let s = 11; for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]; }
  const fade = (t) => t * t * (3 - 2 * t);
  const hash = (x, y) => perm[(perm[x & 255] + y) & 255] / 255;
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const u = fade(xf), v = fade(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const field = (x, y, t) => noise(x * 0.006 + t, y * 0.006) * 0.65 + noise(x * 0.014 - t * 0.6, y * 0.014 + 7) * 0.35;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / CELL) + 1, rows = Math.ceil(h / CELL) + 1;
    const vals = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) vals[j * cols + i] = field(i * CELL, j * CELL, t);

    ctx.strokeStyle = color;
    for (let l = 0; l < LEVELS; l++) {
      const iso = 0.2 + (l / (LEVELS - 1)) * 0.6;
      ctx.lineWidth = l % 4 === 0 ? 1.6 : 0.9; // every fourth line is an index contour
      ctx.beginPath();
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = vals[j * cols + i], b = vals[j * cols + i + 1], c = vals[(j + 1) * cols + i + 1], d = vals[(j + 1) * cols + i];
          const code = (a > iso) | ((b > iso) << 1) | ((c > iso) << 2) | ((d > iso) << 3);
          if (code === 0 || code === 15) continue;
          const x = i * CELL, y = j * CELL;
          const lerp = (p, q) => (iso - p) / (q - p);
          const top = [x + CELL * lerp(a, b), y], right = [x + CELL, y + CELL * lerp(b, c)];
          const bottom = [x + CELL * lerp(d, c), y + CELL], left = [x, y + CELL * lerp(a, d)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (code) {
            case 1: case 14: seg(left, top); break;
            case 2: case 13: seg(top, right); break;
            case 3: case 12: seg(left, right); break;
            case 4: case 11: seg(right, bottom); break;
            case 5: seg(left, top); seg(right, bottom); break;
            case 6: case 9: seg(top, bottom); break;
            case 7: case 8: seg(left, bottom); break;
            case 10: seg(left, bottom); seg(top, right); break;
          }
        }
      }
      ctx.stroke();
    }

    // Soundings: depth figures scattered like on a chart
    ctx.fillStyle = color;
    ctx.font = '11px "IBM Plex Mono", monospace';
    for (let k = 0; k < 14; k++) {
      const sx = ((k * 0.618034) % 1) * w, sy = ((k * 0.414214 + 0.1) % 1) * h;
      ctx.fillText(String(Math.round(field(sx, sy, t) * 90)), sx, sy);
    }
  }

  function loop(now) {
    if (visible && now - last > 60) { draw(now / 60000); last = now; }
    requestAnimationFrame(loop);
  }

  function refreshColor() {
    color = getComputedStyle(root).getPropertyValue('--contour').trim() || color;
    if (reduced || !visible) draw(0.3);
  }

  resize();
  addEventListener('resize', () => { resize(); if (reduced) draw(0.3); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  if (reduced) draw(0.3); else requestAnimationFrame(loop);
  return { refreshColor };
})();

syncThemeFlag();
