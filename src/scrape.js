// Saving the text of a job posting, so it survives after the link stops working.

const MAX_CHARS = 60000;

function clean(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
}

// Many job sites embed the posting as JSON-LD (schema.org JobPosting); it is the cleanest source.
function jsonLdDescription(doc) {
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.textContent);
      const items = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
      const job = items.find((i) => i && i['@type'] === 'JobPosting' && i.description);
      if (job) {
        const holder = new DOMParser().parseFromString(`<body>${job.description}</body>`, 'text/html');
        const title = [job.title, job.hiringOrganization && job.hiringOrganization.name].filter(Boolean).join(' - ');
        return clean(`${title}\n\n${holder.body.innerText || holder.body.textContent}`);
      }
    } catch { /* not valid JSON, try the next one */ }
  }
  return '';
}

export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const fromJson = jsonLdDescription(doc);
  if (fromJson.length > 200) return fromJson;
  doc.querySelectorAll('script, style, noscript, svg, nav, header, footer, form, iframe').forEach((n) => n.remove());
  // textContent ignores layout, so add line breaks after block elements ourselves.
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p, li, div, h1, h2, h3, h4, h5, h6, tr, section').forEach((n) => n.append('\n'));
  const root = doc.querySelector('main, [role="main"], article') || doc.body;
  const text = clean(root.textContent || '');
  return text.length > 200 ? text : clean(doc.body.textContent || '');
}

// Text that is too short, or looks like a login or bot-check page, was probably not the posting.
export function looksBlocked(text) {
  if (text.length < 300) return true;
  return /\b(sign in|log in|captcha|verify you are human|enable javascript|access denied)\b/i.test(text.slice(0, 600)) && text.length < 1500;
}

export async function fetchJobText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { credentials: 'include', signal: ctrl.signal });
    if (!res.ok) throw new Error(`The site answered ${res.status}.`);
    const text = htmlToText(await res.text());
    if (looksBlocked(text)) {
      throw new Error('The page did not contain the posting (login wall or built with JavaScript). Open it in a tab and use "Capture from open tab".');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Open web pages other than the tracker itself.
export async function listCapturableTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((t) => /^https?:/i.test(t.url || ''));
}

// Read what is visible in an open tab (works on pages behind a login).
export async function captureTab(tabId) {
  const [res] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const main = document.querySelector('main, [role="main"], article');
      const pick = main && main.innerText.length > 500 ? main : document.body;
      return { text: pick.innerText, title: document.title, url: location.href };
    },
  });
  const r = res && res.result;
  if (!r) throw new Error('Could not read that tab.');
  return { ...r, text: clean(r.text) };
}
