import { ThemeConfig, TypographySettings } from '../types';
import { parseMarkdownToHtml, extractHeadings } from './markdownParser';
import { applyBionicReading } from './bionicReader';
import { KATEX_OFFLINE_CSS } from './katexOfflineStyles';
import {
  getFontFamilyCss,
  getHeaderFontFamilyCss,
  getMeasureMaxWidthCss,
  getWordSpacingCss,
  getLetterSpacingCss,
} from './typographyStyles';

export interface StandaloneHtmlOptions {
  markdown: string;
  documentTitle: string;
  theme: ThemeConfig;
  settings: TypographySettings;
}

/**
 * Generates 100% self-contained, 1:1 pixel-perfect standalone HTML document matching
 * Lumina Prose's preview pane exactly:
 *  - 1:1 Typography, sizes, leading, measure width, alignment, and spacing
 *  - Minimal outline icon button in the corner
 *  - Collapsible Outline drawer with active scroll highlighting and chevron icons
 *  - No extra reading time / word count / grade level ribbons (matching original preview pane)
 *  - Interactive task lists, code block copy, mermaid diagram viewer, and image lightbox
 */
export function generateStandaloneHtmlDocument({
  markdown,
  documentTitle,
  theme,
  settings,
}: StandaloneHtmlOptions): string {
  let bodyHtml = parseMarkdownToHtml(markdown, theme.category === 'dark', true);
  if (settings.bionicReading) {
    bodyHtml = applyBionicReading(bodyHtml);
  }

  const headings = extractHeadings(markdown);
  const fontFamily = getFontFamilyCss(settings.fontFamily);
  const headerFontFamily = getHeaderFontFamilyCss(settings.headerFontFamily);
  const maxWidth = getMeasureMaxWidthCss(settings.measureWidth);
  const wordSpacing = getWordSpacingCss(settings.wordSpacing);
  const letterSpacing = getLetterSpacingCss(settings.letterSpacing);
  const isDark = theme.category === 'dark';
  const warmthAlpha = (settings.screenWarmth || 0) * 0.0022;

  // Build Outline rows with collapsible chevron icons matching Preview.tsx
  const outlineItemsHtml =
    headings.length > 0
      ? headings
          .map((h, idx) => {
            const next = headings[idx + 1];
            const hasChildren = Boolean(next && next.level > h.level);
            const indentPx = (h.level - 1) * 12 + 6;
            return `
            <div 
              class="toc-row ${h.level === 1 ? 'level-h1' : ''}" 
              data-toc-id="${h.id}" 
              data-level="${h.level}"
              style="padding-left: ${indentPx}px;"
              onclick="scrollToHeading('${h.id}')"
            >
              ${
                hasChildren
                  ? `<button type="button" class="toc-collapse-btn" onclick="toggleHeadingCollapse('${h.id}', event)" title="Collapse / Expand section">
                      <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>`
                  : `<span class="toc-bullet-spacer"></span>`
              }
              <span class="toc-text truncate">${h.text}</span>
            </div>`;
          })
          .join('')
      : '<div class="toc-empty">No headings found in markdown. Use # or ## to create outline items.</div>';

  return `<!DOCTYPE html>
<html lang="en" data-theme-category="${theme.category}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${documentTitle || 'Document'}</title>
  
  <!-- Web Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap" rel="stylesheet">
  
  <!-- KaTeX Math Stylesheet -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">

  <!-- Mermaid Diagram Renderer -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

  <style>
    :root {
      --bg: ${theme.bg};
      --bg-secondary: ${theme.bgSecondary};
      --bg-elevated: ${theme.bgElevated};
      --text: ${theme.text};
      --text-muted: ${theme.textMuted};
      --accent: ${theme.accent};
      --border-color: ${theme.border};
      --code-bg: ${theme.codeBg};
      --blockquote-border: ${theme.blockquoteBorder};
      --table-header-bg: ${theme.tableHeaderBg};
      --table-stripe-bg: ${theme.tableStripeBg};
      --hr-color: ${theme.hrColor};
      --font-body: ${fontFamily};
      --font-header: ${headerFontFamily};
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-serif-literary: 'Newsreader', Georgia, serif;
      --font-serif-elegant: 'Cormorant Garamond', 'Times New Roman', serif;
      --font-serif-classic: 'Lora', Georgia, serif;
      --font-serif-display: 'Instrument Serif', Georgia, serif;
      --font-sans-clean: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-sans-legible: 'Atkinson Hyperlegible', system-ui, sans-serif;
      --font-mono-code: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Offline KaTeX & MathJax Fallback */
    ${KATEX_OFFLINE_CSS}

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background-color: var(--bg);
      color: var(--text);
      font-family: ${fontFamily};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      scroll-behavior: smooth;
      -webkit-tap-highlight-color: transparent;
    }

    ${
      settings.paperTexture
        ? `body {
      background-image: radial-gradient(rgba(0, 0, 0, ${isDark ? '0.2' : '0.04'}) 1px, transparent 0);
      background-size: 24px 24px;
    }`
        : ''
    }

    ::selection {
      background-color: ${isDark ? 'rgba(245, 158, 11, 0.45)' : '#fde68a'};
      color: ${isDark ? '#ffffff' : '#1c1917'};
    }

    /* Screen Warmth Overlay if configured */
    ${
      settings.screenWarmth > 0
        ? `#warmth-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9990;
      background-color: rgba(249, 115, 22, ${warmthAlpha});
      mix-blend-mode: ${isDark ? 'screen' : 'multiply'};
    }`
        : ''
    }

    /* Reading Progress Top Bar */
    #reading-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      z-index: 1000;
      background-color: rgba(150, 150, 150, 0.15);
      pointer-events: none;
    }
    #reading-progress-indicator {
      height: 100%;
      width: 0%;
      background-color: var(--accent);
      transition: width 0.05s ease-out;
    }

    /* Top-Right Minimal Icon Button for Outline (Matching user's icon-only outline trigger) */
    .floating-outline-icon-btn {
      position: fixed;
      top: 1.25rem;
      right: 1.25rem;
      z-index: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border-color);
      background-color: var(--bg-elevated);
      color: var(--text);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .floating-outline-icon-btn:hover {
      transform: scale(1.08);
      border-color: var(--accent);
      color: var(--accent);
    }

    /* Outer layout container matching Preview.tsx preview-container */
    .preview-container {
      position: relative;
      min-height: 100vh;
      width: 100%;
      padding: 2.5rem 1.5rem 6rem 1.5rem;
      display: flex;
      justify-content: center;
    }

    @media (min-width: 640px) {
      .preview-container {
        padding: 3.5rem 2.5rem 8rem 2.5rem;
      }
    }

    @media (min-width: 1024px) {
      .preview-container {
        padding: 4.5rem 3.5rem 10rem 3.5rem;
      }
    }

    /* Article envelope matching Preview.tsx exactly */
    article.preview-article {
      width: 100%;
      max-width: ${maxWidth};
      margin: 0 auto;
      font-family: ${fontFamily};
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      text-align: ${settings.alignment};
      word-spacing: ${wordSpacing};
      letter-spacing: ${letterSpacing};
    }

    /* Markdown Body Typography (Exact 1:1 match with preview pane index.css) */
    .markdown-body {
      color: inherit;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      text-wrap: pretty;
    }

    .markdown-body p {
      margin-top: 1.15em;
      margin-bottom: ${settings.paragraphSpacing === 'relaxed' ? '1.75em' : '1.15em'};
      line-height: inherit;
      overflow-wrap: break-word;
    }

    ${
      settings.dropCaps
        ? `.markdown-body > p:first-of-type::first-letter {
      font-family: var(--font-serif-display), var(--font-serif-literary), serif;
      float: left;
      font-size: 3.8em;
      line-height: 0.8;
      padding-top: 4px;
      padding-right: 12px;
      padding-bottom: 2px;
      font-weight: 600;
      color: var(--accent);
    }`
        : ''
    }

    ${
      settings.paragraphSpacing === 'indented'
        ? `.markdown-body p + p {
      text-indent: 1.8em;
      margin-top: 0 !important;
    }`
        : ''
    }

    .markdown-body h1, 
    .markdown-body h2, 
    .markdown-body h3, 
    .markdown-body h4, 
    .markdown-body h5, 
    .markdown-body h6 {
      font-family: inherit;
      color: var(--text);
      font-weight: 700;
      line-height: 1.28;
      scroll-margin-top: 2.5rem;
    }

    .markdown-body h1 {
      font-size: 2.3em;
      line-height: 1.22;
      margin-top: 2.4em;
      margin-bottom: 0.8em;
      letter-spacing: -0.025em;
      border-bottom: 1.5px solid var(--border-color);
      padding-bottom: 0.4em;
    }

    .markdown-body h2 {
      font-size: 1.7em;
      line-height: 1.28;
      margin-top: 2.1em;
      margin-bottom: 0.65em;
      letter-spacing: -0.02em;
    }

    .markdown-body h3 {
      font-size: 1.35em;
      line-height: 1.35;
      font-weight: 600;
      margin-top: 1.8em;
      margin-bottom: 0.55em;
      letter-spacing: -0.015em;
    }

    .markdown-body h4 {
      font-size: 1.15em;
      line-height: 1.4;
      font-weight: 600;
      margin-top: 1.5em;
      margin-bottom: 0.45em;
    }

    .markdown-body > h1:first-child,
    .markdown-body > h2:first-child,
    .markdown-body > h3:first-child {
      margin-top: 0.2em;
    }

    .markdown-body ul {
      list-style-type: disc;
      padding-left: 1.6em;
      margin-top: 0.85em;
      margin-bottom: 1.25em;
    }

    .markdown-body ol {
      list-style-type: decimal;
      padding-left: 1.6em;
      margin-top: 0.85em;
      margin-bottom: 1.25em;
    }

    .markdown-body li {
      margin-top: 0.4em;
      margin-bottom: 0.4em;
      line-height: inherit;
    }

    .markdown-body blockquote.editorial-blockquote {
      border-left: 3.5px solid var(--blockquote-border);
      padding-left: 1.35em;
      padding-top: 0.15em;
      padding-bottom: 0.15em;
      margin: 1.75em 0;
      font-style: italic;
      opacity: 0.96;
      line-height: inherit;
    }

    .markdown-body a {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 3.5px;
      font-weight: 500;
      transition: opacity 0.15s;
    }
    .markdown-body a:hover {
      opacity: 0.8;
    }

    .markdown-body hr {
      border: 0;
      height: 1px;
      background-color: var(--hr-color);
      margin: 2.5em 0;
    }

    /* Inline Code & Code Blocks */
    .markdown-body code.inline-code {
      background-color: var(--code-bg);
      padding: 0.18em 0.45em;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.88em;
      border: 1px solid var(--border-color);
    }

    .code-block-wrapper {
      position: relative;
      margin: 1.5rem 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      background-color: var(--code-bg);
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.75rem;
      font-family: var(--font-mono);
      background-color: rgba(150, 150, 150, 0.05);
      user-select: none;
    }

    .code-language {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      font-size: 11px;
      opacity: 0.8;
    }

    .copy-code-btn {
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 11px;
      font-family: var(--font-sans-clean);
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .copy-code-btn:hover {
      background-color: var(--border-color);
    }

    .hljs-pre {
      margin: 0;
      padding: 0.875rem 1rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.88em;
      line-height: 1.5;
      background: transparent;
    }

    /* Tables */
    .table-container {
      margin: 2em 0;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92em;
    }

    .markdown-body th {
      background-color: var(--table-header-bg);
      border: 1px solid var(--border-color);
      padding: 0.75em 1em;
      font-weight: 700;
      text-align: left;
    }

    .markdown-body td {
      border: 1px solid var(--border-color);
      padding: 0.65em 1em;
      border-bottom: 1px solid var(--border-color);
    }

    .markdown-body tbody tr:nth-child(even) {
      background-color: var(--table-stripe-bg);
    }

    /* Callout Admonitions */
    .admonition-block {
      margin: 1.25rem 0;
      padding: 1rem 1.25rem;
      border-radius: 0.75rem;
      border-left-width: 4px;
      border-left-style: solid;
    }
    .admonition-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      user-select: none;
    }

    /* Interactive Task List */
    .task-list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      margin: 0.375rem 0;
      list-style: none;
    }
    .task-checkbox {
      margin-top: 0.3em;
      width: 1.1em;
      height: 1.1em;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .task-content.checked {
      text-decoration: line-through;
      opacity: 0.6;
    }

    /* Interactive Mermaid Diagram Wrapper in HTML Export */
    .mermaid-block-wrapper {
      position: relative;
      margin: 1.5rem 0;
      padding: 1rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border-color);
      background-color: var(--code-bg);
      display: flex;
      flex-direction: column;
      overflow-x: auto;
    }

    .mermaid-diagram {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0.5rem 0;
      overflow-x: auto;
      cursor: pointer;
    }

    .mermaid-diagram svg {
      max-width: 100%;
      height: auto;
    }

    .mermaid-zoom-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 11px;
      font-family: var(--font-sans-clean);
      font-weight: 500;
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mermaid-zoom-btn:hover {
      background-color: var(--border-color);
    }

    /* ============================================================
       SLIDE-OUT DOCUMENT OUTLINE SIDEBAR (Identical to Preview.tsx)
       ============================================================ */
    .outline-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 18rem;
      max-width: 85vw;
      background-color: var(--bg-secondary);
      border-left: 1px solid var(--border-color);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      user-select: none;
      font-family: var(--font-sans-clean);
    }

    .outline-sidebar.open {
      transform: translateX(0);
    }

    .outline-sidebar-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .outline-sidebar-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
      color: var(--text);
    }

    .outline-close-btn {
      padding: 0.375rem;
      border-radius: 0.375rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .outline-close-btn:hover {
      background-color: rgba(150, 150, 150, 0.15);
      color: var(--text);
    }

    .outline-sidebar-body {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .toc-row {
      width: 100%;
      text-align: left;
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      border-left: 2px solid transparent;
      font-size: 0.75rem;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;
      transition: all 0.15s ease;
      opacity: 0.85;
    }
    .toc-row:hover {
      background-color: rgba(150, 150, 150, 0.1);
      opacity: 1;
    }
    .toc-row.active {
      border-left-color: var(--accent);
      background-color: rgba(245, 158, 11, 0.15);
      font-weight: 700;
      opacity: 1;
      color: ${isDark ? '#ffffff' : '#000000'};
    }
    .toc-row.level-h1 {
      font-weight: 600;
    }

    .toc-collapse-btn {
      padding: 0.125rem;
      border-radius: 0.25rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    .toc-collapse-btn:hover {
      background-color: rgba(150, 150, 150, 0.2);
    }
    .toc-bullet-spacer {
      width: 14px;
      flex-shrink: 0;
      display: inline-block;
    }

    .toc-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toc-empty {
      text-align: center;
      padding: 2rem 1rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      opacity: 0.7;
    }

    .outline-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      z-index: 9998;
    }
    .outline-backdrop.open {
      display: block;
    }

    /* Mermaid Modal for Zoom/Pan */
    #mermaid-zoom-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99999;
      background-color: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      flex-direction: column;
    }
    #mermaid-zoom-modal.open {
      display: flex;
    }

    .mermaid-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background-color: var(--bg-elevated);
      border-bottom: 1px solid var(--border-color);
      color: var(--text);
      font-family: var(--font-sans-clean);
    }

    .mermaid-modal-viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg);
    }
    .mermaid-modal-viewport.dragging {
      cursor: grabbing;
    }

    .mermaid-modal-content-container {
      position: absolute;
      transform-origin: center center;
      user-select: none;
    }

    .mermaid-modal-controls {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      z-index: 10;
    }

    .mermaid-zoom-control-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.15s ease;
    }
    .mermaid-zoom-control-btn:hover {
      background: var(--accent);
      color: #fff;
    }

    /* Image Lightbox Modal */
    #image-lightbox-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99999;
      background-color: rgba(0, 0, 0, 0.85);
      align-items: center;
      justify-content: center;
      padding: 1rem;
      cursor: zoom-out;
    }
    #image-lightbox-modal.open {
      display: flex;
    }
    #image-lightbox-img {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 8px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    #image-lightbox-caption {
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: #e5e5e5;
      font-style: italic;
      text-align: center;
    }

    /* Toast Notification */
    #copy-toast {
      display: none;
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      background-color: #1c1917;
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      align-items: center;
      gap: 0.5rem;
    }
    #copy-toast.open {
      display: flex;
    }

    /* Print Stylesheet */
    @media print {
      body {
        background-color: #fff !important;
        color: #000 !important;
      }
      #reading-progress-bar,
      .floating-outline-icon-btn,
      .outline-sidebar,
      .outline-backdrop,
      .copy-code-btn,
      .mermaid-zoom-btn,
      #mermaid-zoom-modal,
      #image-lightbox-modal,
      #copy-toast {
        display: none !important;
      }
      .preview-container {
        padding: 0 !important;
      }
      article.preview-article {
        max-width: 100% !important;
      }
      .markdown-body pre, 
      .markdown-body blockquote,
      .markdown-body table {
        page-break-inside: avoid;
      }
      .markdown-body h1, 
      .markdown-body h2, 
      .markdown-body h3 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Optional Warmth Filter -->
  <div id="warmth-overlay"></div>

  <!-- Reading Progress Indicator -->
  <div id="reading-progress-bar">
    <div id="reading-progress-indicator"></div>
  </div>

  <!-- Minimal Icon-Only Floating Outline Button (ListTree icon) -->
  ${
    headings.length > 0
      ? `<button id="floating-outline-btn" class="floating-outline-icon-btn" onclick="toggleOutline()" title="Document Outline (${headings.length} sections)" aria-label="Toggle Document Outline">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12h-8"></path><path d="M21 6H8"></path><path d="M21 18h-8"></path><path d="M3 6v4c0 1.1.9 2 2 2h3"></path><path d="M3 10v6c0 1.1.9 2 2 2h3"></path></svg>
        </button>`
      : ''
  }

  <!-- Main Document Stage -->
  <div class="preview-container">
    <article class="preview-article">
      <div class="markdown-body">
        ${bodyHtml}
      </div>
    </article>
  </div>

  <!-- Slide-out Document Outline Sidebar -->
  <div id="outline-backdrop" class="outline-backdrop" onclick="toggleOutline()"></div>
  <aside id="outline-sidebar" class="outline-sidebar" aria-label="Document Outline">
    <div class="outline-sidebar-header">
      <h3 class="outline-sidebar-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12h-8"></path><path d="M21 6H8"></path><path d="M21 18h-8"></path><path d="M3 6v4c0 1.1.9 2 2 2h3"></path><path d="M3 10v6c0 1.1.9 2 2 2h3"></path></svg>
        <span>Document Outline</span>
      </h3>
      <button class="outline-close-btn" onclick="toggleOutline()" aria-label="Close outline">✕</button>
    </div>
    <div id="outline-list" class="outline-sidebar-body">
      ${outlineItemsHtml}
    </div>
  </aside>

  <!-- Interactive Fullscreen Mermaid Diagram Viewer Modal -->
  <div id="mermaid-zoom-modal">
    <div class="mermaid-modal-header">
      <span style="font-weight: 600; font-size: 14px;">Mermaid Interactive Canvas</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="copy-code-btn" onclick="downloadMermaidSvg()">Download SVG</button>
        <button class="copy-code-btn" onclick="copyMermaidModalCode()"><span id="mermaid-modal-copy-text">Copy Code</span></button>
        <button class="copy-code-btn" onclick="closeMermaidModal()" style="font-weight: bold;">✕</button>
      </div>
    </div>
    <div id="mermaid-modal-canvas" class="mermaid-modal-viewport">
      <div id="mermaid-modal-content" class="mermaid-modal-content-container"></div>
    </div>
    <div class="mermaid-modal-controls">
      <button class="mermaid-zoom-control-btn" onclick="mermaidZoomIn()" title="Zoom In (+)">+</button>
      <button class="mermaid-zoom-control-btn" onclick="mermaidZoomOut()" title="Zoom Out (-)">−</button>
      <button class="mermaid-zoom-control-btn" onclick="mermaidResetZoom()" title="Reset (100%)" style="font-size: 11px; width: auto; padding: 0 10px;">Reset</button>
      <button class="mermaid-zoom-control-btn" onclick="mermaidFitToScreen()" title="Fit to Screen" style="font-size: 11px; width: auto; padding: 0 10px;">Fit</button>
    </div>
  </div>

  <!-- Image Lightbox Modal -->
  <div id="image-lightbox-modal" onclick="closeImageLightbox()">
    <div style="position: relative; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center;">
      <img id="image-lightbox-img" src="" alt="" />
      <div id="image-lightbox-caption"></div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="copy-toast">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span id="toast-message">Copied to clipboard</span>
  </div>

  <script>
    // 1. Reading Progress & Active Heading Scroll Highlighting
    var progressIndicator = document.getElementById('reading-progress-indicator');
    var headingNodes = Array.from(document.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4'));

    function updateActiveHeading() {
      var sTop = window.scrollY || document.documentElement.scrollTop;
      var sHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = sHeight > 0 ? (sTop / sHeight) * 100 : 0;
      if (progressIndicator) {
        progressIndicator.style.width = Math.min(100, Math.max(0, pct)) + '%';
      }

      var activeId = '';
      for (var i = headingNodes.length - 1; i >= 0; i--) {
        var rect = headingNodes[i].getBoundingClientRect();
        if (rect.top <= 160) {
          activeId = headingNodes[i].getAttribute('id');
          break;
        }
      }

      if (!activeId && headingNodes.length > 0) {
        activeId = headingNodes[0].getAttribute('id');
      }

      if (activeId) {
        updateActiveOutlineItem(activeId);
      }
    }

    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    updateActiveHeading();

    function updateActiveOutlineItem(id) {
      if (!id) return;
      document.querySelectorAll('.toc-row').forEach(function(row) {
        if (row.getAttribute('data-toc-id') === id) {
          row.classList.add('active');
        } else {
          row.classList.remove('active');
        }
      });
    }

    // 2. Outline Sidebar Toggle & Navigation
    var isOutlineOpen = false;
    var collapsedSections = {};

    function toggleOutline() {
      isOutlineOpen = !isOutlineOpen;
      var drawer = document.getElementById('outline-sidebar');
      var backdrop = document.getElementById('outline-backdrop');
      if (isOutlineOpen) {
        if (drawer) drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('open');
        updateActiveHeading();
      } else {
        if (drawer) drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      }
    }

    function scrollToHeading(id) {
      var el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateActiveOutlineItem(id);
        if (window.innerWidth < 1024) {
          toggleOutline();
        }
      }
    }

    function toggleHeadingCollapse(id, e) {
      if (e) e.stopPropagation();
      collapsedSections[id] = !collapsedSections[id];
      var btn = e ? e.currentTarget : null;
      if (btn) {
        btn.style.transform = collapsedSections[id] ? 'rotate(-90deg)' : 'rotate(0deg)';
      }
      // Hide or show child rows under this level
      var allRows = Array.from(document.querySelectorAll('.toc-row'));
      var clickedIdx = allRows.findIndex(function(r) { return r.getAttribute('data-toc-id') === id; });
      if (clickedIdx !== -1) {
        var parentLevel = parseInt(allRows[clickedIdx].getAttribute('data-level'), 10);
        for (var i = clickedIdx + 1; i < allRows.length; i++) {
          var currLevel = parseInt(allRows[i].getAttribute('data-level'), 10);
          if (currLevel > parentLevel) {
            allRows[i].style.display = collapsedSections[id] ? 'none' : 'flex';
          } else {
            break;
          }
        }
      }
    }

    // 3. Code Block Copy & Toast
    function showToast(msg) {
      var toast = document.getElementById('copy-toast');
      var msgEl = document.getElementById('toast-message');
      if (toast && msgEl) {
        msgEl.textContent = msg;
        toast.classList.add('open');
        setTimeout(function() { toast.classList.remove('open'); }, 2000);
      }
    }

    window.__copyCodeBlock = function(btn) {
      var encoded = btn.getAttribute('data-code');
      if (encoded) {
        var raw = decodeURIComponent(encoded);
        navigator.clipboard.writeText(raw).then(function() {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          showToast('Code copied to clipboard');
          setTimeout(function() { btn.textContent = orig; }, 2000);
        });
      }
    };

    // 4. Interactive Task List Checkboxes
    window.__toggleTaskItem = function(checkbox) {
      var parent = checkbox.closest('.task-list-item');
      if (parent) {
        var content = parent.querySelector('.task-content');
        if (content) {
          if (checkbox.checked) {
            content.classList.add('checked');
          } else {
            content.classList.remove('checked');
          }
        }
      }
    };

    // 5. Image Lightbox Zoom
    window.__zoomImage = function(src, encodedAlt) {
      var modal = document.getElementById('image-lightbox-modal');
      var img = document.getElementById('image-lightbox-img');
      var cap = document.getElementById('image-lightbox-caption');
      if (modal && img) {
        img.src = src;
        var alt = encodedAlt ? decodeURIComponent(encodedAlt) : '';
        if (cap) cap.textContent = alt;
        modal.classList.add('open');
      }
    };

    function closeImageLightbox() {
      var modal = document.getElementById('image-lightbox-modal');
      if (modal) modal.classList.remove('open');
    }

    // 6. Fullscreen Pan & Zoom Mermaid Viewer
    var currentMermaidSvg = '';
    var currentMermaidCode = '';
    var mScale = 1;
    var mPosX = 0;
    var mPosY = 0;
    var mIsDragging = false;
    var mDragStartX = 0;
    var mDragStartY = 0;

    var mermaidModal = document.getElementById('mermaid-zoom-modal');
    var mermaidCanvas = document.getElementById('mermaid-modal-canvas');
    var mermaidContent = document.getElementById('mermaid-modal-content');

    function updateMermaidTransform(noTransition) {
      if (!mermaidContent) return;
      mermaidContent.style.transition = noTransition ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
      mermaidContent.style.transform = 'translate(' + mPosX + 'px, ' + mPosY + 'px) scale(' + mScale + ')';
    }

    function mermaidZoomIn() {
      mScale = Math.min(mScale * 1.25, 25);
      updateMermaidTransform();
    }
    function mermaidZoomOut() {
      mScale = Math.max(mScale * 0.8, 0.1);
      updateMermaidTransform();
    }
    function mermaidResetZoom() {
      mScale = 1;
      mPosX = 0;
      mPosY = 0;
      updateMermaidTransform();
    }
    function mermaidFitToScreen() {
      if (!mermaidCanvas || !mermaidContent) return;
      var svg = mermaidContent.querySelector('svg');
      if (!svg) { mermaidResetZoom(); return; }
      var cRect = mermaidCanvas.getBoundingClientRect();
      var sWidth = svg.getBoundingClientRect().width / (mScale || 1);
      var sHeight = svg.getBoundingClientRect().height / (mScale || 1);
      if (!sWidth || !sHeight) { mermaidResetZoom(); return; }
      var pad = 48;
      var scaleX = (cRect.width - pad * 2) / sWidth;
      var scaleY = (cRect.height - pad * 2) / sHeight;
      mScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.15), 5);
      mPosX = 0;
      mPosY = 0;
      updateMermaidTransform();
    }

    function closeMermaidModal() {
      if (mermaidModal) mermaidModal.classList.remove('open');
      mIsDragging = false;
    }

    window.__openMermaidViewer = function(btn) {
      var rawCode = btn.getAttribute('data-code');
      currentMermaidCode = rawCode ? decodeURIComponent(rawCode) : '';
      var wrapper = btn.closest('.mermaid-block-wrapper');
      var diag = wrapper ? wrapper.querySelector('.mermaid-diagram') : null;
      var svgHtml = diag ? diag.innerHTML : '';
      currentMermaidSvg = svgHtml;

      if (!mermaidModal || !mermaidContent) return;
      mermaidModal.classList.add('open');

      function applyAndFit(html) {
        mermaidContent.innerHTML = html;
        mScale = 1;
        mPosX = 0;
        mPosY = 0;
        updateMermaidTransform(true);
        setTimeout(mermaidFitToScreen, 60);
      }

      if (!svgHtml || svgHtml.includes('Rendering diagram...')) {
        if (window.mermaid && currentMermaidCode) {
          var id = 'm-modal-' + Math.random().toString(36).substring(2, 9);
          window.mermaid.render(id, currentMermaidCode).then(function(res) {
            currentMermaidSvg = res.svg;
            applyAndFit(res.svg);
          }).catch(function() {
            applyAndFit('<pre style="font-family:monospace;font-size:12px;padding:1rem;">' + currentMermaidCode + '</pre>');
          });
        } else {
          applyAndFit('<pre style="font-family:monospace;font-size:12px;padding:1rem;">' + currentMermaidCode + '</pre>');
        }
      } else {
        applyAndFit(svgHtml);
      }
    };

    function downloadMermaidSvg() {
      if (!currentMermaidSvg) return;
      var blob = new Blob([currentMermaidSvg], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mermaid-diagram-' + Date.now() + '.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function copyMermaidModalCode() {
      if (!currentMermaidCode) return;
      navigator.clipboard.writeText(currentMermaidCode).then(function() {
        var copyText = document.getElementById('mermaid-modal-copy-text');
        if (copyText) {
          var orig = copyText.textContent;
          copyText.textContent = 'Copied!';
          setTimeout(function() { copyText.textContent = orig; }, 2000);
        }
      });
    }

    if (mermaidCanvas) {
      mermaidCanvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        var factor = e.deltaY < 0 ? 1.15 : 0.87;
        mScale = Math.min(Math.max(mScale * factor, 0.1), 25);
        updateMermaidTransform();
      }, { passive: false });

      mermaidCanvas.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        mIsDragging = true;
        mermaidCanvas.classList.add('dragging');
        mDragStartX = e.clientX - mPosX;
        mDragStartY = e.clientY - mPosY;
      });

      window.addEventListener('mousemove', function(e) {
        if (!mIsDragging) return;
        mPosX = e.clientX - mDragStartX;
        mPosY = e.clientY - mDragStartY;
        updateMermaidTransform(true);
      });

      window.addEventListener('mouseup', function() {
        if (mIsDragging) {
          mIsDragging = false;
          if (mermaidCanvas) mermaidCanvas.classList.remove('dragging');
        }
      });
    }

    // 7. Initialize Mermaid on Page Load
    function initAllMermaidDiagrams() {
      if (!window.mermaid) return;
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: '${isDark ? 'dark' : 'default'}',
          securityLevel: 'loose'
        });
        document.querySelectorAll('.mermaid-diagram').forEach(function(diag) {
          var code = diag.getAttribute('data-code');
          if (code && (!diag.querySelector('svg') || diag.innerHTML.includes('Rendering diagram...'))) {
            var raw = decodeURIComponent(code);
            var id = 'mermaid-init-' + Math.random().toString(36).substring(2, 9);
            window.mermaid.render(id, raw).then(function(res) {
              diag.innerHTML = res.svg;
            }).catch(function() {});
          }
        });
      } catch(e) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initAllMermaidDiagrams);
    } else {
      initAllMermaidDiagrams();
    }
    window.addEventListener('load', initAllMermaidDiagrams);
  </script>
</body>
</html>`;
}
