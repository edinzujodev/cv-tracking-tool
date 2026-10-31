// Shared building blocks for every template.
//
// ATS rules all templates follow: one column of reading order, real text, standard
// headings, no tables, images or icons. Layouts that look two-column (dates on the
// left or right) are CSS grid over markup that still reads top to bottom:
// heading, then content, then dates.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dates = (a, b) => [a, b].filter(Boolean).join(' – ');
const paragraphs = (text) =>
  String(text || '').split('\n').filter(Boolean).map((l) => `<p class="desc">${esc(l)}</p>`).join('');

// How an entry's title and organisation are written:
//   stacked      Title (bold) over Organisation (italic)
//   inline       Title, Organisation
//   orgFirst     Organisation, Title
function head(title, org, style) {
  if (style === 'inline') return `<p class="head"><strong>${esc(title)},</strong> <em>${esc(org)}</em></p>`;
  if (style === 'orgFirst') return `<p class="head"><strong>${esc(org)},</strong> <em>${esc(title)}</em></p>`;
  return `<p class="head"><strong>${esc(title)}</strong></p>${org ? `<p class="org"><em>${esc(org)}</em></p>` : ''}`;
}

// Content first in the markup; CSS puts the dates on the left or right.
function entry({ title, org, start, end, place, body }, o) {
  const when = dates(start, end);
  return `<div class="item">
    <div class="main">${head(title, org, o.titleStyle)}${body || ''}</div>
    <div class="meta">${when ? `<p>${esc(when)}</p>` : ''}${place ? `<p>${esc(place)}</p>` : ''}</div>
  </div>`;
}

function section(title, body) {
  return body ? `<section><h2>${title}</h2>${body}</section>` : '';
}

function skills(p) {
  const groups = p.skillGroups.length ? p.skillGroups : p.skills.length ? [{ name: '', items: p.skills }] : [];
  if (!groups.length) return '';
  return `<div class="skills">${groups
    .map((g) => `<div class="skill-group">${g.name ? `<strong>${esc(g.name)}</strong>` : ''}<p>${g.items.map(esc).join(', ')}</p></div>`)
    .join('')}</div>`;
}

export function renderResume(p, o) {
  const contact = [p.email, p.phone, p.location, ...p.links.map((l) => l.url)].filter(Boolean);

  const experience = p.experience
    .map((e) => entry({ title: e.title, org: e.company, start: e.start, end: e.end, place: e.location, body: paragraphs(e.description) }, o))
    .join('');
  const education = p.education
    .map((e) => entry({ title: e.degree || e.school, org: e.degree ? e.school : '', start: e.start, end: e.end, body: paragraphs(e.details) }, o))
    .join('');
  const projects = p.projects
    .map((x) => `<div class="item solo"><div class="main"><p class="head"><strong>${esc(x.name)}</strong></p>${paragraphs(x.description)}</div></div>`)
    .join('');
  const awards = [...p.awards, ...p.certifications.map((c) => ({ title: c.name, issuer: c.issuer, date: c.date }))]
    .map((a) => entry({ title: a.title, org: a.issuer, start: a.date, body: '' }, o))
    .join('');
  const volunteering = p.volunteering
    .map((v) => entry({ title: v.role, org: v.organization, start: v.start, end: v.end, body: paragraphs(v.description) }, o))
    .join('');

  return `<article class="resume ${o.cls}">
    <header class="hdr">
      <div class="title-line"><h1>${esc(p.name)}</h1>${p.headline ? `<span class="tagline">${esc(p.headline)}</span>` : ''}</div>
      <ul class="contact">${contact.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </header>
    ${section('Summary', p.summary ? `<p class="desc">${esc(p.summary)}</p>` : '')}
    ${section('Experience', experience)}
    ${section('Education', education)}
    ${section('Skills', skills(p))}
    ${section('Projects', projects)}
    ${section('Awards', awards)}
    ${section('Volunteering', volunteering)}
    ${section('Languages', p.languages.length ? `<p class="desc">${p.languages.map(esc).join(', ')}</p>` : '')}
  </article>`;
}

// Layout shared by all four; each template overrides colour, type and headings.
export const BASE_CSS = `
  .resume { color: #111; font-size: 10.5pt; line-height: 1.4; max-width: 7.6in; margin: 0 auto;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .resume h1 { margin: 0; font-size: 22pt; line-height: 1.1; }
  .resume .title-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4pt 10pt; }
  .resume .tagline { font-size: 13pt; }
  .resume .contact { list-style: none; margin: 8pt 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 2pt 14pt; }
  .resume section { margin-top: 14pt; }
  .resume h2 { margin: 0 0 6pt; font-size: 12pt; }
  .resume p { margin: 0; }
  .resume .item { display: grid; gap: 0 14pt; margin-bottom: 8pt; break-inside: avoid; }
  .resume .item .main { grid-area: main; min-width: 0; }
  .resume .item .meta { grid-area: meta; }
  .resume .item.solo { grid-template-columns: 1fr; grid-template-areas: "main"; }
  .resume .skills { display: grid; gap: 8pt 18pt; }
  .resume .skill-group p { margin: 0; }
`;
