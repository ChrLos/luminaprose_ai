import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { TocHeading } from '../types';
import { getCachedMermaidSvg } from './mermaidRenderer';

// Slug generator for heading IDs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Global heading occurrence counts per parse session to guarantee unique HTML IDs
let currentParseHeadingCounts = new Map<string, number>();
let currentParseTaskIndex = 0;

// Extract TOC Headings safely with duplicate ID resolution
export function extractHeadings(markdown: string): TocHeading[] {
  if (!markdown) return [];
  const headings: TocHeading[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  const idCounts = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();

      // Clean raw text to match sharedRenderer's plain text slug
      const cleanedText = rawText
        .replace(/\$\$[\s\S]*?\$\$/g, '')
        .replace(/\$[^\$]+?\$/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[*_~`=]/g, '')
        .trim();

      const baseId = slugify(cleanedText || rawText);
      const count = idCounts.get(baseId) || 0;
      idCounts.set(baseId, count + 1);

      const uniqueId = count === 0 ? baseId : `${baseId}-${count}`;
      headings.push({ id: uniqueId, text: cleanedText || rawText, level, lineIndex: i });
    }
  }

  return headings;
}

// Setup custom marked renderer with placeholder-based KaTeX protection
const sharedRenderer = new marked.Renderer();

// Headings with unique IDs and smooth anchor links
sharedRenderer.heading = function ({
  tokens,
  depth,
}: {
  tokens: any[];
  depth: number;
}): string {
  const text = this.parser.parseInline(tokens);
  const plainText = text.replace(/<[^>]*>/g, '');
  const baseId = slugify(plainText);
  const count = currentParseHeadingCounts.get(baseId) || 0;
  currentParseHeadingCounts.set(baseId, count + 1);

  const uniqueId = count === 0 ? baseId : `${baseId}-${count}`;

  return `
    <h${depth} id="${uniqueId}" class="group heading-anchor-wrapper flex items-center justify-between">
      <span>${text}</span>
      <a 
        href="#${uniqueId}" 
        class="heading-anchor opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity ml-2 text-stone-400 dark:text-stone-500 hover:text-amber-600 no-underline cursor-pointer"
        aria-label="Permalink to ${plainText}"
      >#</a>
    </h${depth}>
  `;
};

// Obsidian-style Callouts / Admonitions
sharedRenderer.blockquote = function ({ tokens }: { tokens: any[] }): string {
  const body = this.parser.parse(tokens);

  // Match Obsidian callouts: > [!NOTE] or > [!WARNING] or > [!TIP] etc.
  const calloutMatch = body.match(
    /<p>\s*\[!([a-zA-Z]+)\]([+-]?)(?:[ \t]+([^\n<]+))?\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*)/
  );

  if (calloutMatch) {
    const type = calloutMatch[1].toLowerCase();
    const customTitle = calloutMatch[3]?.trim();
    const restOfFirstPara = calloutMatch[4]?.trim();
    const afterFirstPara = calloutMatch[5] || '';

    const title =
      customTitle || type.charAt(0).toUpperCase() + type.slice(1);

    const calloutIcons: Record<string, string> = {
      note: '📝',
      tip: '💡',
      important: '✨',
      warning: '⚠️',
      caution: '🔴',
      danger: '🔥',
      info: 'ℹ️',
      success: '✅',
      quote: '💬',
      example: '📋',
      question: '❓',
      faq: '❓',
      todo: '☑️',
      bug: '🐛',
      abstract: '📄',
      summary: '📄',
      tldr: '📄',
    };

    const calloutColors: Record<string, string> = {
      note: 'border-blue-500/80 bg-blue-500/5 text-blue-900 dark:text-blue-200',
      tip: 'border-emerald-500/80 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200',
      important: 'border-purple-500/80 bg-purple-500/5 text-purple-900 dark:text-purple-200',
      warning: 'border-amber-500/80 bg-amber-500/5 text-amber-900 dark:text-amber-200',
      caution: 'border-amber-600/80 bg-amber-600/5 text-amber-900 dark:text-amber-200',
      danger: 'border-rose-500/80 bg-rose-500/5 text-rose-900 dark:text-rose-200',
      info: 'border-sky-500/80 bg-sky-500/5 text-sky-900 dark:text-sky-200',
      success: 'border-teal-500/80 bg-teal-500/5 text-teal-900 dark:text-teal-200',
      quote: 'border-stone-400 bg-stone-500/5 text-stone-900 dark:text-stone-200',
      example: 'border-indigo-500/80 bg-indigo-500/5 text-indigo-900 dark:text-indigo-200',
      question: 'border-amber-500/80 bg-amber-500/5 text-amber-900 dark:text-amber-200',
      faq: 'border-amber-500/80 bg-amber-500/5 text-amber-900 dark:text-amber-200',
      todo: 'border-blue-500/80 bg-blue-500/5 text-blue-900 dark:text-blue-200',
      bug: 'border-rose-600/80 bg-rose-600/5 text-rose-900 dark:text-rose-200',
      abstract: 'border-cyan-500/80 bg-cyan-500/5 text-cyan-900 dark:text-cyan-200',
      summary: 'border-cyan-500/80 bg-cyan-500/5 text-cyan-900 dark:text-cyan-200',
      tldr: 'border-cyan-500/80 bg-cyan-500/5 text-cyan-900 dark:text-cyan-200',
    };

    const icon = calloutIcons[type] || '📌';
    const colorClasses =
      calloutColors[type] ||
      'border-amber-500/80 bg-amber-500/5 text-amber-900 dark:text-amber-200';

    return `
      <div class="admonition-block admonition-${type} my-5 p-4 rounded-xl border-l-4 ${colorClasses} shadow-2xs">
        <div class="admonition-title flex items-center gap-2 font-semibold text-sm mb-2 select-none">
          <span class="admonition-icon">${icon}</span>
          <span>${title}</span>
        </div>
        <div class="admonition-content">
          ${restOfFirstPara ? `<p>${restOfFirstPara}</p>` : ''}
          ${afterFirstPara}
        </div>
      </div>
    `;
  }

  return `<blockquote class="editorial-blockquote">${body}</blockquote>`;
};

function renderCodeBlock(text: string, lang?: string, isDark = false): string {
  const normalizedLang = (lang || '').trim().toLowerCase();

  // Mermaid diagrams rendering
  if (normalizedLang === 'mermaid' || normalizedLang === 'mermaidjs') {
    const rawTrimmed = text.trim();
    const encodedRaw = encodeURIComponent(rawTrimmed);
    // Check if SVG is already cached in memory for instant 0ms rendering
    const cachedSvg = getCachedMermaidSvg(rawTrimmed, isDark);
    const initialContent = cachedSvg || '<div class="text-xs opacity-60 font-mono py-4">Rendering diagram...</div>';

    return `
      <div class="mermaid-block-wrapper my-6 p-4 rounded-xl border shadow-xs transition-colors flex flex-col w-full relative overflow-x-auto" style="background-color: var(--code-bg); border-color: var(--border-color);">
        <div class="code-header w-full flex items-center justify-between pb-2 mb-2 border-b text-[11px] font-mono select-none" style="border-color: var(--border-color);">
          <span class="uppercase font-semibold tracking-wider flex items-center gap-1.5 opacity-75">
            <span>📊</span>
            <span>Mermaid Diagram</span>
          </span>
          <div class="flex items-center gap-1.5">
            <button 
              type="button"
              class="mermaid-zoom-btn px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors cursor-pointer border flex items-center gap-1 hover:bg-stone-500/10"
              data-code="${encodedRaw}"
              onclick="window.__openMermaidViewer?.(this)"
              title="Maximize and Pan & Zoom Diagram"
              style="border-color: var(--border-color);"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
              <span>Expand</span>
            </button>
            <button 
              type="button"
              class="copy-code-btn px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors cursor-pointer"
              data-code="${encodedRaw}"
              onclick="window.__copyCodeBlock?.(this)"
            >
              Copy Code
            </button>
          </div>
        </div>
        <div 
          class="mermaid-diagram w-full flex items-center justify-center my-2 text-center overflow-x-auto cursor-pointer" 
          data-code="${encodedRaw}" 
          data-mermaid="${encodedRaw}" 
          onclick="window.__openMermaidViewer?.(this)" 
          title="Click to Maximize and Pan & Zoom"
        >
          ${initialContent}
        </div>
      </div>
    `;
  }

  const language = normalizedLang && hljs.getLanguage(normalizedLang) ? normalizedLang : '';
  let highlighted = '';

  if (language) {
    try {
      highlighted = hljs.highlight(text, { language }).value;
    } catch {
      highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  } else {
    // Fast HTML escaping without running expensive hljs.highlightAuto on every keypress
    highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const encodedRaw = encodeURIComponent(text);

  return `
    <div class="code-block-wrapper relative group my-6 rounded-lg overflow-hidden border shadow-xs">
      <div class="code-header flex items-center justify-between px-3 py-1.5 border-b text-xs font-mono select-none">
        <span class="code-language uppercase font-semibold tracking-wider text-[11px]">${language || 'text'}</span>
        <button 
          type="button"
          class="copy-code-btn px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors cursor-pointer"
          data-code="${encodedRaw}"
          onclick="window.__copyCodeBlock?.(this)"
        >
          Copy Code
        </button>
      </div>
      <div class="code-content-wrapper flex text-xs font-mono overflow-x-auto">
        <pre class="hljs-pre flex-1 p-3 overflow-x-auto"><code class="hljs ${language ? `language-${language}` : ''}">${highlighted}</code></pre>
      </div>
    </div>
  `;
}

// Inline code styling
sharedRenderer.codespan = function ({ text }: { text: string }): string {
  return `<code class="inline-code">${text}</code>`;
};

// Tables with wrapping container and clean styling
sharedRenderer.table = function (token: any): string {
  const headerHtml = token.header
    .map((cell: any) =>
      sharedRenderer.tablecell ? (sharedRenderer.tablecell as any).call(this, cell) : ''
    )
    .join('');
  const rowsHtml = token.rows
    .map((row: any) => {
      const rowCells = row
        .map((cell: any) =>
          sharedRenderer.tablecell ? (sharedRenderer.tablecell as any).call(this, cell) : ''
        )
        .join('');
      return `<tr>${rowCells}</tr>`;
    })
    .join('');

  return `
    <div class="table-container">
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
};

sharedRenderer.tablecell = function (cell: any): string {
  const tag = cell.header ? 'th' : 'td';
  const alignClass = cell.align ? `style="text-align: ${cell.align}"` : '';
  const content = this.parser.parseInline(cell.tokens || []);
  return `<${tag} ${alignClass}>${content}</${tag}>`;
};

// Suppress Marked's default disabled checkbox token so it does not duplicate our interactive checkbox
sharedRenderer.checkbox = function (): string {
  return '';
};

// Interactive Task List items with indexed tracking
sharedRenderer.listitem = function ({
  tokens,
  task,
  checked,
}: {
  tokens: any[];
  task: boolean;
  checked?: boolean;
}): string {
  const text = this.parser.parse(tokens);
  if (task) {
    const isChecked = Boolean(checked);
    const taskIndex = currentParseTaskIndex++;
    // Clean out any leftover internal checkbox tags or literal markers
    const cleanedText = text
      .replace(/<input\s+[^>]*type=["']?checkbox["']?[^>]*>/gi, '')
      .replace(/^\s*\[[ xX]\]\s*/, '')
      .trim();

    return `
      <li class="task-list-item flex items-start gap-2.5 my-1.5 list-none">
        <input 
          type="checkbox" 
          ${isChecked ? 'checked' : ''} 
          data-task-index="${taskIndex}"
          class="task-checkbox mt-1 w-4 h-4 rounded cursor-pointer accent-amber-600 focus:ring-amber-500"
          onchange="window.__toggleTaskItem?.(this)"
        />
        <div class="task-content flex-1 ${isChecked ? 'line-through opacity-60' : ''}">${cleanedText}</div>
      </li>
    `;
  }
  return `<li>${text}</li>`;
};

// Horizontal Rule / Divider (Explicitly rendered & styled)
sharedRenderer.hr = function (): string {
  return `<hr class="my-8 border-t" />`;
};

// Smart Footnotes processing
function processFootnotes(text: string): { processedText: string; footnotesHtml: string } {
  const footnoteDefs = new Map<string, string>();
  const footnoteOrder: string[] = [];

  // Extract definitions: [^1]: Definition text
  const cleanedText = text.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, (_, id, def) => {
    footnoteDefs.set(id, def.trim());
    return '';
  });

  if (footnoteDefs.size === 0) {
    return { processedText: text, footnotesHtml: '' };
  }

  // Replace inline footnote references: [^1]
  const processedText = cleanedText.replace(/\[\^([^\]]+)\]/g, (match, id) => {
    if (!footnoteDefs.has(id)) return match;
    let idx = footnoteOrder.indexOf(id);
    if (idx === -1) {
      footnoteOrder.push(id);
      idx = footnoteOrder.length;
    } else {
      idx += 1;
    }
    return `<sup><a href="#fn-${id}" id="fnref-${id}" class="footnote-ref text-amber-600 dark:text-amber-400 no-underline font-mono text-[11px] px-0.5 hover:underline font-semibold" title="${footnoteDefs.get(id)}">[${idx}]</a></sup>`;
  });

  if (footnoteOrder.length === 0) {
    return { processedText, footnotesHtml: '' };
  }

  // Build Footnotes footer section
  const footnotesList = footnoteOrder
    .map((id, index) => {
      const def = footnoteDefs.get(id) || '';
      return `
        <li id="fn-${id}" class="text-xs leading-relaxed flex items-start gap-1 my-1">
          <span class="font-mono text-stone-400 select-none">${index + 1}.</span>
          <div class="flex-1">${def} <a href="#fnref-${id}" class="footnote-backref text-amber-600 no-underline hover:underline ml-1" title="Jump back to reference">↩</a></div>
        </li>
      `;
    })
    .join('');

  const footnotesHtml = `
    <div class="footnotes-section mt-12 pt-6 border-t font-sans select-text">
      <div class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Footnotes</div>
      <ol class="list-none p-0 m-0 space-y-1">${footnotesList}</ol>
    </div>
  `;

  return { processedText, footnotesHtml };
}

// Marked options configuration
marked.setOptions({
  gfm: true,
  breaks: true,
  renderer: sharedRenderer,
});

// Fast LRU Cache for parsed Markdown
const parseCache = new Map<string, string>();
const MAX_CACHE_SIZE = 40;

export function clearParseCache() {
  parseCache.clear();
}

// Setup custom marked renderer with placeholder-based KaTeX protection
export function parseMarkdownToHtml(
  markdown: string,
  isDark = false,
  _generateHeadingSlugs = true
): string {
  if (!markdown) return '';

  const cacheKey = `${markdown.length}_${isDark ? 'dark' : 'light'}_${markdown}`;
  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  // Reset per-parse session states
  currentParseHeadingCounts = new Map<string, number>();
  currentParseTaskIndex = 0;

  // 1. Protect code blocks and inline code from math parsing
  const codeBlockPlaceholders: { id: string; html: string }[] = [];
  let textWithCodeProtected = markdown.replace(/(```(\w*)\n?([\s\S]*?)```|`([^`\n]+)`)/g, (_match, _blockMatch, lang, blockContent, inlineContent) => {
    const id = `%%CODE_BLOCK_${codeBlockPlaceholders.length}%%`;
    let html = '';

    if (inlineContent !== undefined) {
      const escaped = inlineContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = `<code class="bg-stone-500/10 dark:bg-stone-400/15 px-1.5 py-0.5 rounded text-sm font-mono">${escaped}</code>`;
    } else {
      html = renderCodeBlock(blockContent || '', lang ? lang.trim() : '', isDark);
    }

    codeBlockPlaceholders.push({ id, html });
    return id;
  });

  // 2. Extract and protect math formulas using placeholders
  const mathPlaceholders: { id: string; html: string }[] = [];

  // Block math $$ ... $$
  textWithCodeProtected = textWithCodeProtected.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const id = `%%MATH_BLOCK_${mathPlaceholders.length}%%`;
    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      mathPlaceholders.push({ id, html: `<div class="katex-display-wrapper my-4">${html}</div>` });
    } catch {
      mathPlaceholders.push({
        id,
        html: `<pre class="text-red-500 font-mono text-sm my-2">Math Error: ${math}</pre>`,
      });
    }
    return id;
  });

  // Inline math $ ... $
  textWithCodeProtected = textWithCodeProtected.replace(
    /(?<!\\)\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g,
    (fullMatch, math) => {
      const trimmed = math.trim();

      // Discard false positives for currency lists/ranges
      if (/^\d+(?:\.\d+)?\s*[-–,]$/.test(trimmed)) {
        return fullMatch;
      }

      // Discard plain sentences containing English words without math operators
      if (
        /\b(?:and|or|to|from|is|are|item|items|price|prices|cost|costs|with|for|at)\b/i.test(trimmed) &&
        !/[\\=+\-/*<>^_{}]/.test(trimmed)
      ) {
        return fullMatch;
      }

      const id = `%%MATH_INLINE_${mathPlaceholders.length}%%`;
      try {
        const html = katex.renderToString(trimmed, {
          displayMode: false,
          throwOnError: false,
        });

        if (html.includes('katex-error')) {
          return fullMatch;
        }

        mathPlaceholders.push({ id, html });
        return id;
      } catch {
        return fullMatch;
      }
    }
  );

  // 3. Footnotes extraction
  const { processedText: withFootnotes, footnotesHtml } = processFootnotes(textWithCodeProtected);

  // 4. Custom inline markers (==highlight==, ^sup^, ~sub~) outside code blocks
  let processed = withFootnotes;
  processed = processed.replace(/==([^=\n]+)==/g, '<mark class="mark-highlight">$1</mark>');
  processed = processed.replace(/\^([^\^\s]+)\^/g, '<sup>$1</sup>');
  processed = processed.replace(/(?<!~)~([^~\s]+)~(?!~)/g, '<sub>$1</sub>');

  // 5. Parse Markdown with marked
  let parsedHtml = marked.parse(processed) as string;

  // 6. Restore protected KaTeX math html placeholders
  mathPlaceholders.forEach(({ id, html }) => {
    parsedHtml = parsedHtml.split(id).join(html);
  });

  // 7. Restore protected code blocks LAST so their contents remain 100% untransformed
  codeBlockPlaceholders.forEach(({ id, html }) => {
    if (parsedHtml.includes(`<p>${id}</p>`)) {
      parsedHtml = parsedHtml.replace(`<p>${id}</p>`, html.trim());
    } else {
      parsedHtml = parsedHtml.split(id).join(html);
    }
  });

  const result = parsedHtml + footnotesHtml;

  // Maintain LRU cache
  if (parseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey) parseCache.delete(firstKey);
  }
  parseCache.set(cacheKey, result);

  return result;
}
