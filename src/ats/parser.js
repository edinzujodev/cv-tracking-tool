// A deliberately plain resume parser: it finds only what an ATS finds without
// guessing. A resume it cannot read here is a resume to worry about.

const HEADINGS = {
  summary: /^(professional )?(summary|profile|about( me)?|objective)$/i,
  experience: /^((work|professional) )?(experience|employment( history)?|work history)$/i,
  education: /^education( (and|&) training)?$/i,
  skills: /^((technical|key|core) )?skills$/i,
  projects: /^(passion )?projects?$/i,
  awards: /^((honou?rs|awards)( (and|&) (awards|honou?rs))?|awards?|certifications?|licenses( (and|&) certifications)?)$/i,
  volunteering: /^volunteer(ing)?( experience)?$/i,
  languages: /^languages$/i,
};

export function headingKey(line) {
  const t = line.trim().replace(/:$/, '');
  return Object.keys(HEADINGS).find((k) => HEADINGS[k].test(t)) || null;
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /\+?\d[\d\s().-]{6,}\d/;

export function parseResume(lines) {
  const sections = {};
  const header = [];
  let key = null;
  for (const line of lines) {
    const h = headingKey(line);
    if (h && !(h in sections)) {
      key = h;
      sections[h] = [];
    } else if (key) sections[key].push(line);
    else header.push(line);
  }
  const headerText = header.join(' ');
  return {
    header,
    name: header[0] || '',
    email: (EMAIL.exec(headerText) || [''])[0],
    phone: (PHONE.exec(headerText) || [''])[0],
    sections,
  };
}
