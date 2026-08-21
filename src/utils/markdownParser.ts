import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { TocHeading } from '../types';

// Slug generator for heading IDs
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'heading'
  );
}

// Extract Table of Contents headings from Markdown text with duplicate index resolution
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

// Process footnotes: [^1] and [^1]: Text
function processFootnotes(text: string): { processedText: string; footnotesHtml: string } {
  const footnoteDefs = new Map<string, string>();

  // Extract definitions: [^1]: Footnote content
  const lines = text.split('\n');
  const remainingLines: string[] = [];

  for (const line of lines) {
    const defMatch = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (defMatch) {
      footnoteDefs.set(defMatch[1], defMatch[2].trim());
    } else {
      remainingLines.push(line);
    }
  }

  let processed = remainingLines.join('\n');

  // Replace references [^1]
  footnoteDefs.forEach((_, key) => {
    const refRegex = new RegExp(`\\[\\^${key}\\]`, 'g');
    processed = processed.replace(
      refRegex,
      `<sup class="footnote-ref"><a href="#fn-${key}" id="fnref-${key}" class="font-semibold text-amber-600 dark:text-amber-400 hover:underline px-0.5">[${key}]</a></sup>`
    );
  });

  // Build Footnotes footer if any exist
  let footnotesHtml = '';
  if (footnoteDefs.size > 0) {
    const items: string[] = [];
    footnoteDefs.forEach((def, key) => {
      items.push(
        `<li id="fn-${key}" class="text-sm my-1 leading-relaxed">
          <span>${def}</span>
          <a href="#fnref-${key}" class="inline-block ml-1 text-amber-600 dark:text-amber-400 hover:underline" title="Return to reference">↩</a>
        </li>`
      );
    });
    footnotesHtml = `
      <section class="footnotes-section mt-12 pt-6 border-t border-stone-300/40 dark:border-stone-700/60 text-xs">
        <h4 class="text-xs font-bold uppercase tracking-wider opacity-70 mb-3">Footnotes & Citations</h4>
        <ol class="list-decimal pl-5 space-y-1.5">${items.join('')}</ol>
      </section>
    `;
  }

  return { processedText: processed, footnotesHtml };
}

// Global counters for current parse session
let currentParseHeadingCounts = new Map<string, number>();
let currentParseTaskIndex = 0;

// ----------------------------------------------------
// Configure static marked renderer for peak performance
// ----------------------------------------------------
const sharedRenderer = new marked.Renderer();

