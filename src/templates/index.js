// Ten template slots. Each is { id, name, ready, render(profile) -> HTML string }.
// A slot with ready: false is a placeholder until its design arrives.
import { slate } from './slate.js';
import { banner } from './banner.js';
import { blueRule } from './blueRule.js';
import { serif } from './serif.js';

const designs = [slate, banner, blueRule, serif];

const placeholders = Array.from({ length: 10 - designs.length }, (_, i) => ({
  id: `slot-${designs.length + i + 1}`,
  name: `Template ${designs.length + i + 1} (coming soon)`,
  ready: false,
  render: slate.render,
}));

export const TEMPLATES = [...designs, ...placeholders];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id && t.ready) || slate;
}
