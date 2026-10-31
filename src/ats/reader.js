// Turns positioned text pieces into lines, the way an ATS text extractor might.
//
// An item is { str, x, y, h, eol } with y growing downward. Two reading orders are
// tried because parsers differ, and a layout that reads well in one can scramble in
// the other (two-column layouts are the usual casualty):
//   stream  the order the text is stored in the file
//   visual  top to bottom, then left to right along each visual line

const clean = (s) => s.replace(/[­​-‍﻿]/g, '').replace(/\s+/g, ' ');

function joinPieces(pieces) {
  let out = '';
  for (const p of pieces) {
    if (!out || /\s$/.test(out) || /^\s/.test(p)) out += p;
    else out += ' ' + p;
  }
  return clean(out).trim();
}

function streamLines(items) {
  const lines = [];
  let cur = null;
  for (const it of items) {
    const sameLine = cur && !cur.eol && Math.abs(it.y - cur.y) <= Math.max(2, (it.h || 10) * 0.5);
    if (!it.str.trim()) {
      if (cur && it.eol) cur.eol = true;
      continue;
    }
    if (sameLine) {
      cur.pieces.push(it.str);
      cur.eol = !!it.eol;
    } else {
      cur = { y: it.y, pieces: [it.str], eol: !!it.eol };
      lines.push(cur);
    }
  }
  return lines.map((l) => joinPieces(l.pieces)).filter(Boolean);
}

function visualLines(items) {
  const real = items.filter((it) => it.str.trim()).sort((a, b) => a.y - b.y);
  const rows = [];
  for (const it of real) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(it.y - row.y) <= Math.max(2, (it.h || 10) * 0.5)) row.items.push(it);
    else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .map((r) => joinPieces(r.items.sort((a, b) => a.x - b.x).map((i) => i.str)))
    .filter(Boolean);
}

export function toLines(items, mode) {
  return mode === 'visual' ? visualLines(items) : streamLines(items);
}

// ── Adapters: where the items come from ──────────────────────────

// A rendered page. Quick and approximate: wrapped text counts as one piece placed
// at its first line. The saved-PDF check is the accurate one.
export function itemsFromDom(root) {
  const items = [];
  const base = root.getBoundingClientRect();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement.closest('style, script')) continue;
    if (!n.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const box = range.getClientRects()[0];
    if (!box) continue;
    items.push({ str: n.textContent, x: box.left - base.left, y: box.top - base.top, h: box.height, eol: false });
  }
  return items;
}

// A saved PDF, read with pdf.js. `pdfjs` is the imported library.
export async function itemsFromPdf(data, pdfjs) {
  const doc = await pdfjs.getDocument({ data }).promise;
  const items = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const height = page.getViewport({ scale: 1 }).height;
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!('str' in it)) continue;
      items.push({
        str: it.str,
        x: it.transform[4],
        y: (p - 1) * 1e5 + height - it.transform[5],
        h: it.height || Math.abs(it.transform[3]),
        eol: !!it.hasEOL,
      });
    }
  }
  return items;
}
