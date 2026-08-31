import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ThemeConfig, TypographySettings } from '../types';
import { KATEX_OFFLINE_CSS } from './katexOfflineStyles';

export interface PdfExportOptions {
  title: string;
  htmlContent: string;
  theme: ThemeConfig;
  settings: TypographySettings;
  fontFamily: string;
  headerFontFamily: string;
  onProgress?: (step: string) => void;
}

export async function generateDirectPdf({
  title,
  htmlContent,
  theme,
  settings,
  fontFamily,
  headerFontFamily,
  onProgress,
}: PdfExportOptions): Promise<void> {
  onProgress?.('Preparing PDF document...');

  const cleanFilename = `${(title || 'document').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.pdf`;
  const isDark = theme.category === 'dark';

  // Standard A4 width at 96 DPI is 794px; A4 aspect ratio height (297/210) is 1123px
  const a4WidthPx = 794;
  const a4HeightPx = 1123;
  const topMarginPx = 48;
  const bottomMarginPx = 48;
  const sideMarginPx = 52;
  const usableHeightPx = a4HeightPx - topMarginPx - bottomMarginPx; // ~1027px

  // Create an isolated sandbox iframe to completely bypass Tailwind v4's oklab stylesheets
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = `${a4WidthPx}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.opacity = '1';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Unable to initialize sandbox rendering frame');
    }

    // 100% Exact 1:1 Prose Typography stylesheet for PDF
    const pureCss = `
      ${KATEX_OFFLINE_CSS}

      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background-color: ${theme.bg};
        color: ${theme.text};
        font-family: ${fontFamily};
        font-size: ${settings.fontSize}px;
        line-height: ${settings.lineHeight};
        text-align: ${settings.alignment};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        width: ${a4WidthPx}px;
      }
      .pdf-container {
        width: ${a4WidthPx}px;
        padding: 0 ${sideMarginPx}px;
        background-color: ${theme.bg};
        color: ${theme.text};
        box-sizing: border-box;
        overflow: hidden;
      }

      /* Headings */
      h1 {
        font-family: inherit;
        font-size: 2.15em;
        font-weight: 700;
        margin-top: 1.8em;
        margin-bottom: 0.6em;
        line-height: 1.22;
        letter-spacing: -0.02em;
        border-bottom: 1.5px solid ${theme.border};
        padding-bottom: 0.35em;
        overflow-wrap: break-word;
        page-break-after: avoid;
        break-after: avoid;
      }
      h2 {
        font-family: inherit;
        font-size: 1.55em;
        font-weight: 700;
        margin-top: 1.6em;
        margin-bottom: 0.5em;
        line-height: 1.28;
        letter-spacing: -0.015em;
        overflow-wrap: break-word;
        page-break-after: avoid;
        break-after: avoid;
      }
      h3 {
        font-family: inherit;
        font-size: 1.25em;
        font-weight: 600;
        margin-top: 1.4em;
        margin-bottom: 0.4em;
        line-height: 1.32;
        overflow-wrap: break-word;
        page-break-after: avoid;
        break-after: avoid;
      }
      h4, h5, h6 {
        font-family: inherit;
        font-weight: 600;
        margin-top: 1.2em;
        margin-bottom: 0.35em;
        page-break-after: avoid;
        break-after: avoid;
      }
      h1:first-child, h2:first-child, h3:first-child {
        margin-top: 0;
      }

      /* Paragraphs */
      p {
        margin-top: 1.1em;
        margin-bottom: 1.1em;
        line-height: inherit;
        overflow-wrap: break-word;
      }

      /* Bulleted & Numbered Lists (Precision Indentation & Markers) */
      ol {
        list-style-type: decimal !important;
        list-style-position: outside !important;
        margin: 0.85em 0 1.25em 0 !important;
        padding-left: 2em !important;
      }
      ul {
        list-style-type: disc !important;
        list-style-position: outside !important;
        margin: 0.85em 0 1.25em 0 !important;
        padding-left: 2em !important;
      }
      li {
        display: list-item !important;
        margin-top: 0.38em !important;
        margin-bottom: 0.38em !important;
        line-height: inherit !important;
        font-size: 1em !important;
        vertical-align: baseline !important;
        font-variant-numeric: normal !important;
        padding-left: 0.25em !important;
      }
      li > p {
        margin: 0.2em 0 !important;
        display: block !important;
        line-height: inherit !important;
        font-size: 1em !important;
      }
      ul ul, ol ol, ul ol, ol ul {
        margin-top: 0.3em !important;
        margin-bottom: 0.3em !important;
      }
      ul ul { list-style-type: circle !important; }
      ul ul ul { list-style-type: square !important; }

      /* Task Lists */
      li.task-list-item {
        list-style: none !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 0.65em !important;
        margin: 0.45em 0 !important;
        padding-left: 0 !important;
      }
      .task-checkbox {
        width: 1.05rem !important;
        height: 1.05rem !important;
        margin-top: 0.25em !important;
        accent-color: ${theme.accent} !important;
        flex-shrink: 0 !important;
        border-radius: 4px !important;
      }
      .task-content {
        flex: 1 !important;
      }

      /* Inline Code (Exact 1:1 Match with Web App) */
      code.inline-code, code:not(pre code) {
        font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 0.88em !important;
        padding: 0.16em 0.45em !important;
        border-radius: 4px !important;
        background-color: ${theme.codeBg} !important;
        border: 1px solid ${theme.border} !important;
        color: ${theme.text} !important;
        word-break: break-word !important;
        font-weight: 500 !important;
      }

      /* Code Block Wrapper */
      .code-block-wrapper {
        margin: 1.5em 0;
        border-radius: 8px;
        border: 1px solid ${theme.border};
        overflow: hidden;
        background-color: ${theme.codeBg};
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.4rem 0.8rem;
        background-color: ${theme.bgSecondary};
        border-bottom: 1px solid ${theme.border};
        font-size: 0.75rem;
        font-family: 'JetBrains Mono', monospace;
        color: ${theme.textMuted};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      pre {
        margin: 0;
        padding: 1rem 1.15rem;
        overflow-x: auto;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.86em;
        line-height: 1.6;
        background-color: ${theme.codeBg};
        color: ${theme.text};
        tab-size: 2;
      }
      pre code {
        font-family: inherit !important;
        background: transparent !important;
        padding: 0 !important;
        border: none !important;
      }

      /* Highlight.js Tokens */
      .hljs-keyword, .hljs-selector-tag, .hljs-subst {
        color: ${isDark ? '#f59e0b' : '#d97706'};
        font-weight: 600;
      }
      .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-type {
        color: ${isDark ? '#34d399' : '#059669'};
      }
      .hljs-comment, .hljs-quote, .hljs-deletion {
        color: ${isDark ? '#a8a29e' : '#78716c'};
        font-style: italic;
      }
      .hljs-number, .hljs-regexp {
        color: ${isDark ? '#60a5fa' : '#2563eb'};
      }
      .hljs-function, .hljs-title.function_ {
        color: ${isDark ? '#fbbf24' : '#b45309'};
      }
      .hljs-params, .hljs-variable, .hljs-attr {
        color: ${isDark ? '#e0e7ff' : '#4338ca'};
      }
      .hljs-built_in {
        color: ${isDark ? '#c084fc' : '#7c3aed'};
      }

      /* Blockquotes */
      blockquote {
        margin: 1.5em 0;
        padding-left: 1.25em;
        border-left: 3.5px solid ${theme.blockquoteBorder};
        font-style: italic;
        opacity: 0.95;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* Highlights */
      mark, .mark-highlight {
        background-color: ${isDark ? 'rgba(245, 158, 11, 0.35)' : '#fef08a'} !important;
        color: ${isDark ? '#fef3c7' : '#1c1917'} !important;
        padding: 0.12em 0.35em !important;
        border-radius: 3px !important;
        font-weight: 500 !important;
      }

      /* Tables */
      .table-container {
        width: 100%;
        max-width: 100%;
        margin: 1.6em 0;
        overflow: hidden;
      }
      table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        margin: 1.2em 0;
        font-size: 0.85em;
        table-layout: auto;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      th, td {
        border: 1px solid ${theme.border};
        padding: 0.55em 0.75em;
        word-break: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
      }
      th {
        background-color: ${theme.tableHeaderBg};
        font-weight: 700;
        text-align: left;
      }
      tbody tr:nth-child(even) {
        background-color: ${theme.tableStripeBg};
      }

      /* Admonitions */
      .admonition {
        margin: 1.5em 0;
        padding: 0.95rem 1.25rem;
        border-radius: 0 8px 8px 0;
        border-left-width: 4px;
        border-left-style: solid;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .admonition-title {
        font-weight: 700;
        font-size: 0.85rem;
        text-transform: uppercase;
        margin-bottom: 0.35rem;
        letter-spacing: 0.04em;
      }
      .admonition-note { border-left-color: #2563eb; background-color: ${isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.1)'}; color: ${isDark ? '#bfdbfe' : '#1e3a8a'}; }
      .admonition-tip { border-left-color: #059669; background-color: ${isDark ? 'rgba(5, 150, 105, 0.18)' : 'rgba(5, 150, 105, 0.1)'}; color: ${isDark ? '#a7f3d0' : '#064e3b'}; }
      .admonition-warning { border-left-color: #d97706; background-color: ${isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.13)'}; color: ${isDark ? '#fde68a' : '#78350f'}; }
      .admonition-important { border-left-color: #7c3aed; background-color: ${isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.13)'}; color: ${isDark ? '#ddd6fe' : '#4c1d95'}; }
      .admonition-caution { border-left-color: #e11d48; background-color: ${isDark ? 'rgba(225, 29, 72, 0.2)' : 'rgba(225, 29, 72, 0.13)'}; color: ${isDark ? '#fecdd3' : '#881337'}; }
      .admonition-quote { border-left-color: #78716c; background-color: rgba(120, 113, 108, 0.1); color: inherit; font-style: italic; }

      /* Drop Cap */
      ${settings.dropCaps ? `
      .drop-cap > p:first-of-type::first-letter {
        float: left;
        font-size: 3.6em;
        line-height: 0.8;
        padding-top: 4px;
        padding-right: 10px;
        padding-bottom: 2px;
        font-weight: 600;
      }
      ` : ''}

      .no-print, .copy-code-btn, .anchor-link { display: none !important; }
    `;

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <!-- Full Google Fonts Web Typography -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>${pureCss}</style>
</head>
<body>
  <div class="pdf-container ${settings.dropCaps ? 'drop-cap' : ''}" id="pdf-root">
    ${htmlContent}
  </div>
</body>
</html>`);
    iframeDoc.close();

    onProgress?.('Loading typography fonts...');
    // Ensure all Google web fonts and KaTeX math fonts are fully rendered
    await Promise.all([
      (document as any).fonts?.ready || Promise.resolve(),
      (iframeDoc as any).fonts?.ready || Promise.resolve(),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);

    const renderTarget = iframeDoc.getElementById('pdf-root') || iframeDoc.body;

    // Collect elements and calculate intelligent page break cut-points
    const blockSelectors = 'h1, h2, h3, h4, h5, h6, p, li, blockquote, .code-block-wrapper, table, .admonition, .katex-display, hr';
    const elements = Array.from(renderTarget.querySelectorAll(blockSelectors)) as HTMLElement[];

    const containerRect = renderTarget.getBoundingClientRect();
    const elementTops = elements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        top: Math.round(rect.top - containerRect.top),
        bottom: Math.round(rect.bottom - containerRect.top),
        height: Math.round(rect.height),
      };
    });

    const totalDocHeightPx = Math.ceil(renderTarget.scrollHeight || renderTarget.offsetHeight);
    const pageCuts: { startY: number; endY: number }[] = [];

    let currentY = 0;
    while (currentY < totalDocHeightPx) {
      const maxTargetY = currentY + usableHeightPx;

      if (maxTargetY >= totalDocHeightPx) {
        pageCuts.push({ startY: currentY, endY: totalDocHeightPx });
        break;
      }

      // Find if any element crosses maxTargetY
      let bestCut = maxTargetY;
      for (const el of elementTops) {
        if (el.top < maxTargetY && el.bottom > maxTargetY) {
          // If the element crosses the boundary and fits in the next page, break before it
          if (el.top > currentY + 100 && el.height <= usableHeightPx) {
            bestCut = el.top;
            break;
          }
        }
      }

      pageCuts.push({ startY: currentY, endY: bestCut });
      currentY = bestCut;
    }

    onProgress?.('Rasterizing pages...');
    const scale = 1.5;
    const canvas = await html2canvas(renderTarget, {
      scale: scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: theme.bg,
      scrollY: 0,
      imageTimeout: 3000,
    });

    onProgress?.('Compiling smart-paginated full-bleed PDF...');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const targetWidthPx = Math.round(a4WidthPx * scale);
    const targetHeightPx = Math.round(a4HeightPx * scale);
    const scaledTopMarginPx = Math.round(topMarginPx * scale);

    // Build each page with full-bleed background and smart content slice
    pageCuts.forEach((cut, pageIdx) => {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = targetWidthPx;
      pageCanvas.height = targetHeightPx;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        // 1. Paint 100% full-bleed background color across the entire page (0 white borders)
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

        // 2. Draw content slice with top margin offset so text never hugs the top/bottom edges
        const sliceStartY = Math.round(cut.startY * scale);
        const sliceHeight = Math.round((cut.endY - cut.startY) * scale);

        ctx.drawImage(
          canvas,
          0,
          sliceStartY,
          canvas.width,
          sliceHeight,
          0,
          scaledTopMarginPx,
          canvas.width,
          sliceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);

        if (pageIdx > 0) {
          pdf.addPage();
        }

        // Draw full-bleed page (0, 0, 210, 297) with complete background coverage
        pdf.addImage(
          pageImgData,
          'JPEG',
          0,
          0,
          pageWidthMm,
          pageHeightMm,
          undefined,
          'FAST'
        );
      }
    });

    onProgress?.('Downloading PDF file...');
    pdf.save(cleanFilename);
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
