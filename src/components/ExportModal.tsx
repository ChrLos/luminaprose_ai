import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  FileDown, 
  Code, 
  Check, 
  Share2,
  Loader2,
  FileText
} from 'lucide-react';
import { ThemeConfig, TypographySettings } from '../types';
import { parseMarkdownToHtml, extractHeadings } from '../utils/markdownParser';
import { applyBionicReading } from '../utils/bionicReader';
import { generateDirectPdf } from '../utils/pdfGenerator';
import { useFocusTrap } from '../utils/useFocusTrap';
import { KATEX_OFFLINE_CSS } from '../utils/katexOfflineStyles';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  documentTitle: string;
  theme: ThemeConfig;
  settings: TypographySettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  markdown,
  documentTitle,
  theme,
  settings,
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Measure Column width mapping
  const getMeasureMaxWidth = () => {
    switch (settings.measureWidth) {
      case 'narrow':
        return '600px';
      case 'optimal':
        return '720px';
      case 'wide':
        return '860px';
      case 'editorial':
        return '980px';
      case 'full':
        return '100%';
    }
  };

  // Font family mapping
  const getFontFamilyStyle = () => {
    switch (settings.fontFamily) {
      case 'Newsreader':
        return "'Newsreader', Georgia, serif";
      case 'Lora':
        return "'Lora', Georgia, serif";
      case 'Cormorant Garamond':
        return "'Cormorant Garamond', 'Times New Roman', serif";
      case 'Plus Jakarta Sans':
        return "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
      case 'Atkinson Hyperlegible':
        return "'Atkinson Hyperlegible', system-ui, sans-serif";
      case 'JetBrains Mono':
        return "'JetBrains Mono', monospace";
      case 'System Serif':
        return 'ui-serif, Georgia, Cambria, serif';
      default:
        return 'system-ui, -apple-system, sans-serif';
    }
  };

  // Header font family mapping
  const getHeaderFontFamilyStyle = () => {
    switch (settings.headerFontFamily) {
      case 'Newsreader':
        return "'Newsreader', Georgia, serif";
      case 'Lora':
        return "'Lora', Georgia, serif";
      case 'Cormorant Garamond':
        return "'Cormorant Garamond', 'Times New Roman', serif";
      case 'Plus Jakarta Sans':
        return "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
      case 'Atkinson Hyperlegible':
        return "'Atkinson Hyperlegible', system-ui, sans-serif";
      case 'JetBrains Mono':
        return "'JetBrains Mono', monospace";
      case 'System Serif':
        return 'ui-serif, Georgia, Cambria, serif';
      default:
        return 'system-ui, -apple-system, sans-serif';
    }
  };

  // Word spacing style calculation
  const getWordSpacingStyle = () => {
    switch (settings.wordSpacing) {
      case 'relaxed':
        return '0.08em';
      case 'spacious':
        return '0.16em';
      default:
        return 'normal';
    }
  };

  // Get formatted HTML body
  const getRenderedBodyHtml = () => {
    let bodyHtml = parseMarkdownToHtml(markdown, theme.category === 'dark', true);
    if (settings.bionicReading) {
      bodyHtml = applyBionicReading(bodyHtml);
    }
    return bodyHtml;
  };

  // Generate 100% Mobile-Friendly Standalone HTML with Smart Auto-Hiding Outline Icon
  const generateStandaloneHtml = () => {
    const bodyHtml = getRenderedBodyHtml();
    const headings = extractHeadings(markdown);
    const fontFamily = getFontFamilyStyle();
    const headerFontFamily = getHeaderFontFamilyStyle();
    const maxWidth = getMeasureMaxWidth();
    const wordSpacing = getWordSpacingStyle();
    const letterSpacing = settings.letterSpacing === 'tight' ? '-0.02em' : settings.letterSpacing === 'wide' ? '0.03em' : 'normal';

    const outlineLinksHtml = headings.length > 0 
      ? headings.map((h) => {
          const indent = (h.level - 1) * 16 + 12;
          return `<a href="#${h.id}" class="outline-item level-${h.level}" style="padding-left: ${indent}px" onclick="navigateTo(event, '${h.id}')">
            <span class="outline-text">${h.text}</span>
          </a>`;
        }).join('')
      : '<div class="outline-empty">No headings found in document</div>';

    const isDark = theme.category === 'dark';

    return `<!DOCTYPE html>
<html lang="en" data-theme-category="${theme.category}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <title>${documentTitle || 'Document'}</title>
  
  <!-- Web Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  
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
    }

    /* Offline KaTeX & MathJax Fallback */
    ${KATEX_OFFLINE_CSS}

    *, *::before, *::after {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      font-family: ${fontFamily};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      scroll-behavior: smooth;
      -webkit-tap-highlight-color: transparent;
    }

    ::selection {
      background-color: ${isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a'};
      color: ${isDark ? '#ffffff' : '#1c1917'};
    }

    /* ============================================================
       SMART AUTO-HIDING OUTLINE ICON BUTTON (Top-Right Floating)
       ============================================================ */
    .outline-trigger-bar {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 40;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
      transform: translateY(0);
      opacity: 1;
    }

    /* Auto-hidden state on scroll down (Mobile screens only) */
    @media (max-width: 767px) {
      .outline-trigger-bar.hidden-scrolled {
        transform: translateY(-80px);
        opacity: 0;
        pointer-events: none;
      }
    }

    .outline-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      color: var(--text);
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
      transition: all 0.18s ease;
      user-select: none;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
    }

    .outline-icon-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.16);
    }

    .outline-icon-btn:active {
      transform: scale(0.95);
    }

    /* Outline Slide-over Drawer */
    .outline-drawer {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      justify-content: flex-end;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .outline-drawer.open {
      opacity: 1;
      pointer-events: auto;
    }

    .outline-backdrop {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }

    .outline-panel {
      position: relative;
      width: 320px;
      max-width: 88vw;
      height: 100%;
      background-color: var(--bg-elevated);
      border-left: 1px solid var(--border-color);
      box-shadow: -6px 0 28px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .outline-drawer.open .outline-panel {
      transform: translateX(0);
    }

    .outline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.15rem 1.25rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .outline-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text);
    }

    .outline-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 8px;
      font-size: 1rem;
      line-height: 1;
      transition: all 0.15s;
    }

    .outline-close-btn:hover {
      background-color: var(--bg-secondary);
      border-color: var(--border-color);
      color: var(--text);
    }

    .outline-list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0.85rem 0.65rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .outline-item {
      display: flex;
      align-items: center;
      min-height: 34px;
      padding-top: 0.35rem;
      padding-bottom: 0.35rem;
      padding-right: 0.75rem;
      border-radius: 6px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.82rem;
      color: var(--text);
      text-decoration: none;
      line-height: 1.35;
      transition: all 0.15s ease;
      overflow-wrap: break-word;
      word-break: break-word;
      border-left: 2px solid transparent;
    }

    .outline-item:hover, .outline-item:active {
      background-color: var(--bg-secondary);
      color: var(--accent);
      border-left-color: var(--accent);
    }

    .outline-item.active {
      background-color: rgba(217, 119, 6, 0.2);
      border-left-color: var(--accent);
      color: #000000;
      font-weight: 700;
    }

    [data-theme-category="dark"] .outline-item.active {
      color: #ffffff;
    }

    .outline-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .outline-item.level-1 { font-weight: 600; font-size: 0.84rem; }
    .outline-item.level-2 { font-size: 0.8rem; }
    .outline-item.level-3 { font-size: 0.76rem; opacity: 0.9; }
    .outline-item.level-4, .outline-item.level-5, .outline-item.level-6 { font-size: 0.72rem; opacity: 0.8; }

    .outline-empty {
      padding: 2.5rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    /* ============================================================
       RESPONSIVE ARTICLE CONTAINER & MOBILE TYPOGRAPHY
       ============================================================ */
    .article-container {
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: 2.5rem 1.15rem 5.5rem;
      font-size: ${Math.max(16, settings.fontSize - 1)}px;
      line-height: ${settings.lineHeight};
      text-align: ${settings.alignment};
      letter-spacing: ${letterSpacing};
      word-spacing: ${wordSpacing};
      overflow-wrap: break-word;
    }

    @media (min-width: 640px) {
      .article-container {
        padding: 4.5rem 1.75rem 6.5rem;
        font-size: ${settings.fontSize}px;
      }
    }

    .markdown-body {
      color: inherit;
      line-height: inherit;
    }

    .markdown-body p {
      margin-top: 1.15em;
      margin-bottom: 1.15em;
      line-height: inherit;
      overflow-wrap: break-word;
    }

    /* Responsive Headings */
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      font-family: var(--font-header);
    }

    .markdown-body h1 {
      font-size: 1.85em;
      line-height: 1.25;
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 0.7em;
      letter-spacing: -0.025em;
      border-bottom: 1.5px solid var(--border-color);
      padding-bottom: 0.35em;
      scroll-margin-top: 4.5rem;
      overflow-wrap: break-word;
    }

    @media (min-width: 640px) {
      .markdown-body h1 {
        font-size: 2.3em;
        line-height: 1.22;
        margin-top: 2.4em;
        margin-bottom: 0.8em;
      }
    }

    .markdown-body h2 {
      font-size: 1.45em;
      line-height: 1.3;
      font-weight: 700;
      margin-top: 1.8em;
      margin-bottom: 0.55em;
      letter-spacing: -0.02em;
      scroll-margin-top: 4.5rem;
      overflow-wrap: break-word;
    }

    @media (min-width: 640px) {
      .markdown-body h2 {
        font-size: 1.7em;
        line-height: 1.28;
        margin-top: 2.1em;
        margin-bottom: 0.65em;
      }
    }

    .markdown-body h3 {
      font-size: 1.2em;
      line-height: 1.35;
      font-weight: 600;
      margin-top: 1.6em;
      margin-bottom: 0.5em;
      letter-spacing: -0.015em;
      scroll-margin-top: 4.5rem;
      overflow-wrap: break-word;
    }

    @media (min-width: 640px) {
      .markdown-body h3 {
        font-size: 1.35em;
        margin-top: 1.8em;
        margin-bottom: 0.55em;
      }
    }

    .markdown-body h4 {
      font-size: 1.08em;
      line-height: 1.4;
      font-weight: 600;
      margin-top: 1.35em;
      margin-bottom: 0.4em;
      scroll-margin-top: 4.5rem;
    }

    .markdown-body > h1:first-child,
    .markdown-body > h2:first-child,
    .markdown-body > h3:first-child {
      margin-top: 0.2em;
    }

    .markdown-body ul {
      list-style-type: disc;
      padding-left: 1.4em;
      margin-top: 0.85em;
      margin-bottom: 1.25em;
    }

    .markdown-body ol {
      list-style-type: decimal;
      padding-left: 1.4em;
      margin-top: 0.85em;
      margin-bottom: 1.25em;
    }

    .markdown-body li {
      margin-top: 0.4em;
      margin-bottom: 0.4em;
      line-height: inherit;
    }

    /* Task Lists */
    .task-list-item {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      margin: 0.4em 0;
      list-style: none;
    }

    .task-checkbox {
      margin-top: 0.3em;
      width: 1.1rem;
      height: 1.1rem;
      accent-color: var(--accent);
      cursor: pointer;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .task-content {
      flex: 1;
    }

    /* Blockquotes */
    .markdown-body blockquote.editorial-blockquote {
      border-left: 3.5px solid var(--blockquote-border);
      padding-left: 1.15em;
      padding-top: 0.15em;
      padding-bottom: 0.15em;
      margin: 1.6em 0;
      font-style: italic;
      opacity: 0.96;
      line-height: inherit;
    }

    /* Inline Code */
    .markdown-body code.inline-code {
      background-color: var(--code-bg);
      padding: 0.15em 0.4em;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.86em;
      border: 1px solid var(--border-color);
      word-break: break-word;
    }

    /* Images */
    .markdown-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 1.5em auto;
    }

    /* KaTeX Math Equations (Responsive Horizontal Scroll) */
    .katex-display {
      max-width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0.5em 0;
      margin: 1.5em 0 !important;
    }

    /* ============================================================
       CODE BLOCKS (Fully Responsive & 1:1 Workspace Match)
       ============================================================ */
    .code-block-wrapper {
      position: relative;
      max-width: 100%;
      margin: 1.6em 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      background-color: var(--code-bg);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.75rem;
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      font-size: 0.75rem;
      font-family: var(--font-mono);
      color: var(--text-muted);
      user-select: none;
    }

    @media (min-width: 640px) {
      .code-header {
        padding: 0.45rem 0.85rem;
      }
    }

    .code-header span {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.06em;
    }

    .copy-code-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.22rem 0.65rem;
      border-radius: 4px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text);
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 28px;
    }

    .copy-code-btn:hover {
      background-color: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }

    .code-block-wrapper pre {
      margin: 0;
      padding: 0.9rem 1rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      font-family: var(--font-mono);
      font-size: 0.84em;
      line-height: 1.6;
      background-color: var(--code-bg);
      color: var(--text);
      tab-size: 2;
    }

    @media (min-width: 640px) {
      .code-block-wrapper pre {
        padding: 1.15rem 1.25rem;
        font-size: 0.88em;
        line-height: 1.65;
      }
    }

    .code-block-wrapper code {
      font-family: inherit;
      background: transparent !important;
      padding: 0 !important;
      border: none !important;
    }

    /* Highlight.js Syntax Colors */
    .hljs-keyword, .hljs-selector-tag, .hljs-subst, .hljs-meta .hljs-keyword {
      color: ${isDark ? '#f59e0b' : '#d97706'};
      font-weight: 600;
    }
    .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition {
      color: ${isDark ? '#34d399' : '#059669'};
    }
    .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta {
      color: ${isDark ? '#a8a29e' : '#78716c'};
      font-style: italic;
    }
    .hljs-number, .hljs-regexp, .hljs-link {
      color: ${isDark ? '#60a5fa' : '#2563eb'};
    }
    .hljs-function, .hljs-title.function_, .hljs-title.class_ {
      color: ${isDark ? '#fbbf24' : '#b45309'};
    }
    .hljs-params, .hljs-variable, .hljs-attr {
      color: ${isDark ? '#e0e7ff' : '#4338ca'};
    }
    .hljs-built_in, .hljs-symbol {
      color: ${isDark ? '#c084fc' : '#7c3aed'};
    }

    /* Links */
    .markdown-body a.prose-link {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 3.5px;
      font-weight: 500;
    }

    .markdown-body mark, .markdown-body .mark-highlight {
      background-color: ${isDark ? 'rgba(245, 158, 11, 0.35)' : '#fef08a'} !important;
      color: ${isDark ? '#fef3c7' : '#1c1917'} !important;
      padding: 0.12em 0.35em;
      border-radius: 3px;
      font-weight: 500;
    }

    /* Responsive Tables */
    .table-container {
      max-width: 100%;
      margin: 1.8em 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }

    th {
      background-color: var(--table-header-bg);
      border: 1px solid var(--border-color);
      padding: 0.65em 0.85em;
      font-weight: 700;
      text-align: left;
    }

    td {
      border: 1px solid var(--border-color);
      padding: 0.6em 0.85em;
    }

    tbody tr:nth-child(even) {
      background-color: var(--table-stripe-bg);
    }

    /* Callout Admonitions */
    .admonition {
      margin: 1.6em 0;
      padding: 1rem 1.15rem;
      border-radius: 0 8px 8px 0;
      border-left-width: 4px;
      border-left-style: solid;
    }

    @media (min-width: 640px) {
      .admonition {
        padding: 1.1rem 1.35rem;
      }
    }

    .admonition .admonition-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-weight: 700;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.4rem;
    }

    .admonition .admonition-content {
      font-size: 0.92rem;
      line-height: 1.55;
    }

    .admonition-note {
      border-left-color: #2563eb;
      background-color: ${isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.1)'};
      color: ${isDark ? '#bfdbfe' : '#1e3a8a'};
    }

    .admonition-info {
      border-left-color: #0284c7;
      background-color: ${isDark ? 'rgba(2, 132, 199, 0.18)' : 'rgba(2, 132, 199, 0.1)'};
      color: ${isDark ? '#bae6fd' : '#0c4a6e'};
    }

    .admonition-tip {
      border-left-color: #059669;
      background-color: ${isDark ? 'rgba(5, 150, 105, 0.18)' : 'rgba(5, 150, 105, 0.1)'};
      color: ${isDark ? '#a7f3d0' : '#064e3b'};
    }

    .admonition-warning {
      border-left-color: #d97706;
      background-color: ${isDark ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.13)'};
      color: ${isDark ? '#fde68a' : '#78350f'};
    }

    .admonition-important {
      border-left-color: #7c3aed;
      background-color: ${isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.13)'};
      color: ${isDark ? '#ddd6fe' : '#4c1d95'};
    }

    .admonition-caution {
      border-left-color: #e11d48;
      background-color: ${isDark ? 'rgba(225, 29, 72, 0.2)' : 'rgba(225, 29, 72, 0.13)'};
      color: ${isDark ? '#fecdd3' : '#881337'};
    }

    .admonition-quote {
      border-left-color: #78716c;
      background-color: rgba(120, 113, 108, 0.1);
      color: inherit;
      font-style: italic;
    }

    /* ============================================================
       MERMAID DIAGRAM PAN & ZOOM MODAL (Standalone Export)
       ============================================================ */
    .mermaid-block-wrapper {
      position: relative;
      width: 100%;
      max-width: 100%;
      margin: 1.6em 0;
      padding: 1rem;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background-color: var(--code-bg);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      overflow-x: auto;
    }

    .mermaid-zoom-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 28px;
    }

    .mermaid-zoom-btn:hover {
      background-color: var(--accent);
      color: #ffffff;
      border-color: var(--accent);
    }

    .mermaid-diagram {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow-x: auto;
      cursor: pointer;
      padding: 0.5rem 0;
      transition: transform 0.15s ease;
    }

    .mermaid-modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: none;
      flex-direction: column;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      user-select: none;
    }

    .mermaid-modal.open {
      display: flex;
      opacity: 1;
      pointer-events: auto;
    }

    .mermaid-modal-backdrop {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .mermaid-modal-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .mermaid-modal-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      background-color: var(--bg-elevated);
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      z-index: 20;
      flex-shrink: 0;
      gap: 0.75rem;
    }

    .mermaid-modal-title {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }

    .mermaid-modal-icon {
      color: var(--accent);
      flex-shrink: 0;
    }

    .mermaid-modal-heading {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      line-height: 1.2;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mermaid-modal-subheading {
      font-size: 0.72rem;
      color: var(--text-muted);
      display: none;
    }

    @media (min-width: 640px) {
      .mermaid-modal-subheading {
        display: block;
      }
    }

    .mermaid-modal-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    .mermaid-zoom-controls {
      display: flex;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 2px;
      background-color: var(--bg-secondary);
    }

    .mermaid-modal-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text);
      cursor: pointer;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.78rem;
      font-weight: 500;
      transition: all 0.15s ease;
      min-height: 30px;
    }

    .mermaid-modal-btn:hover {
      background-color: rgba(125, 125, 125, 0.15);
      color: var(--accent);
    }

    .mermaid-zoom-text {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      min-width: 50px;
      text-align: center;
      padding: 0.2rem 0.4rem;
    }

    .mermaid-modal-action-btn {
      border: 1px solid var(--border-color);
      background-color: var(--bg-secondary);
      padding: 0.35rem 0.75rem;
    }

    .mermaid-modal-action-btn:hover {
      background-color: var(--bg-elevated);
      border-color: var(--accent);
      color: var(--accent);
    }

    .mermaid-modal-action-btn span {
      display: none;
    }

    @media (min-width: 640px) {
      .mermaid-modal-action-btn span {
        display: inline;
      }
    }

    .mermaid-modal-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mermaid-modal-close:hover {
      background-color: rgba(125, 125, 125, 0.2);
      color: var(--text);
    }

    .mermaid-modal-canvas {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      cursor: grab;
    }

    .mermaid-modal-canvas.dragging {
      cursor: grabbing;
    }

    .mermaid-modal-content {
      padding: 2rem;
      max-width: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: center center;
      transition: transform 0.08s ease-out;
    }

    .mermaid-modal-content svg {
      max-width: none !important;
      max-height: none !important;
    }

    .mermaid-recenter-btn {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 25;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      background-color: var(--bg-elevated);
      border: 1px solid var(--accent);
      color: var(--accent);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      font-size: 0.76rem;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: transform 0.15s ease;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    .mermaid-recenter-btn:hover {
      transform: scale(1.04);
    }

    .mermaid-modal-hint {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      background-color: var(--bg-elevated);
      border: 1px solid var(--border-color);
      color: var(--text);
      font-size: 0.72rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      pointer-events: none;
      opacity: 0.85;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      white-space: nowrap;
    }

    /* Print Specific Overrides */
    @media print {
      @page {
        size: A4 portrait;
        margin: 18mm 16mm;
      }
      .no-print, .outline-trigger-bar, .outline-drawer, .mermaid-modal {
        display: none !important;
      }
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: ${theme.bg} !important;
        color: ${theme.text} !important;
      }
      .article-container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .code-block-wrapper, blockquote, table, .admonition, .katex-display, .mermaid-block-wrapper {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
        break-after: avoid;
      }
      .copy-code-btn, .anchor-link, .mermaid-zoom-btn {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Top Right Smart Auto-Hiding Outline Icon Button -->
  <div id="outline-trigger-bar" class="no-print outline-trigger-bar">
    <button id="outline-toggle-btn" class="outline-icon-btn" onclick="toggleOutline()" aria-label="Toggle Document Outline" title="Document Outline">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    </button>
  </div>

  <!-- Outline Slide-over Drawer -->
  <div id="outline-drawer" class="no-print outline-drawer">
    <div class="outline-backdrop" onclick="toggleOutline()"></div>
    <div class="outline-panel">
      <div class="outline-header">
        <div class="outline-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Outline</span>
        </div>
        <button class="outline-close-btn" onclick="toggleOutline()" aria-label="Close outline">✕</button>
      </div>
      <div class="outline-list">
        ${outlineLinksHtml}
      </div>
    </div>
  </div>

  <!-- Mermaid Diagram Pan & Zoom Maximized Modal -->
  <div id="mermaid-modal" class="no-print mermaid-modal" role="dialog" aria-modal="true" aria-label="Mermaid Diagram Viewer">
    <div class="mermaid-modal-backdrop" onclick="closeMermaidModal()"></div>
    <div class="mermaid-modal-container">
      <div class="mermaid-modal-header">
        <div class="mermaid-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="mermaid-modal-icon">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <div>
            <div class="mermaid-modal-heading">Mermaid Diagram Canvas</div>
            <div class="mermaid-modal-subheading">Drag or touch to pan • Scroll or pinch to zoom • Double-tap/click to fit</div>
          </div>
        </div>
        <div class="mermaid-modal-actions">
          <div class="mermaid-zoom-controls">
            <button type="button" class="mermaid-modal-btn" onclick="mermaidZoomOut()" title="Zoom Out (-)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            <button type="button" id="mermaid-zoom-level" class="mermaid-modal-btn mermaid-zoom-text" onclick="mermaidResetZoom()" title="Reset Zoom (0)">100%</button>
            <button type="button" class="mermaid-modal-btn" onclick="mermaidZoomIn()" title="Zoom In (+)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
          </div>
          <button type="button" class="mermaid-modal-btn mermaid-modal-action-btn" onclick="mermaidFitToScreen()" title="Fit & Center (0)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            <span>Fit Screen</span>
          </button>
          <button type="button" class="mermaid-modal-btn mermaid-modal-action-btn" onclick="mermaidActualSize()" title="Actual 1:1 Scale (1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path></svg>
            <span>100%</span>
          </button>
          <button type="button" class="mermaid-modal-btn mermaid-modal-action-btn" onclick="downloadMermaidSvg()" title="Download SVG">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Export SVG</span>
          </button>
          <button type="button" id="mermaid-modal-copy-btn" class="mermaid-modal-btn mermaid-modal-action-btn" onclick="copyMermaidModalCode()" title="Copy Code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span id="mermaid-modal-copy-text">Copy Code</span>
          </button>
          <button type="button" class="mermaid-modal-close" onclick="closeMermaidModal()" title="Close (Esc)">✕</button>
        </div>
      </div>
      <div id="mermaid-modal-canvas" class="mermaid-modal-canvas">
        <div id="mermaid-modal-recenter-btn" class="mermaid-recenter-btn" onclick="mermaidResetZoom()" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
          <span>Re-center Diagram</span>
        </div>
        <div id="mermaid-modal-content" class="mermaid-modal-content"></div>
        <div class="mermaid-modal-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
          <span>Drag / Touch to pan • Scroll / Pinch to zoom • Double-click / tap to reset</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Document Article Body -->
  <div class="article-container">
    <article class="markdown-body">
      ${bodyHtml}
    </article>
  </div>

  <script>
    let isDrawerOpen = false;

    function toggleOutline() {
      const drawer = document.getElementById('outline-drawer');
      if (drawer) {
        isDrawerOpen = !drawer.classList.contains('open');
        drawer.classList.toggle('open');
        // Prevent background scrolling on mobile when outline is open
        document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
      }
    }

    function navigateTo(e, id) {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        if (window.innerWidth < 768 && isDrawerOpen) {
          toggleOutline();
        }
        document.body.style.overflow = '';
        setTimeout(function() {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        history.replaceState(null, '', '#' + id);
      }
    }

    // Smart Scroll: Auto-hide outline icon on mobile scroll down, keep visible on desktop
    let lastScrollY = window.scrollY || 0;
    const triggerBar = document.getElementById('outline-trigger-bar');

    window.addEventListener('scroll', function() {
      if (isDrawerOpen || window.innerWidth >= 768) {
        if (triggerBar) triggerBar.classList.remove('hidden-scrolled');
        return;
      }
      const currentScrollY = window.scrollY || 0;
      
      if (currentScrollY > lastScrollY && currentScrollY > 70) {
        // Scrolling DOWN on mobile
        if (triggerBar) triggerBar.classList.add('hidden-scrolled');
      } else {
        // Scrolling UP or near top on mobile
        if (triggerBar) triggerBar.classList.remove('hidden-scrolled');
      }
      lastScrollY = Math.max(0, currentScrollY);
    }, { passive: true });

    // Interactive Copy Code button handler
    window.__copyCodeBlock = function(btn) {
      const codeEncoded = btn.getAttribute('data-code');
      if (codeEncoded) {
        const rawCode = decodeURIComponent(codeEncoded);
        navigator.clipboard.writeText(rawCode).then(function() {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.backgroundColor = '#059669';
          btn.style.color = '#ffffff';
          btn.style.borderColor = '#059669';
          setTimeout(function() {
            btn.textContent = orig;
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 2000);
        }).catch(function() {
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
        });
      }
    };

    // Interactive Task list toggle handler
    window.__toggleTaskItem = function(checkbox) {
      const parent = checkbox.closest('.task-list-item');
      if (parent) {
        const content = parent.querySelector('.task-content');
        if (content) {
          if (checkbox.checked) {
            content.style.textDecoration = 'line-through';
            content.style.opacity = '0.6';
          } else {
            content.style.textDecoration = 'none';
            content.style.opacity = '1';
          }
        }
      }
    };

    // ============================================================
    // MERMAID DIAGRAM VIEWER, PAN & ZOOM (STANDALONE HTML)
    // ============================================================
    let mermaidModal = document.getElementById('mermaid-modal');
    let mermaidCanvas = document.getElementById('mermaid-modal-canvas');
    let mermaidContent = document.getElementById('mermaid-modal-content');
    let mermaidRecenterBtn = document.getElementById('mermaid-modal-recenter-btn');
    let mermaidZoomLevelText = document.getElementById('mermaid-zoom-level');
    let currentMermaidCode = '';
    let currentMermaidSvg = '';
    
    let mScale = 1;
    let mBaseFitScale = 1;
    let mPosX = 0;
    let mPosY = 0;
    let mIsDragging = false;
    let mDragStartX = 0;
    let mDragStartY = 0;
    let mPinchDist = null;
    let mPinchScale = 1;
    let mLastTouchTime = 0;

    function prepareSvgForCanvas(rawSvg) {
      if (!rawSvg) return '';
      if (rawSvg.indexOf('<svg') === -1) return rawSvg;

      var width = 0;
      var height = 0;

      var viewBoxMatch = rawSvg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
      if (viewBoxMatch && viewBoxMatch[1]) {
        var parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      }

      if (!width || !height) {
        var wMatch = rawSvg.match(/width\s*=\s*["']([0-9.]+)(px)?["']/i);
        var hMatch = rawSvg.match(/height\s*=\s*["']([0-9.]+)(px)?["']/i);
        if (wMatch && wMatch[1]) width = parseFloat(wMatch[1]);
        if (hMatch && hMatch[1]) height = parseFloat(hMatch[1]);
      }

      if (!width || width <= 0) width = 800;
      if (!height || height <= 0) height = 500;

      // Measure viewport to set base SVG canvas dimensions so 100% zoom naturally fills screen
      var canvasW = window.innerWidth || 1200;
      var canvasH = (window.innerHeight || 800) - 80;
      var availW = Math.max(canvasW - 64, 320);
      var availH = Math.max(canvasH - 80, 240);

      var aspect = width / height;
      var fitW = availW;
      var fitH = availW / aspect;
      if (fitH > availH) {
        fitH = availH;
        fitW = availH * aspect;
      }

      // Enforce healthy baseline minimum width (at least 800px) so small diagrams render large & crisp
      if (fitW < 800) {
        fitW = 800;
        fitH = 800 / aspect;
      }

      var roundedW = Math.round(fitW);
      var roundedH = Math.round(fitH);

      return rawSvg.replace(/<svg([^>]*)>/i, function(match, attrs) {
        var cleanedAttrs = attrs
          .replace(/\s*(width|height)\s*=\s*["'][^"']*["']/gi, '')
          .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

        return '<svg' + cleanedAttrs + ' width="' + roundedW + '" height="' + roundedH + '" style="width: ' + roundedW + 'px !important; height: ' + roundedH + 'px !important; min-width: ' + roundedW + 'px !important; min-height: ' + roundedH + 'px !important; max-width: none !important; max-height: none !important; display: block !important;">';
      });
    }

    function calculateOptimalFitScale() {
      mermaidContent = mermaidContent || document.getElementById('mermaid-modal-content');
      mermaidCanvas = mermaidCanvas || document.getElementById('mermaid-modal-canvas');
      if (!mermaidContent) return 1;

      var svg = mermaidContent.querySelector('svg');
      if (!svg) return 1;

      var svgW = parseFloat(svg.getAttribute('width')) || svg.clientWidth || 800;
      var svgH = parseFloat(svg.getAttribute('height')) || svg.clientHeight || 500;

      var canvasW = (mermaidCanvas && mermaidCanvas.clientWidth > 100) ? mermaidCanvas.clientWidth : (window.innerWidth || 1200);
      var canvasH = (mermaidCanvas && mermaidCanvas.clientHeight > 100) ? mermaidCanvas.clientHeight : ((window.innerHeight || 800) - 60);

      var availW = Math.max(canvasW - 48, 200);
      var availH = Math.max(canvasH - 64, 200);

      var scaleX = availW / svgW;
      var scaleY = availH / svgH;
      var fit = Math.min(scaleX, scaleY);
      
      // Keep fit baseline around 1.0 (clamped between 0.8 and 3.0) so 100% displays perfectly on screen
      return Number(Math.min(Math.max(fit, 0.8), 3.0).toFixed(2));
    }

    function updateMermaidTransform(instant) {
      mermaidContent = mermaidContent || document.getElementById('mermaid-modal-content');
      mermaidZoomLevelText = mermaidZoomLevelText || document.getElementById('mermaid-zoom-level');
      mermaidRecenterBtn = mermaidRecenterBtn || document.getElementById('mermaid-modal-recenter-btn');

      if (!mermaidContent) return;
      mermaidContent.style.transition = instant || mIsDragging ? 'none' : 'transform 0.08s ease-out';
      mermaidContent.style.transform = 'translate(' + mPosX + 'px, ' + mPosY + 'px) scale(' + mScale + ')';
      if (mermaidZoomLevelText) {
        mermaidZoomLevelText.textContent = Math.round((mScale / (mBaseFitScale || 1)) * 100) + '%';
      }
      if (mermaidRecenterBtn) {
        var isTransformed = Math.abs(mScale - (mBaseFitScale || 1)) > 0.05 || mPosX !== 0 || mPosY !== 0;
        mermaidRecenterBtn.style.display = isTransformed ? 'inline-flex' : 'none';
      }
    }

    function mermaidZoomIn() {
      // Allow massive zoom up to 25x relative to fit baseline (2500% zoom!)
      mScale = Math.min(mScale * 1.35, (mBaseFitScale || 1) * 25);
      updateMermaidTransform();
    }

    function mermaidZoomOut() {
      mScale = Math.max(mScale / 1.35, (mBaseFitScale || 1) * 0.1);
      updateMermaidTransform();
    }

    function mermaidFitToScreen() {
      mBaseFitScale = calculateOptimalFitScale();
      mScale = mBaseFitScale;
      mPosX = 0;
      mPosY = 0;
      updateMermaidTransform();
    }

    function mermaidActualSize() {
      mScale = 1;
      mPosX = 0;
      mPosY = 0;
      updateMermaidTransform();
    }

    function mermaidResetZoom() {
      mermaidFitToScreen();
    }

    function closeMermaidModal() {
      mermaidModal = mermaidModal || document.getElementById('mermaid-modal');
      if (mermaidModal) {
        mermaidModal.classList.remove('open');
        mermaidModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    // Attach all handlers explicitly to window for inline onclick accessibility
    window.mermaidZoomIn = mermaidZoomIn;
    window.mermaidZoomOut = mermaidZoomOut;
    window.mermaidFitToScreen = mermaidFitToScreen;
    window.mermaidActualSize = mermaidActualSize;
    window.mermaidResetZoom = mermaidResetZoom;
    window.closeMermaidModal = closeMermaidModal;

    window.__openMermaidViewer = function(btn) {
      mermaidModal = mermaidModal || document.getElementById('mermaid-modal');
      mermaidContent = mermaidContent || document.getElementById('mermaid-modal-content');
      mermaidCanvas = mermaidCanvas || document.getElementById('mermaid-modal-canvas');

      const codeEncoded = btn.getAttribute('data-code');
      const wrapper = btn.closest('.mermaid-block-wrapper') || btn;
      const diagramEl = wrapper ? wrapper.querySelector('.mermaid-diagram') : null;
      let svgHtml = diagramEl ? diagramEl.innerHTML.trim() : '';
      currentMermaidCode = codeEncoded ? decodeURIComponent(codeEncoded) : '';

      if (mermaidModal) {
        mermaidModal.style.display = 'flex';
        mermaidModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      }

      function applyAndFit(rawSvg) {
        currentMermaidSvg = prepareSvgForCanvas(rawSvg);
        if (mermaidContent) {
          mermaidContent.innerHTML = currentMermaidSvg;
        }

        mBaseFitScale = calculateOptimalFitScale();
        mScale = mBaseFitScale;
        mPosX = 0;
        mPosY = 0;
        updateMermaidTransform(true);

        setTimeout(function() {
          mBaseFitScale = calculateOptimalFitScale();
          mScale = mBaseFitScale;
          updateMermaidTransform(true);
        }, 50);
      }

      if (!svgHtml || svgHtml.includes('Rendering diagram...')) {
        if (window.mermaid) {
          try {
            const id = 'mermaid-temp-' + Math.random().toString(36).substring(2, 9);
            window.mermaid.render(id, currentMermaidCode).then(function(res) {
              if (diagramEl) diagramEl.innerHTML = res.svg;
              applyAndFit(res.svg);
            }).catch(function(e) {
              if (mermaidContent) mermaidContent.innerHTML = '<pre style="color:red;font-size:12px;">' + (e.message || 'Syntax error') + '</pre>';
            });
          } catch(e) {}
        } else {
          applyAndFit('<pre style="font-family:monospace;font-size:12px;padding:1rem;">' + currentMermaidCode + '</pre>');
        }
      } else {
        applyAndFit(svgHtml);
      }
    };

    function downloadMermaidSvg() {
      if (!currentMermaidSvg) return;
      const blob = new Blob([currentMermaidSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mermaid-diagram-' + Date.now() + '.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    window.downloadMermaidSvg = downloadMermaidSvg;

    function copyMermaidModalCode() {
      if (!currentMermaidCode) return;
      navigator.clipboard.writeText(currentMermaidCode).then(function() {
        const copyText = document.getElementById('mermaid-modal-copy-text');
        if (copyText) {
          const orig = copyText.textContent;
          copyText.textContent = 'Copied!';
          setTimeout(function() { copyText.textContent = orig; }, 2000);
        }
      });
    }
    window.copyMermaidModalCode = copyMermaidModalCode;

    if (mermaidCanvas) {
      mermaidCanvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        const maxLimit = (mBaseFitScale || 1) * 25;
        const minLimit = (mBaseFitScale || 1) * 0.1;
        mScale = Math.min(Math.max(mScale * factor, minLimit), maxLimit);
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

      mermaidCanvas.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        mermaidResetZoom();
      });

      // Touch handlers for mobile
      mermaidCanvas.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
          mIsDragging = true;
          mDragStartX = e.touches[0].clientX - mPosX;
          mDragStartY = e.touches[0].clientY - mPosY;
        } else if (e.touches.length === 2) {
          mIsDragging = false;
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          mPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          mPinchScale = mScale;
        }
      }, { passive: true });

      mermaidCanvas.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1 && mIsDragging) {
          mPosX = e.touches[0].clientX - mDragStartX;
          mPosY = e.touches[0].clientY - mDragStartY;
          updateMermaidTransform(true);
        } else if (e.touches.length === 2 && mPinchDist) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const ratio = dist / mPinchDist;
          const maxLimit = (mBaseFitScale || 1) * 25;
          const minLimit = (mBaseFitScale || 1) * 0.1;
          mScale = Math.min(Math.max(mPinchScale * ratio, minLimit), maxLimit);
          updateMermaidTransform(true);
        }
      }, { passive: true });

      mermaidCanvas.addEventListener('touchend', function(e) {
        if (e.touches.length === 0) {
          mIsDragging = false;
          mPinchDist = null;
          const now = Date.now();
          if (now - mLastTouchTime < 300) {
            mermaidResetZoom();
          }
          mLastTouchTime = now;
        } else if (e.touches.length === 1) {
          mIsDragging = true;
          mDragStartX = e.touches[0].clientX - mPosX;
          mDragStartY = e.touches[0].clientY - mPosY;
          mPinchDist = null;
        }
      });
    }

    // Dynamic Mermaid CDN auto-rendering on page load with async fallback
    function initAllMermaidDiagrams() {
      if (!window.mermaid) return;
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: '${isDark ? 'dark' : 'default'}',
          securityLevel: 'loose'
        });
        document.querySelectorAll('.mermaid-diagram').forEach(function(diag) {
          const code = diag.getAttribute('data-code');
          if (code && (!diag.querySelector('svg') || diag.innerHTML.includes('Rendering diagram...'))) {
            const raw = decodeURIComponent(code);
            const id = 'mermaid-init-' + Math.random().toString(36).substring(2, 9);
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
    setTimeout(initAllMermaidDiagrams, 400);
    setTimeout(initAllMermaidDiagrams, 1200);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (mermaidModal && mermaidModal.classList.contains('open')) {
          closeMermaidModal();
          return;
        }
        if (isDrawerOpen) {
          toggleOutline();
        }
      } else if (mermaidModal && mermaidModal.classList.contains('open')) {
        if (e.key === '+' || e.key === '=') {
          mermaidZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          mermaidZoomOut();
        } else if (e.key === '0') {
          mermaidFitToScreen();
        } else if (e.key === '1') {
          mermaidActualSize();
        }
      }
    });
  </script>
</body>
</html>`;
  };

  // Direct Client-Side PDF Generation
  const handleGeneratePdf = async () => {
    setIsExportingPdf(true);
    setPdfError(null);
    setPdfProgressText('Preparing PDF document...');

    try {
      await generateDirectPdf({
        title: documentTitle,
        htmlContent: getRenderedBodyHtml(),
        theme,
        settings,
        fontFamily: getFontFamilyStyle(),
        headerFontFamily: getHeaderFontFamilyStyle(),
        onProgress: (step) => setPdfProgressText(step),
      });
      setIsExportingPdf(false);
      setPdfProgressText('');
    } catch (err) {
      console.error('Direct PDF generation error:', err);
      setIsExportingPdf(false);
      setPdfProgressText('');
      setPdfError('PDF export could not complete. Please try again.');
    }
  };

  // Copy Formatted Rich HTML to Clipboard
  const handleCopyRichText = async () => {
    try {
      const htmlContent = parseMarkdownToHtml(markdown, theme.category === 'dark', true);
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([markdown], { type: 'text/plain' });

      if (navigator.clipboard && (window as any).ClipboardItem) {
        const item = new (window as any).ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(markdown);
      }

      setCopiedType('rich');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      await navigator.clipboard.writeText(markdown);
      setCopiedType('rich');
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  // Copy Raw Markdown
  const handleCopyRawMarkdown = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopiedType('raw');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Download .md file
  const handleDownloadMarkdown = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document'}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Standalone HTML file (100% 1:1 replica of the preview with Smart Floating Outline)
  const handleDownloadHtml = () => {
    const filename = `${documentTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document'}.html`;
    const fullHtml = generateStandaloneHtml();

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div 
        ref={modalRef}
        className="relative max-w-lg w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-5"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Export & Publish Document"
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-base">Export & Publish Document</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-stone-500/10 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {pdfError && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
            <span>{pdfError}</span>
            <button type="button" onClick={() => setPdfError(null)} className="ml-2 hover:underline cursor-pointer">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Action 1: Direct Download PDF (.pdf) */}
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isExportingPdf}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group disabled:opacity-50"
            style={{
              borderColor: theme.accent,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {isExportingPdf ? (
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              ) : (
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Direct PDF
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {isExportingPdf ? (pdfProgressText || 'Exporting...') : 'Export to PDF (.pdf)'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Direct file download with 1:1 styles
              </div>
            </div>
          </button>

          {/* Action 2: Copy Rich Text */}
          <button
            type="button"
            onClick={handleCopyRichText}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              {copiedType === 'rich' ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Clipboard</span>
            </div>
            <div>
              <div className="text-sm font-semibold">
                {copiedType === 'rich' ? 'Copied Rich Text!' : 'Copy Formatted Text'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Paste into Notion, Docs, or Medium
              </div>
            </div>
          </button>

          {/* Action 3: Download .md */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <FileDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Markdown</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Download .md</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Standard Markdown text file
              </div>
            </div>
          </button>

          {/* Action 4: Download HTML */}
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="p-4 rounded-xl border text-left transition-all hover:ring-2 hover:ring-amber-500 cursor-pointer flex flex-col justify-between group"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgElevated,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Standalone</span>
            </div>
            <div>
              <div className="text-sm font-semibold">Download .html</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                Mobile-friendly + Auto-hiding Outline
              </div>
            </div>
          </button>
        </div>

        {/* Copy Raw Markdown footer button */}
        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={handleCopyRawMarkdown}
            className="text-xs font-mono font-medium hover:underline flex items-center gap-1.5 cursor-pointer"
            style={{ color: theme.textMuted }}
          >
            {copiedType === 'raw' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedType === 'raw' ? 'Copied Raw Markdown!' : 'Copy raw markdown source'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-stone-500/10 cursor-pointer transition-colors"
            style={{ borderColor: theme.border }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
