# Plan

A personal Manifest V3 extension (plain JavaScript, Pico.css) for tracking job
applications. Data lives in `chrome.storage.local`; nothing is uploaded.

## Fields

Job (link or pasted description), optional role/company label, CV used, date applied
(defaults to today), status (Applied, Interview, Offer, Rejected, Ghosted, Withdrawn).

## Layout

```
manifest.json
src/background.js   toolbar icon opens (or focuses) the tracker tab
src/model.js        statuses, defaults, CSV export, storage helpers
src/tracker.*       the page: add/edit form, table, status filter, CSV export
vendor/pico.min.css Pico.css 2.1.1, bundled (extensions cannot load a CDN)
```

## Later

Follow-up reminders, notes per application, attaching the CV file itself, import from CSV.
