/**
 * Safe Bionic Reading Transformer
 * Guides eye saccades by bolding the initial fixation points of words.
 * Strictly ignores mathematical formulas (KaTeX), code blocks, tables, and scripts.
 */

function bionicWord(word: string): string {
  // Ignore special characters, html entities, numbers or very short tokens
  if (!word || word.length <= 1 || word.startsWith('&') || /^[0-9\W]+$/.test(word)) {
    return word;
  }

  // Calculate fixation length (approx 40-50% of the word)
  let fixLen = 1;
  if (word.length >= 7) {
    fixLen = 3;
  } else if (word.length >= 4) {
    fixLen = 2;
  }

  const prefix = word.slice(0, fixLen);
  const rest = word.slice(fixLen);
  return `<b>${prefix}</b>${rest}`;
}

const bionicCache = new Map<string, string>();
const MAX_BIONIC_CACHE_SIZE = 30;

export function clearBionicCache(): void {
  bionicCache.clear();
}

export function applyBionicReading(html: string): string {
  if (!html || typeof window === 'undefined') return html;

  if (bionicCache.has(html)) {
    return bionicCache.get(html)!;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Select all text-bearing paragraph and list elements, while strictly excluding code, math, tables
    const textNodes: Node[] = [];
    const walker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Exclude math, code, pre, script, style, tables, anchors, and admonition titles
          if (
            parent.closest('pre') ||
            parent.closest('code') ||
            parent.closest('.katex') ||
            parent.closest('.katex-display') ||
            parent.closest('.katex-display-wrapper') ||
            parent.closest('table') ||
            parent.closest('script') ||
            parent.closest('style') ||
            parent.closest('.admonition-title')
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          // Only process paragraphs, list items, headings, blockquotes
          if (
            parent.closest('p') ||
            parent.closest('li') ||
            parent.closest('blockquote') ||
            parent.closest('figcaption')
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    for (const node of textNodes) {
      const text = node.textContent || '';
      if (!text.trim()) continue;

      // Split text preserving whitespace and punctuation
      const words = text.split(/(\s+|[.,!?;:()[\]{}"])/);
      const bionicHtml = words
        .map((segment) => {
          if (/^\s+$/.test(segment) || /^[.,!?;:()[\]{}"]+$/.test(segment)) {
            return segment;
          }
          return bionicWord(segment);
        })
        .join('');

      const span = doc.createElement('span');
      span.className = 'bionic-text';
      span.innerHTML = bionicHtml;

      node.parentNode?.replaceChild(span, node);
    }

    const result = doc.body.innerHTML;
    if (bionicCache.size >= MAX_BIONIC_CACHE_SIZE) {
      const firstKey = bionicCache.keys().next().value;
      if (firstKey) bionicCache.delete(firstKey);
    }
    bionicCache.set(html, result);

    return result;
  } catch {
    return html;
  }
}
