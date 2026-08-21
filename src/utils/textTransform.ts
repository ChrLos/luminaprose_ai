// Text transformation utilities: Case converters and Multi-line List switchers

export type CaseStyle = 
  | 'sentence' 
  | 'title' 
  | 'upper' 
  | 'lower' 
  | 'camel' 
  | 'kebab' 
  | 'snake';

/**
 * Convert string to Sentence case.
 * Capitalizes first letter of sentences and keeps proper structure.
 */
export function toSentenceCase(text: string): string {
  if (!text) return text;
  return text
    .toLowerCase()
    .replace(/(^\s*|[.!?]\s+|\n\s*)([a-z\u00C0-\u017F])/g, (_, prefix, char) => {
      return prefix + char.toUpperCase();
    });
}

/**
 * Convert string to Title Case.
 * Capitalizes major words, keeps small words lowercase unless first/last.
 */
export function toTitleCase(text: string): string {
  if (!text) return text;
  const minorWords = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if', 'in', 
    'of', 'on', 'or', 'the', 'to', 'v', 'via', 'vs'
  ]);

  return text.replace(/\b([a-zA-Z\u00C0-\u017F]+)\b/g, (match, _, index) => {
    const isFirstWord = index === 0 || text[index - 1] === '\n' || text[index - 2] === '.';
    if (!isFirstWord && minorWords.has(match.toLowerCase())) {
      return match.toLowerCase();
    }
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });
}

/**
 * Convert string to camelCase.
 */
export function toCamelCase(text: string): string {
  if (!text) return text;
  return text
    .trim()
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Convert string to kebab-case.
 */
export function toKebabCase(text: string): string {
  if (!text) return text;
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case.
 */
export function toSnakeCase(text: string): string {
  if (!text) return text;
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Transform text according to specified CaseStyle.
 */
export function transformCase(text: string, style: CaseStyle): string {
  switch (style) {
    case 'sentence':
      return toSentenceCase(text);
    case 'title':
      return toTitleCase(text);
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'camel':
      return toCamelCase(text);
    case 'kebab':
      return toKebabCase(text);
    case 'snake':
      return toSnakeCase(text);
    default:
      return text;
  }
}

export type ListType = 'bullet' | 'numbered' | 'checklist' | 'quote';

interface LineTransformResult {
  newFullText: string;
  newSelectionStart: number;
  newSelectionEnd: number;
}

/**
 * Transforms single or multi-line selections in Markdown for lists and quotes.
 * Supports switching directly between bullet lists, checklists, and numbered lists.
 */
export function transformLinesList(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  listType: ListType
): LineTransformResult {
  // Find start of first selected line and end of last selected line
  const lineStartIndex = fullText.lastIndexOf('\n', selectionStart - 1) + 1;
  let lineEndIndex = fullText.indexOf('\n', selectionEnd);
  if (lineEndIndex === -1) {
    lineEndIndex = fullText.length;
  }

  const selectedBlock = fullText.substring(lineStartIndex, lineEndIndex);
  const lines = selectedBlock.split('\n');

  // Check existing patterns on lines
  const checklistRegex = /^(\s*)([-*+]\s+\[[ xX]\]\s+)(.*)$/;
  const bulletRegex = /^(\s*)([-*+]\s+)(.*)$/;
  const numberedRegex = /^(\s*)(\d+\.\s+)(.*)$/;
  const quoteRegex = /^(\s*)(>\s*)(.*)$/;

  // Determine if all non-empty lines already have this exact formatting
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const allAreTargetType =
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every((line) => {
      if (listType === 'checklist') return checklistRegex.test(line);
      if (listType === 'bullet') return bulletRegex.test(line) && !checklistRegex.test(line);
      if (listType === 'numbered') return numberedRegex.test(line);
      if (listType === 'quote') return quoteRegex.test(line);
      return false;
    });

  let counter = 1;
  const newLines = lines.map((line) => {
    // Leave completely blank lines alone if there are multiple lines
    if (lines.length > 1 && line.trim().length === 0) {
      return line;
    }

    // 1. If all lines already have target format -> Toggle OFF (strip prefix)
    if (allAreTargetType) {
      if (listType === 'checklist') {
        return line.replace(checklistRegex, '$1$3');
      }
      if (listType === 'bullet') {
        return line.replace(bulletRegex, '$1$3');
      }
      if (listType === 'numbered') {
        return line.replace(numberedRegex, '$1$3');
      }
      if (listType === 'quote') {
        return line.replace(quoteRegex, '$1$3');
      }
    }

    // 2. Extract leading whitespace and raw text content without any list markers
    let indent = '';
    let rawContent = line;

    // Strip existing checklist prefix
    const checkMatch = line.match(checklistRegex);
    if (checkMatch) {
      indent = checkMatch[1];
      rawContent = checkMatch[3];
    } else {
      // Strip existing bullet prefix
      const bulletMatch = line.match(bulletRegex);
      if (bulletMatch) {
        indent = bulletMatch[1];
        rawContent = bulletMatch[3];
      } else {
        // Strip existing numbered prefix
        const numMatch = line.match(numberedRegex);
        if (numMatch) {
          indent = numMatch[1];
          rawContent = numMatch[3];
        } else {
          // Strip quote if present
          const quoteMatch = line.match(quoteRegex);
          if (quoteMatch) {
            indent = quoteMatch[1];
            rawContent = quoteMatch[3];
          } else {
            const indentMatch = line.match(/^(\s*)(.*)$/);
            if (indentMatch) {
              indent = indentMatch[1];
              rawContent = indentMatch[2];
            }
          }
        }
      }
    }

    // 3. Apply the desired listType
    switch (listType) {
      case 'bullet':
        return `${indent}- ${rawContent}`;
      case 'checklist':
        return `${indent}- [ ] ${rawContent}`;
      case 'numbered': {
        const itemNum = counter++;
        return `${indent}${itemNum}. ${rawContent}`;
      }
      case 'quote':
        return `${indent}> ${rawContent}`;
      default:
        return line;
    }
  });

  const newBlock = newLines.join('\n');
  const newFullText =
    fullText.substring(0, lineStartIndex) + newBlock + fullText.substring(lineEndIndex);

  // Preserve selection covering the modified block
  const lengthDiff = newBlock.length - selectedBlock.length;
  const newSelectionStart = lineStartIndex;
  const newSelectionEnd = Math.max(lineStartIndex, lineEndIndex + lengthDiff);

  return {
    newFullText,
    newSelectionStart,
    newSelectionEnd,
  };
}
