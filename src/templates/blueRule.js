import { renderResume, BASE_CSS } from './common.js';

// Blue headings with a full-width rule, "Title, Company" on one line, dates on the right.
const CSS = `${BASE_CSS}
  .t-blue { font-family: 'Open Sans', 'Segoe UI', Calibri, Arial, sans-serif; --accent: #3a6393; }
  .t-blue h1 { color: var(--accent); font-weight: 800; }
  .t-blue .tagline { font-size: 12.5pt; }
  .t-blue h2 { color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 2pt; font-weight: 700; }
  .t-blue .org em { color: var(--accent); }
  .t-blue .head em { color: var(--accent); }
  .t-blue .item { grid-template-columns: 1fr auto; grid-template-areas: "main meta"; }
  .t-blue .item .meta { text-align: right; white-space: nowrap; }
  .t-blue .skills { grid-template-columns: repeat(2, 1fr); }
`;

export const blueRule = {
  id: 'blue-rule',
  name: 'Blue Rule',
  ready: true,
  css: CSS,
  render: (p) => `<style>${CSS}</style>` + renderResume(p, { cls: 't-blue', titleStyle: 'inline' }),
};