// Headings with unique duplicate-safe id for table of contents
sharedRenderer.heading = function ({ tokens, depth }: { tokens: any[]; depth: number }): string {
  const text = this.parser.parseInline(tokens);
  const plainText = text
    .replace(/%%(?:MATH_INLINE|MATH_BLOCK|CODE_BLOCK)_\d+%%/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[*_~`=]/g, '')
    .trim();

  const baseId = slugify(plainText || 'heading');

  const count = currentParseHeadingCounts.get(baseId) || 0;
  currentParseHeadingCounts.set(baseId, count + 1);
  const uniqueId = count === 0 ? baseId : `${baseId}-${count}`;

  return `<h${depth} id="${uniqueId}" class="scroll-mt-20">${text}</h${depth}>`;
};

// Blockquote with Admonition / Callout support
sharedRenderer.blockquote = function ({ tokens }: { tokens: any[] }): string {
  const body = this.parser.parse(tokens);

  // Check if it's a Callout: [!NOTE], [!TIP], [!WARNING], [!IMPORTANT], [!CAUTION], [!QUOTE]
  const calloutMatch = body.match(
    /^<p>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|INFO|QUOTE)\](?:\s+([^\n<]+))?\s*(?:<br>|\n)?([\s\S]*?)<\/p>/i
  );

  if (calloutMatch) {
    const type = calloutMatch[1].toUpperCase();
    const customTitle = calloutMatch[2]?.trim();
    const restOfFirstPara = calloutMatch[3]?.trim();
    const afterFirstPara = body.substring(calloutMatch[0].length);

    const title = customTitle || type.charAt(0) + type.slice(1).toLowerCase();

    const iconMap: Record<string, string> = {
      NOTE: '📝',
      INFO: '💡',
      TIP: '✨',
      WARNING: '⚠️',
      IMPORTANT: '⚡',
      CAUTION: '🛑',
      QUOTE: '❝',
    };

    const icon = iconMap[type] || '📌';
    const admonitionTypeClass = `admonition-${type.toLowerCase()}`;

    return `
      <div class="admonition ${admonitionTypeClass}">
        <div class="admonition-title">
          <span>${icon}</span>
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

function renderCodeBlock(text: string, lang?: string): string {
  const language = lang && hljs.getLanguage(lang) ? lang : '';
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
        <span class="uppercase font-semibold tracking-wider">${language || 'text'}</span>
        <button 
          type="button"
          class="copy-code-btn px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors cursor-pointer"
          data-code="${encodedRaw}"
          onclick="window.__copyCodeBlock?.(this)"
        >
          Copy
        </button>
      </div>
      <pre class="p-4 overflow-x-auto text-[13.5px] leading-relaxed font-mono"><code class="hljs ${
        language ? `language-${language}` : ''
      }">${highlighted}</code></pre>
    </div>
  `;
}

// Code blocks with syntax highlighting & copy button
sharedRenderer.code = function (token: any): string {
  return renderCodeBlock(token.text || '', token.lang);
};

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
  return `<hr class="markdown-divider my-10" style="height: 2px; width: 100%; border: none; background-color: var(--hr-color, rgba(150, 150, 150, 0.35));" />`;
};

// Links with external indicator
sharedRenderer.link = function ({
  href,
  title,
  tokens,
}: {
  href: string;
  title?: string | null;
  tokens: any[];
}): string {
  const text = this.parser.parseInline(tokens);
  const isExternal = href.startsWith('http://') || href.startsWith('https://');
  return `
    <a 
      href="${href}" 
      ${title ? `title="${title}"` : ''} 
      ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}
      class="prose-link"
    >${text}</a>
  `;
};

// Images with caption support
sharedRenderer.image = function ({
  href,
  title,
  text,
}: {
  href: string;
  title?: string | null;
  text: string;
}): string {
  return `
    <figure class="my-8 text-center">
      <img 
        src="${href}" 
        alt="${text}" 
        loading="lazy"
        class="rounded-lg max-w-full mx-auto shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
        onclick="window.__zoomImage?.(this.src, '${encodeURIComponent(text)}')"
      />
      ${
        text
          ? `<figcaption class="mt-2.5 text-xs text-stone-500 dark:text-stone-400 italic tracking-wide">${text}</figcaption>`
          : ''
      }
    </figure>
  `;
};

marked.setOptions({
  renderer: sharedRenderer,
  gfm: true,
  breaks: true,
});

// Fast LRU Cache for parsed Markdown
const parseCache = new Map<string, string>();
const MAX_CACHE_SIZE = 40;

// Setup custom marked renderer with placeholder-based KaTeX protection
export function parseMarkdownToHtml(
  markdown: string,
  options: {
    highlightSyntax?: boolean;
    showLineNumbers?: boolean;
  } = {}
): string {
  if (!markdown) return '';

  const cacheKey = `${markdown.length}_${markdown.slice(0, 40)}_${options.highlightSyntax}_${markdown}`;
  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  // Reset per-parse session states
  currentParseHeadingCounts = new Map<string, number>();
  currentParseTaskIndex = 0;

  // 1. Protect code blocks and inline code from math parsing
  const codeBlockPlaceholders: { id: string; html: string }[] = [];
  let textWithCodeProtected = markdown.replace(/(```(\w*)\n?([\s\S]*?)```|`([^`\n]+)`)/g, (match, blockMatch, lang, blockContent, inlineContent) => {
    const id = `%%CODE_BLOCK_${codeBlockPlaceholders.length}%%`;
    let html = '';

    if (inlineContent !== undefined) {
      const escaped = inlineContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = `<code class="bg-stone-500/10 dark:bg-stone-400/15 px-1.5 py-0.5 rounded text-sm font-mono">${escaped}</code>`;
    } else {
      html = renderCodeBlock(blockContent || '', lang ? lang.trim() : '');
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
  // Lookbehind (?<!\\) ensures $ is not escaped with backslash.
  // Requires non-space immediately after opening $ and non-space immediately before closing $.
  textWithCodeProtected = textWithCodeProtected.replace(
    /(?<!\\)\$([^\s$](?:[^$\n]*?[^\s$])?)\$/g,
    (fullMatch, math) => {
      const trimmed = math.trim();

      // Discard false positives for currency lists/ranges where first dollar ends with punctuation before next dollar (e.g. "$10-$15" capturing "10-", "$10, $15" capturing "10,")
      if (/^\d+(?:\.\d+)?\s*[-–,]$/.test(trimmed)) {
        return fullMatch;
      }

      // Discard plain sentences containing English words without math operators (e.g. "$10 to $15", "$10 and $20")
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

  // 5. Parse Markdown with marked (code blocks remain protected so marked won't mangle them either)
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
