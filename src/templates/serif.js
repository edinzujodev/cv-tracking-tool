import { renderResume, BASE_CSS } from './common.js';

// Centred header, black serif type, uppercase headings over a heavy rule, dates on the right.
const CSS = `${BASE_CSS}
  .t-serif { font-family: Georgia, 'Times New Roman', serif; }
  .t-serif .hdr { text-align: center; }
  .t-serif .title-line { justify-content: center; flex-direction: column; align-items: center; gap: 2pt; }
  .t-serif h1 { font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
  .t-serif .tagline { font-style: italic; }
  .t-serif .contact { justify-content: center; }
  .t-serif h2 { text-transform: uppercase; letter-spacing: .04em; border-bottom: 3px solid #000; padding-bottom: 2pt; }
  .t-serif .item { grid-template-columns: 1fr auto; grid-template-areas: "main meta"; }
  .t-serif .item .meta { text-align: right; white-space: nowrap; }
  .t-serif .skills { grid-template-columns: repeat(2, 1fr); }
`;

export const serif = {
  id: 'serif',
  name: 'Serif',
  ready: true,
  css: CSS,
  render: (p) => `<style>${CSS}</style>` + renderResume(p, { cls: 't-serif', titleStyle: 'stacked' }),
};
