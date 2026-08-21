/**
 * Smart Typography Engine
 * Automatically transforms typography symbols (->, =>, ..., quotes, etc.) outside code blocks
 * with instant single-key Backspace reversal.
 */

export interface SmartTransformRecord {
  start: number;
  end: number;
  original: string;
  replaced: string;
  docLengthAfter: number;
}

/**
 * Checks whether a given character index in markdown text is inside a code block or inline code
 */
export function isInsideCode(text: string, index: number): boolean {
  if (index < 0 || index > text.length) return false;

  // 1. Check fenced code blocks (``` ... ``` or ~~~ ... ~~~)
  const beforeCursor = text.slice(0, index);
  const fenceMatches = beforeCursor.match(/^```|^~~~/gm);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return true;
  }

  // 2. Check inline code `...` on current line
  const lastNewline = beforeCursor.lastIndexOf('\n');
  const currentLineBefore = lastNewline === -1 ? beforeCursor : beforeCursor.slice(lastNewline + 1);
  const inlineBackticks = (currentLineBefore.match(/`/g) || []).length;
  if (inlineBackticks % 2 !== 0) {
    return true;
  }

  return false;
}

/**
 * Checks if the last inserted character sequence matches a smart typography pattern
 * Returns the transformed string, new cursor position, and the transform record for backspace reversal.
 */
export function checkSmartTypography(
  text: string,
  cursorPos: number
): {
  newText: string;
  newCursor: number;
  record: SmartTransformRecord;
} | null {
  if (cursorPos <= 0 || isInsideCode(text, cursorPos)) {
    return null;
  }

  const sliceBefore = text.slice(0, cursorPos);
  const sliceAfter = text.slice(cursorPos);

  // Pattern matchers from longest to shortest
  const patterns: { search: string; replace: string }[] = [
    { search: '<=>', replace: '⇔' },
    { search: '->', replace: '→' },
    { search: '<-', replace: '←' },
    { search: '=>', replace: '⇒' },
    { search: '!=', replace: '≠' },
    { search: '/=', replace: '≠' },
    { search: '>=', replace: '≥' },
    { search: '<=', replace: '≤' },
    { search: '+-', replace: '±' },
    { search: '...', replace: '…' },
    { search: '--', replace: '—' },
  ];

  for (const { search, replace } of patterns) {
    if (sliceBefore.endsWith(search)) {
      const matchStart = cursorPos - search.length;
      const newBefore = sliceBefore.slice(0, matchStart) + replace;
      const newText = newBefore + sliceAfter;
      const newCursor = matchStart + replace.length;

      return {
        newText,
        newCursor,
        record: {
          start: matchStart,
          end: newCursor,
          original: search,
          replaced: replace,
          docLengthAfter: newText.length,
        },
      };
    }
  }

  return null;
}

/**
 * Handles smart curly quotes for double quote (") and single quote (')
 */
export function handleSmartQuote(
  text: string,
  selStart: number,
  selEnd: number,
  quoteChar: '"' | "'"
): {
  newText: string;
  newCursor: number;
  record: SmartTransformRecord;
} | null {
  if (selStart !== selEnd) return null;
  if (isInsideCode(text, selStart)) return null;

  const before = text.slice(0, selStart);
  const after = text.slice(selEnd);
  const prevChar = before.slice(-1);

  // Determine opening vs closing quote
  const isOpening =
    before.length === 0 ||
    /[\s\n\r\t(\[{\u201C\u2018<]/.test(prevChar);

  let replacement = '';
  if (quoteChar === '"') {
    replacement = isOpening ? '“' : '”';
  } else {
    replacement = isOpening ? '‘' : '’';
  }

  const newText = before + replacement + after;
  const newCursor = selStart + replacement.length;

  return {
    newText,
    newCursor,
    record: {
      start: selStart,
      end: newCursor,
      original: quoteChar,
      replaced: replacement,
      docLengthAfter: newText.length,
    },
  };
}
