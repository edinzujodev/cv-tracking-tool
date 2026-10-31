import { loadProfile, TEMPLATE_KEY } from './model.js';
import { getTemplate } from './templates/index.js';
import { checkReadBack } from './ats/check.js';
import { itemsFromDom, itemsFromPdf } from './ats/reader.js';

const $ = (id) => document.getElementById(id);
const LABEL = { pass: 'OK', warn: 'Check', fail: 'Fail' };

function showCheck(profile, items, source) {
  const { score, results } = checkReadBack(profile, items);
  const problems = results.filter((r) => r.status !== 'pass');
  $('check').innerHTML = `
    <article>
      <h3>ATS read-back: ${score}/100 <small>${source}</small></h3>
      <small>${problems.length ? `${problems.length} thing${problems.length === 1 ? '' : 's'} to look at.` : 'Everything was read back correctly.'}
      This shows whether a parser can read the data. It does not promise any one ATS will accept it.
      ${source.startsWith('quick') ? 'Save as PDF, then use "Check a saved PDF" for the accurate result.' : ''}</small>
      <ul>${[...problems, ...results.filter((r) => r.status === 'pass')]
        .map((r) => `<li><span class="badge ${r.status}">${LABEL[r.status]}</span><span>${esc(r.label)}${r.detail ? ` <small>${esc(r.detail)}</small>` : ''}</span></li>`)
        .join('')}</ul>
    </article>`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

(async () => {
  const profile = await loadProfile();
  const { [TEMPLATE_KEY]: id } = await chrome.storage.local.get(TEMPLATE_KEY);
  const template = getTemplate(id);

  document.title = `${profile.name || 'Resume'} - Resume`;
  $('page').innerHTML = template.render(profile);

  // The browser's print engine writes real, selectable text, which is what an ATS needs.
  $('print').addEventListener('click', () => window.print());

  // Quick check on the page as rendered, once fonts have settled the layout.
  await document.fonts.ready;
  showCheck(profile, itemsFromDom($('page')), 'quick check of this page');

  // The accurate check: read the PDF the user saved, exactly as a parser would.
  $('pdf').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $('check').innerHTML = '<article aria-busy="true">Reading the PDF…</article>';
    try {
      const pdfjs = await import('../vendor/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.min.mjs');
      const items = await itemsFromPdf(new Uint8Array(await file.arrayBuffer()), pdfjs);
      showCheck(profile, items, `read from ${file.name}`);
    } catch (err) {
      $('check').innerHTML = `<article>Could not read that PDF: ${esc(err.message || err)}</article>`;
    }
    e.target.value = '';
  });
})();
