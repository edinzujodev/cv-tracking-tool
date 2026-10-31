# Plan

A browser extension (Manifest V3, plain JavaScript, Pico.css) that reads the LinkedIn
profile you are looking at, lets you pick one of 10 templates, and produces a resume an
ATS can parse. Everything runs in the browser; nothing is uploaded.

## Flow

1. **Scan.** On your own profile, click the toolbar icon, then "Scan my profile".
2. **Review.** Fix any field, add the email and phone LinkedIn hides.
3. **Build.** Pick a template, open the resume, save as PDF (text-based, selectable).
4. **Check** (phase 3). Read the generated PDF back and compare with the source data.

## Layout

```
manifest.json
src/background.js      opens the side panel from the toolbar icon
src/scanner.js         content script: reads the page, own profile only
src/model.js           the profile shape + storage helpers
src/panel.*            side panel UI (scan, edit, choose template)
src/resume.*           page that renders the chosen template and prints it
src/templates/         index.js (10 slots) + one file per template
vendor/pico.min.css    Pico.css 2.1.1, bundled (extensions cannot load a CDN)
```

## ATS rules every template follows

One column. No tables, text boxes, icons or images carrying text. Standard headings
(Summary, Experience, Education, Skills). Real text in a standard font. Dates as
`Month YYYY – Month YYYY`. Contact details in the body, not a page header or footer.

## Phases

1. **Scaffold + scanner + one template** (done, needs testing on a real profile).
2. **Templates.** Four are built (Slate, Banner, Blue Rule, Serif); slots 5-10 wait for
   designs. Same `render(profile)` contract. The designs' contact icons are left out
   on purpose: icons are what ATS parsers trip on. Fonts are system stacks that
   approximate the designs; bundle the real fonts later if exact looks matter.
3. **ATS check.** Parse the generated PDF with pdf.js, extract name, contacts, work
   history, education and skills, diff against the profile, show a score and the
   fields that failed. DOCX export with docx.js.
4. **Fuller scans.** Read the "see all" detail pages for complete lists and split
   grouped roles. No upload or paste fallback: the extension only scans.
5. **Polish.** Icons, store listing, Firefox build, optional job-description tailoring.

## Known limits

- LinkedIn's terms prohibit scraping. The scanner is click-to-run, reads only what is
  on screen, and refuses profiles that are not the user's own. Account restriction is
  the realistic risk.
- LinkedIn changes its markup often. All selectors are in `SEL` in `scanner.js`.
- The main profile page truncates long lists, and grouped roles under one company are
  not split yet. Both are phase 4.
- A real ATS cannot be tested. The check measures "parses cleanly", not "passes".
