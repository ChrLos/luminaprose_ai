/**
 * Self-contained Critical KaTeX & MathJax CSS Fallback
 * Inlined directly into standalone HTML and direct PDF export containers
 * so that mathematical formulas, fractions, powers, matrices, and symbols
 * render accurately offline without depending on CDN network availability.
 */
export const KATEX_OFFLINE_CSS = `
/* KaTeX Critical Mathematical Layout Rules */
.katex {
  font: normal 1.15em / 1.2 "KaTeX_Main", "Cambria Math", "Times New Roman", serif;
  text-indent: 0;
  text-rendering: auto;
  border-color: currentColor;
  display: inline-block;
  white-space: nowrap;
}
.katex * {
  -webkit-font-smoothing: antialiased;
}
.katex .katex-html {
  display: inline-block;
}
.katex .katex-mathml {
  clip: rect(1px, 1px, 1px, 1px);
  border: 0;
  height: 1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
}
.katex-display {
  display: block;
  margin: 1.25em 0;
  text-align: center;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.4em 0;
}
.katex-display > .katex {
  display: inline-block;
  text-align: initial;
  white-space: nowrap;
}
.katex-display-wrapper {
  overflow-x: auto;
  max-width: 100%;
  padding: 0.5rem 0;
  margin: 0.8rem 0;
}
.katex .base {
  position: relative;
  display: inline-block;
  white-space: nowrap;
  width: min-content;
}
.katex .strut {
  display: inline-block;
  height: 2em;
}
.katex .mord, 
.katex .mbin, 
.katex .mrel, 
.katex .mopen, 
.katex .mclose, 
.katex .mpunct, 
.katex .minner {
  position: relative;
  display: inline-block;
}
.katex .mord.mathnormal {
  font-style: italic;
  font-family: "KaTeX_Math", "Cambria Math", "Times New Roman", serif;
}
.katex .mord.text {
  font-family: inherit;
  font-style: normal;
}
.katex .msupsub {
  display: inline-block;
  position: relative;
  font-size: 0.75em;
  vertical-align: 0.25em;
}
.katex .vlist-t {
  display: inline-table;
  table-layout: fixed;
  border-collapse: collapse;
}
.katex .vlist-r {
  display: table-row;
}
.katex .vlist {
  display: table-cell;
  vertical-align: bottom;
  position: relative;
  height: 100%;
}
.katex .vlist > span {
  display: block;
  height: 0;
  position: relative;
}
.katex .vlist > span > span {
  display: inline-block;
}
.katex .mfrac {
  display: inline-block;
  vertical-align: -0.5em;
  padding: 0 0.15em;
  text-align: center;
}
.katex .mfrac .frac-line {
  display: inline-block;
  width: 100%;
  border-bottom: 1.2px solid currentColor;
}
.katex .sqrt {
  display: inline-block;
  position: relative;
}
.katex .sqrt > .root {
  margin-left: 0.28em;
  margin-right: -0.55em;
}
.katex .delimsizing {
  display: inline-block;
}
.katex .sizing {
  display: inline-block;
}
`;
