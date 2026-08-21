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
  if (!isOpen) return null;

  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);

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
    let bodyHtml = parseMarkdownToHtml(markdown, { highlightSyntax: settings.highlightSyntax });
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

    /* Print Specific Overrides */
    @media print {
      @page {
        size: A4 portrait;
        margin: 18mm 16mm;
      }
      .no-print, .outline-trigger-bar, .outline-drawer {
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
      .code-block-wrapper, blockquote, table, .admonition, .katex-display {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      h1, h2, h3 {
        page-break-after: avoid;
        break-after: avoid;
      }
      .copy-code-btn, .anchor-link {
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

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isDrawerOpen) {
        toggleOutline();
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
      const htmlContent = parseMarkdownToHtml(markdown, { highlightSyntax: true });
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
        className="relative max-w-lg w-full rounded-2xl shadow-2xl border p-6 z-10 space-y-5"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
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
