// Content script: reads the LinkedIn profile the user is looking at, on request.
//
// It runs only when the panel asks (a click), only reads what is already on the
// page, and refuses on anyone else's profile. LinkedIn changes its markup often,
// so every selector lives in SEL and each lookup fails soft to an empty value.

(() => {
  const SEL = {
    name: 'main h1',
    headline: 'main .text-body-medium.break-words',
    location: 'main .text-body-small.inline.t-black--light.break-words',
    // Controls only the profile's owner sees.
    ownerControls: [
      'a[href*="/edit/intro/"]',
      '#navigation-add-edit-deeplink-edit-pencil',
      'a[href*="/add-edit/"]',
      'a[href*="/edit/forms/"]',
    ],
    visibleText: 'span[aria-hidden="true"]',
  };

  const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
  const DATE_RANGE = new RegExp(
    `^((?:(?:${MONTHS})[a-z]*\\.? )?\\d{4})\\s*[-–]\\s*((?:(?:${MONTHS})[a-z]*\\.? )?\\d{4}|Present)`,
    'i'
  );

  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const text = (sel) => clean(document.querySelector(sel)?.textContent);

  function isOwnProfile() {
    return SEL.ownerControls.some((s) => document.querySelector(s));
  }

  function findSection(title) {
    for (const section of document.querySelectorAll('main section')) {
      const heading = clean(section.querySelector('h2')?.textContent);
      if (heading && heading.toLowerCase().startsWith(title.toLowerCase())) return section;
    }
    return null;
  }

  // Each top-level list item becomes an array of its visible text lines.
  function itemLines(section) {
    if (!section) return [];
    const items = [...section.querySelectorAll('li')].filter(
      (li) => !li.parentElement.closest('li')
    );
    return items
      .map((li) => {
        const seen = new Set();
        return [...li.querySelectorAll(SEL.visibleText)]
          .map((n) => clean(n.textContent))
          .filter((t) => t && !seen.has(t) && seen.add(t));
      })
      .filter((lines) => lines.length);
  }

  function parseDates(line) {
    const m = DATE_RANGE.exec(line || '');
    return m ? { start: m[1], end: m[2] } : null;
  }

  function parseExperience(lines) {
    const dateAt = lines.findIndex((l) => parseDates(l));
    if (dateAt < 1) return null;
    const { start, end } = parseDates(lines[dateAt]);
    const rest = lines.slice(dateAt + 1);
    return {
      title: lines[0],
      company: clean((lines[1] || '').split('·')[0]),
      location: dateAt + 1 < lines.length && !/^[A-Z].{60,}/.test(rest[0] || '') ? rest[0] || '' : '',
      start,
      end,
      description: rest.slice(1).join('\n'),
    };
  }

  function parseEducation(lines) {
    const dateAt = lines.findIndex((l) => parseDates(l));
    const dates = dateAt >= 0 ? parseDates(lines[dateAt]) : null;
    return {
      school: lines[0] || '',
      degree: lines[1] && lines[1] !== lines[dateAt] ? lines[1] : '',
      start: dates?.start || '',
      end: dates?.end || '',
    };
  }

  function scan() {
    if (!isOwnProfile()) {
      return {
        ok: false,
        reason: 'not-own-profile',
        message: 'Open your own LinkedIn profile. This extension only reads the profile you own.',
      };
    }

    const about = findSection('About');
    const summary = about
      ? clean([...about.querySelectorAll(SEL.visibleText)].map((n) => n.textContent).slice(1).join(' '))
      : '';

    const experience = itemLines(findSection('Experience')).map(parseExperience).filter(Boolean);
    const education = itemLines(findSection('Education')).map(parseEducation);
    const skills = itemLines(findSection('Skills')).map((l) => l[0]).filter(Boolean);
    const certifications = itemLines(findSection('Licenses')).map((l) => ({
      name: l[0] || '',
      issuer: l[1] || '',
      date: (l.find((x) => /issued/i.test(x)) || '').replace(/^issued\s*/i, ''),
    }));
    const languages = itemLines(findSection('Languages')).map((l) => l[0]).filter(Boolean);
    const awards = itemLines(findSection('Honors')).map((l) => ({
      title: l[0] || '',
      issuer: (l.find((x) => /^associated with|^issued by/i.test(x)) || '').replace(/^(associated with|issued by)\s*/i, ''),
      date: (l.find((x) => /^issued/i.test(x)) || '').replace(/^issued\s*/i, ''),
    }));
    const projects = itemLines(findSection('Projects')).map((l) => ({
      name: l[0] || '',
      description: l.filter((x) => x !== l[0] && !parseDates(x)).join('\n'),
    }));
    const volunteering = itemLines(findSection('Volunteer')).map((l) => {
      const d = parseDates(l.find((x) => parseDates(x)));
      return {
        role: l[0] || '',
        organization: clean((l[1] || '').split('·')[0]),
        start: d?.start || '',
        end: d?.end || '',
        description: '',
      };
    });

    return {
      ok: true,
      profile: {
        name: text(SEL.name),
        headline: text(SEL.headline),
        location: text(SEL.location),
        links: [{ label: 'LinkedIn', url: location.origin + location.pathname.replace(/\/$/, '') }],
        summary,
        experience,
        education,
        skills,
        certifications,
        awards,
        projects,
        volunteering,
        languages,
      },
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg?.type === 'scan') respond(scan());
  });
})();
