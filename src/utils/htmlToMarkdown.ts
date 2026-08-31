/**
 * Utility to convert an HTML DOM element/fragment (e.g. from user selection)
 * back into clean, authentic Markdown text.
 */
export function domFragmentToMarkdown(container: HTMLElement): string {
  function serializeNode(node: Node, indentLevel = 0): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();
    const classList = el.classList;

    // Ignore UI chrome / action buttons that shouldn't be in markdown
    if (
      classList.contains('no-print') ||
      classList.contains('copy-code-btn') ||
      classList.contains('code-block-header') ||
      classList.contains('code-header') ||
      classList.contains('selection-toolbar-bubble')
    ) {
      return '';
    }

    // Handle Bionic Reading spans: do not turn bionic bold into markdown asterisks
    if (classList.contains('bionic-bold') || classList.contains('bionic-word')) {
      return el.textContent || '';
    }

    // Handle KaTeX math
    if (classList.contains('katex') || classList.contains('katex-display')) {
      const texAnnotation = el.querySelector('annotation[encoding="application/x-tex"]');
      const formula = texAnnotation?.textContent || el.getAttribute('data-tex') || '';
      if (formula) {
        return classList.contains('katex-display') ? `\n$$\n${formula.trim()}\n$$\n` : `$${formula.trim()}$`;
      }
      return el.textContent || '';
    }

    // Check if it's a code block wrapper or pre
    if (tagName === 'pre' || classList.contains('code-block-wrapper')) {
      const codeEl = el.querySelector('code');
      const langMatch = (codeEl?.className || el.className).match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      const text = (codeEl || el).textContent || '';
      return `\n\`\`\`${lang}\n${text.replace(/^\n+|\n+$/g, '')}\n\`\`\`\n`;
    }

    if (tagName === 'code') {
      // If inside pre, text is handled by pre
      if (el.parentElement?.tagName.toLowerCase() === 'pre' || el.closest('pre')) {
        return el.textContent || '';
      }
      return `\`${el.textContent || ''}\``;
    }

    // Headings
    if (/^h[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1], 10);
      const prefix = '#'.repeat(level);
      const text = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('').trim();
      return `\n\n${prefix} ${text}\n\n`;
    }

    // Bold / Strong
    if (tagName === 'strong' || tagName === 'b') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      if (!inner.trim()) return '';
      return `**${inner}**`;
    }

    // Italic / Em
    if (tagName === 'em' || tagName === 'i') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      if (!inner.trim()) return '';
      return `*${inner}*`;
    }

    // Strikethrough / Del
    if (tagName === 'del' || tagName === 's' || tagName === 'strike') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      if (!inner.trim()) return '';
      return `~~${inner}~~`;
    }

    // Highlight mark
    if (tagName === 'mark') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      return `==${inner}==`;
    }

    // Blockquote
    if (tagName === 'blockquote') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('').trim();
      const quoted = inner.split('\n').map((line) => `> ${line}`).join('\n');
      return `\n\n${quoted}\n\n`;
    }

    // Links
    if (tagName === 'a') {
      const href = el.getAttribute('href') || '';
      const text = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      if (!href || href.startsWith('javascript:')) return text;
      return `[${text}](${href})`;
    }

    // Images
    if (tagName === 'img') {
      const alt = el.getAttribute('alt') || '';
      const src = el.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }

    // Tables
    if (tagName === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (rows.length === 0) return '';
      
      const tableLines: string[] = [];
      rows.forEach((row, rowIdx) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowContent = cells
          .map((c) => Array.from(c.childNodes).map((n) => serializeNode(n, 0)).join('').replace(/\|/g, '\\|').trim())
          .join(' | ');
        
        tableLines.push(`| ${rowContent} |`);
        
        if (rowIdx === 0) {
          const sep = cells.map(() => '---').join(' | ');
          tableLines.push(`| ${sep} |`);
        }
      });
      return `\n\n${tableLines.join('\n')}\n\n`;
    }

    // Lists
    if (tagName === 'ul') {
      const items = Array.from(el.childNodes)
        .filter((n) => n.nodeName.toLowerCase() === 'li')
        .map((li) => serializeListItem(li as HTMLElement, indentLevel, '- '))
        .join('');
      return `\n${items}\n`;
    }

    if (tagName === 'ol') {
      let idx = 1;
      const items = Array.from(el.childNodes)
        .filter((n) => n.nodeName.toLowerCase() === 'li')
        .map((li) => {
          const res = serializeListItem(li as HTMLElement, indentLevel, `${idx}. `);
          idx++;
          return res;
        })
        .join('');
      return `\n${items}\n`;
    }

    if (tagName === 'li') {
      return serializeListItem(el, indentLevel, '- ');
    }

    // Paragraphs & Divs
    if (tagName === 'p') {
      const inner = Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
      return `\n\n${inner}\n\n`;
    }

    if (tagName === 'br') {
      return '\n';
    }

    if (tagName === 'hr') {
      return '\n\n---\n\n';
    }

    // Fallback for generic elements (div, span, section, etc.)
    return Array.from(el.childNodes).map((n) => serializeNode(n, indentLevel)).join('');
  }

  function serializeListItem(li: HTMLElement, indentLevel: number, bulletPrefix: string): string {
    const indent = '  '.repeat(indentLevel);
    
    // Check if task checkbox exists
    const checkbox = li.querySelector('input[type="checkbox"]');
    let prefix = bulletPrefix;
    if (checkbox) {
      const isChecked = (checkbox as HTMLInputElement).checked;
      prefix = `- [${isChecked ? 'x' : ' '}] `;
    }

    // Filter out the checkbox from child serialization if present
    const childTexts: string[] = [];
    li.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'input') {
        return;
      }
      if (child.nodeType === Node.ELEMENT_NODE && ['ul', 'ol'].includes((child as HTMLElement).tagName.toLowerCase())) {
        childTexts.push(serializeNode(child, indentLevel + 1));
      } else {
        childTexts.push(serializeNode(child, indentLevel));
      }
    });

    const content = childTexts.join('').trim();
    return `${indent}${prefix}${content}\n`;
  }

  const rawMarkdown = serializeNode(container);
  
  // Normalize consecutive newlines
  return rawMarkdown
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts markdown from current window selection within a given container element.
 */
export function getSelectionAsMarkdown(containerEl: HTMLElement | null): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return '';
  }

  const selectedText = selection.toString();
  if (!selectedText || !selectedText.trim()) {
    return '';
  }

  const range = selection.getRangeAt(0);
  
  // Ensure the selection is within containerEl if provided
  if (containerEl) {
    const isInside =
      containerEl.contains(range.commonAncestorContainer) ||
      containerEl.contains(range.startContainer) ||
      containerEl.contains(range.endContainer);
    if (!isInside) {
      return '';
    }
  }

  try {
    const clonedFragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(clonedFragment);

    const converted = domFragmentToMarkdown(tempDiv);
    if (converted && converted.trim().length > 0) {
      return converted;
    }
  } catch (err) {
    console.error('Error serializing selection to markdown:', err);
  }

  return selectedText;
}
