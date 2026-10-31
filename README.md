# LinkedIn Resume

Chrome extension that turns your own LinkedIn profile into an ATS-friendly resume.
Everything stays in your browser. See [docs/PLAN.md](docs/PLAN.md).

## Try it

1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked** and select this folder.
3. Open your own LinkedIn profile, click the extension icon, then **Scan my profile**.
4. Check the details, pick a template, **Open resume**, then **Save as PDF**.
5. Back on the resume page, **Check a saved PDF** reads your PDF the way a parser would
   and lists anything it could not read.

## Tests

`node --test test/check.test.mjs` runs the read-back check on made-up resumes, including
broken ones. `test/browser-harness.html` runs it in a real browser against a printed PDF.
