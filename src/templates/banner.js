import { renderResume, BASE_CSS } from './common.js';

// Dark header banner, serif type, short accent underline on headings, dates on the right.
const CSS = `${BASE_CSS}
  .t-banner { font-family: Georgia, 'Times New Roman', serif; --accent: #0f4c75; }
  .t-banner .hdr { background: #05476b; color: #fff; padding: 16pt 18pt; margin-bottom: 4pt; }
  .t-banner h1 { font-weight: 600; }
  .t-banner .tagline { font-style: italic; }
  .t-banner h2 { color: var(--accent); font-weight: 700; padding-bottom: 5pt; position: relative; margin-bottom: 8pt; }
  .t-banner h2::after { content: ''; position: absolute; left: 0; bottom: 0; width: 38pt; height: 3pt; background: var(--accent); }
  .t-banner .item { grid-template-columns: 1fr auto; grid-template-areas: "main meta"; }
  .t-banner .item .meta { text-align: right; white-space: nowrap; }
  .t-banner .skills { grid-template-columns: repeat(3, 1fr); }
`;

export const banner = {
  id: 'banner',
  name: 'Banner',
  ready: true,
  css: CSS,
  render: (p) => `<style>${CSS}</style>` + renderResume(p, { cls: 't-banner', titleStyle: 'stacked' }),
};
