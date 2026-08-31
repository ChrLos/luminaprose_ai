export type SortDirection = 'asc' | 'desc';
export type SortAlgorithm = 'natural' | 'alphabetical' | 'length' | 'reverse';

export interface LineSortOptions {
  direction?: SortDirection;
  algorithm?: SortAlgorithm;
  caseSensitive?: boolean;
  preserveIndentation?: boolean;
  trimBeforeSort?: boolean;
}

export interface SortResult {
  newText: string;
  newSelectionStart: number;
  newSelectionEnd: number;
  lineCount: number;
  algorithm: SortAlgorithm;
  direction: SortDirection;
}

/**
 * Modular line comparison engine supporting standard alphabetical,
 * natural alphanumeric, line length, and direction.
 */
export function createLineComparator(options: LineSortOptions = {}) {
  const {
    direction = 'asc',
    algorithm = 'natural',
    caseSensitive = false,
  } = options;

  const collator = new Intl.Collator(undefined, {
    numeric: algorithm === 'natural',
    sensitivity: caseSensitive ? 'variant' : 'base',
  });

  return (a: string, b: string): number => {
    // If preserving indentation, extract the content after leading whitespace for comparison
    const aContent = a.replace(/^\s*/, '');
    const bContent = b.replace(/^\s*/, '');

    let diff = 0;
    if (algorithm === 'length') {
      diff = aContent.length - bContent.length;
      if (diff === 0) {
        diff = collator.compare(aContent, bContent);
      }
    } else {
      diff = collator.compare(aContent, bContent);
    }

    return direction === 'desc' ? -diff : diff;
  };
}

/**
 * Sort an array or multi-line string of lines with preservation of line endings (LF vs CRLF)
 * and leading indentation.
 */
export function sortLines(text: string, options: LineSortOptions = {}): string {
  if (!text) return '';

  const {
    direction = 'asc',
    algorithm = 'natural',
    preserveIndentation = true,
  } = options;

  // Detect line endings (\r\n vs \n)
  const isCrlf = text.includes('\r\n');
  const lineEnding = isCrlf ? '\r\n' : '\n';
  const rawLines = text.split(/\r?\n/);

  if (rawLines.length <= 1) {
    return text;
  }

  if (algorithm === 'reverse') {
    return [...rawLines].reverse().join(lineEnding);
  }

  const comparator = createLineComparator(options);

  if (preserveIndentation) {
    // Each line preserves its leading whitespace while its position is sorted based on text content
    const sorted = [...rawLines].sort(comparator);
    return sorted.join(lineEnding);
  } else {
    const sorted = [...rawLines].sort(comparator);
    return sorted.join(lineEnding);
  }
}

/**
 * Expands selection to complete line boundaries and sorts the lines in place.
 * Returns the transformed full document text and adjusted selection bounds.
 */
export function sortSelectedLinesInDocument(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  options: LineSortOptions = {}
): SortResult {
  const { direction = 'asc', algorithm = 'natural' } = options;

  if (!fullText) {
    return {
      newText: '',
      newSelectionStart: 0,
      newSelectionEnd: 0,
      lineCount: 0,
      algorithm,
      direction,
    };
  }

  const isCrlf = fullText.includes('\r\n');
  const lineEnding = isCrlf ? '\r\n' : '\n';

  let start = Math.min(selectionStart, selectionEnd);
  let end = Math.max(selectionStart, selectionEnd);

  // If no text is explicitly highlighted (collapsed cursor), expand to the current block/paragraph
  if (start === end) {
    let blockStart = fullText.lastIndexOf('\n\n', start - 1);
    blockStart = blockStart === -1 ? 0 : blockStart + 2;

    let blockEnd = fullText.indexOf('\n\n', end);
    blockEnd = blockEnd === -1 ? fullText.length : blockEnd;

    start = blockStart;
    end = blockEnd;
  }

  // Expand start backwards to the beginning of the line
  const lineStart = fullText.lastIndexOf('\n', start - 1);
  const effectiveStart = lineStart === -1 ? 0 : lineStart + 1;

  // Expand end forwards to the end of the line
  let effectiveEnd = end;
  if (effectiveEnd < fullText.length && fullText[effectiveEnd - 1] !== '\n') {
    const lineEnd = fullText.indexOf('\n', effectiveEnd);
    effectiveEnd = lineEnd === -1 ? fullText.length : lineEnd;
  }

  const beforeText = fullText.substring(0, effectiveStart);
  const selectedLinesText = fullText.substring(effectiveStart, effectiveEnd);
  const afterText = fullText.substring(effectiveEnd);

  const lines = selectedLinesText.split(/\r?\n/);
  const sortedLinesText = sortLines(selectedLinesText, options);

  const newText = beforeText + sortedLinesText + afterText;
  const newSelectionStart = effectiveStart;
  const newSelectionEnd = effectiveStart + sortedLinesText.length;

  return {
    newText,
    newSelectionStart,
    newSelectionEnd,
    lineCount: lines.length,
    algorithm,
    direction,
  };
}
