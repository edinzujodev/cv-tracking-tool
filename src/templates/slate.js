import { renderResume, BASE_CSS } from './common.js';

// Grey section bars, dates and place in a left column, three-column skills.
const CSS = `${BASE_CSS}
  .t-slate { font-family: 'Source Sans 3', 'Segoe UI', Calibri, Arial, sans-serif; --ink: #12303f; --accent: #1f4e79; }
  .t-slate h1 { color: var(--ink); font-weight: 800; letter-spacing: .01em; }
  .t-slate .tagline { font-style: italic; color: var(--ink); }
  .t-slate .contact { display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 20pt; }
  .t-slate h2 { background: #eceef0; color: var(--ink); text-align: center; padding: 4pt 0; font-weight: 700; }
  .t-slate .item { grid-template-columns: 1.35in 1fr; grid-template-areas: "meta main"; }
  .t-slate .item .meta { color: var(--accent); text-align: left; }
  .t-slate .head, .t-slate .org { display: inline; }
  .t-slate .skills { grid-template-columns: repeat(3, 1fr); }
`;

export const slate = {
  id: 'slate',
  name: 'Slate',
  ready: true,
  css: CSS,
  render: (p) => `<style>${CSS}</style>` + renderResume(p, { cls: 't-slate', titleStyle: 'orgFirst' }),
};
